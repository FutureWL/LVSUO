/**
 * 审计日志(任务书 13.2)
 * 所有写操作 + AI 调用 + 敏感读操作 留痕
 */
import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditInterceptor } from './audit.interceptor';

@Global()
@Module({
  providers: [AuditService, AuditInterceptor],
  exports: [AuditService, AuditInterceptor],
})
export class AuditModule {}
