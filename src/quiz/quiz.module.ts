import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuizController } from './quiz.controller';
import { QuizService } from './quiz.service';
import { Quiz } from './entities/quiz.entity';
import { QuizResult } from './entities/quiz-result.entity';
import { User } from 'src/auth/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Quiz, QuizResult, User])],
  controllers: [QuizController],
  providers: [QuizService],
})
export class QuizModule {}
