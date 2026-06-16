// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { mount, flushPromises } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { server, http, HttpResponse } from '@/test/msw';
import Dashboard from './Dashboard.vue';

/**
 * Dashboard 真实集成测试(MSW + @vue/test-utils)
 *  - Dashboard 在 onMounted 并发拉 6 个端点
 *  - MSW 拦截,返回 6 路响应
 *  - buildDashboardStats 装配成 6 个数
 *  - 模板渲染 6 张 el-card 显示数字
 *  - el-* 组件用 stub 替身避开 CSS 加载
 *
 * 与 Dashboard.spec.ts(单元)互补:
 *  - 单元测 buildDashboardStats 函数
 *  - 本文件测端到端:fetch → 装配 → 渲染
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
beforeEach(() => setActivePinia(createPinia()));

describe('Dashboard 真实集成(MSW)', () => {
  it('6 路端点都返回 → 6 张统计卡显示正确数字', async () => {
    // 6 路响应分别 mock
    server.use(
      http.get(/\/api\/leads(\?|$)/, () =>
        HttpResponse.json({ items: [], total: 42, page: 1, pageSize: 1 }),
      ),
      http.get(/\/api\/matters(\?|$)/, () =>
        HttpResponse.json({ items: [], total: 17, page: 1, pageSize: 1 }),
      ),
      http.get(
        /\/api\/service-products/,
        () => HttpResponse.json([{}, {}, {}, {}, {}]), // length=5
      ),
      http.get(
        /\/api\/knowledge-cards/,
        () => HttpResponse.json([{}, {}]), // length=2
      ),
      http.get(/\/api\/clients(\?|$)/, () =>
        HttpResponse.json({ items: [], total: 8, page: 1, pageSize: 1 }),
      ),
      http.get(/\/api\/quotes(\?|$)/, () =>
        HttpResponse.json({ items: [], total: 3, page: 1, pageSize: 1 }),
      ),
    );

    const wrapper = mount(Dashboard, {
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
    // 等 onMounted 的 Promise.all 走完
    await flushPromises();
    // 多次 flushPromises(网络是异步的,需要等 MSW handler 走完)
    await flushPromises();
    await flushPromises();

    const text = wrapper.text();
    expect(text).toContain('42'); // leads
    expect(text).toContain('17'); // matters
    expect(text).toContain('5'); // products (list length)
    expect(text).toContain('2'); // cards
    expect(text).toContain('8'); // clients
    expect(text).toContain('3'); // quotes
  });

  it('某端点 500 → onMounted 的 try/catch 吞掉,页面仍渲染(数字为 0)', async () => {
    // 全部 mock 成 500,Dashboard 的 try/catch 应该吞掉
    server.use(
      http.get(/\/api\/.*/, () => HttpResponse.json({ message: 'fail' }, { status: 500 })),
    );
    const wrapper = mount(Dashboard, {
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
    await flushPromises();
    await flushPromises();

    // 不崩,显示 0
    const text = wrapper.text();
    expect(text).toContain('0');
  });

  it('6 路请求并发(都收到了)', async () => {
    const callTimestamps: number[] = [];
    server.use(
      http.get(/\/api\/.*/, async () => {
        callTimestamps.push(Date.now());
        return HttpResponse.json({ items: [], total: 1, page: 1, pageSize: 1 });
      }),
    );
    mount(Dashboard, {
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
    await flushPromises();
    await flushPromises();
    // 6 路都收到(leads, matters, service-products, knowledge-cards, clients, quotes)
    expect(callTimestamps.length).toBe(6);
  });
});
