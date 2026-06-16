import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { isPlatformRole } from '@/utils/roles';

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/Login.vue'),
    meta: { public: true },
  },
  {
    path: '/error',
    name: 'error',
    component: () => import('@/views/errors/ErrorPage.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '总览驾驶舱' },
      },
      {
        path: 'leads',
        name: 'leads',
        component: () => import('@/views/leads/LeadList.vue'),
        meta: { title: '线索看板' },
      },
      {
        path: 'leads/:id',
        name: 'lead-detail',
        component: () => import('@/views/leads/LeadDetail.vue'),
        meta: { title: '线索详情' },
      },
      {
        path: 'marketing',
        name: 'marketing',
        component: () => import('@/views/marketing/ContentList.vue'),
        meta: { title: '内容合规审查' },
      },
      {
        path: 'products',
        name: 'products',
        component: () => import('@/views/products/ProductList.vue'),
        meta: { title: '服务产品库' },
      },
      {
        path: 'clients',
        name: 'clients',
        component: () => import('@/views/clients/ClientList.vue'),
        meta: { title: '客户中心' },
      },
      {
        path: 'clients/:id',
        name: 'client-detail',
        component: () => import('@/views/clients/ClientDetail.vue'),
        meta: { title: '客户详情' },
      },
      {
        path: 'quotes',
        name: 'quotes',
        component: () => import('@/views/quotes/QuoteList.vue'),
        meta: { title: '报价卡' },
      },
      {
        path: 'quotes/create',
        name: 'quote-create',
        component: () => import('@/views/quotes/QuoteCreate.vue'),
        meta: { title: '新建报价' },
      },
      {
        path: 'matters',
        name: 'matters',
        component: () => import('@/views/matters/MatterList.vue'),
        meta: { title: '案件看板' },
      },
      {
        path: 'matters/create',
        name: 'matter-create',
        component: () => import('@/views/matters/MatterCreate.vue'),
        meta: { title: '新建案件' },
      },
      {
        path: 'platform',
        name: 'platform',
        component: () => import('@/views/platform/PlatformConsole.vue'),
        meta: { title: '平台控制台', requiresPlatform: true },
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

/**
 * 路由守卫 —— 导出为函数以便单测(原内联在 router.beforeEach)
 *  - 跳转前 auth.rehydrate() 同步 localStorage
 *  - public 路由直接放行
 *  - 未登录重定向 /login,带 redirect query 记录目标
 *  - requiresPlatform 路由只允许 PLATFORM_* 角色
 */
export function authGuard(
  to: ReturnType<typeof router.resolve> extends infer R ? any : never,
  _from: any,
  next: (to?: any) => void,
) {
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
  if (to.meta.requiresPlatform && !isPlatformRole(auth.user?.role)) {
    return next({ name: 'dashboard' });
  }
  next();
}

router.beforeEach(authGuard as any);

export default router;
