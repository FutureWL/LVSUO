// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  resolveBaseURL,
  resolveBaseURLFromEnv,
  injectAuthHeader,
  handleResponseError,
} from './http';

/**
 * http.ts 单测 —— 抽出的 3 个纯函数
 *  - resolveBaseURL: VITE_API_BASE / BASE_URL+'/api' / '/api' 优先级
 *  - injectAuthHeader: token 有则设 Bearer,空则不设
 *  - handleResponseError: 401 调 onUnauthorized(不 toast),其他调 showError
 *
 * 注:实际 axios 实例的拦截器注册是简单胶水,不值得专门测
 *  真要测就 vi.mock axios,过度,不做
 */

describe('resolveBaseURLFromEnv(纯函数,env 参数化)', () => {
  it('VITE_API_BASE 显式设置 → 直接用,忽略 BASE_URL', () => {
    expect(resolveBaseURLFromEnv({ VITE_API_BASE: 'https://api.example.com', BASE_URL: '/' })).toBe(
      'https://api.example.com',
    );
  });

  it('无 VITE_API_BASE,BASE_URL=/ → /api', () => {
    expect(resolveBaseURLFromEnv({ BASE_URL: '/' })).toBe('/api');
  });

  it('无 VITE_API_BASE,BASE_URL=/lvsuo/ → /lvsuo/api(剥尾斜杠)', () => {
    expect(resolveBaseURLFromEnv({ BASE_URL: '/lvsuo/' })).toBe('/lvsuo/api');
  });

  it('无 VITE_API_BASE,BASE_URL 多尾斜杠 → 只剥一次', () => {
    expect(resolveBaseURLFromEnv({ BASE_URL: '/app///' })).toBe('/app/api');
  });

  it('BASE_URL 空字符串 → /api(兜底)', () => {
    expect(resolveBaseURLFromEnv({ BASE_URL: '' })).toBe('/api');
  });

  it('空 env → /api(默认)', () => {
    expect(resolveBaseURLFromEnv({})).toBe('/api');
  });
});

describe('resolveBaseURL(读 import.meta.env,实际行为)', () => {
  it('默认行为:返回非空字符串(由 import.meta.env 决定)', () => {
    // import.meta.env 在 test 环境 BASE_URL=/,所以结果是 /api
    expect(resolveBaseURL()).toBe('/api');
  });
});

describe('injectAuthHeader', () => {
  function makeConfig() {
    return { headers: { set: vi.fn() } } as any;
  }

  it('token 有值 → 设 Authorization: Bearer xxx', () => {
    const config = makeConfig();
    injectAuthHeader(config, 'jwt-abc');
    expect(config.headers.set).toHaveBeenCalledWith('Authorization', 'Bearer jwt-abc');
  });

  it('token 为 null → 不调用 set', () => {
    const config = makeConfig();
    injectAuthHeader(config, null);
    expect(config.headers.set).not.toHaveBeenCalled();
  });

  it('token 为 undefined → 不调用 set', () => {
    const config = makeConfig();
    injectAuthHeader(config, undefined as any);
    expect(config.headers.set).not.toHaveBeenCalled();
  });

  it('token 为空字符串 → 不调用 set(空值视为未登录)', () => {
    const config = makeConfig();
    injectAuthHeader(config, '');
    expect(config.headers.set).not.toHaveBeenCalled();
  });

  it('返回 config(便于链式)', () => {
    const config = makeConfig();
    expect(injectAuthHeader(config, 'jwt')).toBe(config);
  });
});

describe('handleResponseError', () => {
  let onUnauthorized: ReturnType<typeof vi.fn>;
  let showError: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    onUnauthorized = vi.fn();
    showError = vi.fn();
  });

  it('401 → 调 onUnauthorized,不调 showError(不 toast)', async () => {
    const err = { response: { status: 401, data: { message: 'token 失效' } } };
    await expect(handleResponseError(err, { onUnauthorized, showError })).rejects.toBe(err);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(showError).not.toHaveBeenCalled();
  });

  it('403 → 调 showError,带后端 message', async () => {
    const err = { response: { status: 403, data: { message: '无权访问' } } };
    await expect(handleResponseError(err, { onUnauthorized, showError })).rejects.toBe(err);
    expect(showError).toHaveBeenCalledWith('无权访问');
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('404 → toast 后端 message', async () => {
    const err = {
      response: { status: 404, data: { code: 'LEAD_NOT_FOUND', message: '线索不存在' } },
    };
    await expect(handleResponseError(err, { onUnauthorized, showError })).rejects.toBe(err);
    expect(showError).toHaveBeenCalledWith('线索不存在');
  });

  it('5xx → toast 后端 message', async () => {
    const err = { response: { status: 500, data: { message: 'Internal Error' } } };
    await expect(handleResponseError(err, { onUnauthorized, showError })).rejects.toBe(err);
    expect(showError).toHaveBeenCalledWith('Internal Error');
  });

  it('网络错误(无 response)→ toast message', async () => {
    const err = { message: 'Network Error' };
    await expect(handleResponseError(err, { onUnauthorized, showError })).rejects.toBe(err);
    expect(showError).toHaveBeenCalledWith('Network Error');
  });

  it('返回 rejected promise(不 throw,让调用方 catch)', async () => {
    const err = { response: { status: 500, data: { message: 'x' } } };
    const p = handleResponseError(err, { onUnauthorized, showError });
    // 验证是 Promise 且 rejected
    await expect(p).rejects.toBe(err);
  });

  it('总是 reject 原 err(不包装新对象),便于调用方拿到 status/code', async () => {
    const err = { response: { status: 404, data: { code: 'X', message: 'y' } } };
    await expect(handleResponseError(err, { onUnauthorized, showError })).rejects.toBe(err);
  });
});
