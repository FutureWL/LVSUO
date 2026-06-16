import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiProperty,
  ApiPropertyOptional,
  ApiQuery,
} from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsIn, MinLength } from 'class-validator';
import { PlatformTenantService, CreateTenantInput } from './platform-tenant.service';
import { TenantType, DeploymentMode, ErrorCode } from '@lm-unity/shared';
import { RequirePerm } from '../../common/permission/permission.decorator';
import { Audit } from '../../common/audit/audit.decorator';

class CreateTenantDto implements CreateTenantInput {
  @ApiProperty({ description: '租户名称' })
  @IsString() tenantName!: string;
  @ApiProperty({ enum: TenantType })
  @IsEnum(TenantType) tenantType!: TenantType;
  @ApiProperty({ enum: DeploymentMode })
  @IsEnum(DeploymentMode) deploymentMode!: DeploymentMode;
  @ApiProperty() @IsString() adminUsername!: string;
  @ApiProperty({ minLength: 8 }) @IsString() @MinLength(8) adminPassword!: string;
  @ApiProperty() @IsString() adminRealName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() adminMobile?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() adminEmail?: string;
}

class UpdateStatusDto {
  @ApiProperty({ enum: ['ACTIVE', 'SUSPENDED', 'TRIAL', 'DELETED'] })
  @IsIn(['ACTIVE', 'SUSPENDED', 'TRIAL', 'DELETED'])
  status!: 'ACTIVE' | 'SUSPENDED' | 'TRIAL' | 'DELETED';
}

@ApiTags('platform')
@ApiBearerAuth()
@Controller('platform')
export class PlatformTenantController {
  constructor(private readonly platform: PlatformTenantService) {}

  @Get('tenants')
  @RequirePerm({ action: 'platform:tenant:list' })
  @ApiOperation({ summary: '[平台] 列出所有租户' })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'pageSize', required: false, example: '20' })
  @ApiQuery({ name: 'search', required: false, description: '按租户名模糊搜索' })
  @ApiResponse({ status: 200, description: 'PageResponse<Tenant>', schema: { example: { items: [], total: 0, page: 1, pageSize: 20 } } })
  @ApiResponse({ status: 403, description: ErrorCode.FORBIDDEN })
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
  @ApiResponse({ status: 201, description: 'Tenant' })
  @ApiResponse({ status: 400, description: '参数错误' })
  @ApiResponse({ status: 409, description: ErrorCode.TENANT_DUPLICATE_NAME })
  async createTenant(@Body() dto: CreateTenantDto) {
    return this.platform.create(dto);
  }

  @Patch('tenants/:id/status')
  @RequirePerm({ action: 'platform:tenant:update' })
  @Audit({ resourceType: 'tenant' })
  @ApiOperation({ summary: '[平台] 修改租户状态' })
  @ApiParam({ name: 'id', description: '租户 ID' })
  @ApiResponse({ status: 200, description: 'Tenant' })
  @ApiResponse({ status: 404, description: ErrorCode.TENANT_NOT_FOUND })
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.platform.updateStatus(id, dto.status);
  }

  @Get('stats')
  @RequirePerm({ action: 'platform:stats' })
  @ApiOperation({ summary: '[平台] 跨租户统计' })
  @ApiResponse({ status: 200, schema: {
      example: { totalTenants: 0, activeTenants: 0, totalUsers: 0, totalLeads: 0, totalMatters: 0, totalKnowledgeCards: 0, byType: {} },
    } })
  async stats() {
    return this.platform.getStats();
  }
}
