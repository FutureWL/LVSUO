// @vitest-environment happy-dom
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { mount, flushPromises } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';
import { server, http, HttpResponse } from '@/test/msw';
import MatterCreate from './MatterCreate.vue';

/**
 * MatterCreate 端到端(MSW + 真实 router)
 *  - onMounted → 3 路并发(/clients, /users, /quotes)
 *  - 从报价创建:选 quoteId → POST /matters/from-quote
 *  - 直接创建:无 quoteId → POST /matters
 *  - 500 → saving 回 false + 不跳
 *  - 报价列表过滤:只显示 CLIENT_CONFIRMED 且没 matterId 的
 */

const ElStub = defineComponent({
  name: 'ElStub',
  setup(_props, { slots, attrs }) {
    return () => h('div', { ...attrs, 'data-el-stub': true }, slots.default?.());
  },
});

const ElSelectStub = defineComponent({
  name: 'ElSelect',
  props: ['modelValue', 'placeholder', 'disabled'],
  setup(_props, { slots }) {
    return () =>
      h('div', { 'data-select': true, 'data-disabled': !!_props.disabled }, slots.default?.());
  },
});

const ElOptionStub = defineComponent({
  name: 'ElOption',
  props: ['label', 'value'],
  setup(_props) {
    return () =>
      h('div', { 'data-option': true, 'data-value': _props.value ?? '' }, _props.label ?? '');
  },
});

const components = {
  ElButton: ElStub,
  ElInput: ElStub,
  ElInputNumber: ElStub,
  ElForm: ElStub,
  ElFormItem: ElStub,
  ElSelect: ElSelectStub,
  ElOption: ElOptionStub,
  ElRow: ElStub,
  ElCol: ElStub,
  ElCard: ElStub,
};

const SAMPLE_CLIENTS = [
  { id: 'c1', clientName: 'ABC 公司' },
  { id: 'c2', clientName: '李四' },
];
const SAMPLE_USERS = [
  { id: 'u1', realName: '王律师', roleType: 'LAWYER' },
  { id: 'u2', realName: '张合伙人', roleType: 'PARTNER' },
];
const SAMPLE_QUOTES_RAW = {
  items: [
    { id: 'q1', lawyerFee: 5000, status: 'CLIENT_CONFIRMED', matterId: null },
    { id: 'q2', lawyerFee: 10000, status: 'DRAFT', matterId: null }, // 草稿,过滤掉
    { id: 'q3', lawyerFee: 8000, status: 'CLIENT_CONFIRMED', matterId: 'm99' }, // 已有 matter,过滤掉
    { id: 'q4', lawyerFee: 12000, status: 'CLIENT_CONFIRMED', matterId: null }, // 留下
  ],
  total: 4,
  page: 1,
  pageSize: 20,
};

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
      { path: '/matters', name: 'matters', component: { template: '<div>list</div>' } },
      {
        path: '/matters/create',
        name: 'matter-create',
        component: MatterCreate,
        meta: { public: true },
      },
    ],
  });
  await router.push('/matters/create');
  await router.isReady();
});

function mockLoad() {
  server.use(
    http.get(/\/api\/clients/, () =>
      HttpResponse.json({ items: SAMPLE_CLIENTS, total: 2, page: 1, pageSize: 20 }),
    ),
    http.get(/\/api\/users/, () => HttpResponse.json(SAMPLE_USERS)),
    http.get(/\/api\/quotes/, () => HttpResponse.json(SAMPLE_QUOTES_RAW)),
  );
}

async function mountCreate(query: Record<string, string> = {}) {
  await router.push({ name: 'matter-create', query });
  const w = mount(MatterCreate, { global: { plugins: [router], components } });
  await flushPromises();
  await flushPromises();
  return w;
}

describe('MatterCreate 端到端(MSW)', () => {
  it('onMounted → 3 路并发加载(clients/users/quotes)', async () => {
    mockLoad();
    const w = await mountCreate();
    expect((w.vm as any).clients.length).toBe(2);
    expect((w.vm as any).users.length).toBe(2);
    // quotes 被过滤:q1 + q4 留下(CLIENT_CONFIRMED 且 matterId=null)
    expect((w.vm as any).quotes.length).toBe(2);
    expect((w.vm as any).quotes[0].id).toBe('q1');
    expect((w.vm as any).quotes[1].id).toBe('q4');
  });

  it('从报价创建:quoteId 有值 → POST /matters/from-quote', async () => {
    let postUrl = '';
    let postBody: any = null;
    server.use(
      http.get(/\/api\/clients/, () =>
        HttpResponse.json({ items: SAMPLE_CLIENTS, total: 2, page: 1, pageSize: 20 }),
      ),
      http.get(/\/api\/users/, () => HttpResponse.json(SAMPLE_USERS)),
      http.get(/\/api\/quotes/, () => HttpResponse.json(SAMPLE_QUOTES_RAW)),
      http.post(/\/api\/matters\/from-quote/, async ({ request }) => {
        postUrl = request.url;
        postBody = await request.json();
        return HttpResponse.json({ id: 'm1', ...postBody }, { status: 201 });
      }),
      http.post(/\/api\/matters/, () =>
        HttpResponse.json({ message: 'wrong path' }, { status: 404 }),
      ),
    );
    const w = await mountCreate({ clientId: 'c1', quoteId: 'q1' });
    (w.vm as any).form.matterTitle = '劳动仲裁一审';
    (w.vm as any).form.matterType = '劳动';
    (w.vm as any).form.disputeAmount = 50000;
    (w.vm as any).form.responsiblePartnerId = 'u2';
    (w.vm as any).form.leadLawyerId = 'u1';
    await (w.vm as any).submit();
    await flushPromises();
    await flushPromises();
    expect(postUrl).toContain('/matters/from-quote');
    expect(postBody.quoteId).toBe('q1');
    expect(postBody.matterTitle).toBe('劳动仲裁一审');
    expect(postBody.responsiblePartnerId).toBe('u2');
    expect(router.currentRoute.value.name).toBe('matters');
  });

  it('直接创建:无 quoteId → POST /matters(form 全量)', async () => {
    let postUrl = '';
    let postBody: any = null;
    server.use(
      http.get(/\/api\/clients/, () =>
        HttpResponse.json({ items: SAMPLE_CLIENTS, total: 2, page: 1, pageSize: 20 }),
      ),
      http.get(/\/api\/users/, () => HttpResponse.json(SAMPLE_USERS)),
      http.get(/\/api\/quotes/, () => HttpResponse.json(SAMPLE_QUOTES_RAW)),
      http.post(/\/api\/matters/, async ({ request }) => {
        postUrl = request.url;
        postBody = await request.json();
        return HttpResponse.json({ id: 'm1', ...postBody }, { status: 201 });
      }),
    );
    const w = await mountCreate({ clientId: 'c1' });
    (w.vm as any).form.matterTitle = '独立案件';
    (w.vm as any).form.matterType = '合同';
    (w.vm as any).form.disputeAmount = 100000;
    (w.vm as any).form.billingType = 'FIXED';
    await (w.vm as any).submit();
    await flushPromises();
    await flushPromises();
    expect(postUrl).toContain('/matters');
    expect(postUrl).not.toContain('/from-quote');
    expect(postBody.quoteId).toBe(''); // 空
    expect(postBody.matterTitle).toBe('独立案件');
    expect(postBody.billingType).toBe('FIXED');
  });

  it('500 → saving 回 false + 不跳', async () => {
    server.use(
      http.get(/\/api\/clients/, () =>
        HttpResponse.json({ items: SAMPLE_CLIENTS, total: 2, page: 1, pageSize: 20 }),
      ),
      http.get(/\/api\/users/, () => HttpResponse.json(SAMPLE_USERS)),
      http.get(/\/api\/quotes/, () => HttpResponse.json(SAMPLE_QUOTES_RAW)),
      http.post(/\/api\/matters\/from-quote/, () =>
        HttpResponse.json({ message: '失败' }, { status: 500 }),
      ),
    );
    const w = await mountCreate({ quoteId: 'q1' });
    (w.vm as any).form.matterTitle = 'x';
    try {
      await (w.vm as any).submit();
    } catch {}
    await flushPromises();
    expect((w.vm as any).saving).toBe(false);
    expect(router.currentRoute.value.name).toBe('matter-create');
  });
});
