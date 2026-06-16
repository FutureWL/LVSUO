// @vitest-environment happy-dom
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { mountView } from '@/test/view-test-helpers';
import { server, http, HttpResponse } from '@/test/msw';
import ContentList from './ContentList.vue';

/**
 * ContentList 端到端(MSW)
 *  目前是占位,无真实 API
 *  - 页面标题 + 提示
 *  - onMounted load (空响应) → 不崩
 */

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterAll(() => server.close());
afterEach(() => server.resetHandlers());
beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('ContentList 端到端(MSW)', () => {
  it('页面标题 + 提示 + 空表', async () => {
    const w = await mountView(ContentList);
    expect(w.text()).toContain('内容合规审查');
    expect(w.text()).toContain('任务书 7.x');
    expect(w.text()).toContain('内容审查 endpoint');
    // items 是 []
    expect((w.vm as any).items).toEqual([]);
  });

  it('onMounted load → loading 回 false + items 空', async () => {
    const w = await mountView(ContentList);
    expect((w.vm as any).loading).toBe(false);
  });
});
