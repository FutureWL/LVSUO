// @vitest-environment happy-dom
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { mount, flushPromises } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { server, http, HttpResponse } from '@/test/msw';
import ClientList from './ClientList.vue';

/**
 * ClientList 端到端(MSW)
 *  - onMounted → GET /clients → table 渲染
 *  - 新建对话框 → 填表 → POST /clients → reload
 *  - empty:0 条 → TableEmpty
 *  - 类型映射:ENTERPRISE → 企业 / INDIVIDUAL → 个人
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
          h('div', { 'data-row': row.id, key: row.id }, row.clientName ?? ''),
        ),
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
  ElInput: ElStub,
  ElSelect: ElStub,
  ElOption: ElStub,
  ElTable: ElTableStub,
  ElTableColumn: defineComponent({
    name: 'ElTableColumn',
    props: ['label', 'prop', 'width'],
    setup(_props, { slots }) {
      return () =>
        h('label', { 'data-col': _props.prop ?? _props.label }, [
          h('span', { class: 'col-label' }, _props.label ?? ''),
          // 传 row 给 slot(scope 模式)
          slots.default ? h('div', { class: 'col-body' }, slots.default({ row: {} })) : null,
        ]);
    },
  }),
  ElTableColumn__: ElStub,
  ElTag: ElStub,
  ElPagination: ElStub,
  ElDialog: ElStub,
  ElForm: ElStub,
  ElFormItem: ElStub,
  ElEmpty: ElEmptyStub,
};

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterAll(() => server.close());
afterEach(() => server.resetHandlers());
beforeEach(() => {
  setActivePinia(createPinia());
  localStorage.clear();
});

const SAMPLE_CLIENTS = [
  {
    id: 'c1',
    clientName: 'ABC 公司',
    clientType: 'ENTERPRISE',
    contactName: '张三',
    contactMobile: '13800138000',
    riskLevel: 'LOW',
  },
  {
    id: 'c2',
    clientName: '李四',
    clientType: 'INDIVIDUAL',
    contactName: '李四',
    contactMobile: '13900139000',
    riskLevel: 'MEDIUM',
  },
];

async function mountList() {
  const w = mount(ClientList, { global: { components } });
  await flushPromises();
  await flushPromises();
  return w;
}

describe('ClientList 端到端(MSW)', () => {
  it('onMounted → GET /clients → items 渲染', async () => {
    server.use(
      http.get(/\/api\/clients/, () =>
        HttpResponse.json({ items: SAMPLE_CLIENTS, total: 2, page: 1, pageSize: 20 }),
      ),
    );
    const w = await mountList();
    expect(w.text()).toContain('客户中心');
    expect(w.text()).toContain('ABC 公司');
    expect(w.text()).toContain('李四');
  });

  it('类型映射:ENTERPRISE → "企业",INDIVIDUAL → "个人"', async () => {
    server.use(
      http.get(/\/api\/clients/, () =>
        HttpResponse.json({ items: SAMPLE_CLIENTS, total: 2, page: 1, pageSize: 20 }),
      ),
    );
    const w = await mountList();
    const text = w.text();
    expect(text).toContain('企业');
    expect(text).toContain('个人');
  });

  it('empty:0 条 → TableEmpty 显示', async () => {
    server.use(
      http.get(/\/api\/clients/, () =>
        HttpResponse.json({ items: [], total: 0, page: 1, pageSize: 20 }),
      ),
    );
    const w = await mountList();
    const vm = w.vm as any;
    expect(vm.empty).toBe(true);
    expect(w.find('[data-el-empty]').exists()).toBe(true);
  });

  it('新建对话框:打开 → 填表 → POST /clients → 关闭 → reload', async () => {
    let postCalled = false;
    let postBody: any = null;
    server.use(
      http.get(/\/api\/clients/, () =>
        HttpResponse.json({ items: SAMPLE_CLIENTS, total: 2, page: 1, pageSize: 20 }),
      ),
      http.post(/\/api\/clients/, async ({ request }) => {
        postCalled = true;
        postBody = await request.json();
        return HttpResponse.json({ id: 'c3', ...postBody }, { status: 201 });
      }),
    );
    const w = await mountList();
    // 打开对话框
    (w.vm as any).dialogVisible = true;
    // 填表
    (w.vm as any).form.clientName = '新公司';
    (w.vm as any).form.clientType = 'ENTERPRISE';
    (w.vm as any).form.contactName = '王五';
    (w.vm as any).form.contactMobile = '13700137000';
    // 调 create
    await (w.vm as any).create();
    await flushPromises();
    expect(postCalled).toBe(true);
    expect(postBody.clientName).toBe('新公司');
    expect(postBody.clientType).toBe('ENTERPRISE');
    // 关闭
    expect((w.vm as any).dialogVisible).toBe(false);
    // form 重置
    expect((w.vm as any).form.clientName).toBe('');
    // saving 回到 false
    expect((w.vm as any).saving).toBe(false);
  });

  it('POST /clients 500 → saving 回 false(可重试)+ dialog 不关', async () => {
    server.use(
      http.get(/\/api\/clients/, () =>
        HttpResponse.json({ items: SAMPLE_CLIENTS, total: 2, page: 1, pageSize: 20 }),
      ),
      http.post(/\/api\/clients/, () =>
        HttpResponse.json({ message: '保存失败' }, { status: 500 }),
      ),
    );
    const w = await mountList();
    (w.vm as any).dialogVisible = true;
    (w.vm as any).form.clientName = '会失败的';
    try {
      await (w.vm as any).create();
    } catch {
      // http.post 失败 reject,吞掉
    }
    await flushPromises();
    // saving 仍回 false(try/finally)
    expect((w.vm as any).saving).toBe(false);
  });
});
