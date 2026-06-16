import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import zhCn from 'element-plus/dist/locale/zh-cn.mjs';

import App from './App.vue';
import router from './router';
import { useAuthStore } from './stores/auth';
import './styles/global.scss';

const app = createApp(App);

app.use(createPinia());

// 同步 auth store 与 localStorage(防止 HMR / 刷新后状态不一致)
const auth = useAuthStore();
auth.rehydrate();

app.use(router);
app.use(ElementPlus, { locale: zhCn });

// 全局错误兜底:组件渲染 / 生命周期抛出的同步异常 → 跳到 /error?status=500
// HTTP 错误走 axios 拦截器(已分类处理)
app.config.errorHandler = (err, _instance, info) => {
  // eslint-disable-next-line no-console
  console.error('[vue error]', err, info);
  if (router.currentRoute.value.name !== 'error') {
    router.replace({ name: 'error', query: { status: '500', message: '页面渲染异常' } });
  }
};

app.mount('#app');
