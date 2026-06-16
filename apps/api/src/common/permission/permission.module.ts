/**
 * 7 维权限模型(任务书 5.1)的实现
 * RBAC + ABAC + TenantScope + MatterScope + DataLevel + StageGate + ApprovalFlow
 */
import { Module, Global } from '@nestjs/common';
import { PermissionGuard } from './permission.guard';
import { PermissionService } from './permission.service';

@Global()
@Module({
  providers: [PermissionGuard, PermissionService],
  exports: [PermissionGuard, PermissionService],
})
export class PermissionModule {}
