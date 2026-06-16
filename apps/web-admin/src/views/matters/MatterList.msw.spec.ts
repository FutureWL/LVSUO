// @vitest-environment happy-dom
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { mountView } from '@/test/view-test-helpers';
import { server, http, HttpResponse } from '@/test/msw';
import MatterList from './MatterList.vue';

/**
 * MatterList 端到端(MSW)
 *  - onMounted → GET /matters → table 渲染
 *  - empty:0 条 → TableEmpty(el-empty)渲染 "暂无案件"
 *  - 分页:page 变化 → reload
 *  - 状态名映射(MATTER_STATUS_NAME)
 *
 * 比 LeadList 简单:无搜索/筛选,只分页
 */

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterAll(() => server.close());
afterEach(() => server.resetHandlers());
beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

const SAMPLE_MATTERS = [
  {
    id: 'm1',
    matterNo: 'M-001',
    matterTitle: '王某劳动纠纷',
    client: { clientName: '王五' },
    status: 'MATTER_OPENED',
    disputeAmount: 50000,
    createdAt: '2026-01-15',
  },
  {
    id: 'm2',
    matterNo: 'M-002',
    matterTitle: '李某合同纠纷',
    client: { clientName: '李四' },
    status: 'HEARING_OR_NEGOTIATION',
    disputeAmount: 120000,
    createdAt: '2026-02-01',
  },
];

async function mountList() {
  return await mountView(MatterList);
}

describe('MatterList 端到端(MSW)', () => {
  it('onMounted → GET /matters → items 渲染', async () => {
    server.use(
      http.get(/\/api\/matters/, () =>
        HttpResponse.json({ items: SAMPLE_MATTERS, total: 2, page: 1, pageSize: 20 }),
      ),
    );
    const w = await mountList();
    expect(w.text()).toContain('案件看板');
    expect(w.text()).toContain('M-001');
    expect(w.text()).toContain('M-002');
  });

  it('状态列存在 + 案件 item 渲染行(MATTER_OPENED 状态名由真实 el-table 渲染验证)', async () => {
    server.use(
      http.get(/\/api\/matters/, () =>
        HttpResponse.json({ items: SAMPLE_MATTERS, total: 2, page: 1, pageSize: 20 }),
      ),
    );
    const w = await mountList();
    // 列名显示
    expect(w.text()).toContain('案件编号');
    expect(w.text()).toContain('状态');
    expect(w.text()).toContain('争议金额');
    // 2 条 item 渲染(data-row 在 stub 里)
    expect(w.findAll('[data-row]').length).toBe(2);
    // statusName 函数本身在 shared 包里已单测过(枚举),这里只验证集成
    const vm = w.vm as any;
    expect(typeof vm.statusName).toBe('function');
    expect(vm.statusName('MATTER_OPENED')).toBe('案件立项');
  });

  it('empty:0 条 → TableEmpty 显示"暂无案件"', async () => {
    server.use(
      http.get(/\/api\/matters/, () =>
        HttpResponse.json({ items: [], total: 0, page: 1, pageSize: 20 }),
      ),
    );
    const w = await mountList();
    const vm = w.vm as any;
    expect(vm.empty).toBe(true);
    expect(w.find('[data-el-empty]').exists()).toBe(true);
    expect(w.text()).toContain('暂无案件');
  });

  it('分页:page=2 → reload → MSW 收到 page=2', async () => {
    let captured = '';
    server.use(
      http.get(/\/api\/matters/, ({ request }) => {
        captured = request.url;
        return HttpResponse.json({ items: [], total: 100, page: 1, pageSize: 20 });
      }),
    );
    const w = await mountList();
    (w.vm as any).page = 2;
    await (w.vm as any).reload();
    await flushPromises();
    expect(new URL(captured).searchParams.get('page')).toBe('2');
  });

  it('500 → 列表显示空 + 渲染页面骨架(不崩)', async () => {
    server.use(
      http.get(/\/api\/matters/, () =>
        HttpResponse.json({ message: 'server down' }, { status: 500 }),
      ),
    );
    const w = await mountList();
    // 不崩
    expect(w.text()).toContain('案件看板');
    const vm = w.vm as any;
    expect(vm.items).toEqual([]);
    // loading 回 false
    expect(vm.loading).toBe(false);
  });
});
