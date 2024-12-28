import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity()
export class QuizResult {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  quizId: number;

  @ManyToOne(() => User, (user) => user.quizResults)
  user: User;

  @Column()
  userId: number;

  @Column()
  totalQuestions: number;

  @Column()
  correctAnswers: number;

  @Column('json')
  categoryAnalysis: {
    [key: string]: {
      correct: number;
      total: number;
      score: number;
    };
  };

  @Column('float')
  overallScore: number;

  @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
