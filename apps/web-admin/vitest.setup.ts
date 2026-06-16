/**
 * vitest setup —— 在所有 spec 运行前加载
 *
 * 解决 element-plus 的 CSS 加载问题:
 *  - element-plus 在 node/happy-dom 下 import .css 报 'Unknown file extension'
 *  - vi.mock 用具体路径经常拦不到(可能因为 query string / 子路径 / 顺序)
 *  - 干脆 mock 整个 element-plus 包,用 stub 替身代替真实组件
 *
 * 代价:
 *  - 测试里 <el-button> 等不会渲染真实 Element Plus 组件
 *  - 但 ErrorPage 自己的结构和逻辑能测
 *  - 组件代码本身可以靠 e2e / 浏览器验证
 */
import { vi } from 'vitest';
import { defineComponent, h } from 'vue';

// 用一个能渲染任意 children 的 stub 组件代替所有 Element Plus 组件
const Stub = defineComponent({
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
  ],
  setup(props, { slots, attrs, emit }) {
    return () => h('div', { ...attrs, 'data-el-stub': true }, slots.default?.());
  },
});

// 通用 stub 替身:任何 import 都拿到一个能渲染 slot 的组件
function makeElStub() {
  return new Proxy(
    { name: 'ElStub' },
    {
      get(_target, prop) {
        if (prop === 'install') return () => {};
        if (prop === 'default' || prop === 'render') return Stub;
        return Stub;
      },
    },
  );
}

vi.mock('element-plus', () => ({
  default: makeElStub(),
  ElButton: Stub,
  ElInput: Stub,
  ElForm: Stub,
  ElFormItem: Stub,
  ElCard: Stub,
  ElTable: Stub,
  ElTableColumn: Stub,
  ElPagination: Stub,
  ElSelect: Stub,
  ElOption: Stub,
  ElDialog: Stub,
  ElRadio: Stub,
  ElRadioGroup: Stub,
  ElCheckbox: Stub,
  ElCheckboxGroup: Stub,
  ElInputNumber: Stub,
  ElTag: Stub,
  ElTooltip: Stub,
  ElEmpty: Stub,
  ElLoading: Stub,
  ElRow: Stub,
  ElCol: Stub,
  ElDescriptions: Stub,
  ElDescriptionsItem: Stub,
  ElSpace: Stub,
  ElButtonGroup: Stub,
  ElMenu: Stub,
  ElMenuItem: Stub,
  ElSubMenu: Stub,
  ElHeader: Stub,
  ElAside: Stub,
  ElMain: Stub,
  ElContainer: Stub,
}));
