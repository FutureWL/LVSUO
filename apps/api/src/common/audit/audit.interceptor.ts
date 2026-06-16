import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from './audit.service';

/**
 * 自动审计拦截器
 * 用 @Audit() 装饰器标记需要审计的端点
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          this.record(request, 'SUCCESS', start);
        },
        error: () => {
          this.record(request, 'FAILURE', start);
        },
      }),
    );
  }

  private async record(
    request: any,
    result: 'SUCCESS' | 'FAILURE',
    start: number,
  ): Promise<void> {
    if (!request.auditMeta) return;
    const user = request.user;
    if (!user || !user.tid) return;

    await this.audit.record({
      tenantId: user.tid,
      userId: user.sub,
      action: `${request.method} ${request.route?.path || request.url}`,
      resourceType: request.auditMeta.resourceType,
      resourceId: request.auditMeta.resourceId || request.params?.id,
      dataLevel: request.auditMeta.dataLevel,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      input: { body: request.body, params: request.params, query: request.query },
      result,
      traceId: request.headers['x-trace-id'],
    });
  }
}
