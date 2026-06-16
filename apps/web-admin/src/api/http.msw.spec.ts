// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { server, http, HttpResponse } from '@/test/msw';
import httpClient from './http';

/**
 * http.ts 集成测试(MSW 真实网络模拟)
 *  - http.get / http.page 真实走 axios → node http → MSW 拦截
 *  - 验证 handleResponseError 真实链路(不只是 mock 函数)
 *  - 验证 successCb 真实解包 res.data
 *
 * 与 http.spec.ts(单元,纯函数 mock)互补:
 *  - 本文件走真实网络,确认拦截器真实生效
 *  - 单元文件只验 handleResponseError 的逻辑分支
 */

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterAll(() => server.close());
afterEach(() => server.resetHandlers());
beforeEach(() => {
  setActivePinia(createPinia());
  localStorage.clear();
});

describe('http 集成(MSW 真实网络)', () => {
  it('200 + 业务对象 → http.get 拿到的就是业务对象(无 .data 包装)', async () => {
    server.use(
      http.get(/\/api\/leads/, () =>
        HttpResponse.json({ items: [{ id: '1', clientName: '张三' }], total: 1 }),
      ),
    );
    const res = await httpClient.get<{ items: any[]; total: number }>('/leads');
    expect(res.items[0].clientName).toBe('张三');
    expect(res).not.toHaveProperty('data'); // successCb 解包过
  });

  it('500 + 后端 message → toast 拿 message + reject', async () => {
    server.use(
      http.get(/\/api\/leads/, () =>
        HttpResponse.json({ message: '服务开了小差' }, { status: 500 }),
      ),
    );
    const { ElMessage } = await import('element-plus');
    const spy = vi.spyOn(ElMessage, 'error').mockImplementation((() => undefined) as any);
    await expect(httpClient.get('/leads')).rejects.toBeDefined();
    expect(spy).toHaveBeenCalledWith('服务开了小差');
    spy.mockRestore();
  });

  it('404 + 业务 code → reject 后 err.response.data.code 拿得到', async () => {
    server.use(
      http.get(/\/api\/leads\/x/, () =>
        HttpResponse.json({ code: 'LEAD_NOT_FOUND', message: '线索不存在' }, { status: 404 }),
      ),
    );
    try {
      await httpClient.get('/leads/x');
      expect.fail('应抛错');
    } catch (err: any) {
      expect(err.response.data.code).toBe('LEAD_NOT_FOUND');
    }
  });

  it('401 → useAuthStore.clear() + localStorage 清空 + 不 toast', async () => {
    localStorage.setItem('lmsuo_token', 'jwt');
    localStorage.setItem(
      'lmsuo_user',
      JSON.stringify({ id: 'u1', username: 'a', realName: 'A', role: 'R', tenantId: 't' }),
    );
    server.use(
      http.get(/\/api\/leads/, () => HttpResponse.json({ message: 'token 失效' }, { status: 401 })),
    );
    const { ElMessage } = await import('element-plus');
    const spy = vi.spyOn(ElMessage, 'error').mockImplementation((() => undefined) as any);
    await expect(httpClient.get('/leads')).rejects.toBeDefined();
    // 401 触发 auth.clear() → localStorage 删 token + user
    expect(localStorage.getItem('lmsuo_token')).toBeNull();
    expect(localStorage.getItem('lmsuo_user')).toBeNull();
    // 不 toast
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('http.page 把 params 拼到 URL query string', async () => {
    let capturedUrl = '';
    server.use(
      http.get(/\/api\/leads/, ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({ items: [], total: 0, page: 1, pageSize: 20 });
      }),
    );
    await httpClient.page('/leads', { page: 2, pageSize: 50, keyword: '张三' });
    // MSW 收到完整 URL,验证 query string 正确拼接
    const url = new URL(capturedUrl);
    expect(url.searchParams.get('page')).toBe('2');
    expect(url.searchParams.get('pageSize')).toBe('50');
    expect(url.searchParams.get('keyword')).toBe('张三');
  });
});
