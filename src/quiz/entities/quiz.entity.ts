import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Quiz {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column('text')
  passage: string;

  @Column('json')
  questions: Array<{
    id: number;
    type: string;
    question: string;
    options: string[];
    correctAnswer: string;
    category: string;
  }>;

  @Column('json', { nullable: true })
  answers: Array<{
    questionId: number;
    userAnswer: string;
    isCorrect: boolean;
    category: string;
  }>;

  @Column()
  totalQuestions: number;

  @Column()
  currentQuestion: number;

  @Column()
  status: 'in_progress' | 'completed';
}
