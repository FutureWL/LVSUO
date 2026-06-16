/**
 * 多租户隔离(任务书 3.2)
 * 4 级数据隔离: TenantID + FirmID + WorkspaceID + UserID
 *
 * TenantGuard 验证请求中的 tenantId 与 JWT 中 tid 一致
 */
import { Module, Global } from '@nestjs/common';
import { TenantGuard } from './tenant.guard';
import { TenantInterceptor } from './tenant.interceptor';

@Global()
@Module({
  providers: [TenantGuard, TenantInterceptor],
  exports: [TenantGuard, TenantInterceptor],
})
export class TenantModule {}
