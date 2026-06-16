import { describe, it, expect } from 'vitest';
import { buildDashboardStats } from '@/utils/dashboard';

/**
 * Dashboard stats 装配 —— 6 路响应 → 6 个数字
 *  - paginated(total) / list(length) 分支
 *  - undefined 防御
 */

describe('buildDashboardStats', () => {
  it('正常响应 → 6 个数对', () => {
    const stats = buildDashboardStats({
      leads: { total: 100 },
      matters: { total: 50 },
      products: [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }],
      cards: [{ id: 'c1' }, { id: 'c2' }],
      clients: { total: 20 },
      quotes: { total: 10 },
    });
    expect(stats).toEqual({
      leads: 100,
      matters: 50,
      products: 3,
      cards: 2,
      clients: 20,
      quotes: 10,
    });
  });

  it('total undefined → 0(paginated 端点)', () => {
    const stats = buildDashboardStats({
      leads: {},
      matters: {},
      products: [],
      cards: [],
      clients: {},
      quotes: {},
    });
    expect(stats).toEqual({ leads: 0, matters: 0, products: 0, cards: 0, clients: 0, quotes: 0 });
  });

  it('空数组 → 0(list 端点)', () => {
    const stats = buildDashboardStats({
      leads: { total: 0 },
      matters: { total: 0 },
      products: [],
      cards: [],
      clients: { total: 0 },
      quotes: { total: 0 },
    });
    expect(stats.products).toBe(0);
    expect(stats.cards).toBe(0);
  });

  it('混合:部分有数据,部分 undefined', () => {
    const stats = buildDashboardStats({
      leads: { total: 5 },
      matters: {}, // 缺 total → 0
      products: [{ id: 'p1' }],
      cards: [], // 空 → 0
      clients: {}, // 缺 total → 0
      quotes: { total: 7 },
    });
    expect(stats).toEqual({
      leads: 5,
      matters: 0,
      products: 1,
      cards: 0,
      clients: 0,
      quotes: 7,
    });
  });

  it('返回的 stats 是新对象(不引用入参)', () => {
    const input = {
      leads: { total: 1 },
      matters: { total: 1 },
      products: [],
      cards: [],
      clients: { total: 1 },
      quotes: { total: 1 },
    };
    const stats = buildDashboardStats(input);
    expect(stats).not.toBe(input as any);
    // 修改 stats 不影响入参
    (stats as any).leads = 999;
    expect(input.leads.total).toBe(1);
  });
});
