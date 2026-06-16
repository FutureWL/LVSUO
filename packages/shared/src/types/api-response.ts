/**
 * 统一 API 响应结构
 * 见 9.x 接口约定的错误响应
 */
export interface ApiResponse<T = unknown> {
  code: string;
  message: string;
  data?: T;
  dataLevel?: 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6';
  traceId?: string;
  timestamp?: string;
}

/** 分页请求 */
export interface PageRequest {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/** 分页响应 */
export interface PageResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** 错误码
 * 命名规则: <领域>_<场景>_, 全部大写蛇形
 * 新增时请按领域分组,避免重复
 */
export const ErrorCode = {
  // ============ 通用 ============
  SUCCESS: 'SUCCESS',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  INVALID_PARAMS: 'INVALID_PARAMS',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',

  // ============ 鉴权 (AUTH) ============
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_USER_DISABLED: 'AUTH_USER_DISABLED',

  // ============ 用户 (USER) ============
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_DUPLICATE: 'USER_DUPLICATE',

  // ============ 租户 (TENANT) ============
  TENANT_NOT_FOUND: 'TENANT_NOT_FOUND',
  TENANT_DUPLICATE_NAME: 'TENANT_DUPLICATE_NAME',

  // ============ 线索 (LEAD) ============
  LEAD_NOT_FOUND: 'LEAD_NOT_FOUND',
  LEAD_INVALID_STATUS: 'LEAD_INVALID_STATUS',

  // ============ 案件 (MATTER) ============
  MATTER_NOT_FOUND: 'MATTER_NOT_FOUND',
  MATTER_INVALID_STATUS: 'MATTER_INVALID_STATUS',
  MATTER_QUOTE_NOT_CONFIRMED: 'MATTER_QUOTE_NOT_CONFIRMED',
  MATTER_QUOTE_NO_CLIENT: 'MATTER_QUOTE_NO_CLIENT',

  // ============ 报价 (QUOTE) ============
  QUOTE_NOT_FOUND: 'QUOTE_NOT_FOUND',
  QUOTE_INVALID_STATUS: 'QUOTE_INVALID_STATUS',
  QUOTE_NOT_SENT: 'QUOTE_NOT_SENT',
  QUOTE_SCOPE_EMPTY: 'QUOTE_SCOPE_EMPTY',
  QUOTE_EXCLUDED_EMPTY: 'QUOTE_EXCLUDED_EMPTY',
  QUOTE_THIRD_PARTY_NOT_EXPLAINED: 'QUOTE_THIRD_PARTY_NOT_EXPLAINED',
  QUOTE_CONTAINS_SUCCESS_PROMISE: 'QUOTE_CONTAINS_SUCCESS_PROMISE',
  RISK_DISCLOSURE_NOT_CONFIRMED: 'RISK_DISCLOSURE_NOT_CONFIRMED',

  // ============ 服务产品 (PRODUCT) ============
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',

  // ============ 客户 (CLIENT) ============
  CLIENT_NOT_FOUND: 'CLIENT_NOT_FOUND',

  // ============ 会话 (CONVERSATION) ============
  CONVERSATION_NOT_FOUND: 'CONVERSATION_NOT_FOUND',

  // ============ 营销内容 (CONTENT) ============
  CONTENT_BLOCKED: 'CONTENT_BLOCKED',
  CONTENT_CONTAINS_RESULT_PROMISE: 'CONTENT_CONTAINS_RESULT_PROMISE',
  CONTENT_CONTAINS_WIN_RATE: 'CONTENT_CONTAINS_WIN_RATE',
  CONTENT_CONTAINS_JUDICIAL_HINT: 'CONTENT_CONTAINS_JUDICIAL_HINT',

  // ============ L6 AI 限制 ============
  L6_AI_RESTRICTED: 'L6_AI_RESTRICTED',
} as const;
export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];
