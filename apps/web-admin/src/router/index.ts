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
        path: 'matters',
        name: 'matters',
        component: () => import('@/views/matters/MatterList.vue'),
        meta: { title: '案件看板' },
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, _from, next) => {
  const auth = useAuthStore();
  // 路由跳转前先同步 localStorage(防御刷新后 store 状态丢失)
  auth.rehydrate();
  if (to.meta.public) return next();
  if (!auth.isAuthenticated) {
    return next({ name: 'login', query: { redirect: to.fullPath } });
  }
  next();
});

export default router;
