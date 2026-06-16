// @vitest-environment happy-dom
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { mount, flushPromises } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { useRouter, createRouter, createMemoryHistory, type Router } from 'vue-router';
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

const ElStub = defineComponent({
  name: 'ElStub',
  setup(_props, { slots, attrs }) {
    return () => h('div', { ...attrs, 'data-el-stub': true }, slots.default?.());
  },
});

const ElInputStub = defineComponent({
  name: 'ElInput',
  props: ['modelValue', 'placeholder', 'disabled', 'type', 'rows'],
  setup(_props, { slots, attrs }) {
    return () =>
      h('div', { ...attrs, 'data-el-input': true, 'data-disabled': !!_props.disabled }, [
        slots.default?.(),
        h('span', { 'data-value': _props.modelValue ?? '' }, String(_props.modelValue ?? '')),
      ]);
  },
});

const ElFormItemStub = defineComponent({
  name: 'ElFormItem',
  setup(_, { slots }) {
    return () => h('div', { 'data-form-item': true }, slots.default?.());
  },
});

const components = {
  ElButton: ElStub,
  ElInput: ElInputStub,
  ElForm: ElStub,
  ElFormItem: ElFormItemStub,
  ElSelect: ElStub,
  ElOption: ElStub,
  ElInputNumber: ElStub,
  ElRow: ElStub,
  ElCol: ElStub,
  ElCard: ElStub,
  ElCheckbox: ElStub,
  ElCheckboxGroup: ElStub,
};

const SAMPLE_PRODUCTS = [
  { id: 'p1', productName: '法律咨询(小时)' },
  { id: 'p2', productName: '诉讼代理(基础)' },
];

let router: Router;

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterAll(() => server.close());
afterEach(() => server.resetHandlers());

beforeEach(async () => {
  setActivePinia(createPinia());
  localStorage.clear();
  vi.restoreAllMocks();
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/quotes', name: 'quotes', component: { template: '<div>list</div>' } },
      {
        path: '/quotes/create',
        name: 'quote-create',
        component: QuoteCreate,
        meta: { public: true },
      },
    ],
  });
  await router.push('/quotes/create');
  await router.isReady();
});

async function mountCreate(query: Record<string, string> = {}) {
  await router.push({ name: 'quote-create', query });
  const w = mount(QuoteCreate, {
    global: { plugins: [router], components },
  });
  await flushPromises();
  await flushPromises();
  return w;
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
    // 填必填字段
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
    // 跳 /quotes
    expect(router.currentRoute.value.name).toBe('quotes');
    // saving 回 false
    expect((w.vm as any).saving).toBe(false);
  });

  it('addCost / removeCost 增删 thirdPartyCosts', async () => {
    server.use(http.get(/\/api\/service-products/, () => HttpResponse.json(SAMPLE_PRODUCTS)));
    const w = await mountCreate();
    // 初始 1 条
    expect((w.vm as any).form.thirdPartyCosts.length).toBe(1);
    // 加 2 条
    (w.vm as any).addCost();
    (w.vm as any).addCost();
    expect((w.vm as any).form.thirdPartyCosts.length).toBe(3);
    // 删第 1 条
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
    // 仍在 /quotes/create(没跳)
    expect(router.currentRoute.value.name).toBe('quote-create');
  });
});
