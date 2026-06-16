import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { IsString, IsEmail, IsEnum, IsOptional, MinLength } from 'class-validator';
import { AuthService } from './auth.service';
import { Public } from '../../common/auth/public.decorator';
import { TenantType, DeploymentMode, ErrorCode } from '@lm-unity/shared';

class RegisterTenantDto {
  @ApiProperty({ description: '租户名称' })
  @IsString() tenantName!: string;
  @ApiProperty({ enum: TenantType, description: '租户类型' })
  @IsEnum(TenantType) tenantType!: TenantType;
  @ApiProperty({ enum: DeploymentMode, description: '部署模式' })
  @IsEnum(DeploymentMode) deploymentMode!: DeploymentMode;
  @ApiProperty({ description: '管理员用户名' })
  @IsString() adminUsername!: string;
  @ApiProperty({ minLength: 8, description: '管理员密码(至少 8 位)' })
  @IsString() @MinLength(8) adminPassword!: string;
  @ApiProperty({ description: '管理员真实姓名' })
  @IsString() adminRealName!: string;
  @ApiPropertyOptional({ description: '管理员手机号' })
  @IsOptional() @IsString() adminMobile?: string;
  @ApiPropertyOptional({ description: '管理员邮箱' })
  @IsOptional() @IsEmail() adminEmail?: string;
}

class LoginDto {
  @ApiProperty({ description: '租户 ID' })
  @IsString() tenantId!: string;
  @ApiProperty() @IsString() username!: string;
  @ApiProperty({ format: 'password' }) @IsString() password!: string;
}

class RefreshDto {
  @ApiProperty() @IsString() refreshToken!: string;
}

class LoginResponseDto {
  @ApiProperty() accessToken!: string;
  @ApiProperty() refreshToken!: string;
  @ApiProperty({ description: '当前登录用户信息' }) user!: any;
}

class RefreshResponseDto {
  @ApiProperty() accessToken!: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register-tenant')
  @ApiOperation({ summary: '注册租户 + 创建第一个管理员' })
  @ApiResponse({ status: 201, description: '租户注册成功' })
  @ApiResponse({ status: 400, description: '参数错误' })
  @ApiResponse({ status: 409, description: ErrorCode.TENANT_DUPLICATE_NAME, schema: { example: { code: 'TENANT_DUPLICATE_NAME', message: '租户名称已存在' } } })
  async registerTenant(@Body() dto: RegisterTenantDto) {
    return this.auth.registerTenant(dto);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: '登录' })
  @ApiResponse({ status: 201, type: LoginResponseDto, description: '登录成功,返回 access/refresh token + user' })
  @ApiResponse({ status: 401, description: ErrorCode.AUTH_INVALID_CREDENTIALS })
  async login(@Body() dto: LoginDto) {
    return this.auth.login(dto.tenantId, dto.username, dto.password);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: '刷新 access token' })
  @ApiResponse({ status: 201, type: RefreshResponseDto })
  @ApiResponse({ status: 401, description: ErrorCode.AUTH_TOKEN_INVALID })
  async refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }
}
