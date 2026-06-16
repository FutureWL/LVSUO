/** 任务书 8.8 报价卡表 fee_quotes */

export const QuoteStatus = {
  DRAFT: 'DRAFT',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  SENT: 'SENT',
  CLIENT_CONFIRMED: 'CLIENT_CONFIRMED',
  REJECTED: 'REJECTED',
} as const;
export type QuoteStatus = (typeof QuoteStatus)[keyof typeof QuoteStatus];

export interface ThirdPartyCostItem {
  category: string;
  amount: number;
  description?: string;
}

export interface FeeQuote {
  id: string;
  tenantId: string;
  leadId?: string;
  clientId?: string;
  matterId?: string;
  productId?: string;
  serviceScope?: string;
  excludedScope?: string;
  lawyerFee?: number;
  thirdPartyCosts?: ThirdPartyCostItem[];
  paymentSchedule?: string;
  additionalFeeConditions?: string;
  riskDisclosureId?: string;
  approvedBy?: string;
  clientConfirmed: boolean;
  status: QuoteStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateQuoteInput {
  tenantId: string;
  leadId?: string;
  clientId?: string;
  matterId?: string;
  productId?: string;
  serviceScope: string;
  excludedScope: string;
  lawyerFee?: number;
  thirdPartyCosts?: ThirdPartyCostItem[];
  paymentSchedule?: string;
  additionalFeeConditions?: string;
}
