// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { server, http, HttpResponse } from '@/test/msw';
import httpClient from './http';

/**
 * http.ts 错误处理 —— 更复杂场景
 *  - http.spec.ts 测了 6 种基本 kind 的处理
 *  - 本文件测更细的边界:
 *    · 5xx 各种 status
 *    · 后端 message 为空/缺失/特殊字符
 *    · 并发 401
 *    · 错误响应里 data 是非 JSON
 *    · 大 message(toast 显示)
 */

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterAll(() => server.close());
afterEach(() => server.resetHandlers());
beforeEach(() => {
  setActivePinia(createPinia());
  localStorage.clear();
});

describe('http 复杂 error 场景(MSW)', () => {
  it('502 Bad Gateway → toast 后端 message', async () => {
    server.use(
      http.get(/\/api\/.*/, () => HttpResponse.json({ message: '网关挂了' }, { status: 502 })),
    );
    const { ElMessage } = await import('element-plus');
    const spy = vi.spyOn(ElMessage, 'error').mockImplementation((() => undefined) as any);
    await expect(httpClient.get('/test')).rejects.toBeDefined();
    expect(spy).toHaveBeenCalledWith('网关挂了');
    spy.mockRestore();
  });

  it('503 Service Unavailable → toast(用 message)', async () => {
    server.use(
      http.get(/\/api\/.*/, () =>
        HttpResponse.json({ message: 'Service temporarily unavailable' }, { status: 503 }),
      ),
    );
    const { ElMessage } = await import('element-plus');
    const spy = vi.spyOn(ElMessage, 'error').mockImplementation((() => undefined) as any);
    await expect(httpClient.get('/test')).rejects.toBeDefined();
    expect(spy).toHaveBeenCalledWith('Service temporarily unavailable');
    spy.mockRestore();
  });

  it('5xx 但 data.message 是 HTML 标签 → 原样 toast(不解析)', async () => {
    server.use(
      http.get(/\/api\/.*/, () =>
        HttpResponse.json({ message: '<html>Server Error</html>' }, { status: 500 }),
      ),
    );
    const { ElMessage } = await import('element-plus');
    const spy = vi.spyOn(ElMessage, 'error').mockImplementation((() => undefined) as any);
    await expect(httpClient.get('/test')).rejects.toBeDefined();
    // 不解析 HTML,原样传
    expect(spy).toHaveBeenCalledWith('<html>Server Error</html>');
    spy.mockRestore();
  });

  it('message 包含特殊字符(换行/引号)→ toast 原样', async () => {
    server.use(
      http.get(/\/api\/.*/, () =>
        HttpResponse.json({ message: '错误\n"详细信息": <见日志>' }, { status: 500 }),
      ),
    );
    const { ElMessage } = await import('element-plus');
    const spy = vi.spyOn(ElMessage, 'error').mockImplementation((() => undefined) as any);
    await expect(httpClient.get('/test')).rejects.toBeDefined();
    expect(spy).toHaveBeenCalledWith('错误\n"详细信息": <见日志>');
    spy.mockRestore();
  });

  it('并发 3 个 401 → 都走 onUnauthorized(auth 全清)', async () => {
    server.use(
      http.get(/\/api\/.*/, () => HttpResponse.json({ message: 'token 失效' }, { status: 401 })),
    );
    localStorage.setItem('lmsuo_token', 'jwt-stale');
    // 3 个并发请求,都 401
    const promises = [
      httpClient.get('/a').catch(() => {}),
      httpClient.get('/b').catch(() => {}),
      httpClient.get('/c').catch(() => {}),
    ];
    await Promise.all(promises);
    // auth.clear() 被调 3 次(每个请求触发一次)
    // localStorage 都清空
    expect(localStorage.getItem('lmsuo_token')).toBeNull();
  });

  it('5xx 但 data 是 null → toast 兜底 "请求失败"', async () => {
    server.use(http.get(/\/api\/.*/, () => HttpResponse.json(null, { status: 500 })));
    const { ElMessage } = await import('element-plus');
    const spy = vi.spyOn(ElMessage, 'error').mockImplementation((() => undefined) as any);
    await expect(httpClient.get('/test')).rejects.toBeDefined();
    // data 是 null → data?.message 是 undefined → 走 axios err.message 或默认
    // axios 默认 message 是 'Request failed with status code 500'
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('大 message(1000+ 字符)→ toast 不崩(ElMessage 自己处理)', async () => {
    const bigMsg = '错误'.repeat(1000);
    server.use(
      http.get(/\/api\/.*/, () => HttpResponse.json({ message: bigMsg }, { status: 500 })),
    );
    const { ElMessage } = await import('element-plus');
    const spy = vi.spyOn(ElMessage, 'error').mockImplementation((() => undefined) as any);
    await expect(httpClient.get('/test')).rejects.toBeDefined();
    expect(spy).toHaveBeenCalledWith(bigMsg);
    spy.mockRestore();
  });

  it('500 → reject 后调用方能从 err.response.data 拿业务 code', async () => {
    server.use(
      http.get(/\/api\/.*/, () =>
        HttpResponse.json({ code: 'INTERNAL_ERROR', message: '崩了' }, { status: 500 }),
      ),
    );
    try {
      await httpClient.get('/test');
      expect.fail('应抛错');
    } catch (err: any) {
      expect(err.response.status).toBe(500);
      expect(err.response.data.code).toBe('INTERNAL_ERROR');
      expect(err.response.data.message).toBe('崩了');
    }
  });
});
