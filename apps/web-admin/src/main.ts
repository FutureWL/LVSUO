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

app.mount('#app');
