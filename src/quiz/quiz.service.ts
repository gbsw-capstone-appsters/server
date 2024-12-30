import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quiz } from './entities/quiz.entity';
import { QuizResult } from './entities/quiz-result.entity';
import { User } from '../auth/entities/user.entity';
import { OpenAI } from 'openai';
import { Role } from 'src/@common/enums/role.enum';

interface RankingInfo {
  userId: number;
  nickName: string;
  score: number;
  rank?: number;
  createdAt: Date;
}

@Injectable()
export class QuizService {
  private openai: OpenAI;
  private readonly TOTAL_QUESTIONS = 10;
  private readonly CATEGORIES = [
    '사자성어',
    '고사성어',
    '문법',
    '독해',
    '어휘',
  ];

  constructor(
    @InjectRepository(Quiz)
    private quizRepository: Repository<Quiz>,
    @InjectRepository(QuizResult)
    private quizResultRepository: Repository<QuizResult>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    this.openai = new OpenAI({
      apiKey: process.env.GPT_KEY,
    });
  }

  async generateQuiz(userId: number, category: string): Promise<Quiz> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    if (!this.CATEGORIES.includes(category)) {
      throw new BadRequestException('유효하지 않은 카테고리입니다.');
    }

    const passageResponse = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: `사용자의 나이는 ${user.age}입니다. 나이수준에 맞도록 쉽게 ${category}에 대한 문제를 만들기 위한 한국어 문장을 100자 이내로 생성합니다.`,
        },
      ],
    });
    let passage = passageResponse.choices[0].message.content;

    // 불필요한 문장 제거
    passage = passage.replace(/^.*?입니다\.\s*/, '');

    const questionsResponse = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: `다음 지문을 기반으로 10개의 다양한 질문을 생성합니다. question와 options에는 영어가 들어가면 안됩니다.  각 질문은 다음 유형을 포함해야 합니다:
            - 4지선다형 (5개)
            - O/X 퀴즈 (5개)
            
            다음 JSON 형식으로 반환합니다:
            {
              "questions": [
                {
                  "id": number,
                  "type": string,
                  "question": string,
                  "options": array,
                  "correctAnswer": string,
                  "category": string
                }
              ]
            }
            
            문제와 선택지에는 영어가 들어가면 안됩니다.
            카테고리는 ${category}입니다.
            지문: ${passage}`,
        },
      ],
    });

    try {
      const questions = JSON.parse(
        questionsResponse.choices[0].message.content,
      );
      const quiz = new Quiz();
      quiz.passage = passage;
      quiz.questions = questions.questions;
      quiz.totalQuestions = this.TOTAL_QUESTIONS;
      quiz.currentQuestion = 0;
      quiz.status = 'in_progress';
      quiz.answers = [];
      quiz.userId = userId;

      return this.quizRepository.save(quiz);
    } catch (error) {
      throw new BadRequestException(
        '퀴즈를 생성하는 동안 오류가 발생했습니다.',
      );
    }
  }

  async submitAnswer(
    quizId: number,
    questionId: number,
    answer: string,
  ): Promise<{
    isCorrect: boolean;
    progress: number;
    quizCompleted: boolean;
  }> {
    const quiz = await this.quizRepository.findOne({ where: { id: quizId } });
    if (!quiz) {
      throw new NotFoundException(`ID가 ${quizId}인 퀴즈를 찾을 수 없습니다.`);
    }

    if (quiz.status === 'completed') {
      throw new BadRequestException('이 퀴즈는 이미 완료되었습니다.');
    }

    const question = quiz.questions.find((q) => q.id === Number(questionId));
    if (!question) {
      throw new NotFoundException(
        `ID가 ${questionId}인 질문을 찾을 수 없습니다.`,
      );
    }

    // 이미 제출된 질문인지 확인
    const alreadySubmitted = quiz.answers.some(
      (answer) => answer.questionId === Number(questionId),
    );
    if (alreadySubmitted) {
      throw new BadRequestException('이 질문은 이미 답변되었습니다.');
    }

    const isCorrect = question.correctAnswer === answer;
    quiz.currentQuestion += 1;
    const progress = (quiz.currentQuestion / this.TOTAL_QUESTIONS) * 100;

    quiz.answers = quiz.answers || [];
    quiz.answers.push({
      questionId: Number(questionId),
      userAnswer: answer,
      isCorrect,
      category: question.category,
    });

    const quizCompleted = quiz.currentQuestion === this.TOTAL_QUESTIONS;
    if (quizCompleted) {
      quiz.status = 'completed';
      await this.quizRepository.save(quiz);
      const user = await this.userRepository.findOne({
        where: { id: quiz.userId },
      });
      if (user) {
        await this.generateQuizResult(quiz, user);
      }
    } else {
      await this.quizRepository.save(quiz);
    }

    return {
      isCorrect,
      progress,
      quizCompleted,
    };
  }

  private async generateQuizResult(quiz: Quiz, user: User): Promise<void> {
    const correctAnswers = quiz.answers.filter(
      (answer) => answer.isCorrect,
    ).length;
    const overallScore = (correctAnswers / quiz.totalQuestions) * 100;

    const categoryAnalysis = quiz.answers.reduce((acc, answer) => {
      if (!acc[answer.category]) {
        acc[answer.category] = {
          correct: 0,
          total: 0,
          score: 0,
        };
      }
      acc[answer.category].total += 1;
      if (answer.isCorrect) {
        acc[answer.category].correct += 1;
      }
      acc[answer.category].score =
        (acc[answer.category].correct / acc[answer.category].total) * 100;
      return acc;
    }, {});

    const quizResult = this.quizResultRepository.create({
      quizId: quiz.id,
      userId: user.id,
      totalQuestions: quiz.totalQuestions,
      correctAnswers,
      categoryAnalysis,
      overallScore,
    });

    await this.quizResultRepository.save(quizResult);
  }

  async getCategoryRankings(category: string, userId: number): Promise<any> {
    if (!this.CATEGORIES.includes(category)) {
      throw new BadRequestException('유효하지 않은 카테고리입니다.');
    }

    const results = await this.quizResultRepository
      .createQueryBuilder('result')
      .select([
        'result.userId',
        'result.categoryAnalysis',
        'result.createdAt',
        'user.nickName',
      ])
      .leftJoin('result.user', 'user')
      .getMany();

    const categoryScores: RankingInfo[] = results
      .filter(
        (result) =>
          result.categoryAnalysis &&
          result.categoryAnalysis[category] &&
          result.categoryAnalysis[category].score > 0,
      )
      .map((result) => ({
        userId: result.userId,
        nickName: result.user?.nickName || '',
        score: result.categoryAnalysis[category].score,
        createdAt: result.createdAt,
      }));

    const uniqueScores = categoryScores.reduce((acc, score) => {
      const existing = acc.find((s) => s.userId === score.userId);
      if (!existing || existing.score < score.score) {
        return acc.filter((s) => s.userId !== score.userId).concat(score);
      }
      return acc;
    }, []);

    const sortedRankings = uniqueScores
      .sort((a, b) => b.score - a.score)
      .map((score, index, array) => {
        const prevScore = array[index - 1] as RankingInfo;
        let rank = index + 1;
        if (prevScore && prevScore.score === score.score && prevScore.rank) {
          rank = prevScore.rank;
        }
        return { ...score, rank };
      });

    const currentUserRanking = sortedRankings.find((r) => r.userId === userId);

    return {
      currentUser: currentUserRanking || {
        userId,
        nickName: '',
        score: 0,
        rank: null,
        createdAt: new Date(),
      },
      rankings: sortedRankings.slice(0, 100),
      totalParticipants: sortedRankings.length,
    };
  }

  async getOverallRankings(userId: number): Promise<any> {
    const results = await this.quizResultRepository
      .createQueryBuilder('result')
      .select([
        'result.userId',
        'result.overallScore',
        'result.createdAt',
        'user.nickName',
      ])
      .leftJoin('result.user', 'user')
      .orderBy('result.overallScore', 'DESC')
      .addOrderBy('result.createdAt', 'ASC')
      .getMany();

    const uniqueScores = results.reduce((acc, result) => {
      const existing = acc.find((s) => s.userId === result.userId);
      if (!existing || existing.overallScore < result.overallScore) {
        return acc.filter((s) => s.userId !== result.userId).concat(result);
      }
      return acc;
    }, []);

    const sortedRankings: RankingInfo[] = uniqueScores.map(
      (result, index, array) => {
        const prevResult = array[index - 1] as unknown as RankingInfo;
        let rank = index + 1;
        if (
          prevResult &&
          prevResult.score === result.overallScore &&
          prevResult.rank
        ) {
          rank = prevResult.rank;
        }
        return {
          userId: result.userId,
          nickName: (result as any).user?.nickName,
          score: result.overallScore,
          rank,
          createdAt: result.createdAt,
        };
      },
    );

    const currentUserRanking = sortedRankings.find((r) => r.userId === userId);

    return {
      currentUser: currentUserRanking || {
        userId,
        nickName: '',
        score: 0,
        rank: null,
        createdAt: new Date(),
      },
      rankings: sortedRankings.slice(0, 100),
      totalParticipants: sortedRankings.length,
    };
  }

  async getQuizById(id: number): Promise<Quiz> {
    const quiz = await this.quizRepository.findOne({ where: { id } });
    if (!quiz) {
      throw new NotFoundException(`ID가 ${id}인 퀴즈를 찾을 수 없습니다.`);
    }
    return quiz;
  }

  async getQuizResult(quizId: number): Promise<QuizResult> {
    const result = await this.quizResultRepository.findOne({
      where: { quizId },
    });
    if (!result) {
      throw new NotFoundException(
        `ID가 ${quizId}인 퀴즈 결과를 찾을 수 없습니다.`,
      );
    }
    return result;
  }

  async getStudentProgressByEmail(studentEmail: string) {
    const student = await this.userRepository.findOne({
      where: { email: studentEmail, role: Role.STUDENT },
      relations: ['quizResults'],
    });
    if (!student) {
      throw new NotFoundException('학생을 찾을 수 없습니다.');
    }

    return student.quizResults;
  }

  async getStudentBestScoresByEmail(studentEmail: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { email: studentEmail },
    });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    const results = await this.quizResultRepository.find({
      where: { userId: user.id },
    });

    const bestScores = results.reduce((acc, result) => {
      for (const category in result.categoryAnalysis) {
        const score = result.categoryAnalysis[category].score;
        if (!acc[category] || acc[category] < score) {
          acc[category] = score;
        }
      }
      return acc;
    }, {});

    return bestScores;
  }
}
