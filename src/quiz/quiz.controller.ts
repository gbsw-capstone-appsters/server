import { Controller, Get, Param, Post, Body, UseGuards } from '@nestjs/common';
import { QuizService } from './quiz.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SubmitAnswerDto } from './dto/quiz.dto';
import { GetUser } from 'src/@common/decorators/get-user.decorator';
import { User } from 'src/auth/entities/user.entity';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../@common/decorators/roles.decorator';
import { Role } from '../@common/enums/role.enum';

@ApiTags('Quiz')
@Controller('quiz')
@UseGuards(AuthGuard('jwt'))
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @ApiOperation({ summary: '퀴즈 생성 및 시작' })
  @ApiResponse({ status: 200, description: '성공' })
  @Post('start')
  async startQuiz(@GetUser() user: User, @Body('category') category: string) {
    return this.quizService.generateQuiz(user.id, category);
  }

  @ApiOperation({ summary: '카테고리별 랭킹 조회' })
  @ApiResponse({ status: 200, description: '성공' })
  @Get('rankings/category/:category')
  async getCategoryRankings(
    @Param('category') category: string,
    @GetUser() user: User,
  ) {
    return this.quizService.getCategoryRankings(category, user.id);
  }

  @ApiOperation({ summary: '전체 랭킹 조회' })
  @ApiResponse({ status: 200, description: '성공' })
  @Get('rankings/overall')
  async getOverallRankings(@GetUser() user: User) {
    return this.quizService.getOverallRankings(user.id);
  }

  @ApiOperation({ summary: '특정 퀴즈 조회' })
  @ApiResponse({ status: 200, description: '성공' })
  @Get(':id')
  async getQuiz(@Param('id') id: number) {
    return this.quizService.getQuizById(id);
  }

  @ApiOperation({ summary: '퀴즈 답안 제출' })
  @ApiResponse({ status: 200, description: '성공' })
  @Post(':id/submit')
  async submitAnswer(
    @Param('id') quizId: number,
    @Body() body: SubmitAnswerDto,
  ) {
    return this.quizService.submitAnswer(quizId, body.questionId, body.answer);
  }

  @ApiOperation({ summary: '퀴즈 결과 조회' })
  @ApiResponse({ status: 200, description: '성공' })
  @Get(':id/result')
  async getQuizResult(@Param('id') quizId: number) {
    return this.quizService.getQuizResult(quizId);
  }

  @ApiOperation({ summary: '학생 학습 진행 상황 조회' })
  @ApiResponse({ status: 200, description: '성공' })
  @Get('student/progress')
  @Roles(Role.PARENT)
  async getStudentProgress(@Body('studentEmail') studentEmail: string) {
    return this.quizService.getStudentProgressByEmail(studentEmail);
  }

  @ApiOperation({ summary: '학생 각 카테고리별 최고 점수 조회' })
  @ApiResponse({ status: 200, description: '성공' })
  @Get('student/best-scores')
  async getStudentBestScores(@GetUser() user: User) {
    return this.quizService.getStudentBestScoresByEmail(user.email);
  }
}
