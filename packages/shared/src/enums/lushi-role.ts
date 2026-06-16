/**
 * 任务书 12.x 律时数字人 5 角色
 */
export enum LushiRole {
  /** 合规前台 - 面向潜在客户 */
  COMPLIANCE_FRONT = 'COMPLIANCE_FRONT',
  /** 时间秘书 - 面向律师个人 */
  TIME_SECRETARY = 'TIME_SECRETARY',
  /** 客户助理 - 面向已委托客户 */
  CLIENT_ASSISTANT = 'CLIENT_ASSISTANT',
  /** 案件协同秘书 - 面向办案团队 */
  COLLABORATION_SECRETARY = 'COLLABORATION_SECRETARY',
  /** 知识研究助手 - 面向律师专业能力 */
  RESEARCH_ASSISTANT = 'RESEARCH_ASSISTANT',
}

export const LUSHI_ROLE_NAME: Record<LushiRole, string> = {
  [LushiRole.COMPLIANCE_FRONT]: '律时·合规前台',
  [LushiRole.TIME_SECRETARY]: '律时·时间秘书',
  [LushiRole.CLIENT_ASSISTANT]: '律时·客户助理',
  [LushiRole.COLLABORATION_SECRETARY]: '律时·案件协同秘书',
  [LushiRole.RESEARCH_ASSISTANT]: '律时·知识研究助手',
};
