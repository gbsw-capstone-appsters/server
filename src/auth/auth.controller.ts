import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  UseGuards,
  ValidationPipe,
  UseInterceptors,
  UploadedFile,
  Param,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthDto, SignupDto } from './dto/auth.dto';
import { User } from './entities/user.entity';
import { GetUser } from 'src/@common/decorators/get-user.decorator';
import { AuthGuard } from '@nestjs/passport';
import { EditProfileDto } from './dto/edit-profile.dto';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '../@common/enums/role.enum';
import { Roles } from '../@common/decorators/roles.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @ApiResponse({
    status: 201,
    description: '성공',
  })
  @ApiResponse({
    status: 500,
    description: '서버 오류',
  })
  @ApiOperation({ summary: '회원가입' })
  @Post('/signup')
  signup(@Body(ValidationPipe) signupDto: SignupDto) {
    return this.authService.signup(signupDto);
  }

  @ApiResponse({
    status: 200,
    description: '성공',
  })
  @ApiResponse({
    status: 401,
    description: '인증 오류',
  })
  @ApiOperation({ summary: '로그인' })
  @Post('/signin')
  signin(@Body(ValidationPipe) authDto: AuthDto) {
    return this.authService.signin(authDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiResponse({
    status: 200,
    description: '성공',
  })
  @ApiResponse({
    status: 403,
    description: '접근 거부',
  })
  @ApiOperation({ summary: 'Refresh Token 발급' })
  @Get('/refresh')
  refresh(@GetUser() user: User) {
    return this.authService.refreshToken(user);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: '프로필 조회' })
  @Get('/me')
  getProfile(@GetUser() user: User) {
    return this.authService.getProfile(user);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiResponse({
    status: 200,
    description: '성공',
  })
  @ApiResponse({
    status: 404,
    description: '사용자를 찾을 수 없음',
  })
  @ApiOperation({ summary: '프로필 수정' })
  @ApiConsumes('multipart/form-data')
  @Patch('/me')
  @UseInterceptors(FileInterceptor('image'))
  editProfile(
    @Body() editProfileDto: EditProfileDto,
    @GetUser() user: User,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.authService.editProfile(editProfileDto, user, image);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiResponse({
    status: 200,
    description: '성공',
  })
  @ApiResponse({
    status: 404,
    description: '서버 오류',
  })
  @ApiOperation({ summary: '로그아웃' })
  @Post('/logout')
  logout(@GetUser() user: User) {
    return this.authService.deleteRefreshToken(user);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiResponse({
    status: 200,
    description: '성공',
  })
  @ApiResponse({
    status: 400,
    description: '요청을 처리하지 못함',
  })
  @ApiOperation({ summary: '계정 삭제' })
  @Delete('/me')
  deleteAccount(@GetUser() user: User) {
    return this.authService.deleteAccount(user);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: '부모님 학생 등록' })
  @Post('parent/child')
  @Roles(Role.PARENT)
  async addChild(
    @GetUser() user: User,
    @Body(ValidationPipe) body: { studentEmail: string },
  ) {
    return this.authService.addChildByEmail(user.email, body.studentEmail);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: '부모님 학생 등록 해제' })
  @Delete('parent/child')
  @Roles(Role.PARENT)
  async removeChild(
    @GetUser() user: User,
    @Body(ValidationPipe) body: { studentEmail: string },
  ) {
    return this.authService.removeChildByEmail(user.email, body.studentEmail);
  }

  @ApiOperation({ summary: '부모님 자신의 학생 목록 조회' })
  @UseGuards(AuthGuard('jwt'))
  @Get('parent/children')
  @Roles(Role.PARENT)
  async getChildren(@GetUser() user: User) {
    return this.authService.getChildrenByEmail(user.email);
  }
}
