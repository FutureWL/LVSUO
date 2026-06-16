import { KnowledgeCardType } from '../enums/index.js';

export type CardVisibility = 'FIRM' | 'TEAM' | 'PERSONAL' | 'PUBLIC';

export interface KnowledgeCard {
  id: string;
  tenantId: string;
  sourceMatterId?: string;
  title: string;
  cardType: KnowledgeCardType;
  practiceArea?: string;
  issueTags?: string;
  content: string;
  riskNotes?: string;
  reusableTemplates?: string;
  visibility: CardVisibility;
  desensitized: boolean;
  reviewStatus: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedBy?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
