import { buildPage } from './page';

describe('buildPage', () => {
  it('装配 PageResponse 字段', () => {
    const items = [{ id: '1' }, { id: '2' }];
    const res = buildPage(items, 2, 1, 20);
    expect(res).toEqual({ items, total: 2, page: 1, pageSize: 20 });
  });

  it('空列表仍返回完整结构(前端可直接读 total)', () => {
    const res = buildPage<{ id: string }>([], 0, 1, 20);
    expect(res.items).toEqual([]);
    expect(res.total).toBe(0);
  });

  it('保持泛型 T,引用相等', () => {
    const arr = [{ id: 'a' }];
    const res = buildPage(arr, 1, 1, 10);
    expect(res.items).toBe(arr);
  });
});
