// @vitest-environment happy-dom
import { mount, flushPromises } from '@vue/test-utils';
import type { Component } from 'vue';
import { defineComponent, h } from 'vue';
import { setActivePinia, createPinia } from 'pinia';
import { createRouter, createMemoryHistory, type Router, type RouteRecordRaw } from 'vue-router';

/**
 * View 测试通用 helper
 *  目标:把视图端到端测试的 boilerplate(El stub、pinia、mount)抽到一起
 *  让新 spec 只关心业务:mock MSW → mountView → assert
 */

/** 通用 Element Plus 组件 stub,支持 click 事件,能渲染 slot */
export const ElStub = defineComponent({
  name: 'ElStub',
  props: [
    'type',
    'placeholder',
    'modelValue',
    'label',
    'disabled',
    'size',
    'clearable',
    'showPassword',
    'loading',
    'link',
  ],
  setup(_props, { slots, attrs, emit }) {
    return () =>
      h(
        'div',
        {
          ...attrs,
          'data-el-stub': true,
          onClick: () => emit('click'),
        },
        slots.default?.(),
      );
  },
});

/** el-input 专用 stub:显示 modelValue,支持 disabled 属性 */
export const ElInputStub = defineComponent({
  name: 'ElInput',
  props: ['modelValue', 'placeholder', 'disabled', 'type', 'rows'],
  setup(_props, { slots, attrs }) {
    return () =>
      h(
        'div',
        {
          ...attrs,
          'data-el-input': true,
          'data-disabled': !!_props.disabled,
          'data-value': _props.modelValue ?? '',
        },
        [slots.default?.(), h('span', String(_props.modelValue ?? ''))],
      );
  },
});

/** el-table stub:渲染列名,并在 slots 外渲染 data 行 */
export const ElTableStub = defineComponent({
  name: 'ElTable',
  props: ['data'],
  setup(_props, { slots, attrs }) {
    return () =>
      h('div', { ...attrs, 'data-table': true }, [
        slots.default?.(),
        (_props.data || []).map((row: any) =>
          h(
            'div',
            { 'data-row': row.id, key: row.id },
            row.clientName ??
              row.matterNo ??
              row.matterTitle ??
              row.productName ??
              row.title ??
              row.id ??
              '',
          ),
        ),
      ]);
  },
});

/** el-table-column stub:渲染 label,并给 scope slot 传 row */
export const ElTableColumnStub = defineComponent({
  name: 'ElTableColumn',
  props: ['label', 'prop', 'width'],
  setup(_props, { slots }) {
    return () =>
      h('label', { 'data-col': _props.prop ?? _props.label }, [
        h('span', { class: 'col-label' }, _props.label ?? ''),
        slots.default ? h('div', { class: 'col-body' }, slots.default({ row: {} })) : null,
      ]);
  },
});

/** el-empty stub:渲染 description */
export const ElEmptyStub = defineComponent({
  name: 'ElEmpty',
  props: ['description'],
  setup(props) {
    return () => h('div', { 'data-el-empty': true }, props.description ?? '');
  },
});

/** el-dialog stub:渲染 header/default/footer 三个 slot */
export const ElDialogStub = defineComponent({
  name: 'ElDialog',
  setup(_, { slots, attrs }) {
    return () =>
      h('div', { ...attrs, 'data-el-dialog': true }, [
        slots.header ? h('div', { 'data-dialog-header': true }, slots.header()) : null,
        slots.default?.(),
        slots.footer ? h('div', { 'data-dialog-footer': true }, slots.footer()) : null,
      ]);
  },
});

/** el-form-item stub */
export const ElFormItemStub = defineComponent({
  name: 'ElFormItem',
  setup(_, { slots }) {
    return () => h('div', { 'data-form-item': true }, slots.default?.());
  },
});

/** 通用 Element Plus 组件注册表(给 mount global.components 用) */
export const elementPlusComponents = {
  ElButton: ElStub,
  ElInput: ElInputStub,
  ElForm: ElStub,
  ElFormItem: ElFormItemStub,
  ElCard: ElStub,
  ElTable: ElTableStub,
  ElTableColumn: ElTableColumnStub,
  ElPagination: ElStub,
  ElSelect: ElStub,
  ElOption: ElStub,
  ElDialog: ElDialogStub,
  ElInputNumber: ElStub,
  ElRow: ElStub,
  ElCol: ElStub,
  ElDescriptions: ElStub,
  ElDescriptionsItem: ElStub,
  ElSpace: ElStub,
  ElTag: ElStub,
  ElCheckbox: ElStub,
  ElCheckboxGroup: ElStub,
  ElRadio: ElStub,
  ElRadioGroup: ElStub,
  ElAlert: ElStub,
  ElEmpty: ElEmptyStub,
};

export interface MountViewOptions {
  /** 可选的真实 router(会作为 plugin) */
  router?: Router;
  /** 额外全局组件,合并到 elementPlusComponents 之上 */
  components?: Record<string, Component>;
  /** 是否自动 setActivePinia(createPinia()) */
  withPinia?: boolean;
}

/** 通用 mount helper:设置 pinia + 注册 Element Plus stubs + 可选 router */
export async function mountView(component: Component, options: MountViewOptions = {}) {
  if (options.withPinia !== false) {
    setActivePinia(createPinia());
  }
  const wrapper = mount(component, {
    global: {
      plugins: options.router ? [options.router] : [],
      components: {
        ...elementPlusComponents,
        ...options.components,
      },
    },
  });
  await flushPromises();
  await flushPromises();
  return wrapper;
}

/**
 * 创建测试 router(memory history,隔离其他测试)
 *  - 为每个 route 默认 component = { template: '<div data-stub-route />' }
 *    除非要测跳转到的 route,再传真实 component
 *  - 返回 isReady 的 router
 *
 * 例:
 *   const router = await makeTestRouter([
 *     { path: '/leads', name: 'leads', component: LeadList },
 *     { path: '/leads/:id', name: 'lead-detail' },
 *   ]);
 *   await router.push('/leads');
 */
export type TestRoute = {
  path: string;
  name?: string;
  component?: Component;
  meta?: Record<string, unknown>;
};

export async function makeTestRouter(routes: TestRoute[], initialPath?: string): Promise<Router> {
  const STUB: Component = { template: '<div data-stub-route />' };
  const router = createRouter({
    history: createMemoryHistory(),
    routes: routes.map((r) => ({ ...r, component: r.component ?? STUB })) as RouteRecordRaw[],
  });
  if (initialPath) {
    await router.push(initialPath);
  }
  await router.isReady();
  return router;
}

/** 找页面中所有看起来像按钮的 stub 节点 */
export function findButtons(wrapper: any) {
  return wrapper.findAll('[data-el-stub]');
}

/** 找包含指定文本的按钮并 trigger('click') */
export async function clickButtonByText(wrapper: any, text: string) {
  const btns = findButtons(wrapper);
  const target = btns.find((b: any) => b.text().includes(text));
  if (!target) throw new Error(`Button with text "${text}" not found`);
  await target.trigger('click');
  await flushPromises();
  await flushPromises();
}
