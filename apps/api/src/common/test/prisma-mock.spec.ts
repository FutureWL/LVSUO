import { makePrismaMock } from './prisma-mock';

describe('makePrismaMock', () => {
  it('声明的路径是 jest.fn() + resolve 传入的值', async () => {
    const prisma = makePrismaMock({ 'user.findFirst': { id: 'u1' } });
    expect(await prisma.user.findFirst()).toEqual({ id: 'u1' });
    expect(jest.isMockFunction(prisma.user.findFirst)).toBe(true);
  });

  it('未声明的路径是 undefined(不会自动成 jest.fn)', () => {
    const prisma = makePrismaMock({ 'user.findFirst': null });
    expect(prisma.feeQuote).toBeUndefined();
    expect(prisma.lead).toBeUndefined();
  });

  it('函数作为值:mockImplementation,接收 args', async () => {
    const prisma = makePrismaMock({
      'lead.update': ({ data, where }: any) => ({ id: where.id, ...data }),
    });
    const r = await prisma.lead.update({ where: { id: 'l1' }, data: { status: 'DONE' } });
    expect(r).toEqual({ id: 'l1', status: 'DONE' });
  });

  it('$transaction 用法(根级路径,值是返回的 result 数组)', async () => {
    const prisma = makePrismaMock({
      $transaction: [{ id: 't1' }, { id: 'l1' }],
    });
    expect(await prisma.$transaction([])).toEqual([{ id: 't1' }, { id: 'l1' }]);
  });

  it('深度路径(3+ 层)正确装配', async () => {
    const prisma = makePrismaMock({ 'a.b.c.find': 'deep' });
    expect(await prisma.a.b.c.find()).toBe('deep');
  });

  it('同一路径多次访问是同一 jest.fn(共享 mock 状态)', async () => {
    const prisma = makePrismaMock({ 'user.findFirst': { id: 'u1' } });
    (prisma.user.findFirst as jest.Mock).mockResolvedValueOnce({ id: 'first' });
    (prisma.user.findFirst as jest.Mock).mockResolvedValueOnce({ id: 'second' });
    expect(await prisma.user.findFirst()).toEqual({ id: 'first' });
    expect(await prisma.user.findFirst()).toEqual({ id: 'second' });
  });

  it('完全兼容 jest matchers(toHaveBeenCalledWith)', async () => {
    const prisma = makePrismaMock({ 'user.findFirst': { id: 'u1' } });
    await prisma.user.findFirst({ where: { id: '1' } });
    expect(prisma.user.findFirst).toHaveBeenCalledWith({ where: { id: '1' } });
  });

  it('空 spec 返回空对象', () => {
    const prisma = makePrismaMock();
    expect(prisma).toEqual({});
  });
});
