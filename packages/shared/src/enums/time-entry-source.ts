/** 任务书 15.2 工时来源 */
export enum TimeEntrySource {
  LUSHI_VOICE = 'LUSHI_VOICE', // 律时语音
  MANUAL = 'MANUAL', // 手动录入
  CALENDAR_SYNC = 'CALENDAR_SYNC', // 日程同步
  MEETING = 'MEETING', // 会议记录
  DOCUMENT_EDIT = 'DOCUMENT_EDIT', // 文档编辑
  TASK_COMPLETE = 'TASK_COMPLETE', // 任务完成
  CLIENT_COMMUNICATION = 'CLIENT_COMMUNICATION', // 客户沟通
  PHONE = 'PHONE', // 电话记录
}
