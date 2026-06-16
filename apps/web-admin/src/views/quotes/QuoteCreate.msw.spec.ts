// @vitest-environment happy-dom
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { mountView, makeTestRouter } from '@/test/view-test-helpers';
import { type Router } from 'vue-router';
import { server, http, HttpResponse } from '@/test/msw';
import QuoteCreate from './QuoteCreate.vue';

/**
 * QuoteCreate 端到端(MSW + 真实 router)
 *  - onMounted → GET /service-products → 列表填到 select
 *  - 填表 → POST /quotes → ElMessage.success + 跳 /quotes
 *  - addCost / removeCost 增删 thirdPartyCosts
 *  - 400/500 → catch,saving 回 false + 不跳
 *  - 从 query 带 leadId/clientId 预填(disabled)
 */

const SAMPLE_PRODUCTS = [
  { id: 'p1', productName: '法律咨询(小时)' },
  { id: 'p2', productName: '诉讼代理(基础)' },
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
      { path: '/quotes', name: 'quotes' },
      {
        path: '/quotes/create',
        name: 'quote-create',
        component: QuoteCreate,
        meta: { public: true },
      },
    ],
    '/quotes/create',
  );
});

async function mountCreate(query: Record<string, string> = {}) {
  if (Object.keys(query).length) {
    await router.push({ name: 'quote-create', query });
    await router.isReady();
  }
  return await mountView(QuoteCreate, { router });
}

describe('QuoteCreate 端到端(MSW)', () => {
  it('onMounted → GET /service-products → 列表加载', async () => {
    server.use(http.get(/\/api\/service-products/, () => HttpResponse.json(SAMPLE_PRODUCTS)));
    const w = await mountCreate();
    expect((w.vm as any).products.length).toBe(2);
    expect((w.vm as any).products[0].productName).toBe('法律咨询(小时)');
  });

  it('query 带 leadId → form.leadId 预填 + el-input stub 渲染', async () => {
    server.use(http.get(/\/api\/service-products/, () => HttpResponse.json(SAMPLE_PRODUCTS)));
    const w = await mountCreate({ leadId: 'l42' });
    expect((w.vm as any).form.leadId).toBe('l42');
    // el-input stub 会渲染 data-value="l42"
    expect(w.find('[data-value="l42"]').exists()).toBe(true);
  });

  it('填表 → POST /quotes → 跳 /quotes', async () => {
    let postBody: any = null;
    server.use(
      http.get(/\/api\/service-products/, () => HttpResponse.json(SAMPLE_PRODUCTS)),
      http.post(/\/api\/quotes/, async ({ request }) => {
        postBody = await request.json();
        return HttpResponse.json({ id: 'q99', ...postBody }, { status: 201 });
      }),
    );
    const w = await mountCreate({ leadId: 'l1', clientId: 'c1' });
    (w.vm as any).form.productId = 'p1';
    (w.vm as any).form.serviceScope = '劳动仲裁一审';
    (w.vm as any).form.excludedScope = '二审';
    (w.vm as any).form.lawyerFee = 8000;
    (w.vm as any).form.riskDisclosureConfirmed = true;
    await (w.vm as any).submit();
    await flushPromises();
    await flushPromises();
    expect(postBody).not.toBeNull();
    expect(postBody.leadId).toBe('l1');
    expect(postBody.productId).toBe('p1');
    expect(postBody.serviceScope).toBe('劳动仲裁一审');
    expect(postBody.lawyerFee).toBe(8000);
    expect(postBody.riskDisclosureConfirmed).toBe(true);
    expect(router.currentRoute.value.name).toBe('quotes');
    expect((w.vm as any).saving).toBe(false);
  });

  it('addCost / removeCost 增删 thirdPartyCosts', async () => {
    server.use(http.get(/\/api\/service-products/, () => HttpResponse.json(SAMPLE_PRODUCTS)));
    const w = await mountCreate();
    expect((w.vm as any).form.thirdPartyCosts.length).toBe(1);
    (w.vm as any).addCost();
    (w.vm as any).addCost();
    expect((w.vm as any).form.thirdPartyCosts.length).toBe(3);
    (w.vm as any).removeCost(0);
    expect((w.vm as any).form.thirdPartyCosts.length).toBe(2);
  });

  it('POST /quotes 400 → saving 回 false + 不跳', async () => {
    server.use(
      http.get(/\/api\/service-products/, () => HttpResponse.json(SAMPLE_PRODUCTS)),
      http.post(/\/api\/quotes/, () =>
        HttpResponse.json({ code: 'QUOTE_BLOCK_RULE', message: '阻断规则' }, { status: 400 }),
      ),
    );
    const w = await mountCreate();
    (w.vm as any).form.serviceScope = '不完整';
    try {
      await (w.vm as any).submit();
    } catch {
      // http 错误会 reject
    }
    await flushPromises();
    expect((w.vm as any).saving).toBe(false);
    expect(router.currentRoute.value.name).toBe('quote-create');
  });
});
