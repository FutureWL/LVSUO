/** 任务书 6.3 / 15.3 工时状态 */
export enum TimeEntryStatus {
  RUNNING = 'RUNNING',
  DRAFT = 'DRAFT',
  PENDING_CONFIRMATION = 'PENDING_CONFIRMATION',
  CONFIRMED = 'CONFIRMED',
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  BILLED = 'BILLED',
  WRITTEN_OFF = 'WRITTEN_OFF',
  NON_BILLABLE = 'NON_BILLABLE',
}

export const TIME_ENTRY_STATUS_NAME: Record<TimeEntryStatus, string> = {
  [TimeEntryStatus.RUNNING]: '计时中',
  [TimeEntryStatus.DRAFT]: '草稿',
  [TimeEntryStatus.PENDING_CONFIRMATION]: '待确认',
  [TimeEntryStatus.CONFIRMED]: '律师已确认',
  [TimeEntryStatus.PENDING_REVIEW]: '待主办律师审核',
  [TimeEntryStatus.APPROVED]: '已审核',
  [TimeEntryStatus.BILLED]: '已计费',
  [TimeEntryStatus.WRITTEN_OFF]: '已核销',
  [TimeEntryStatus.NON_BILLABLE]: '不计费',
};
