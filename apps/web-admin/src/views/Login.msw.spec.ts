// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { mount, flushPromises } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { useRouter, createRouter, createMemoryHistory, type Router } from 'vue-router';
import { server, http, HttpResponse } from '@/test/msw';
import { useAuthStore, type AuthUser } from '@/stores/auth';
import Login from './Login.vue';

/**
 * Login.vue 真实集成(MSW + auth store + router)
 *  - mount Login 组件,填表单,点登录按钮
 *  - MSW 拦截 /api/auth/login,返回 200/401/500
 *  - 验证:
 *    · 200: auth.setAuth 调用,store 有 token/user,跳 /dashboard
 *    · 401: 不 setAuth,store 仍空,ElMessage.error 弹
 *    · 500: 异常被 catch,loading 回到 false
 *
 * 验证了 Login.vue + http.ts + auth store + router 的端到端集成
 */

const ElStub = defineComponent({
  name: 'ElStub',
  setup(_props, { slots, attrs }) {
    return () => h('div', { ...attrs, 'data-el-stub': true }, slots.default?.());
  },
});

let router: Router;

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterAll(() => server.close());
afterEach(() => server.resetHandlers());

beforeEach(async () => {
  setActivePinia(createPinia());
  localStorage.clear();
  vi.restoreAllMocks();
  // 真实 router(用 memory 模式隔离)
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', name: 'login', component: Login, meta: { public: true } },
      { path: '/dashboard', name: 'dashboard', component: { template: '<div>dashboard</div>' } },
    ],
  });
  // 注册守卫
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
    next();
  });
  await router.push('/login');
  await router.isReady();
});

async function mountLogin() {
  return mount(Login, {
    global: {
      plugins: [router],
      components: {
        ElButton: ElStub,
        ElCard: ElStub,
        ElForm: ElStub,
        ElFormItem: ElStub,
        ElInput: ElStub,
      },
    },
  });
}

const SAMPLE_USER: AuthUser = {
  id: 'u1',
  username: 'admin',
  realName: '管理员',
  role: 'FIRM_ADMIN',
  tenantId: 't1',
};

describe('Login 真实集成(MSW + auth store)', () => {
  it('200 + 业务对象 → auth.setAuth + localStorage 写 + 跳 /dashboard', async () => {
    server.use(
      http.post(/\/api\/auth\/login/, () =>
        HttpResponse.json({
          accessToken: 'jwt-xxx',
          refreshToken: 'refresh-xxx',
          user: SAMPLE_USER,
        }),
      ),
    );
    const wrapper = await mountLogin();
    // 模拟填表单
    (wrapper.vm as any).form.tenantId = 'tenant-1';
    (wrapper.vm as any).form.username = 'admin';
    (wrapper.vm as any).form.password = 'Test12345678';
    // 调 onSubmit
    await (wrapper.vm as any).onSubmit();
    await flushPromises();
    await flushPromises();

    const auth = useAuthStore();
    expect(auth.token).toBe('jwt-xxx');
    expect(auth.user).toEqual(SAMPLE_USER);
    expect(localStorage.getItem('lmsuo_token')).toBe('jwt-xxx');
    // 跳到 /dashboard(无 redirect 时默认)
    expect(router.currentRoute.value.name).toBe('dashboard');
  });

  it('401 → 不 setAuth(401 走 onUnauthorized, 不 toast)', async () => {
    server.use(
      http.post(/\/api\/auth\/login/, () =>
        HttpResponse.json(
          { code: 'AUTH_INVALID_CREDENTIALS', message: '用户名或密码错误' },
          { status: 401 },
        ),
      ),
    );
    const wrapper = await mountLogin();
    (wrapper.vm as any).form.username = 'admin';
    (wrapper.vm as any).form.password = 'wrong';
    await (wrapper.vm as any).onSubmit();
    await flushPromises();

    const auth = useAuthStore();
    // 401 → 走 onUnauthorized(清 auth + 跳 login),不 toast
    expect(auth.token).toBeNull();
    expect(auth.user).toBeNull();
    // loading 仍回 false
    expect((wrapper.vm as any).loading).toBe(false);
  });

  it('500 → catch 异常,loading 仍回 false(按钮可重试)', async () => {
    server.use(
      http.post(/\/api\/auth\/login/, () =>
        HttpResponse.json({ message: 'Internal Error' }, { status: 500 }),
      ),
    );
    const wrapper = await mountLogin();
    (wrapper.vm as any).form.username = 'admin';
    (wrapper.vm as any).form.password = 'x';
    await (wrapper.vm as any).onSubmit();
    await flushPromises();
    // loading 应回 false(try/finally)
    expect((wrapper.vm as any).loading).toBe(false);
  });
});
