// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore, type AuthUser } from '@/stores/auth';
import { authGuard } from './index';

/**
 * 路由守卫(authGuard)单测
 *  - public 路由直接放行
 *  - 未登录 → 重定向 /login 带 redirect query
 *  - requiresPlatform 路由只允许 PLATFORM_* 角色
 *
 * 通过把守卫抽成导出函数(原内联在 router.beforeEach),
 *  测起来直接调,不需要 router.push() 触发 lazy 组件加载
 *
 * 注: BASE_URL=/lvsuo/ 的剥 base 逻辑,test 环境 BASE_URL=/,无法模拟
 *  vi.stubGlobal 对 import.meta.env 无效(Vite 冻结对象),留待 e2e 验证
 */

const PLATFORM_USER: AuthUser = {
  id: 'u1',
  username: 'super',
  realName: '平台超管',
  role: 'PLATFORM_SUPER_ADMIN',
  tenantId: 't1',
};
const FIRM_USER: AuthUser = {
  id: 'u2',
  username: 'admin',
  realName: '律所管理员',
  role: 'FIRM_ADMIN',
  tenantId: 't1',
};

function nextMock() {
  return vi.fn();
}

function makeTo(opts: {
  name?: string;
  path: string;
  fullPath: string;
  meta?: Record<string, any>;
}) {
  // authGuard 内部用: to.meta.public / to.meta.requiresPlatform / to.fullPath
  return {
    name: opts.name,
    path: opts.path,
    fullPath: opts.fullPath,
    meta: opts.meta ?? {},
  } as any;
}

beforeEach(() => {
  setActivePinia(createPinia());
  localStorage.clear();
  vi.unstubAllGlobals();
  // 重置 BASE_URL mock(test 环境 default /,Vite 冻结,stub 不生效)
  vi.stubGlobal('import.meta.env', { BASE_URL: '/' });
});

describe('authGuard', () => {
  describe('public 路由', () => {
    it('未登录访问 /login → 放行', () => {
      const to = makeTo({
        name: 'login',
        path: '/login',
        fullPath: '/login',
        meta: { public: true },
      });
      const next = nextMock();
      authGuard(to, {} as any, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('未登录访问 /error → 放行', () => {
      const to = makeTo({
        name: 'error',
        path: '/error',
        fullPath: '/error',
        meta: { public: true },
      });
      const next = nextMock();
      authGuard(to, {} as any, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('已登录访问 /login 也放行(public 优先)', () => {
      const auth = useAuthStore();
      auth.setAuth('jwt', FIRM_USER);
      const to = makeTo({
        name: 'login',
        path: '/login',
        fullPath: '/login',
        meta: { public: true },
      });
      const next = nextMock();
      authGuard(to, {} as any, next);
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('未登录访问受保护路由', () => {
    it('重定向到 /login,带 redirect query', () => {
      const to = makeTo({ name: 'dashboard', path: '/dashboard', fullPath: '/dashboard' });
      const next = nextMock();
      authGuard(to, {} as any, next);
      expect(next).toHaveBeenCalledWith({ name: 'login', query: { redirect: '/dashboard' } });
    });

    it('带子路径 /leads/:id 也能正确传 redirect', () => {
      const to = makeTo({ name: 'lead-detail', path: '/leads/:id', fullPath: '/leads/abc123' });
      const next = nextMock();
      authGuard(to, {} as any, next);
      expect(next).toHaveBeenCalledWith({ name: 'login', query: { redirect: '/leads/abc123' } });
    });
  });

  describe('BASE_URL 处理(注:test 环境 BASE_URL 是 /,剥 base 逻辑无法测)', () => {
    it('BASE_URL=/(根)目标不剥(原样)—— 这就是 test 环境的实际行为', () => {
      // 部署到子目录(如 /lvsuo/)时,守卫会 to.fullPath.slice(base.length - 1) 剥 base
      // 但 test 环境下 BASE_URL=/,跳过剥 base 分支,redirect 是 fullPath 原样
      // 真实部署行为留待 e2e 验证
      const to = makeTo({ name: 'dashboard', path: '/dashboard', fullPath: '/dashboard' });
      const next = nextMock();
      authGuard(to, {} as any, next);
      expect(next).toHaveBeenCalledWith({ name: 'login', query: { redirect: '/dashboard' } });
    });
  });

  describe('已登录', () => {
    it('普通受保护路由 → 放行', () => {
      const auth = useAuthStore();
      auth.setAuth('jwt', FIRM_USER);
      const to = makeTo({ name: 'leads', path: '/leads', fullPath: '/leads' });
      const next = nextMock();
      authGuard(to, {} as any, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('requiresPlatform + PLATFORM 角色 → 放行', () => {
      const auth = useAuthStore();
      auth.setAuth('jwt', PLATFORM_USER);
      const to = makeTo({
        name: 'platform',
        path: '/platform',
        fullPath: '/platform',
        meta: { requiresPlatform: true },
      });
      const next = nextMock();
      authGuard(to, {} as any, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('requiresPlatform + 非 PLATFORM 角色 → 重定向 /dashboard', () => {
      const auth = useAuthStore();
      auth.setAuth('jwt', FIRM_USER);
      const to = makeTo({
        name: 'platform',
        path: '/platform',
        fullPath: '/platform',
        meta: { requiresPlatform: true },
      });
      const next = nextMock();
      authGuard(to, {} as any, next);
      expect(next).toHaveBeenCalledWith({ name: 'dashboard' });
    });

    it('PLATFORM_OPERATOR 也能进 platform 路由(任何 PLATFORM_ 开头都行)', () => {
      const auth = useAuthStore();
      auth.setAuth('jwt', { ...PLATFORM_USER, role: 'PLATFORM_OPERATOR' });
      const to = makeTo({
        name: 'platform',
        path: '/platform',
        fullPath: '/platform',
        meta: { requiresPlatform: true },
      });
      const next = nextMock();
      authGuard(to, {} as any, next);
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('rehydrate 行为', () => {
    it('守卫调用前 rehydrate():从 localStorage 拉 user', () => {
      // 模拟"页面刷新后第一次跳转"
      localStorage.setItem('lmsuo_token', 'jwt-xxx');
      localStorage.setItem('lmsuo_user', JSON.stringify(FIRM_USER));
      const auth = useAuthStore();
      const to = makeTo({ name: 'dashboard', path: '/dashboard', fullPath: '/dashboard' });
      const next = nextMock();
      authGuard(to, {} as any, next);
      // rehydrate 同步了 localStorage,user 应该被设上
      expect(auth.user).toEqual(FIRM_USER);
      expect(next).toHaveBeenCalledWith();
    });
  });
});
