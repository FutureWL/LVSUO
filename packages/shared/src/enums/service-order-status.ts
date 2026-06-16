/** 任务书 6.3 服务产品订单状态机 */
export enum ServiceOrderStatus {
  ORDER_CREATED = 'ORDER_CREATED',
  MATERIAL_PENDING = 'MATERIAL_PENDING',
  LAWYER_ASSIGNED = 'LAWYER_ASSIGNED',
  SERVICE_IN_PROGRESS = 'SERVICE_IN_PROGRESS',
  DELIVERABLE_DRAFTING = 'DELIVERABLE_DRAFTING',
  INTERNAL_REVIEW = 'INTERNAL_REVIEW',
  DELIVERED = 'DELIVERED',
  CLIENT_FEEDBACK_PENDING = 'CLIENT_FEEDBACK_PENDING',
  UPGRADE_RECOMMENDED = 'UPGRADE_RECOMMENDED',
  COMPLETED = 'COMPLETED',
  REFUNDED = 'REFUNDED',
  CANCELLED = 'CANCELLED',
}

export const SERVICE_ORDER_STATUS_NAME: Record<ServiceOrderStatus, string> = {
  [ServiceOrderStatus.ORDER_CREATED]: '订单创建',
  [ServiceOrderStatus.MATERIAL_PENDING]: '待客户提交材料',
  [ServiceOrderStatus.LAWYER_ASSIGNED]: '已分配律师',
  [ServiceOrderStatus.SERVICE_IN_PROGRESS]: '服务中',
  [ServiceOrderStatus.DELIVERABLE_DRAFTING]: '交付物制作中',
  [ServiceOrderStatus.INTERNAL_REVIEW]: '内部审核中',
  [ServiceOrderStatus.DELIVERED]: '已交付',
  [ServiceOrderStatus.CLIENT_FEEDBACK_PENDING]: '待客户反馈',
  [ServiceOrderStatus.UPGRADE_RECOMMENDED]: '建议升级服务',
  [ServiceOrderStatus.COMPLETED]: '完成',
  [ServiceOrderStatus.REFUNDED]: '已退款',
  [ServiceOrderStatus.CANCELLED]: '已取消',
};
