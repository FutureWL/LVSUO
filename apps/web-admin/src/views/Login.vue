<script setup lang="ts">
import { ref, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import http from '@/api/http';
import { ElMessage } from 'element-plus';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const form = ref({
  tenantId: '',
  username: '',
  password: '',
});

const loading = ref(false);

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    username: string;
    realName: string;
    role: string;
    tenantId: string;
  };
}

const doRedirect = async (path: string) => {
  // 关键:等 DOM/store 状态彻底稳定再导航
  await nextTick();
  // 双保险:用 named route 替代字符串路径,避免 path 解析歧义
  const target = path === '/dashboard' ? { name: 'dashboard' } : path;
  try {
    await router.push(target);
  } catch (err) {
    console.error('[Login] router.push failed, fallback to location.href', err);
    // 最后兜底:硬刷新跳转
    window.location.href = path;
  }
};

const onSubmit = async () => {
  if (loading.value) return;
  loading.value = true;
  try {
    const res = await http.post<LoginResponse>('/auth/login', form.value);
    if (!res || !res.accessToken) {
      ElMessage.error('登录响应异常:未拿到 accessToken');
      return;
    }
    // 1. 先写 localStorage(同步)
    localStorage.setItem('lmsuo_token', res.accessToken);
    // 2. 再 setAuth 更新 ref
    auth.setAuth(res.accessToken, res.user);
    // 3. 验证 isAuthenticated
    if (!auth.isAuthenticated) {
      console.error('[Login] isAuthenticated is false after setAuth', { token: auth.token });
      ElMessage.error('登录状态异常,请重试');
      return;
    }
    ElMessage.success('登录成功');
    const redirect = (route.query.redirect as string) || '/dashboard';
    await doRedirect(redirect);
  } catch (err: any) {
    console.error('[Login] failed:', err);
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="login-bg">
    <el-card class="login-card">
      <h2 style="text-align: center; margin-bottom: 8px">智法云枢 · 律所管理端</h2>
      <p style="text-align: center; color: #888; margin-bottom: 24px">LM Unity · Counsel</p>
      <el-form :model="form" label-position="top" @submit.prevent="onSubmit">
        <el-form-item label="租户 ID">
          <el-input v-model="form.tenantId" placeholder="如 cmqgxxxxxxxxxxxx" />
        </el-form-item>
        <el-form-item label="用户名">
          <el-input v-model="form.username" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="form.password" type="password" show-password />
        </el-form-item>
        <el-button type="primary" :loading="loading" style="width: 100%" @click="onSubmit">
          登录
        </el-button>
      </el-form>
      <p style="text-align: center; color: #aaa; margin-top: 16px; font-size: 12px">
        任务书 V3.0 · 14.2 第 1 项:多租户与用户权限
      </p>
    </el-card>
  </div>
</template>

<style scoped>
.login-bg {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1890ff 0%, #722ed1 100%);
}
.login-card {
  width: 400px;
  border-radius: 8px;
}
</style>
