import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * 自动为查询请求附加 tenantId 过滤
 * 简化业务代码:Service 中只需写 { ...其他条件 },tenantId 自动注入
 */
@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.tenantId;

    if (tenantId) {
      // 标记请求已被租户隔离
      request.tenantScoped = true;
    }

    return next.handle();
  }
}
