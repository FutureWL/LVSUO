// @vitest-environment happy-dom
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { mountView, makeTestRouter } from '@/test/view-test-helpers';
import { type Router } from 'vue-router';
import { server, http, HttpResponse } from '@/test/msw';
import ClientDetail from './ClientDetail.vue';

/**
 * ClientDetail 端到端(MSW + 真实 router)
 *  - onMounted → GET /clients/:id + /matters → 详情 + 关联案件
 *  - 案件过滤:只显示 clientId 匹配的
 *  - empty:matters 为空 → el-empty 显示"暂无关联案件"
 *  - 创建案件按钮 → router.push /matters/create?clientId=...
 */

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
  vi.restoreAllMocks();
  localStorage.clear();
  router = await makeTestRouter(
    [
      {
        path: '/clients/:id',
        name: 'client-detail',
        component: ClientDetail,
        meta: { public: true },
      },
      { path: '/matters/create', name: 'matter-create' },
    ],
    '/clients/c1',
  );
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
  return await mountView(ClientDetail, { router });
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
    const w = await mountView(ClientDetail, { router });
    expect(w.text()).toContain('客户详情');
    expect((w.vm as any).client).toBeNull();
    expect((w.vm as any).loading).toBe(false);
  });
});
