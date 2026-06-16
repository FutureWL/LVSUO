// @vitest-environment happy-dom
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { mount, flushPromises } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';
import { server, http, HttpResponse } from '@/test/msw';
import ClientDetail from './ClientDetail.vue';

/**
 * ClientDetail 端到端(MSW + 真实 router)
 *  - onMounted → GET /clients/:id + /matters → 详情 + 关联案件
 *  - 案件过滤:只显示 clientId 匹配的
 *  - empty:matters 为空 → el-empty 显示"暂无关联案件"
 *  - 创建案件按钮 → router.push /matters/create?clientId=...
 */

const ElStub = defineComponent({
  name: 'ElStub',
  setup(_props, { slots, attrs }) {
    return () => h('div', { ...attrs, 'data-el-stub': true }, slots.default?.());
  },
});

const ElTableStub = defineComponent({
  name: 'ElTable',
  props: ['data'],
  setup(_props, { slots, attrs }) {
    return () =>
      h('div', { ...attrs, 'data-table': true }, [
        slots.default?.(),
        (_props.data || []).map((row: any) =>
          h('div', { 'data-row': row.id, key: row.id }, row.matterNo ?? ''),
        ),
      ]);
  },
});

const ElTableColumnStub = defineComponent({
  name: 'ElTableColumn',
  props: ['label', 'prop', 'width'],
  setup(_props, { slots }) {
    return () =>
      h('label', { 'data-col': _props.prop ?? _props.label }, [
        h('span', { class: 'col-label' }, _props.label ?? ''),
        slots.default ? h('div', { class: 'col-body' }, slots.default({ row: {} })) : null,
      ]);
  },
});

const ElEmptyStub = defineComponent({
  name: 'ElEmpty',
  props: ['description'],
  setup(props) {
    return () => h('div', { 'data-el-empty': true }, props.description ?? '');
  },
});

const components = {
  ElButton: ElStub,
  ElCard: ElStub,
  ElTable: ElTableStub,
  ElTableColumn: ElTableColumnStub,
  ElTableColumn__: ElTableColumnStub,
  ElEmpty: ElEmptyStub,
  ElDescriptions: ElStub,
  ElDescriptionsItem: ElStub,
};

const SAMPLE_CLIENT = {
  id: 'c1',
  clientName: 'ABC 公司',
  clientType: 'ENTERPRISE',
  contactName: '张三',
  contactMobile: '13800138000',
  contactEmail: 'a@b.com',
  riskLevel: 'LOW',
  healthScore: 85,
  status: 'ACTIVE',
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
      {
        path: '/clients/:id',
        name: 'client-detail',
        component: ClientDetail,
        meta: { public: true },
      },
      {
        path: '/matters/create',
        name: 'matter-create',
        component: { template: '<div>mcreate</div>' },
      },
    ],
  });
  await router.push('/clients/c1');
  await router.isReady();
});

async function mountDetail(mattersItems: any[] = []) {
  server.use(
    http.get(/\/api\/clients\/c1/, () => HttpResponse.json(SAMPLE_CLIENT)),
    http.get(/\/api\/matters/, () =>
      HttpResponse.json({
        items: mattersItems,
        total: mattersItems.length,
        page: 1,
        pageSize: 100,
      }),
    ),
  );
  const w = mount(ClientDetail, { global: { plugins: [router], components } });
  await flushPromises();
  await flushPromises();
  return w;
}

describe('ClientDetail 端到端(MSW)', () => {
  it('onMounted → 客户详情显示 + 健康分/风险等级映射', async () => {
    const w = await mountDetail();
    const vm = w.vm as any;
    expect(vm.client).toBeTruthy();
    expect(vm.client.clientName).toBe('ABC 公司');
    expect(w.text()).toContain('ABC 公司');
    expect(w.text()).toContain('企业'); // ENTERPRISE → 企业
    expect(w.text()).toContain('张三');
    expect(w.text()).toContain('85');
  });

  it('关联案件过滤:只显示 clientId=c1 的', async () => {
    const mattersAll = [
      {
        id: 'm1',
        matterNo: 'M-001',
        matterTitle: '案件1',
        clientId: 'c1',
        status: 'OPEN',
        createdAt: '2026-01-15',
      },
      {
        id: 'm2',
        matterNo: 'M-002',
        matterTitle: '别人的案件',
        clientId: 'c99',
        status: 'OPEN',
        createdAt: '2026-02-01',
      },
      {
        id: 'm3',
        matterNo: 'M-003',
        matterTitle: '案件3',
        clientId: 'c1',
        status: 'CLOSED',
        createdAt: '2026-03-01',
      },
    ];
    const w = await mountDetail(mattersAll);
    const vm = w.vm as any;
    expect(vm.matters.length).toBe(2);
    expect(vm.matters[0].id).toBe('m1');
    expect(vm.matters[1].id).toBe('m3');
    // c99 案件被过滤
    expect(vm.matters.find((m: any) => m.clientId === 'c99')).toBeUndefined();
  });

  it('empty:无关联案件 → el-empty 显示"暂无关联案件"', async () => {
    const w = await mountDetail([]);
    const vm = w.vm as any;
    expect(vm.matters.length).toBe(0);
    expect(w.find('[data-el-empty]').exists()).toBe(true);
    expect(w.text()).toContain('暂无关联案件');
  });

  it('创建案件按钮 → router.push /matters/create?clientId=c1', async () => {
    const w = await mountDetail();
    await (w.vm as any).createMatter();
    await flushPromises();
    await flushPromises();
    expect(router.currentRoute.value.name).toBe('matter-create');
    expect(router.currentRoute.value.query.clientId).toBe('c1');
  });

  it('500 on /clients/:id → 详情空 + 页面骨架不崩', async () => {
    server.use(
      http.get(/\/api\/clients\/c1/, () => HttpResponse.json({ message: 'fail' }, { status: 500 })),
      http.get(/\/api\/matters/, () =>
        HttpResponse.json({ items: [], total: 0, page: 1, pageSize: 100 }),
      ),
    );
    const w = mount(ClientDetail, { global: { plugins: [router], components } });
    await flushPromises();
    await flushPromises();
    // 不崩
    expect(w.text()).toContain('客户详情');
    expect((w.vm as any).client).toBeNull();
    expect((w.vm as any).loading).toBe(false);
  });
});
