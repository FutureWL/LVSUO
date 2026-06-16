/** 任务书 9.4 服务产品(对应 8.7 legal_service_products) */

export type ProductType =
  | 'P0' // 免费法律信息产品
  | 'P1' // 低价结构化诊断产品
  | 'P2' // 标准文书产品
  | 'P3' // 流程辅导产品
  | 'P4' // 单节点代理产品
  | 'P5' // 完整代理产品
  | 'P6' // 企业订阅 / 常年顾问产品
  | 'P7'; // 专项法律项目产品

export type PriceType = 'FIXED' | 'HOURLY' | 'RANGE' | 'CUSTOM';

export interface ServiceProduct {
  id: string;
  tenantId: string;
  productName: string;
  productType: ProductType;
  applicableScenarios?: string;
  excludedScenarios?: string;
  serviceScope?: string;
  excludedScope?: string;
  deliverables?: string;
  requiredMaterials?: string;
  priceType?: PriceType;
  basePrice?: number;
  deliveryDays?: number;
  requiresLawyer: boolean;
  requiresPartnerApproval: boolean;
  riskDisclosureTemplateId?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'DRAFT';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateServiceProductInput {
  tenantId: string;
  productName: string;
  productType: ProductType;
  applicableScenarios?: string;
  excludedScenarios?: string;
  serviceScope?: string;
  excludedScope?: string;
  deliverables?: string;
  requiredMaterials?: string;
  priceType?: PriceType;
  basePrice?: number;
  deliveryDays?: number;
  requiresLawyer?: boolean;
  requiresPartnerApproval?: boolean;
}
