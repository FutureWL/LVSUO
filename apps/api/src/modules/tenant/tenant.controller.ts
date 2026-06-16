import { Controller, Get, Param, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TenantService } from './tenant.service';
import { RequirePerm } from '../../common/permission/permission.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { JwtPayload } from '@lm-unity/shared';

@ApiTags('tenant')
@ApiBearerAuth()
@Controller('tenants')
export class TenantController {
  constructor(private readonly tenant: TenantService) {}

  @Get(':id')
  @RequirePerm({ action: 'tenant:read' })
  @ApiOperation({ summary: '查询租户详情' })
  async one(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    // 平台角色可以查任何租户
    if (user.role?.startsWith('PLATFORM_')) {
      return this.tenant.findOne(id);
    }
    // 非平台用户只能查自己租户
    if (id !== user.tid) {
      throw new ForbiddenException('越租户访问:只能查询所属租户');
    }
    return this.tenant.findOne(id);
  }
}
