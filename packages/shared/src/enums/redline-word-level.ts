/** 任务书 7.4 红线词分级 */
export enum RedlineWordLevel {
  /** 阻断发布 */
  BLOCKING = 'BLOCKING',
  /** 必须合伙人审核 */
  HIGH_RISK = 'HIGH_RISK',
  /** 提示修改 */
  WARNING = 'WARNING',
  /** 特定上下文允许 */
  ALLOW_WITH_CONTEXT = 'ALLOW_WITH_CONTEXT',
}
