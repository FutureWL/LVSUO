import { MarketingContentStatus } from '../enums/index.js';

export type MarketingContentType =
  | 'SHORT_VIDEO_SCRIPT'
  | 'LIVE_SCRIPT'
  | 'ARTICLE'
  | 'LANDING_PAGE'
  | 'FEED_AD'
  | 'SEARCH_AD'
  | 'PRIVATE_MESSAGE_AUTO_REPLY'
  | 'CLIENT_GUIDE_PAGE'
  | 'LAWYER_CARD_PAGE'
  | 'PRODUCT_PAGE';

export interface AiRiskResult {
  redlineWords: string[];
  detectedRisks: string[];
  riskScore: number; // 0-100
  blocked: boolean;
  reason?: string;
}

export interface MarketingContent {
  id: string;
  tenantId: string;
  accountId?: string;
  contentType: MarketingContentType;
  title: string;
  contentText: string;
  mediaFileId?: string;
  aiRiskResult?: AiRiskResult;
  reviewStatus: MarketingContentStatus;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'BLOCKING';
  publishedUrl?: string;
  publishedAt?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
