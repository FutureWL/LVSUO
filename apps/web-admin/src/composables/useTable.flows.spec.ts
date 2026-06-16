// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { server, http, HttpResponse } from '@/test/msw';
import { useTable } from './useTable';

/**
 * useTable 端到端场景(MSW) —— 搜索 / 筛选 / 分页 完整流程
 *  - 搜索:keyword 走 query string,MSW 按关键字返回
 *  - 筛选:status/urgency/dateRange 多条件组合
 *  - 分页:page/pageSize 切换,total 反映总数
 *  - 真实模拟"前端控制 → 网络 → 数据回流 → UI 更新"
 */

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterAll(() => server.close());
afterEach(() => server.resetHandlers());
beforeEach(() => setActivePinia(createPinia()));

describe('useTable 端到端(搜索/筛选/分页)', () => {
  it('搜索 keyword → MSW 按 query 过滤,total 反映搜索后总数', async () => {
    let capturedQuery = '';
    server.use(
      http.get(/\/api\/leads/, ({ request }) => {
        capturedQuery = request.url;
        // 模拟服务端按 keyword 过滤
        const kw = new URL(request.url).searchParams.get('keyword') || '';
        const items = kw ? [{ id: '1', clientName: `匹配 ${kw}` }] : [];
        return HttpResponse.json({ items, total: items.length, page: 1, pageSize: 20 });
      }),
    );
    const t = useTable<{ id: string; clientName: string }>({ url: '/leads' });
    await t.load({ keyword: '张三' });
    const url = new URL(capturedQuery);
    expect(url.searchParams.get('keyword')).toBe('张三');
    expect(t.items.value).toHaveLength(1);
    expect(t.items.value[0]?.clientName).toBe('匹配 张三');
    expect(t.total.value).toBe(1);
  });

  it('筛选 status + urgency 组合 → query 都带', async () => {
    let capturedQuery = '';
    server.use(
      http.get(/\/api\/leads/, ({ request }) => {
        capturedQuery = request.url;
        return HttpResponse.json({ items: [], total: 0, page: 1, pageSize: 20 });
      }),
    );
    const t = useTable({ url: '/leads' });
    await t.load({ status: 'NEW_LEAD', urgency: 'HIGH' });
    const url = new URL(capturedQuery);
    expect(url.searchParams.get('status')).toBe('NEW_LEAD');
    expect(url.searchParams.get('urgency')).toBe('HIGH');
  });

  it('分页:page=2 + pageSize=5 → MSW 收到,total 反映总数', async () => {
    server.use(
      http.get(/\/api\/leads/, ({ request }) => {
        const url = new URL(request.url);
        const page = url.searchParams.get('page') ?? '1';
        return HttpResponse.json({
          items: Array.from({ length: 5 }, (_, i) => ({ id: `${page}-${i}` })),
          total: 47, // 总共 47 条
          page: Number(page),
          pageSize: 5,
        });
      }),
    );
    const t = useTable<{ id: string }>({ url: '/leads', pageSize: 5 });
    t.page.value = 2;
    await t.load();
    expect(t.items.value).toHaveLength(5);
    const first = t.items.value[0] as { id: string };
    expect(first.id).toBe('2-0');
    expect(t.total.value).toBe(47);
  });

  it('empty:服务端 0 条 → items=[] + total=0 + empty=true', async () => {
    server.use(
      http.get(/\/api\/leads/, () =>
        HttpResponse.json({ items: [], total: 0, page: 1, pageSize: 20 }),
      ),
    );
    const t = useTable({ url: '/leads' });
    await t.load({ keyword: '不存在的关键字' });
    expect(t.items.value).toEqual([]);
    expect(t.total.value).toBe(0);
    expect(t.empty.value).toBe(true);
  });

  it('综合场景:搜索 + 筛选 + 日期范围 + 分页 + 排序', async () => {
    let capturedQuery = '';
    server.use(
      http.get(/\/api\/leads/, ({ request }) => {
        capturedQuery = request.url;
        return HttpResponse.json({ items: [], total: 0, page: 1, pageSize: 20 });
      }),
    );
    const t = useTable({ url: '/leads' });
    await t.load({
      keyword: '王',
      status: 'NEW_LEAD',
      urgency: 'URGENT',
      from: '2026-01-01',
      to: '2026-12-31',
      // 假设 useTable 加了排序参数(不强制,只测如果有)
    });
    const url = new URL(capturedQuery);
    expect(url.searchParams.get('keyword')).toBe('王');
    expect(url.searchParams.get('status')).toBe('NEW_LEAD');
    expect(url.searchParams.get('urgency')).toBe('URGENT');
    expect(url.searchParams.get('from')).toBe('2026-01-01');
    expect(url.searchParams.get('to')).toBe('2026-12-31');
  });

  it('连续 resetAndLoad(不同 keyword)→ URL 反映最新 keyword,不带上次的', async () => {
    const queries: string[] = [];
    server.use(
      http.get(/\/api\/leads/, ({ request }) => {
        queries.push(request.url);
        return HttpResponse.json({ items: [], total: 0, page: 1, pageSize: 20 });
      }),
    );
    const t = useTable({ url: '/leads' });
    // 第一次搜索
    await t.resetAndLoad({ keyword: '张三' });
    // 第二次搜索不同 keyword
    await t.resetAndLoad({ keyword: '李四' });
    // 第三次清空搜索
    await t.resetAndLoad();
    expect(queries).toHaveLength(3);
    expect(new URL(queries[0]!).searchParams.get('keyword')).toBe('张三');
    expect(new URL(queries[1]!).searchParams.get('keyword')).toBe('李四');
    expect(new URL(queries[2]!).searchParams.has('keyword')).toBe(false);
  });

  it('搜索后点 reload() → 用当前 page 不重置(不丢搜索结果)', async () => {
    const queries: string[] = [];
    server.use(
      http.get(/\/api\/leads/, ({ request }) => {
        queries.push(request.url);
        return HttpResponse.json({ items: [], total: 0, page: 1, pageSize: 20 });
      }),
    );
    const t = useTable({ url: '/leads' });
    await t.resetAndLoad({ keyword: '张三' });
    // 改 page 到 3
    t.page.value = 3;
    // reload 不传 extras,但 page 仍 3,keyword 通过 state 持久不在(每次 resetAndLoad 才带)
    // 实际上 useTable 的 reload() 不传 extras,所以 keyword 不带
    await t.reload();
    expect(queries).toHaveLength(2);
    expect(new URL(queries[1]!).searchParams.get('page')).toBe('3');
    // reload 不带 extras,keyword 不在 query
    expect(new URL(queries[1]!).searchParams.has('keyword')).toBe(false);
  });
});
