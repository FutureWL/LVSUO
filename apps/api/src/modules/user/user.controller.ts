import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserService } from './user.service';
import { RequirePerm } from '../../common/permission/permission.decorator';
import { Audit } from '../../common/audit/audit.decorator';
import { RoleType } from '@lm-unity/shared';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { JwtPayload } from '@lm-unity/shared';

@ApiTags('user')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(private readonly user: UserService) {}

  @Get()
  @RequirePerm({ action: 'user:read' })
  @ApiOperation({ summary: '查询租户下所有用户' })
  async list(@CurrentUser() current: JwtPayload) {
    return this.user.findByTenant(current.tid);
  }

  @Get(':id')
  @RequirePerm({ action: 'user:read' })
  @ApiOperation({ summary: '查询单个用户' })
  async one(@CurrentUser() current: JwtPayload, @Param('id') id: string) {
    return this.user.findOne(current.tid, id);
  }
}
