// @vitest-environment happy-dom
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { mountView, clickButtonByText } from '@/test/view-test-helpers';
import { server, http, HttpResponse } from '@/test/msw';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';
import LeadList from './LeadList.vue';

/**
 * LeadList 点击交互测试(view-test-helper PoC)
 *  - 不用 vm.fn,直接 click 按钮
 *  - 验证:点了之后,UI 状态/网络请求符合预期
 *  - 与 LeadList.msw.spec.ts(直接调 vm.fn)互补
 */

const SAMPLE_ITEMS = [
  {
    id: 'l1',
    clientName: '王小明',
    sourceChannel: '抖音',
    legalIssueType: '劳动',
    urgencyLevel: 'URGENT',
    intakeStatus: 'NEW_LEAD',
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
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/leads', name: 'leads', component: LeadList, meta: { public: true } },
      { path: '/leads/:id', name: 'lead-detail', component: { template: '<div>detail</div>' } },
    ],
  });
  await router.push('/leads');
  await router.isReady();
});

describe('LeadList 点击交互(view-test-helpers)', () => {
  it('点击"新建线索"按钮 → dialogVisible=true', async () => {
    server.use(
      http.get(/\/api\/leads/, () =>
        HttpResponse.json({ items: SAMPLE_ITEMS, total: 1, page: 1, pageSize: 20 }),
      ),
    );
    const w = await mountView(LeadList, { router });
    await clickButtonByText(w, '新建线索');
    expect((w.vm as any).dialogVisible).toBe(true);
  });

  it('点击"重置"按钮 → keyword/filter 清空 + resetAndLoad 触发', async () => {
    const calls: string[] = [];
    server.use(
      http.get(/\/api\/leads/, ({ request }) => {
        calls.push(request.url);
        return HttpResponse.json({ items: [], total: 0, page: 1, pageSize: 20 });
      }),
    );
    const w = await mountView(LeadList, { router });
    // 先设筛选 — 这样重置按钮(v-if=hasFilter())才会出现
    (w.vm as any).keyword = '王';
    (w.vm as any).filterStatus = 'NEW_LEAD';
    await flushPromises();
    // 点击"重置"
    await clickButtonByText(w, '重置');
    expect((w.vm as any).keyword).toBe('');
    expect((w.vm as any).filterStatus).toBe('');
    // 重置后调了 resetAndLoad(不带 extras)
    const lastCall = calls[calls.length - 1];
    expect(new URL(lastCall!).searchParams.has('keyword')).toBe(false);
    expect(new URL(lastCall!).searchParams.has('status')).toBe(false);
  });

  it('点击"搜索"按钮 → resetAndLoad 把 keyword 拼进 query', async () => {
    const calls: string[] = [];
    server.use(
      http.get(/\/api\/leads/, ({ request }) => {
        calls.push(request.url);
        return HttpResponse.json({ items: [], total: 0, page: 1, pageSize: 20 });
      }),
    );
    const w = await mountView(LeadList, { router });
    (w.vm as any).keyword = '张三';
    await clickButtonByText(w, '搜索');
    const lastCall = calls[calls.length - 1];
    expect(new URL(lastCall!).searchParams.get('keyword')).toBe('张三');
  });

  it('点行(row-click) → router.push /leads/:id', async () => {
    server.use(
      http.get(/\/api\/leads/, () =>
        HttpResponse.json({ items: SAMPLE_ITEMS, total: 1, page: 1, pageSize: 20 }),
      ),
    );
    const w = await mountView(LeadList, { router });
    // 调 goDetail(模拟点行)
    (w.vm as any).goDetail({ id: 'l99' });
    await flushPromises();
    expect(router.currentRoute.value.name).toBe('lead-detail');
    expect(router.currentRoute.value.params.id).toBe('l99');
  });
});
