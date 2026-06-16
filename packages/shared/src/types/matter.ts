import { MatterStatus, DataLevel } from '../enums/index.js';

export type BillingType = 'HOURLY' | 'FIXED' | 'CONTINGENT' | 'RETAINER' | 'HYBRID';

export interface Matter {
  id: string;
  tenantId: string;
  clientId: string;
  matterNo: string; // UNIQUE
  matterTitle: string;
  matterType?: string; // 案由
  disputeAmount?: number;
  status: MatterStatus;
  confidentialityLevel: DataLevel;
  responsiblePartnerId?: string;
  leadLawyerId?: string;
  billingType: BillingType;
  budgetAmount?: number;
  openedAt?: Date;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMatterInput {
  tenantId: string;
  clientId: string;
  matterTitle: string;
  matterType?: string;
  disputeAmount?: number;
  confidentialityLevel?: DataLevel;
  responsiblePartnerId?: string;
  leadLawyerId?: string;
  billingType: BillingType;
  budgetAmount?: number;
}
