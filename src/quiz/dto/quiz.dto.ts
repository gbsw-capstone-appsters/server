import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class SubmitAnswerDto {
  @ApiProperty({ description: '문제 ID' })
  @IsNotEmpty()
  questionId: number;

  @ApiProperty({ description: '답변' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  answer: string;
}
