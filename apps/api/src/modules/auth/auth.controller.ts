import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsString, IsEmail, IsEnum, IsOptional, MinLength } from 'class-validator';
import { AuthService } from './auth.service';
import { Public } from '../../common/auth/public.decorator';
import { TenantType, DeploymentMode, RoleType } from '@lm-unity/shared';

class RegisterTenantDto {
  @IsString() tenantName!: string;
  @IsEnum(TenantType) tenantType!: TenantType;
  @IsEnum(DeploymentMode) deploymentMode!: DeploymentMode;
  @IsString() adminUsername!: string;
  @IsString() @MinLength(8) adminPassword!: string;
  @IsString() adminRealName!: string;
  @IsOptional() @IsString() adminMobile?: string;
  @IsOptional() @IsEmail() adminEmail?: string;
}

class LoginDto {
  @IsString() tenantId!: string;
  @IsString() username!: string;
  @IsString() password!: string;
}

class RefreshDto {
  @IsString() refreshToken!: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register-tenant')
  @ApiOperation({ summary: '注册租户 + 创建第一个管理员' })
  async registerTenant(@Body() dto: RegisterTenantDto) {
    return this.auth.registerTenant(dto);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: '登录' })
  async login(@Body() dto: LoginDto) {
    return this.auth.login(dto.tenantId, dto.username, dto.password);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: '刷新 token' })
  async refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }
}
