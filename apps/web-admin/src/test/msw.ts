/**
 * MSW (Mock Service Worker) setup for vitest
 *  - handlers: 共享的 http mock 列表
 *  - server: setupServer 实例,beforeAll listen,afterAll close
 *  - 真实网络请求走 MSW 拦截,不连外网
 *
 * 用法(spec):
 *   import { server, http, HttpResponse } from '@/test/msw';
 *   beforeAll(() => server.listen());
 *   afterAll(() => server.close());
 *   server.use(http.get('/api/leads', () => HttpResponse.json({...})));
 */
import { setupServer, type SetupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// 共享 handlers —— 不写 spec 级 mock 时,这些是默认响应
export const defaultHandlers = [
  // 任何 /api/* GET → 200 空响应(让不关心响应的测试不抛 404)
  http.get(/\/api\/.*/, () => HttpResponse.json({})),
];

export const server: SetupServer = setupServer(...defaultHandlers);

// 重新导出常用 MSW API,简化 spec import
export { http, HttpResponse };
