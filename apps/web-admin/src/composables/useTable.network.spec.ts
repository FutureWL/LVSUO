// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { server, http, HttpResponse } from '@/test/msw';
import { useTable } from './useTable';

/**
 * useTable + http 集成测试(MSW 真实网络)
 *  - useTable 走 http.page 真实走 axios → MSW 拦截
 *  - 验证完整链路: composable → http.page → axios → MSW → response → items/total
 *
 * 与 useTable.spec.ts(单元,vi.mock @/api/http)互补:
 *  - 单元测 http.page 调用 pattern
 *  - 本文件测实际网络返回的解析逻辑
 */

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterAll(() => server.close());
afterEach(() => server.resetHandlers());
beforeEach(() => setActivePinia(createPinia()));

describe('useTable + http 集成(MSW)', () => {
  it('load() 拿到 MSW 返回的 items + total', async () => {
    server.use(
      http.get(/\/api\/leads/, () =>
        HttpResponse.json({
          items: [
            { id: '1', clientName: '张三' },
            { id: '2', clientName: '李四' },
          ],
          total: 2,
          page: 1,
          pageSize: 20,
        }),
      ),
    );
    const t = useTable<{ id: string; clientName: string }>({ url: '/leads' });
    await t.load();
    expect(t.items.value).toHaveLength(2);
    const items = t.items.value;
    expect(items[0]?.clientName).toBe('张三');
    expect(t.total.value).toBe(2);
    expect(t.empty.value).toBe(false);
  });

  it('load() 拿到 200 + 空 → empty=true', async () => {
    server.use(
      http.get(/\/api\/leads/, () =>
        HttpResponse.json({ items: [], total: 0, page: 1, pageSize: 20 }),
      ),
    );
    const t = useTable({ url: '/leads' });
    await t.load();
    expect(t.items.value).toEqual([]);
    expect(t.total.value).toBe(0);
    expect(t.empty.value).toBe(true);
  });

  it('load() 401 → reject + 走 onUnauthorized(由 http 拦截器处理)', async () => {
    server.use(
      http.get(/\/api\/leads/, () => HttpResponse.json({ message: 'token 失效' }, { status: 401 })),
    );
    const t = useTable({ url: '/leads' });
    await expect(t.load()).rejects.toBeDefined();
    // loading 应回 false(try/finally)
    expect(t.loading.value).toBe(false);
  });

  it('load() 500 → reject + loading 仍回 false', async () => {
    server.use(
      http.get(/\/api\/leads/, () => HttpResponse.json({ message: 'boom' }, { status: 500 })),
    );
    const t = useTable({ url: '/leads' });
    await expect(t.load()).rejects.toBeDefined();
    expect(t.loading.value).toBe(false);
  });

  it('resetAndLoad(连 extras) 真正发到 MSW', async () => {
    let capturedUrl = '';
    server.use(
      http.get(/\/api\/leads/, ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({ items: [], total: 0, page: 1, pageSize: 20 });
      }),
    );
    const t = useTable({ url: '/leads' });
    t.page.value = 5; // 任意 page
    await t.resetAndLoad({ keyword: '张三', status: 'NEW_LEAD' });
    const url = new URL(capturedUrl);
    // page 回到 1
    expect(url.searchParams.get('page')).toBe('1');
    expect(url.searchParams.get('keyword')).toBe('张三');
    expect(url.searchParams.get('status')).toBe('NEW_LEAD');
  });

  it('extras 中空字符串/null 被剔除(query string 不出现)', async () => {
    // 这是 useTable 的逻辑: 在 http.page 之前过滤
    let capturedUrl = '';
    server.use(
      http.get(/\/api\/leads/, ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({ items: [], total: 0, page: 1, pageSize: 20 });
      }),
    );
    const t = useTable({ url: '/leads' });
    await t.load({ keyword: '', status: null, urgency: undefined, from: '2026-01-01' });
    const url = new URL(capturedUrl);
    expect(url.searchParams.has('keyword')).toBe(false);
    expect(url.searchParams.has('status')).toBe(false);
    expect(url.searchParams.has('urgency')).toBe(false);
    expect(url.searchParams.get('from')).toBe('2026-01-01');
  });
});
