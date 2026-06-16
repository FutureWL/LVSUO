// @vitest-environment happy-dom
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { mount, flushPromises } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { server, http, HttpResponse } from '@/test/msw';
import { useAuthStore, type AuthUser } from '@/stores/auth';
import Dashboard from './Dashboard.vue';

/**
 * Dashboard 按权限过滤
 *  - 律所角色(FIRM_*)→ leads/matters/clients/quotes
 *  - 平台角色(PLATFORM_*)→ products/cards/clients
 *  - clients 双方都看
 *  - 快捷操作也按权限过滤
 */

const ElStub = defineComponent({
  name: 'ElStub',
  setup(_props, { slots, attrs }) {
    return () => h('div', { ...attrs, 'data-el-stub': true }, slots.default?.());
  },
});

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterAll(() => server.close());
afterEach(() => server.resetHandlers());
beforeEach(() => {
  setActivePinia(createPinia());
  localStorage.clear();
});

function mockAllEndpoints() {
  server.use(
    http.get(/\/api\/.*/, () => HttpResponse.json({ items: [], total: 0, page: 1, pageSize: 1 })),
  );
}

function setUser(role: AuthUser['role']) {
  useAuthStore().setAuth('jwt-test', {
    id: 'u1',
    username: 'admin',
    realName: '管理员',
    role,
    tenantId: 't1',
  });
}

function mountDashboard() {
  const w = mount(Dashboard, {
    global: {
      components: {
        ElButton: ElStub,
        ElCard: ElStub,
        ElRow: ElStub,
        ElCol: ElStub,
        ElSpace: ElStub,
        ElDescriptions: ElStub,
        ElDescriptionsItem: ElStub,
      },
    },
  });
  return w;
}

describe('Dashboard 按权限过滤', () => {
  it('FIRM_ADMIN → 看到 leads/matters/clients/quotes,看不到 products/cards', async () => {
    mockAllEndpoints();
    setUser('FIRM_ADMIN');
    const w = mountDashboard();
    await flushPromises();
    await flushPromises();
    const text = w.text();
    expect(text).toContain('线索总数');
    expect(text).toContain('案件总数');
    expect(text).toContain('客户');
    expect(text).toContain('报价卡');
    expect(text).not.toContain('服务产品');
    expect(text).not.toContain('知识卡');
  });

  it('FIRM_LAWYER → 同 FIRM_ADMIN(都是非平台)', async () => {
    mockAllEndpoints();
    setUser('FIRM_LAWYER');
    const w = mountDashboard();
    await flushPromises();
    await flushPromises();
    const text = w.text();
    expect(text).toContain('线索总数');
    expect(text).not.toContain('服务产品');
  });

  it('PLATFORM_ADMIN → 看到 products/cards/clients,看不到 leads/matters/quotes', async () => {
    mockAllEndpoints();
    setUser('PLATFORM_ADMIN');
    const w = mountDashboard();
    await flushPromises();
    await flushPromises();
    const text = w.text();
    expect(text).toContain('服务产品');
    expect(text).toContain('知识卡');
    expect(text).toContain('客户');
    expect(text).not.toContain('线索总数');
    expect(text).not.toContain('案件总数');
    expect(text).not.toContain('报价卡');
  });

  it('PLATFORM_OPS → 同 PLATFORM_ADMIN', async () => {
    mockAllEndpoints();
    setUser('PLATFORM_OPS');
    const w = mountDashboard();
    await flushPromises();
    await flushPromises();
    const text = w.text();
    expect(text).toContain('服务产品');
    expect(text).not.toContain('线索总数');
  });

  it('快捷操作:FIRM_ADMIN → 4 个按钮(线索/客户/报价/案件)', async () => {
    mockAllEndpoints();
    setUser('FIRM_ADMIN');
    const w = mountDashboard();
    await flushPromises();
    await flushPromises();
    const text = w.text();
    expect(text).toContain('线索看板');
    expect(text).toContain('客户中心');
    expect(text).toContain('新建报价');
    expect(text).toContain('新建案件');
  });

  it('快捷操作:PLATFORM_ADMIN → 只 1 个按钮(客户中心),没有线索/报价/案件', async () => {
    mockAllEndpoints();
    setUser('PLATFORM_ADMIN');
    const w = mountDashboard();
    await flushPromises();
    await flushPromises();
    const text = w.text();
    expect(text).toContain('客户中心');
    expect(text).not.toContain('线索看板');
    expect(text).not.toContain('新建报价');
    expect(text).not.toContain('新建案件');
  });

  it('无用户(未登录)→ 默认非平台,只看到 leads/matters/clients/quotes', async () => {
    mockAllEndpoints();
    // 不设用户
    const w = mountDashboard();
    await flushPromises();
    await flushPromises();
    const text = w.text();
    expect(text).toContain('线索总数');
    expect(text).not.toContain('服务产品');
  });
});
