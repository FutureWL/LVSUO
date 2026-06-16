import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { JwtPayload } from '@lm-unity/shared';

/**
 * 验证请求路径或 body 中的 tenantId 与 JWT payload 中的 tid 一致
 * 配合 Prisma 查询时自动注入 tenantId 过滤
 *
 * 平台角色(PLATFORM_*)享有跨租户访问权限,不受此 guard 限制
 */
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload | undefined;

    if (!user) {
      return true; // 公开接口
    }

    // 平台角色跨租户通行
    if (user.role?.startsWith('PLATFORM_')) {
      request.tenantId = user.tid; // 仍是其所属租户(PLATFORM)
      return true;
    }

    const requestTenantId =
      request.params?.tenantId ||
      request.body?.tenantId ||
      request.query?.tenantId;

    if (requestTenantId && requestTenantId !== user.tid) {
      throw new ForbiddenException('Tenant mismatch: 越租户访问被拒绝');
    }

    request.tenantId = user.tid;
    return true;
  }
}
