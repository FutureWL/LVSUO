/**
 * 任务书 4.x 33 角色代码
 * RBAC 的基础数据
 */
export enum RoleType {
  // ============ 4.1 平台级(4) ============
  PLATFORM_SUPER_ADMIN = 'PLATFORM_SUPER_ADMIN',
  PLATFORM_OPERATOR = 'PLATFORM_OPERATOR',
  PLATFORM_COMPLIANCE = 'PLATFORM_COMPLIANCE',
  PLATFORM_TECH_SUPPORT = 'PLATFORM_TECH_SUPPORT',

  // ============ 4.2 律所组织级(10) ============
  FIRM_ADMIN = 'FIRM_ADMIN',
  MANAGING_PARTNER = 'MANAGING_PARTNER',
  RISK_PARTNER = 'RISK_PARTNER',
  MARKETING_DIRECTOR = 'MARKETING_DIRECTOR',
  CLIENT_SUCCESS_MANAGER = 'CLIENT_SUCCESS_MANAGER',
  KNOWLEDGE_MANAGER = 'KNOWLEDGE_MANAGER',
  FINANCE_OFFICER = 'FINANCE_OFFICER',
  OPERATION_USER = 'OPERATION_USER',
  QUALITY_REVIEWER = 'QUALITY_REVIEWER',

  // ============ 4.3 律师业务级(8) ============
  RESPONSIBLE_PARTNER = 'RESPONSIBLE_PARTNER',
  LEAD_LAWYER = 'LEAD_LAWYER',
  ASSOCIATE_LAWYER = 'ASSOCIATE_LAWYER',
  LEGAL_ASSISTANT = 'LEGAL_ASSISTANT',
  INTERN = 'INTERN',
  SOLO_LAWYER = 'SOLO_LAWYER',
  EXTERNAL_LAWYER = 'EXTERNAL_LAWYER',
  EXPERT_ADVISOR = 'EXPERT_ADVISOR',

  // ============ 4.4 客户侧(7) ============
  CLIENT_OWNER = 'CLIENT_OWNER',
  CLIENT_CONTACT = 'CLIENT_CONTACT',
  CLIENT_LEGAL = 'CLIENT_LEGAL',
  CLIENT_FINANCE = 'CLIENT_FINANCE',
  CLIENT_DECISION_MAKER = 'CLIENT_DECISION_MAKER',
  INDIVIDUAL_CLIENT = 'INDIVIDUAL_CLIENT',

  // ============ 4.5 支持型企业(4) ============
  SUPPORT_ORG_ADMIN = 'SUPPORT_ORG_ADMIN',
  SUPPORT_OPERATOR = 'SUPPORT_OPERATOR',
  SUPPORT_QA = 'SUPPORT_QA',
  SUPPORT_DATA_ANALYST = 'SUPPORT_DATA_ANALYST',
}

/** 角色中文名(4.x) */
export const ROLE_NAME_MAP: Record<RoleType, string> = {
  // 平台
  [RoleType.PLATFORM_SUPER_ADMIN]: '平台超级管理员',
  [RoleType.PLATFORM_OPERATOR]: '平台运营人员',
  [RoleType.PLATFORM_COMPLIANCE]: '平台合规审核人员',
  [RoleType.PLATFORM_TECH_SUPPORT]: '技术支持',

  // 律所
  [RoleType.FIRM_ADMIN]: '律所管理员',
  [RoleType.MANAGING_PARTNER]: '管理合伙人',
  [RoleType.RISK_PARTNER]: '风控合伙人',
  [RoleType.MARKETING_DIRECTOR]: '市场负责人',
  [RoleType.CLIENT_SUCCESS_MANAGER]: '客户成功经理',
  [RoleType.KNOWLEDGE_MANAGER]: '知识管理员',
  [RoleType.FINANCE_OFFICER]: '财务人员',
  [RoleType.OPERATION_USER]: '运营人员',
  [RoleType.QUALITY_REVIEWER]: '质检人员',

  // 律师
  [RoleType.RESPONSIBLE_PARTNER]: '负责合伙人',
  [RoleType.LEAD_LAWYER]: '主办律师',
  [RoleType.ASSOCIATE_LAWYER]: '协办律师',
  [RoleType.LEGAL_ASSISTANT]: '律师助理',
  [RoleType.INTERN]: '实习生',
  [RoleType.SOLO_LAWYER]: '独立律师',
  [RoleType.EXTERNAL_LAWYER]: '外部协作律师',
  [RoleType.EXPERT_ADVISOR]: '外部专家',

  // 客户
  [RoleType.CLIENT_OWNER]: '客户主联系人',
  [RoleType.CLIENT_CONTACT]: '客户联系人',
  [RoleType.CLIENT_LEGAL]: '客户法务',
  [RoleType.CLIENT_FINANCE]: '客户财务',
  [RoleType.CLIENT_DECISION_MAKER]: '客户决策人',
  [RoleType.INDIVIDUAL_CLIENT]: '个人客户',

  // 支持企业
  [RoleType.SUPPORT_ORG_ADMIN]: '支持企业管理员',
  [RoleType.SUPPORT_OPERATOR]: '支持企业运营人员',
  [RoleType.SUPPORT_QA]: '支持企业质检人员',
  [RoleType.SUPPORT_DATA_ANALYST]: '支持企业数据分析人员',
};

/** 角色分类(用于批量权限处理) */
export const ROLE_CATEGORY = {
  PLATFORM: 'PLATFORM',
  FIRM: 'FIRM',
  LAWYER: 'LAWYER',
  CLIENT: 'CLIENT',
  SUPPORT: 'SUPPORT',
} as const;
export type RoleCategory = (typeof ROLE_CATEGORY)[keyof typeof ROLE_CATEGORY];
