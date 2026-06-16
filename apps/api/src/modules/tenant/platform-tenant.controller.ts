import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsIn, MinLength } from 'class-validator';
import { PlatformTenantService, CreateTenantInput } from './platform-tenant.service';
import { TenantType, DeploymentMode, RoleType } from '@lm-unity/shared';
import { RequirePerm } from '../../common/permission/permission.decorator';
import { Audit } from '../../common/audit/audit.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { JwtPayload } from '@lm-unity/shared';

class CreateTenantDto implements CreateTenantInput {
  @IsString() tenantName!: string;
  @IsEnum(TenantType) tenantType!: TenantType;
  @IsEnum(DeploymentMode) deploymentMode!: DeploymentMode;
  @IsString() adminUsername!: string;
  @IsString() @MinLength(8) adminPassword!: string;
  @IsString() adminRealName!: string;
  @IsOptional() @IsString() adminMobile?: string;
  @IsOptional() @IsString() adminEmail?: string;
}

class UpdateStatusDto {
  @IsIn(['ACTIVE', 'SUSPENDED', 'TRIAL', 'DELETED'])
  status!: 'ACTIVE' | 'SUSPENDED' | 'TRIAL' | 'DELETED';
}

@ApiTags('platform')
@ApiBearerAuth()
@Controller('platform')
export class PlatformTenantController {
  constructor(private readonly platform: PlatformTenantService) {}

  /**
   * 平台超管专属:列出租户
   * 权限: PLATFORM_SUPER_ADMIN / PLATFORM_OPERATOR / PLATFORM_COMPLIANCE
   */
  @Get('tenants')
  @RequirePerm({ action: 'platform:tenant:list' })
  @ApiOperation({ summary: '[平台] 列出所有租户' })
  async listTenants(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('search') search?: string,
  ) {
    return this.platform.listAll(Number(page), Number(pageSize), search);
  }

  @Post('tenants')
  @RequirePerm({ action: 'platform:tenant:create' })
  @Audit({ resourceType: 'tenant' })
  @ApiOperation({ summary: '[平台] 创建新租户 + 第一个管理员' })
  async createTenant(@Body() dto: CreateTenantDto) {
    return this.platform.create(dto);
  }

  @Patch('tenants/:id/status')
  @RequirePerm({ action: 'platform:tenant:update' })
  @Audit({ resourceType: 'tenant' })
  @ApiOperation({ summary: '[平台] 修改租户状态(暂停/恢复/注销)' })
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.platform.updateStatus(id, dto.status);
  }

  @Get('stats')
  @RequirePerm({ action: 'platform:stats' })
  @ApiOperation({ summary: '[平台] 跨租户统计' })
  async stats() {
    return this.platform.getStats();
  }
}
