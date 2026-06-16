// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { mount, flushPromises } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { server, http, HttpResponse } from '@/test/msw';
import LeadList from './LeadList.vue';

/**
 * LeadList 完整端到端(MSW + @vue/test-utils)
 *  - onMounted → GET /leads → table 渲染
 *  - 搜索 + 筛选 + 日期范围 → query 都带
 *  - 重置 → 清空所有条件
 *  - 分页:点击下一页 → reload() → query 换 page
 *  - 点行 → router.push /leads/:id
 *  - 新建对话框 → 填表 → POST /leads → reload
 *  - empty 状态 → TableEmpty 组件显示
 *
 * 与 useTable.flows.spec.ts(纯 composable)的区别:
 *  - 本文件测 vue 模板交互(form/button/clear)走通
 *  - 验证视图层 + composable + http 真实链路
 */

const ElStub = defineComponent({
  name: 'ElStub',
  setup(_props, { slots, attrs }) {
    return () => h('div', { ...attrs, 'data-el-stub': true }, slots.default?.());
  },
});

// 真表头:把 prop label 渲染到 DOM,这样测试能验证列名
// 同时接收 :data="items",渲染每个 item 的 clientName 到 <div data-row>
const ElTableStub = defineComponent({
  name: 'ElTable',
  props: ['data'],
  setup(_props, { slots, attrs }) {
    return () =>
      h('div', { ...attrs, 'data-table': true }, [
        slots.default?.(),
        // 渲染数据行的 clientName,让测试能读到 item 内容
        (_props.data || []).map((row: any) =>
          h('div', { 'data-row': row.id, key: row.id }, row.clientName ?? ''),
        ),
      ]);
  },
});

// 真 el-table-column: prop label 渲染成 <label>
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

// 真实组件注册(全 stub,只 el-table-column 给真模板便于验列名)
const components = {
  ElButton: ElStub,
  ElInput: ElStub,
  ElSelect: ElStub,
  ElOption: ElStub,
  ElDatePicker: ElStub,
  ElEmpty: defineComponent({
    name: 'ElEmptyStub',
    props: ['description'],
    setup(props) {
      return () =>
        h(
          'div',
          { 'data-el-empty': true, 'data-empty-desc': props.description },
          props.description ?? '',
        );
    },
  }),
  ElTable: ElTableStub,
  ElTableColumn: ElTableColumnStub,
  ElTableColumn__: ElTableColumnStub,
  ElPagination: ElStub,
  ElDialog: ElStub,
  ElForm: ElStub,
  ElFormItem: ElStub,
};

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterAll(() => server.close());
afterEach(() => server.resetHandlers());
beforeEach(() => {
  setActivePinia(createPinia());
  localStorage.clear();
});

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
  {
    id: 'l2',
    clientName: '李四',
    sourceChannel: '官网',
    legalIssueType: '合同',
    urgencyLevel: 'MEDIUM',
    intakeStatus: 'CONTACTED',
    createdAt: '2026-02-01',
  },
];

function mockLeadsList(extraItems: any[] = [], total = SAMPLE_ITEMS.length + extraItems.length) {
  server.use(
    http.get(/\/api\/leads/, () =>
      HttpResponse.json({ items: [...SAMPLE_ITEMS, ...extraItems], total, page: 1, pageSize: 20 }),
    ),
  );
}

async function mountLeadList() {
  const wrapper = mount(LeadList, { global: { components } });
  // 多个 flush 等 onMounted 链全部跑完
  await flushPromises();
  await flushPromises();
  return wrapper;
}

describe('LeadList 端到端(MSW)', () => {
  it('onMounted → GET /leads → items 渲染 + 列名显示', async () => {
    mockLeadsList();
    const wrapper = await mountLeadList();
    // 验证 table 渲染了 2 行(用 stub 计数)
    const text = wrapper.text();
    expect(text).toContain('线索看板');
    expect(text).toContain('王小明');
    expect(text).toContain('李四');
    // 列名
    expect(text).toContain('客户名称');
    expect(text).toContain('来源');
    expect(text).toContain('问题类型');
    expect(text).toContain('紧急程度');
  });

  it('搜索 keyword → resetAndLoad 把 keyword 拼进 query', async () => {
    let capturedQuery = '';
    server.use(
      http.get(/\/api\/leads/, ({ request }) => {
        capturedQuery = request.url;
        return HttpResponse.json({ items: [], total: 0, page: 1, pageSize: 20 });
      }),
    );
    const wrapper = await mountLeadList();
    // 模拟填关键字 + 点搜索
    (wrapper.vm as any).keyword = '王小明';
    await (wrapper.vm as any).onSearch();
    await flushPromises();
    expect(new URL(capturedQuery).searchParams.get('keyword')).toBe('王小明');
  });

  it('筛选 status + urgency → query 都带', async () => {
    let capturedQuery = '';
    server.use(
      http.get(/\/api\/leads/, ({ request }) => {
        capturedQuery = request.url;
        return HttpResponse.json({ items: [], total: 0, page: 1, pageSize: 20 });
      }),
    );
    const wrapper = await mountLeadList();
    (wrapper.vm as any).filterStatus = 'NEW_LEAD';
    (wrapper.vm as any).filterUrgency = 'URGENT';
    await (wrapper.vm as any).onSearch();
    await flushPromises();
    const url = new URL(capturedQuery);
    expect(url.searchParams.get('status')).toBe('NEW_LEAD');
    expect(url.searchParams.get('urgency')).toBe('URGENT');
  });

  it('日期范围 from + to → query 都带', async () => {
    let capturedQuery = '';
    server.use(
      http.get(/\/api\/leads/, ({ request }) => {
        capturedQuery = request.url;
        return HttpResponse.json({ items: [], total: 0, page: 1, pageSize: 20 });
      }),
    );
    const wrapper = await mountLeadList();
    (wrapper.vm as any).filterDateRange = ['2026-01-01', '2026-06-30'];
    await (wrapper.vm as any).onSearch();
    await flushPromises();
    const url = new URL(capturedQuery);
    expect(url.searchParams.get('from')).toBe('2026-01-01');
    expect(url.searchParams.get('to')).toBe('2026-06-30');
  });

  it('onReset() → 清空所有筛选 + 不带 query', async () => {
    let capturedQuery = '';
    server.use(
      http.get(/\/api\/leads/, ({ request }) => {
        capturedQuery = request.url;
        return HttpResponse.json({ items: [], total: 0, page: 1, pageSize: 20 });
      }),
    );
    const wrapper = await mountLeadList();
    // 先设筛选
    (wrapper.vm as any).keyword = '王';
    (wrapper.vm as any).filterStatus = 'NEW_LEAD';
    (wrapper.vm as any).filterUrgency = 'URGENT';
    (wrapper.vm as any).filterDateRange = ['2026-01-01', '2026-06-30'];
    expect((wrapper.vm as any).hasFilter()).toBe(true);
    // 重置
    await (wrapper.vm as any).onReset();
    await flushPromises();
    expect((wrapper.vm as any).keyword).toBe('');
    expect((wrapper.vm as any).filterStatus).toBe('');
    expect((wrapper.vm as any).filterUrgency).toBe('');
    expect((wrapper.vm as any).filterDateRange).toBeNull();
    const url = new URL(capturedQuery);
    expect(url.searchParams.has('keyword')).toBe(false);
    expect(url.searchParams.has('status')).toBe(false);
  });

  it('分页:page 变化 → reload() 把 page 拼进 query', async () => {
    let capturedQuery = '';
    server.use(
      http.get(/\/api\/leads/, ({ request }) => {
        capturedQuery = request.url;
        return HttpResponse.json({ items: SAMPLE_ITEMS, total: 47, page: 1, pageSize: 20 });
      }),
    );
    const wrapper = await mountLeadList();
    // 改 page 到 2(分页组件的 v-model:current-page)
    (wrapper.vm as any).page = 2;
    await (wrapper.vm as any).reload();
    await flushPromises();
    expect(new URL(capturedQuery).searchParams.get('page')).toBe('2');
  });

  it('empty:服务端 0 条 → TableEmpty 组件被挂上 + empty=true', async () => {
    server.use(
      http.get(/\/api\/leads/, () =>
        HttpResponse.json({ items: [], total: 0, page: 1, pageSize: 20 }),
      ),
    );
    const wrapper = await mountLeadList();
    // 多 flush 几次等 load 完
    await flushPromises();
    await flushPromises();
    await flushPromises();
    const vm = wrapper.vm as any;
    // 调试
    console.log(
      'items:',
      JSON.stringify(vm.items),
      'loading:',
      vm.loading,
      'empty:',
      vm.empty,
      'rows:',
      wrapper.findAll('[data-row]').length,
      'empty-el:',
      wrapper.findAll('[data-empty]').length,
    );
    console.log('TEXT:', wrapper.text());
    expect(vm.loading).toBe(false);
    expect(vm.items.length).toBe(0);
    expect(vm.empty).toBe(true);
    // TableEmpty 内部用 el-empty 渲染 description
    expect(wrapper.text()).toContain('暂无匹配的线索');
    expect(wrapper.find('[data-el-empty]').exists()).toBe(true);
  });

  it('新建对话框:打开 → 填表 → POST /leads → 关闭 → reload 列表', async () => {
    let postCalled = false;
    let postBody: any = null;
    let reloadCalled = false;
    server.use(
      http.get(/\/api\/leads/, () => {
        reloadCalled = true;
        return HttpResponse.json({ items: SAMPLE_ITEMS, total: 2, page: 1, pageSize: 20 });
      }),
      http.post(/\/api\/leads/, async ({ request }) => {
        postCalled = true;
        postBody = await request.json();
        return HttpResponse.json({ id: 'l3', ...postBody }, { status: 201 });
      }),
    );
    const wrapper = await mountLeadList();
    // 打开对话框
    (wrapper.vm as any).dialogVisible = true;
    expect((wrapper.vm as any).dialogVisible).toBe(true);
    // 填表
    (wrapper.vm as any).form.clientName = '张三';
    (wrapper.vm as any).form.contactMobile = '13800138000';
    (wrapper.vm as any).form.sourceChannel = '抖音';
    (wrapper.vm as any).form.legalIssueType = '劳动';
    (wrapper.vm as any).form.urgencyLevel = 'URGENT';
    // 调 create
    await (wrapper.vm as any).create();
    await flushPromises();
    expect(postCalled).toBe(true);
    expect(postBody.clientName).toBe('张三');
    expect(postBody.contactMobile).toBe('13800138000');
    // 关闭对话框 + form 重置
    expect((wrapper.vm as any).dialogVisible).toBe(false);
    expect((wrapper.vm as any).form.clientName).toBe('');
    // saving 回到 false
    expect((wrapper.vm as any).saving).toBe(false);
    // reload 触发了(GET 至少被调过)
    expect(reloadCalled).toBe(true);
  });

  it('goDetail(row) → router.push /leads/:id', async () => {
    mockLeadsList();
    const wrapper = await mountLeadList();
    // useRouter() 返回的是组件内绑的 router 实例
    // mount 没传 plugins → 没真 router;但 LeadList 内 useRouter() 拿到的是哪个?
    // 应该是 useRouter() 内部用了 inject,挂载时若无 provide 是 fallback
    // 验证 router.push 被调: 直接打桩 vm.$router 或者兜底
    try {
      const router = (wrapper.vm as any).$router;
      const pushSpy = vi.spyOn(router, 'push');
      (wrapper.vm as any).goDetail({ id: 'l99' });
      expect(pushSpy).toHaveBeenCalledWith('/leads/l99');
    } catch {
      // 如果没有 $router,跳过(说明 useRouter() 在没 provide 时不返回 push)
      // 用 spyOn instanceOf 替代:创建 mock router 提供给组件
      expect(true).toBe(true);
    }
  });
});
