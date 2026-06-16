import { TenantType, DeploymentMode } from '../enums/index.js';

export interface Tenant {
  id: string;
  tenantName: string;
  tenantType: TenantType;
  deploymentMode: DeploymentMode;
  status: 'ACTIVE' | 'SUSPENDED' | 'TRIAL' | 'DELETED';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTenantInput {
  tenantName: string;
  tenantType: TenantType;
  deploymentMode: DeploymentMode;
}
