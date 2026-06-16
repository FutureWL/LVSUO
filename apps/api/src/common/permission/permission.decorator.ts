import { SetMetadata } from '@nestjs/common';
import { DataLevel } from '@lm-unity/shared';

export const PERMISSION_KEY = 'lmsuo:permission';

export interface RequirePermission {
  action: string; // 'lead:read' | 'matter:write' | ...
  dataLevel?: DataLevel;
}

/**
 * 用法:@RequirePerm({ action: 'matter:write', dataLevel: DataLevel.L4 })
 */
export const RequirePerm = (perm: RequirePermission) => SetMetadata(PERMISSION_KEY, perm);
