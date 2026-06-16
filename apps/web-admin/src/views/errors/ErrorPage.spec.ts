// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';
import { createPinia, setActivePinia } from 'pinia';
import ErrorPage from './ErrorPage.vue';

// Stub 替身:代替 element-plus 组件(避开 CSS 加载问题)
const ElStub = defineComponent({
  name: 'ElStub',
  setup(_props, { slots, attrs }) {
    return () => h('div', { ...attrs, 'data-el-stub': true }, slots.default?.());
  },
});

/**
 * ErrorPage.vue 渲染测试
 *  - 根据 query.status 显示不同标题(403/404/默认 500)
 *  - 根据 query.message 显示描述,无则默认
 *  - "返回首页"按钮触发 router.push('/dashboard')
 *
 * 用 createMemoryHistory 隔离路由,真实 query 流转
 */

let router: Router;

async function mountError(query: Record<string, string> = {}) {
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div>home</div>' } },
      { path: '/dashboard', component: { template: '<div>dashboard</div>' } },
      { path: '/error', component: ErrorPage },
    ],
  });
  router.push({ path: '/error', query });
  await router.isReady();
  const wrapper = mount(ErrorPage, {
    global: {
      plugins: [router],
      components: { ElButton: ElStub }, // stub element-plus 组件
    },
  });
  await flushPromises();
  return wrapper;
}

beforeEach(() => {
  setActivePinia(createPinia());
  localStorage.clear();
});

describe('ErrorPage 渲染', () => {
  it('query.status=404 → 标题"资源不存在"', async () => {
    const wrapper = await mountError({ status: '404' });
    expect(wrapper.text()).toContain('404');
    expect(wrapper.text()).toContain('资源不存在');
  });

  it('query.status=403 → 标题"无权访问"', async () => {
    const wrapper = await mountError({ status: '403' });
    expect(wrapper.text()).toContain('403');
    expect(wrapper.text()).toContain('无权访问');
  });

  it('query.status 无 → 默认 500 + 标题"服务异常"', async () => {
    const wrapper = await mountError();
    expect(wrapper.text()).toContain('500');
    expect(wrapper.text()).toContain('服务异常');
  });

  it('query.status 非数字(如 abc)→ 默认 500', async () => {
    const wrapper = await mountError({ status: 'abc' });
    expect(wrapper.text()).toContain('500');
  });

  it('query.message → 显示 description', async () => {
    const wrapper = await mountError({ status: '500', message: '服务暂时不可用' });
    expect(wrapper.text()).toContain('服务暂时不可用');
  });

  it('query.message 无 → 默认描述', async () => {
    const wrapper = await mountError({ status: '500' });
    expect(wrapper.text()).toContain('抱歉,发生了一些意外');
  });

  it('"返回首页"按钮点击 → 跳到 /dashboard', async () => {
    const wrapper = await mountError({ status: '500' });
    // element-plus 组件被 stub 替身,渲染 <div data-el-stub>
    await wrapper.find('[data-el-stub]').trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/dashboard');
  });

  it('错误码显示是大字号(.code 类)', async () => {
    const wrapper = await mountError({ status: '503' });
    const codeDiv = wrapper.find('.code');
    expect(codeDiv.exists()).toBe(true);
    expect(codeDiv.text()).toBe('503');
  });
});
