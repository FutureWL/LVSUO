import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionService } from './permission.service';
import { JwtPayload, DataLevel } from '@lm-unity/shared';
import { PERMISSION_KEY, RequirePermission } from './permission.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionService: PermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<RequirePermission>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload | undefined;
    if (!user) {
      throw new ForbiddenException('Unauthorized');
    }

    // 7 维权限校验
    const resource = request.params?.matterId
      ? { type: 'matter' as const, id: request.params.matterId }
      : request.params?.leadId
        ? { type: 'lead' as const, id: request.params.leadId }
        : undefined;

    const result = await this.permissionService.check({
      user,
      action: required.action,
      resource: resource?.id,
      resourceType: resource?.type,
      dataLevel: required.dataLevel as DataLevel,
      // 后续可注入 StageGate / ABAC 属性
    });

    if (!result.allowed) {
      throw new ForbiddenException({
        code: 'PERMISSION_DENIED',
        message: result.reason || '权限不足',
        required: required.action,
      });
    }

    return true;
  }
}
