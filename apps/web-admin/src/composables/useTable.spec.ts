import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTable } from './useTable';

// mock @/api/http,在 useTable 导入前生效(vi.mock 会被 hoist)
vi.mock('@/api/http', () => ({
  default: {
    page: vi.fn(),
  },
}));

import http from '@/api/http';
const pageMock = (http as any).page as ReturnType<typeof vi.fn>;

function mockResponse(items: any[], total: number, page = 1, pageSize = 20) {
  pageMock.mockResolvedValueOnce({ items, total, page, pageSize });
}

beforeEach(() => {
  pageMock.mockReset();
});

describe('useTable', () => {
  describe('state 初始化', () => {
    it('默认值:items=[], total=0, page=1, pageSize=20', () => {
      const t = useTable({ url: '/test' });
      expect(t.items.value).toEqual([]);
      expect(t.total.value).toBe(0);
      expect(t.page.value).toBe(1);
      expect(t.pageSize.value).toBe(20);
    });

    it('pageSize 自定义', () => {
      const t = useTable({ url: '/test', pageSize: 50 });
      expect(t.pageSize.value).toBe(50);
    });
  });

  describe('empty 计算属性', () => {
    it('初始化就是 empty(!loading && items 为空)', () => {
      const t = useTable({ url: '/test' });
      expect(t.empty.value).toBe(true);
    });

    it('load 完有数据 → empty=false', async () => {
      mockResponse([{ id: '1' }], 1);
      const t = useTable({ url: '/test' });
      await t.load();
      expect(t.empty.value).toBe(false);
    });
  });

  describe('load() 拉当前页', () => {
    it('把 http.page 的 items/total 写到 ref', async () => {
      mockResponse([{ id: '1' }, { id: '2' }], 2);
      const t = useTable({ url: '/leads' });
      await t.load();
      expect(t.items.value).toEqual([{ id: '1' }, { id: '2' }]);
      expect(t.total.value).toBe(2);
    });

    it('http.page 收到的 params 含 page + pageSize + url', async () => {
      mockResponse([], 0);
      const t = useTable({ url: '/leads' });
      await t.load();
      expect(pageMock).toHaveBeenCalledWith('/leads', { page: 1, pageSize: 20 });
    });

    it('extras 合并到 params(非空值)', async () => {
      mockResponse([], 0);
      const t = useTable({ url: '/leads' });
      await t.load({ keyword: '张三', status: 'NEW_LEAD', urgency: 'HIGH' });
      expect(pageMock).toHaveBeenCalledWith('/leads', {
        page: 1,
        pageSize: 20,
        keyword: '张三',
        status: 'NEW_LEAD',
        urgency: 'HIGH',
      });
    });

    it('extras 自动剔除空字符串 / null / undefined', async () => {
      mockResponse([], 0);
      const t = useTable({ url: '/leads' });
      await t.load({ keyword: '', status: null, urgency: undefined, from: '2026-01-01' });
      const callArgs = pageMock.mock.calls[0]![1] as Record<string, any>;
      expect(callArgs).not.toHaveProperty('keyword');
      expect(callArgs).not.toHaveProperty('status');
      expect(callArgs).not.toHaveProperty('urgency');
      expect(callArgs.from).toBe('2026-01-01');
    });

    it('数字 0 / false 保留(不当作"空")', async () => {
      mockResponse([], 0);
      const t = useTable({ url: '/leads' });
      await t.load({ page: 0, isActive: false });
      const args = pageMock.mock.calls[0]![1] as Record<string, any>;
      expect(args.page).toBe(0);
      expect(args.isActive).toBe(false);
    });

    it('loading 期间 loading=true,完成后 loading=false(成功路径)', async () => {
      let resolveLoad: (v: any) => void;
      pageMock.mockReturnValueOnce(
        new Promise((r) => {
          resolveLoad = r;
        }),
      );
      const t = useTable({ url: '/leads' });
      const p = t.load();
      expect(t.loading.value).toBe(true);
      resolveLoad!({ items: [], total: 0, page: 1, pageSize: 20 });
      await p;
      expect(t.loading.value).toBe(false);
    });

    it('loading 即使 http 抛错也回到 false(try/finally)', async () => {
      pageMock.mockRejectedValueOnce(new Error('boom'));
      const t = useTable({ url: '/leads' });
      await expect(t.load()).rejects.toThrow('boom');
      expect(t.loading.value).toBe(false);
    });

    it('pageSize 用 ref 当前值(支持运行中改 pageSize)', async () => {
      mockResponse([], 0);
      const t = useTable({ url: '/leads', pageSize: 20 });
      t.pageSize.value = 100;
      await t.load();
      expect(pageMock).toHaveBeenCalledWith('/leads', { page: 1, pageSize: 100 });
    });
  });

  describe('reload() 重拉当前页', () => {
    it('不带 extras 调用 load', async () => {
      mockResponse([], 0);
      const t = useTable({ url: '/leads' });
      await t.reload();
      expect(pageMock).toHaveBeenCalledWith('/leads', { page: 1, pageSize: 20 });
    });

    it('page 不重置', async () => {
      mockResponse([], 0);
      mockResponse([], 0);
      const t = useTable({ url: '/leads' });
      await t.load();
      // 改 page 到 3
      t.page.value = 3;
      await t.reload();
      expect(t.page.value).toBe(3);
    });
  });

  describe('resetAndLoad() 跳回第 1 页', () => {
    it('page 重置为 1,再调 load', async () => {
      mockResponse([], 0);
      const t = useTable({ url: '/leads' });
      t.page.value = 5;
      await t.resetAndLoad();
      expect(t.page.value).toBe(1);
      expect(pageMock).toHaveBeenCalledWith('/leads', { page: 1, pageSize: 20 });
    });

    it('extras 一并传下去', async () => {
      mockResponse([], 0);
      const t = useTable({ url: '/leads' });
      t.page.value = 5;
      await t.resetAndLoad({ keyword: '张三' });
      expect(t.page.value).toBe(1);
      expect(pageMock).toHaveBeenCalledWith('/leads', {
        page: 1,
        pageSize: 20,
        keyword: '张三',
      });
    });
  });
});
