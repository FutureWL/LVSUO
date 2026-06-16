/**
 * 任务书 2.1 系统必须内置的 10 条底线
 */
export const COMPLIANCE_RED_LINES = [
  '律师事务所 / 律师是法律服务交付主体',
  '运营人员、客服人员、法律服务支持企业不得作法律判断',
  '不得承诺办案结果',
  '不得宣示胜诉率、赔偿额、回款率',
  '不得明示或暗示与司法机关、行政机关、仲裁机构有特殊关系',
  '不得低价诱导后续不透明加价',
  '不得以案件结果、律师费、回款额向第三方分成',
  '不得将客户隐私、商业秘密和案件敏感信息外泄',
  'AI 不得替代律师作出最终法律意见',
  '客户侧数字人不得自动回答实质法律判断问题',
] as const;

/** 红线强度分类(用于系统处理策略) */
export const RED_LINE_STRENGTH = {
  HARD: 'HARD', // 硬红线 - 任何情况都禁止
  STRONG: 'STRONG', // 强红线 - 默认禁止,需特批
  SOFT: 'SOFT', // 软红线 - 提示修改
} as const;
export type RedLineStrength = (typeof RED_LINE_STRENGTH)[keyof typeof RED_LINE_STRENGTH];
