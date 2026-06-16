import { SetMetadata } from '@nestjs/common';
import { DataLevel } from '@lm-unity/shared';

export const AUDIT_META = 'lmsuo:audit';

export interface AuditMeta {
  resourceType: string;
  resourceId?: string;
  dataLevel?: DataLevel;
}

/**
 * 用法:@Audit({ resourceType: 'matter', dataLevel: DataLevel.L4 })
 */
export const Audit = (meta: AuditMeta) => (target: any, key?: any, descriptor?: any) => {
  SetMetadata(AUDIT_META, meta)(target, key, descriptor);
};
