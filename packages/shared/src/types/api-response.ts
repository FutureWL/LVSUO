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

/** 错误码 */
export const ErrorCode = {
  // 通用
  SUCCESS: 'SUCCESS',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  INVALID_PARAMS: 'INVALID_PARAMS',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',

  // 业务
  QUOTE_SCOPE_EMPTY: 'QUOTE_SCOPE_EMPTY',
  QUOTE_EXCLUDED_EMPTY: 'QUOTE_EXCLUDED_EMPTY',
  QUOTE_THIRD_PARTY_NOT_EXPLAINED: 'QUOTE_THIRD_PARTY_NOT_EXPLAINED',
  RISK_DISCLOSURE_NOT_CONFIRMED: 'RISK_DISCLOSURE_NOT_CONFIRMED',
  QUOTE_CONTAINS_SUCCESS_PROMISE: 'QUOTE_CONTAINS_SUCCESS_PROMISE',

  CONTENT_BLOCKED: 'CONTENT_BLOCKED',
  CONTENT_CONTAINS_RESULT_PROMISE: 'CONTENT_CONTAINS_RESULT_PROMISE',
  CONTENT_CONTAINS_WIN_RATE: 'CONTENT_CONTAINS_WIN_RATE',
  CONTENT_CONTAINS_JUDICIAL_HINT: 'CONTENT_CONTAINS_JUDICIAL_HINT',

  // L6 AI 限制
  L6_AI_RESTRICTED: 'L6_AI_RESTRICTED',
} as const;
export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];
