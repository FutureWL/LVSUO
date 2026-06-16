// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

/**
 * http.page() 集成测试
 *  - vi.mock('axios') 完整替身
 *  - 验证 http.page(url, params) 把 params 透传到 instance.get(url, { params })
 *  - 验证响应经过 success callback(类似 axios 真实行为)
 *
 * 与 http.spec.ts(单元)互补:
 *  - http.spec.ts 测 resolveBaseURL / injectAuthHeader / handleResponseError 三个纯函数
 *  - 本文件测 http.page → instance.get → successCb 整条链路
 *
 * 实现: 用 vi.hoisted() 共享 mock 状态
 *   - 工厂的 create() 返回一个真实工作的 instance
 *   - instance.get 会调用注册的 successCb(模拟 axios 真实行为)
 *   - successCb 通过引用被 http.ts 注册,被测试用同样引用手动调
 */

const mocks = vi.hoisted(() => {
  // 默认 successCb 跟 axios 真实行为一致(返回 res.data)
  const refs = {
    requestCb: null as null | ((config: any) => any),
    successCb: null as null | ((res: any) => any),
    errorCb: null as null | ((err: any) => any),
    getResponse: { data: { items: [], total: 0, page: 1, pageSize: 20 } } as any,
  };
  return {
    refs,
    /**
     * 模拟 instance.get: 拿到 url+opts,过 requestCb(如有),返回 Promise
     * 然后 successCb 转换
     */
    get: vi.fn((url: string, opts: any) => {
      const config = { url, ...opts };
      const out = refs.requestCb ? refs.requestCb(config) : config;
      return Promise.resolve(refs.getResponse).then((raw) =>
        refs.successCb ? refs.successCb(raw) : raw,
      );
    }),
  };
});

vi.mock('axios', () => ({
  default: {
    create: () => ({
      get: mocks.get,
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      patch: vi.fn(),
      interceptors: {
        request: {
          use: (cb: any) => {
            mocks.refs.requestCb = cb;
          },
        },
        response: {
          use: (sCb: any, eCb: any) => {
            mocks.refs.successCb = sCb;
            mocks.refs.errorCb = eCb;
          },
        },
      },
    }),
  },
}));

import http from './http';

beforeEach(() => {
  mocks.get.mockClear();
  setActivePinia(createPinia());
  localStorage.clear();
  // 不重置 refs.successCb / requestCb —— 它们是模块加载时注册的,持久存在
});

describe('http 集成', () => {
  it('http.page 把 url + params 传给 instance.get({ params })', async () => {
    mocks.refs.getResponse = { data: { items: [], total: 0, page: 1, pageSize: 20 } };
    await http.page('/leads', { page: 1, pageSize: 20 });
    expect(mocks.get).toHaveBeenCalledWith('/leads', { params: { page: 1, pageSize: 20 } });
  });

  it('http.page 返回 res.data(经 successCb 转换)', async () => {
    mocks.refs.getResponse = { data: { items: [{ id: '1' }], total: 1, page: 1, pageSize: 20 } };
    const res = await http.page<{ id: string }>('/leads', { page: 1, pageSize: 20 });
    const items = res.items as { id: string }[];
    expect(items[0]?.id).toBe('1');
  });

  it('http.page 透传 extras 到 params(混合:分页 + 搜索)', async () => {
    mocks.refs.getResponse = { data: { items: [], total: 0, page: 1, pageSize: 20 } };
    await http.page('/leads', { page: 1, pageSize: 20, keyword: '张三', status: 'NEW_LEAD' });
    expect(mocks.get).toHaveBeenCalledWith('/leads', {
      params: { page: 1, pageSize: 20, keyword: '张三', status: 'NEW_LEAD' },
    });
  });

  it('http.get 同样走 instance.get(不是 page)', async () => {
    mocks.refs.getResponse = { data: { foo: 'bar' } };
    const res = await http.get('/some');
    expect(mocks.get).toHaveBeenCalledWith('/some', { params: undefined });
    expect(res).toEqual({ foo: 'bar' });
  });

  it('模块加载时注册了 request + response 拦截器', () => {
    expect(mocks.refs.requestCb).toBeTypeOf('function');
    expect(mocks.refs.successCb).toBeTypeOf('function');
    expect(mocks.refs.errorCb).toBeTypeOf('function');
  });

  it('successCb 默认行为:返回 res.data(等同 axios 实际行为)', () => {
    expect(mocks.refs.successCb!({ data: { items: [1, 2] } })).toEqual({ items: [1, 2] });
    expect(mocks.refs.successCb!({ data: null })).toBeNull();
  });

  it('requestCb 接收 config 转换(由 http.ts 注入 Authorization)', () => {
    // 调用注册的 requestCb,模拟 axios 内部传 config
    const fakeConfig = { headers: { set: vi.fn() } };
    const out = mocks.refs.requestCb!(fakeConfig as any);
    // 验证 set 被调(http.ts 的 injectAuthHeader 在 token 为 null 时不 set)
    // 这里 token 通过 useAuthStore 读,store 没 token → 不 set
    expect(out).toBe(fakeConfig);
  });
});
