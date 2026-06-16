export type MarketingPlatform =
  | 'WECHAT_MP'
  | 'WECHAT_VIDEO'
  | 'DOUYIN'
  | 'KUAISHOU'
  | 'XIAOHONGSHU'
  | 'ZHIHU'
  | 'BAIDU'
  | 'WEIBO'
  | 'WEBSITE'
  | 'OTHER';

export type OwnerType = 'FIRM' | 'LAWYER' | 'TEAM' | 'THIRD_PARTY';

export interface MarketingAccount {
  id: string;
  tenantId: string;
  platform: MarketingPlatform;
  accountName: string;
  accountId: string;
  ownerType: OwnerType;
  ownerUserId?: string;
  responsibleLawyerId?: string;
  operatedByThirdParty: boolean;
  thirdPartyName?: string;
  filingStatus: 'FILED' | 'UNFILED' | 'PENDING';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'ACTIVE' | 'SUSPENDED' | 'DISABLED';
  createdAt: Date;
  updatedAt: Date;
}
