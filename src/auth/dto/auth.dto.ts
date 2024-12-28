import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../@common/enums/role.enum';
import {
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class AuthDto {
  @ApiProperty({ description: '이메일' })
  @IsString()
  @MinLength(6)
  @MaxLength(50)
  @IsNotEmpty()
  @Matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, {
    message: '이메일 형식이 아닙니다.',
  })
  email: string;

  @ApiProperty({ description: '비밀번호' })
  @IsString()
  @MinLength(8)
  @MaxLength(20)
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9\W_]*$/, {
    message: '비밀번호가 영어 또는 숫자, 특수문자 조합이 아닙니다.',
  })
  password: string;
}

export class SignupDto extends AuthDto {
  @ApiProperty({ description: '닉네임' })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  @IsNotEmpty()
  nickName: string;

  @ApiProperty({ description: '나이' })
  @IsNotEmpty()
  age: number;

  @ApiProperty({ description: '역할', enum: Role, required: false })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}
