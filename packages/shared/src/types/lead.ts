import { LeadStatus, ClientSentiment } from '../enums/index.js';

export type ClientType = 'INDIVIDUAL' | 'ENTERPRISE';
export type UrgencyLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Lead {
  id: string;
  tenantId: string;
  sourceChannel: string;
  sourceAccountId?: string;
  clientName: string;
  contactMobile?: string;
  contactEmail?: string;
  legalIssueType?: string;
  urgencyLevel: UrgencyLevel;
  emotionalState: ClientSentiment;
  intakeStatus: LeadStatus;
  assignedLawyerId?: string;
  recommendedProductId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLeadInput {
  tenantId: string;
  sourceChannel: string;
  clientName: string;
  contactMobile?: string;
  contactEmail?: string;
  legalIssueType?: string;
  urgencyLevel?: UrgencyLevel;
}
