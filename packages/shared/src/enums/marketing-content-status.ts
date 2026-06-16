/** 任务书 6.1 推广内容状态机 */
export enum MarketingContentStatus {
  DRAFT = 'DRAFT',
  AI_RISK_CHECK = 'AI_RISK_CHECK',
  OPERATION_REVIEW = 'OPERATION_REVIEW',
  LAWYER_REVIEW = 'LAWYER_REVIEW',
  PARTNER_REVIEW = 'PARTNER_REVIEW',
  APPROVED = 'APPROVED',
  PUBLISHED = 'PUBLISHED',
  TAKEDOWN = 'TAKEDOWN',
  RECTIFICATION_REQUIRED = 'RECTIFICATION_REQUIRED',
  ARCHIVED = 'ARCHIVED',
  BLOCKED = 'BLOCKED',
}

export const MARKETING_CONTENT_STATUS_NAME: Record<MarketingContentStatus, string> = {
  [MarketingContentStatus.DRAFT]: '草稿',
  [MarketingContentStatus.AI_RISK_CHECK]: 'AI 风险初审',
  [MarketingContentStatus.OPERATION_REVIEW]: '运营自检',
  [MarketingContentStatus.LAWYER_REVIEW]: '律师专业审查',
  [MarketingContentStatus.PARTNER_REVIEW]: '合伙人/风控审查',
  [MarketingContentStatus.APPROVED]: '审核通过',
  [MarketingContentStatus.PUBLISHED]: '已发布',
  [MarketingContentStatus.TAKEDOWN]: '已下架',
  [MarketingContentStatus.RECTIFICATION_REQUIRED]: '需整改',
  [MarketingContentStatus.ARCHIVED]: '已归档',
  [MarketingContentStatus.BLOCKED]: '已阻断',
};
