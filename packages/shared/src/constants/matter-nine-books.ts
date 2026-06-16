/**
 * 任务书 14.2 案件九本账
 * 每个正式案件必须围绕这 9 本账组织
 */
export const MATTER_NINE_BOOKS = [
  { code: 'CLIENT', name: '客户账', description: '客户基本信息与关系' },
  { code: 'SUBJECT', name: '主体账', description: '当事方与对方主体' },
  { code: 'FACT', name: '事实账', description: '案件事实重构' },
  { code: 'EVIDENCE', name: '证据账', description: '证据清单与证明力' },
  { code: 'CLAIM', name: '请求账', description: '诉请 / 仲裁请求' },
  { code: 'LAW', name: '法律账', description: '法律关系与适用法条' },
  { code: 'STRATEGY', name: '策略账', description: '攻防策略与节奏' },
  { code: 'TASK', name: '任务账', description: '任务拆解与责任' },
  { code: 'EXPERIENCE', name: '经验账', description: '复盘与知识沉淀' },
] as const;

export type MatterNineBookCode = (typeof MATTER_NINE_BOOKS)[number]['code'];
