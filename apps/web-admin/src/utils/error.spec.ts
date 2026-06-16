import { describe, it, expect } from 'vitest';
import { classifyError } from './error';

/**
 * classifyError 单测 —— C1 引入时留了 TODO,本次接入 vitest 后补上
 *  覆盖矩阵:401/403/404/5xx/400/409/network/未知 status/非对象/兜底 message
 */

describe('classifyError', () => {
  it('401 → unauthorized,保留后端 message/code', () => {
    const r = classifyError({
      response: { status: 401, data: { code: 'AUTH_TOKEN_INVALID', message: 'token 失效' } },
    });
    expect(r.kind).toBe('unauthorized');
    expect(r.status).toBe(401);
    expect(r.code).toBe('AUTH_TOKEN_INVALID');
    expect(r.message).toBe('token 失效');
  });

  it('403 → forbidden(越租户 / 权限不足)', () => {
    const r = classifyError({ response: { status: 403, data: { message: '无权访问' } } });
    expect(r.kind).toBe('forbidden');
  });

  it('404 → not_found,保留业务 code', () => {
    const r = classifyError({
      response: { status: 404, data: { code: 'LEAD_NOT_FOUND', message: '线索不存在' } },
    });
    expect(r.kind).toBe('not_found');
    expect(r.code).toBe('LEAD_NOT_FOUND');
  });

  it('5xx → server(500/502/503/504 全归 server)', () => {
    for (const s of [500, 502, 503, 504]) {
      const r = classifyError({ response: { status: s, data: { message: 'x' } } });
      expect(r.kind).toBe('server');
      expect(r.status).toBe(s);
    }
  });

  it('400 / 409 → other(业务参数错 / 冲突)', () => {
    expect(classifyError({ response: { status: 400, data: { message: '参数错' } } }).kind).toBe(
      'other',
    );
    expect(classifyError({ response: { status: 409, data: { message: '冲突' } } }).kind).toBe(
      'other',
    );
  });

  it('无 response → network(超时 / offline / 后端挂)', () => {
    const r = classifyError({ message: 'Network Error' });
    expect(r.kind).toBe('network');
    expect(r.status).toBeNull();
    expect(r.message).toBe('Network Error');
  });

  it('axios 超时(message 含 timeout)也归 network', () => {
    const r = classifyError({ message: 'timeout of 30000ms exceeded' });
    expect(r.kind).toBe('network');
  });

  it('未知 status → other(防止未识别状态炸页面)', () => {
    const r = classifyError({ response: { status: 418, data: { message: "I'm a teapot" } } });
    expect(r.kind).toBe('other');
    expect(r.status).toBe(418);
  });

  it('完全不是 axios 错误 → other + 默认 message', () => {
    expect(classifyError('boom')).toEqual({ kind: 'other', status: null, message: '请求失败' });
    expect(classifyError(null)).toEqual({ kind: 'other', status: null, message: '请求失败' });
    expect(classifyError(undefined)).toEqual({ kind: 'other', status: null, message: '请求失败' });
  });

  it('message 兜底顺序: 后端 data.message > axios err.message > 默认', () => {
    expect(
      classifyError({ response: { status: 403, data: { message: '后端' } }, message: 'axios' })
        .message,
    ).toBe('后端');
    expect(classifyError({ message: 'axios' }).message).toBe('axios');
    expect(classifyError({}).message).toBe('请求失败');
  });
});
