/**
 * HTTP 错误分类 —— 把 axios 异常归一为前端可消费的类别
 *
 *  401 → 登录失效(需要清 token + 跳登录)
 *  403 → 无权限(业务操作被拒,如越租户、权限不足)
 *  404 → 资源不存在
 *  5xx → 服务端异常
 *  no response → 网络异常(offline / 超时 / 后端挂)
 *  other → 其它(参数错 400 / 冲突 409 等)
 */
export type ErrorKind = 'unauthorized' | 'forbidden' | 'not_found' | 'server' | 'network' | 'other';

export interface ClassifiedError {
  kind: ErrorKind;
  status: number | null;
  /** 后端业务 code(若有) */
  code?: string;
  /** 人类可读 message,优先用后端 message */
  message: string;
}

const KIND_BY_STATUS: Record<number, ErrorKind> = {
  400: 'other',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not_found',
  409: 'other',
  500: 'server',
  502: 'server',
  503: 'server',
  504: 'server',
};

export function classifyError(err: unknown): ClassifiedError {
  // axios 错误的形态
  if (typeof err === 'object' && err !== null) {
    const e = err as {
      response?: { status?: number; data?: { message?: string; code?: string } };
      message?: string;
    };
    const status = typeof e.response?.status === 'number' ? e.response.status : null;
    const data = e.response?.data;
    const message = data?.message || e.message || '请求失败';

    if (status === null) {
      // 没有 response —— 网络层错误(timeout / offline / CORS / 后端挂)
      return { kind: 'network', status: null, code: data?.code, message };
    }
    return {
      kind: KIND_BY_STATUS[status] ?? 'other',
      status,
      code: data?.code,
      message,
    };
  }
  return { kind: 'other', status: null, message: '请求失败' };
}

// TODO: web-admin 接入 vitest 后,补 classifyError 单测
//  当前分支覆盖矩阵:401/403/404/5xx/400/409/network/未知status/非对象
