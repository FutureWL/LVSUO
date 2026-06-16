// @vitest-environment happy-dom
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { mountView, clickButtonByText, makeTestRouter } from '@/test/view-test-helpers';
import { type Router } from 'vue-router';
import { server, http, HttpResponse } from '@/test/msw';
import QuoteList from './QuoteList.vue';

/**
 * QuoteList 点击交互测试
 *  - 不调 vm.fn,直接 click 按钮
 *  - 验证:点了之后,UI 状态/网络请求符合预期
 */

const SAMPLE_QUOTES = [
  {
    id: 'q1',
    clientId: 'c1',
    leadId: 'l1',
    lawyerFee: 5000,
    status: 'DRAFT',
    clientConfirmed: false,
    createdAt: '2026-01-15',
  },
];

let router: Router;

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterAll(() => server.close());
afterEach(() => server.resetHandlers());

beforeEach(async () => {
  vi.restoreAllMocks();
  localStorage.clear();
  router = await makeTestRouter(
    [
      { path: '/quotes', name: 'quotes', component: QuoteList, meta: { public: true } },
      { path: '/quotes/create', name: 'quote-create' },
    ],
    '/quotes',
  );
});

describe('QuoteList 点击交互', () => {
  it('点击"新建报价"按钮 → router.push /quotes/create', async () => {
    server.use(
      http.get(/\/api\/quotes/, () =>
        HttpResponse.json({ items: SAMPLE_QUOTES, total: 1, page: 1, pageSize: 20 }),
      ),
    );
    const w = await mountView(QuoteList, { router });
    await clickButtonByText(w, '新建报价');
    expect(router.currentRoute.value.name).toBe('quote-create');
  });

  it('点击"审批"按钮 → POST /quotes/:id/approve(row 是 stub, id 拿不到真实值)', async () => {
    // 已知限制: el-table-column 的 #default="{ row }" 拿不到真实 row(stub 限制)
    // 这里只验证点"审批"会调 /approve 端点
    const calls: string[] = [];
    server.use(
      http.get(/\/api\/quotes/, () =>
        HttpResponse.json({ items: SAMPLE_QUOTES, total: 1, page: 1, pageSize: 20 }),
      ),
      http.post(/\/api\/quotes\/.+\/approve/, ({ request }) => {
        calls.push(request.url);
        return HttpResponse.json({ ok: true });
      }),
    );
    const w = await mountView(QuoteList, { router });
    await clickButtonByText(w, '审批');
    expect(calls.length).toBeGreaterThanOrEqual(1);
    // stub 限制: row.id 是 undefined,实际调 undefined/approve
    expect(calls[0]).toMatch(/\/quotes\/.+\/approve/);
  });

  it('点击"发送"按钮 → POST /quotes/:id/send-to-client', async () => {
    const calls: string[] = [];
    server.use(
      http.get(/\/api\/quotes/, () =>
        HttpResponse.json({ items: SAMPLE_QUOTES, total: 1, page: 1, pageSize: 20 }),
      ),
      http.post(/\/api\/quotes\/.+\/send-to-client/, ({ request }) => {
        calls.push(request.url);
        return HttpResponse.json({ ok: true });
      }),
    );
    const w = await mountView(QuoteList, { router });
    await clickButtonByText(w, '发送');
    expect(calls[0]).toMatch(/\/quotes\/.+\/send-to-client/);
  });

  it('点击"客户确认"按钮 → POST /quotes/:id/client-confirm', async () => {
    const calls: string[] = [];
    server.use(
      http.get(/\/api\/quotes/, () =>
        HttpResponse.json({ items: SAMPLE_QUOTES, total: 1, page: 1, pageSize: 20 }),
      ),
      http.post(/\/api\/quotes\/.+\/client-confirm/, ({ request }) => {
        calls.push(request.url);
        return HttpResponse.json({ ok: true });
      }),
    );
    const w = await mountView(QuoteList, { router });
    await clickButtonByText(w, '客户确认');
    expect(calls[0]).toMatch(/\/quotes\/.+\/client-confirm/);
  });
});
