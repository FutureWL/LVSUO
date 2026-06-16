import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { UserService } from './user.service';
import { RequirePerm } from '../../common/permission/permission.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { ErrorCode, type JwtPayload } from '@lm-unity/shared';

@ApiTags('user')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(private readonly user: UserService) {}

  @Get()
  @RequirePerm({ action: 'user:read' })
  @ApiOperation({ summary: '查询租户下所有用户' })
  @ApiResponse({ status: 200, description: 'User[]', schema: { example: [{ id: 'u1', username: 'admin', realName: '管理员', role: 'FIRM_ADMIN', tenantId: 't1' }] } })
  @ApiResponse({ status: 403, description: ErrorCode.FORBIDDEN })
  async list(@CurrentUser() current: JwtPayload) {
    return this.user.findByTenant(current.tid);
  }

  @Get(':id')
  @RequirePerm({ action: 'user:read' })
  @ApiOperation({ summary: '查询单个用户' })
  @ApiParam({ name: 'id', description: '用户 ID' })
  @ApiResponse({ status: 200, description: 'User', schema: { example: { id: 'u1', username: 'admin', realName: '管理员', role: 'FIRM_ADMIN', tenantId: 't1' } } })
  @ApiResponse({ status: 404, description: ErrorCode.USER_NOT_FOUND })
  async one(@CurrentUser() current: JwtPayload, @Param('id') id: string) {
    return this.user.findOne(current.tid, id);
  }
}
