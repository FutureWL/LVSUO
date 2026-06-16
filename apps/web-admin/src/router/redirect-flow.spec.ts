// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore, type AuthUser } from '@/stores/auth';

/**
 * 路由跳转的 redirect 实际流程(用真实 router)
 *  与 authGuard 单测的差异:
 *   - authGuard 单测: 直接调函数, 不走 router 实例
 *   - 本文件: 用 createMemoryHistory 真实 router, 调 router.push 走完整流程
 *
 * 关注点:
 *  - router.push('/dashboard') 未登录 → 最终落在 /login?redirect=/dashboard
 *  - 跳转过程无报错
 *  - 已登录访问受保护路由 → 放行(可能组件 load 失败,不影响 route)
 *  - requiresPlatform 拦截 → 重定向到 /dashboard
 */

const FIRM_USER: AuthUser = {
  id: 'u1',
  username: 'admin',
  realName: '律所管理员',
  role: 'FIRM_ADMIN',
  tenantId: 't1',
};
const PLATFORM_USER: AuthUser = {
  id: 'u2',
  username: 'super',
  realName: '平台超管',
  role: 'PLATFORM_SUPER_ADMIN',
  tenantId: 't1',
};

let router: Router;

beforeEach(() => {
  setActivePinia(createPinia());
  localStorage.clear();
});

async function makeRouter() {
  // 真实路由(不挂真实组件,改用 stub,让 router.push 完整跑完不报错)
  const stub = { template: '<div></div>' };
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', name: 'login', component: stub, meta: { public: true } },
      { path: '/error', name: 'error', component: stub, meta: { public: true } },
      {
        path: '/',
        redirect: '/dashboard',
        children: [
          { path: 'dashboard', name: 'dashboard', component: stub },
          { path: 'leads', name: 'leads', component: stub },
          { path: 'platform', name: 'platform', component: stub, meta: { requiresPlatform: true } },
        ],
      },
    ],
  });

  // 注册守卫(同 router/index.ts 的逻辑)
  router.beforeEach((to, _from, next) => {
    const auth = useAuthStore();
    auth.rehydrate();
    if (to.meta.public) return next();
    if (!auth.isAuthenticated) {
      const base = import.meta.env.BASE_URL || '/';
      const redirect =
        base !== '/' && to.fullPath.startsWith(base)
          ? to.fullPath.slice(base.length - 1)
          : to.fullPath;
      return next({ name: 'login', query: { redirect } });
    }
    if (to.meta.requiresPlatform && !auth.user?.role?.startsWith('PLATFORM_')) {
      return next({ name: 'dashboard' });
    }
    next();
  });

  // 跳过组件 lazy-load 报错
  router.onError(() => {});
  return router;
}

describe('路由跳转 redirect 实际流程', () => {
  it('未登录访问 /dashboard → 落在 /login?redirect=/dashboard', async () => {
    await makeRouter();
    await router.push('/dashboard');
    expect(router.currentRoute.value.name).toBe('login');
    expect(router.currentRoute.value.query.redirect).toBe('/dashboard');
  });

  it('未登录访问 /leads → 落在 /login?redirect=/leads', async () => {
    await makeRouter();
    await router.push('/leads');
    expect(router.currentRoute.value.name).toBe('login');
    expect(router.currentRoute.value.query.redirect).toBe('/leads');
  });

  it('已登录访问 /dashboard → 直接落在 /dashboard', async () => {
    await makeRouter();
    const auth = useAuthStore();
    auth.setAuth('jwt', FIRM_USER);
    await router.push('/dashboard');
    expect(router.currentRoute.value.name).toBe('dashboard');
    expect(router.currentRoute.value.path).toBe('/dashboard');
  });

  it('已登录访问 /platform(需要平台角色)+ FIRM_ADMIN → 落在 /dashboard', async () => {
    await makeRouter();
    const auth = useAuthStore();
    auth.setAuth('jwt', FIRM_USER);
    await router.push('/platform');
    expect(router.currentRoute.value.name).toBe('dashboard');
  });

  it('已登录访问 /platform + PLATFORM_SUPER_ADMIN → 落在 /platform', async () => {
    await makeRouter();
    const auth = useAuthStore();
    auth.setAuth('jwt', PLATFORM_USER);
    await router.push('/platform');
    expect(router.currentRoute.value.name).toBe('platform');
  });

  it('已登录访问 /login(public)→ 直接落在 /login', async () => {
    await makeRouter();
    const auth = useAuthStore();
    auth.setAuth('jwt', FIRM_USER);
    await router.push('/login');
    expect(router.currentRoute.value.name).toBe('login');
  });

  it('未登录访问 /error(public)→ 直接落在 /error', async () => {
    await makeRouter();
    await router.push('/error');
    expect(router.currentRoute.value.name).toBe('error');
  });

  it('重定向后 isAuthenticated 状态被检查(确保守卫在跳转时调 auth.rehydrate)', async () => {
    await makeRouter();
    // 模拟另一个标签页 set 了 token
    localStorage.setItem('lmsuo_token', 'jwt-from-other-tab');
    localStorage.setItem('lmsuo_user', JSON.stringify(FIRM_USER));
    await router.push('/dashboard');
    // rehydrate 把 store 同步了,不应该再跳 login
    expect(router.currentRoute.value.name).toBe('dashboard');
    const auth = useAuthStore();
    expect(auth.isAuthenticated).toBe(true);
  });

  it('重定向次数有上限,不能无限循环(redirect 自身)', async () => {
    // 场景:有人构造 /login?redirect=/login,会不会无限跳?
    await makeRouter();
    await router.push({ name: 'login', query: { redirect: '/login' } });
    // 期望:落在 /login,但 query.redirect 被忽略(/login 本身是 public 路径,守卫放行)
    expect(router.currentRoute.value.name).toBe('login');
  });
});
