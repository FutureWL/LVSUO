/**
 * PrismaClient 测试替身 —— spec-driven 工厂
 *
 * 用法: 传入需要 mock 的路径(以 '.' 分隔) → 返回普通对象
 *   每条路径的叶子是 jest.fn(),默认值由传入的 value 决定:
 *     - 普通值 → mockResolvedValue(value)
 *     - 函数   → mockImplementation(fn)
 *     - undefined(省略) → mockResolvedValue(undefined)
 *
 * 例:
 *   const prisma = makePrismaMock({
 *     'user.findFirst': { id: 'u1' },                     // → resolve({id:'u1'})
 *     'user.findUnique': { id: 'u1' },
 *     'lead.update': ({ data }) => ({ ...currentLead, ...data }),
 *     '$transaction': [[{id: 't1'}, {id: 'l1'}]],       // → resolve(...)
 *     'matter.count': 0,
 *     // 没用到的路径(prisma.feeQuote.create 等)直接 undefined
 *   });
 *
 * 优势:
 *  - 完全兼容 jest matcher(toHaveBeenCalledWith / toHaveBeenCalled 等都正常)
 *  - 没声明的路径不会自动成 jest.fn(),调用会得到 undefined(更接近真实 prisma 行为)
 *  - 没有 Proxy,没有 jest 内部 matchers 的兼容性坑
 *
 * 取舍: 写测试时多 1-2 行声明,但 matchers 直接能用
 */

type Path = string; // 'user.findFirst' / '$transaction'
type MockValue = unknown | ((...args: any[]) => any);

function setDeep(obj: any, parts: string[], value: any) {
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    if (cur[k] === undefined) cur[k] = {};
    cur = cur[k];
  }
  cur[parts[parts.length - 1]] = value;
}

function makeMockFn(value: MockValue | undefined) {
  const fn = jest.fn();
  if (typeof value === 'function') {
    fn.mockImplementation(value as any);
  } else if (value !== undefined) {
    fn.mockResolvedValue(value);
  } else {
    fn.mockResolvedValue(undefined);
  }
  return fn;
}

export function makePrismaMock(spec: Record<Path, MockValue | undefined> = {}): any {
  const out: any = {};
  for (const [path, value] of Object.entries(spec)) {
    const parts = path.split('.');
    setDeep(out, parts, makeMockFn(value));
  }
  return out;
}
