import {
  BaseEntity,
  Column,
  Entity,
  OneToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { QuizResult } from '../../quiz/entities/quiz-result.entity';
import { Role } from '../../@common/enums/role.enum';

@Entity()
@Unique(['email'])
export class User extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: 'email' })
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

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.STUDENT,
  })
  role: Role;

  @OneToMany(() => QuizResult, (quizResult) => quizResult.user)
  quizResults: QuizResult[];

  @ManyToOne(() => User, (user) => user.children)
  parent: User;

  @OneToMany(() => User, (user) => user.parent)
  children: User[];
}
