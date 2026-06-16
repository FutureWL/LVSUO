import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

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

router.beforeEach((to, _from, next) => {
  const auth = useAuthStore();
  // 路由跳转前先同步 localStorage(防御刷新后 store 状态丢失)
  auth.rehydrate();
  if (to.meta.public) return next();
  if (!auth.isAuthenticated) {
    // 跳转目标去掉 /lvsuo/ base，避免登录成功后 router.push 把 base 再拼一次
    const base = import.meta.env.BASE_URL || '/';
    const redirect =
      base !== '/' && to.fullPath.startsWith(base)
        ? to.fullPath.slice(base.length - 1)
        : to.fullPath;
    return next({ name: 'login', query: { redirect } });
  }
  // 平台角色才能进入的路由
  if (to.meta.requiresPlatform && !auth.user?.role?.startsWith('PLATFORM_')) {
    return next({ name: 'dashboard' });
  }
  next();
});

export default router;
