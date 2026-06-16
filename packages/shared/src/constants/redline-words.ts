/**
 * 任务书 7.4 红线词库
 * 推广内容审查的硬约束
 */
import { RedlineWordLevel } from '../enums/redline-word-level.js';

export interface RedlineWord {
  word: string;
  level: RedlineWordLevel;
  reason: string;
}

export const REDLINE_WORDS: RedlineWord[] = [
  // BLOCKING - 阻断发布
  { word: '包赢', level: RedlineWordLevel.BLOCKING, reason: '承诺办案结果' },
  { word: '保证胜诉', level: RedlineWordLevel.BLOCKING, reason: '承诺办案结果' },
  { word: '100%追回', level: RedlineWordLevel.BLOCKING, reason: '承诺结果' },
  { word: '一定胜诉', level: RedlineWordLevel.BLOCKING, reason: '承诺办案结果' },
  { word: '法院有人', level: RedlineWordLevel.BLOCKING, reason: '暗示司法关系' },
  { word: '内部关系', level: RedlineWordLevel.BLOCKING, reason: '暗示司法关系' },
  { word: '马上冻结', level: RedlineWordLevel.BLOCKING, reason: '承诺程序结果' },
  { word: '不用开庭', level: RedlineWordLevel.BLOCKING, reason: '虚假陈述' },
  { word: '不成功不收费', level: RedlineWordLevel.BLOCKING, reason: '违规收费' },
  { word: '最低价', level: RedlineWordLevel.BLOCKING, reason: '低价诱导' },
  { word: '零风险', level: RedlineWordLevel.BLOCKING, reason: '虚假承诺' },
  { word: '包退费', level: RedlineWordLevel.BLOCKING, reason: '违规承诺' },
  { word: '保证赔偿', level: RedlineWordLevel.BLOCKING, reason: '承诺办案结果' },
  { word: '保证执行', level: RedlineWordLevel.BLOCKING, reason: '承诺执行结果' },
  { word: '专业维权包', level: RedlineWordLevel.BLOCKING, reason: '虚假宣传' },
  { word: '快速回款', level: RedlineWordLevel.BLOCKING, reason: '承诺回款结果' },
];

/** 按级别分组 */
export function getRedlineWordsByLevel(level: RedlineWordLevel): RedlineWord[] {
  return REDLINE_WORDS.filter((w) => w.level === level);
}
