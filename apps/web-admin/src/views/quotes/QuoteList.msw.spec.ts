// @vitest-environment happy-dom
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { mount, flushPromises } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { server, http, HttpResponse } from '@/test/msw';
import QuoteList from './QuoteList.vue';

/**
 * QuoteList 端到端(MSW)
 *  - onMounted → GET /quotes → 报价表
 *  - 状态名 DRAFT→草稿, PENDING_APPROVAL→待审批 等 6 种
 *  - 操作: approve / send / confirm → POST → reload
 *  - empty:0 条 → TableEmpty
 *  - 500:页面骨架不崩
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
          h('div', { 'data-row': row.id, key: row.id }, row.id ?? ''),
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
  ElTag: ElStub,
  ElTable: ElTableStub,
  ElTableColumn: ElTableColumnStub,
  ElTableColumn__: ElTableColumnStub,
  ElPagination: ElStub,
  ElEmpty: ElEmptyStub,
};

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterAll(() => server.close());
afterEach(() => server.resetHandlers());
beforeEach(() => {
  setActivePinia(createPinia());
  localStorage.clear();
});

const SAMPLE_QUOTES = [
  {
    id: 'q1',
    clientId: 'c1',
    leadId: 'l1',
    lawyerFee: 5000,
    status: 'DRAFT',
    clientConfirmed: false,
    createdAt: '2026-01-15',
  },
  {
    id: 'q2',
    clientId: 'c2',
    leadId: null,
    lawyerFee: 10000,
    status: 'PENDING_APPROVAL',
    clientConfirmed: false,
    createdAt: '2026-02-01',
  },
];

async function mountList() {
  const w = mount(QuoteList, { global: { components } });
  await flushPromises();
  await flushPromises();
  return w;
}

describe('QuoteList 端到端(MSW)', () => {
  it('onMounted → GET /quotes → items 渲染', async () => {
    server.use(
      http.get(/\/api\/quotes/, () =>
        HttpResponse.json({ items: SAMPLE_QUOTES, total: 2, page: 1, pageSize: 20 }),
      ),
    );
    const w = await mountList();
    expect(w.text()).toContain('报价卡');
    expect(w.text()).toContain('q1');
    expect(w.text()).toContain('q2');
    expect(w.findAll('[data-row]').length).toBe(2);
  });

  it('状态名映射:statusName 函数正确', async () => {
    server.use(
      http.get(/\/api\/quotes/, () =>
        HttpResponse.json({ items: SAMPLE_QUOTES, total: 2, page: 1, pageSize: 20 }),
      ),
    );
    const w = await mountList();
    const vm = w.vm as any;
    expect(vm.statusName('DRAFT')).toBe('草稿');
    expect(vm.statusName('PENDING_APPROVAL')).toBe('待审批');
    expect(vm.statusName('APPROVED')).toBe('已审批');
    expect(vm.statusName('SENT')).toBe('已发送');
    expect(vm.statusName('CLIENT_CONFIRMED')).toBe('客户已确认');
    expect(vm.statusName('REJECTED')).toBe('已拒绝');
  });

  it('操作:approve(row) → POST /quotes/:id/approve → reload', async () => {
    const calls: string[] = [];
    server.use(
      http.get(/\/api\/quotes/, () =>
        HttpResponse.json({ items: SAMPLE_QUOTES, total: 2, page: 1, pageSize: 20 }),
      ),
      http.post(/\/api\/quotes\/.+\/approve/, ({ request }) => {
        calls.push(request.url);
        return HttpResponse.json({ ok: true });
      }),
    );
    const w = await mountList();
    await (w.vm as any).approve(SAMPLE_QUOTES[0]);
    await flushPromises();
    await flushPromises();
    expect(calls.length).toBe(1);
    expect(calls[0]).toContain('/quotes/q1/approve');
  });

  it('操作:send/confirm → 各自 POST 不同端点', async () => {
    const calls: string[] = [];
    server.use(
      http.get(/\/api\/quotes/, () =>
        HttpResponse.json({ items: SAMPLE_QUOTES, total: 2, page: 1, pageSize: 20 }),
      ),
      http.post(/\/api\/quotes\/.+/, ({ request }) => {
        calls.push(request.url);
        return HttpResponse.json({ ok: true });
      }),
    );
    const w = await mountList();
    await (w.vm as any).send(SAMPLE_QUOTES[0]);
    await (w.vm as any).confirm(SAMPLE_QUOTES[1]);
    await flushPromises();
    await flushPromises();
    expect(calls).toHaveLength(2);
    expect(calls[0]).toContain('/send-to-client');
    expect(calls[1]).toContain('/client-confirm');
  });

  it('empty:0 条 → TableEmpty 显示"暂无报价"', async () => {
    server.use(
      http.get(/\/api\/quotes/, () =>
        HttpResponse.json({ items: [], total: 0, page: 1, pageSize: 20 }),
      ),
    );
    const w = await mountList();
    expect((w.vm as any).empty).toBe(true);
    expect(w.find('[data-el-empty]').exists()).toBe(true);
  });

  it('500:onMounted 不崩(items 空 + 页面骨架)', async () => {
    server.use(
      http.get(/\/api\/quotes/, () => HttpResponse.json({ message: 'fail' }, { status: 500 })),
    );
    const w = await mountList();
    expect(w.text()).toContain('报价卡');
    expect((w.vm as any).items).toEqual([]);
    expect((w.vm as any).loading).toBe(false);
  });
});
