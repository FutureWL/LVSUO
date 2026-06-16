/** 任务书 8.9 客户表 clients */

export type ClientType = 'INDIVIDUAL' | 'ENTERPRISE';
export type ClientStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
export type ClientRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Client {
  id: string;
  tenantId: string;
  clientName: string;
  clientType: ClientType;
  creditCode?: string;
  industry?: string;
  contactName?: string;
  contactMobile?: string;
  contactEmail?: string;
  riskLevel: ClientRiskLevel;
  healthScore: number;
  status: ClientStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateClientInput {
  tenantId: string;
  clientName: string;
  clientType: ClientType;
  creditCode?: string;
  industry?: string;
  contactName?: string;
  contactMobile?: string;
  contactEmail?: string;
}
