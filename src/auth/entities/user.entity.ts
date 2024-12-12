import {
  BaseEntity,
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { QuizResult } from '../../quiz/entities/quiz-result.entity';

@Entity()
@Unique(['email'])
export class User extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  loginType: 'email';

  @Column()
  email: string;

  @Column()
  password: string;

  @Column()
  nickName: string;

  @Column()
  age: number;

  @Column({ nullable: true })
  imageUri?: string;

  @Column({ nullable: true })
  hashedRefreshToken?: string;

  @OneToMany(() => QuizResult, (quizResult) => quizResult.user)
  quizResults: QuizResult[];
}
