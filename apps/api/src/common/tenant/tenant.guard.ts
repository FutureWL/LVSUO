import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { JwtPayload } from '@lm-unity/shared';

/**
 * 验证请求路径或 body 中的 tenantId 与 JWT payload 中的 tid 一致
 * 配合 Prisma 查询时自动注入 tenantId 过滤
 */
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload | undefined;

    if (!user) {
      // 公开接口由 JwtAuthGuard 之前放行
      return true;
    }

    const requestTenantId =
      request.params?.tenantId ||
      request.body?.tenantId ||
      request.query?.tenantId;

    if (requestTenantId && requestTenantId !== user.tid) {
      throw new ForbiddenException('Tenant mismatch: 越租户访问被拒绝');
    }

    // 注入 tenantId 到 request,供后续使用
    request.tenantId = user.tid;
    return true;
  }
}
