<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import http from '@/api/http';
import { ElMessage } from 'element-plus';
import { resolveRedirectTarget } from '@/utils/redirect';

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

const onSubmit = async () => {
  if (loading.value) return;
  loading.value = true;
  try {
    const res = await http.post<LoginResponse>('/auth/login', form.value);
    if (!res || !res.accessToken) {
      ElMessage.error('登录响应异常:未拿到 accessToken');
      return;
    }
    // 1. 写 localStorage(同步)
    localStorage.setItem('lmsuo_token', res.accessToken);

    // 2. 更新 Pinia store
    auth.setAuth(res.accessToken, res.user);

    // 3. 关键日志(便于排查)
    console.log('[Login] success', {
      role: res.user.role,
      tenantId: res.user.tenantId,
      isAuthenticated: auth.isAuthenticated,
    });

    ElMessage.success('登录成功');

    // 4. 解析跳转目标
    //    默认 /dashboard;若 URL 有 ?redirect=xxx 则跳到那里
    const target = resolveRedirectTarget(route.query as any);

    console.log('[Login] redirecting to:', target);

    // 5. 三重保险:route push + nextTick 兜底 + 硬刷新兜底
    try {
      await router.push(target);
    } catch (navErr) {
      console.warn('[Login] router.push failed, fallback to location.href', navErr);
      window.location.href = target;
    }
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
