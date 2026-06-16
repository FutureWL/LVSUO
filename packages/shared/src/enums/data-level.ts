/**
 * 任务书 5.2 数据密级 6 级
 * L6 是合规与 AI 工程的关键边界
 */
export enum DataLevel {
  /** 公开内容 */
  L1_PUBLIC = 'L1_PUBLIC',
  /** 律所内部 */
  L2_FIRM_INTERNAL = 'L2_FIRM_INTERNAL',
  /** 案件团队 */
  L3_MATTER_TEAM = 'L3_MATTER_TEAM',
  /** 客户秘密 */
  L4_CLIENT_CONFIDENTIAL = 'L4_CLIENT_CONFIDENTIAL',
  /** 高敏案件 */
  L5_HIGHLY_CONFIDENTIAL = 'L5_HIGHLY_CONFIDENTIAL',
  /** 限制 AI 处理 */
  L6_AI_RESTRICTED = 'L6_AI_RESTRICTED',
}

/** 数据密级中文名 */
export const DATA_LEVEL_NAME: Record<DataLevel, string> = {
  [DataLevel.L1_PUBLIC]: '公开内容',
  [DataLevel.L2_FIRM_INTERNAL]: '律所内部',
  [DataLevel.L3_MATTER_TEAM]: '案件团队',
  [DataLevel.L4_CLIENT_CONFIDENTIAL]: '客户秘密',
  [DataLevel.L5_HIGHLY_CONFIDENTIAL]: '高敏案件',
  [DataLevel.L6_AI_RESTRICTED]: '限制 AI 处理',
};

/** 数据密级数字(用于比较) */
export const DATA_LEVEL_RANK: Record<DataLevel, number> = {
  [DataLevel.L1_PUBLIC]: 1,
  [DataLevel.L2_FIRM_INTERNAL]: 2,
  [DataLevel.L3_MATTER_TEAM]: 3,
  [DataLevel.L4_CLIENT_CONFIDENTIAL]: 4,
  [DataLevel.L5_HIGHLY_CONFIDENTIAL]: 5,
  [DataLevel.L6_AI_RESTRICTED]: 6,
};

/** AI 是否可处理 */
export function aiProcessable(level: DataLevel): boolean {
  return level !== DataLevel.L6_AI_RESTRICTED;
}
