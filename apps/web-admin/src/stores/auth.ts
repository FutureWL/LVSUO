import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export interface AuthUser {
  id: string;
  username: string;
  realName: string;
  role: string;
  tenantId: string;
}

export const useAuthStore = defineStore('auth', () => {
  // 初始化时同步从 localStorage 读
  const token = ref<string | null>(localStorage.getItem('lmsuo_token'));
  const user = ref<AuthUser | null>(null);

  // 派生计算:有 token 即视为已登录
  const isAuthenticated = computed(() => !!token.value);

  function setAuth(accessToken: string, u: AuthUser) {
    token.value = accessToken;
    user.value = u;
    localStorage.setItem('lmsuo_token', accessToken);
  }

  function clear() {
    token.value = null;
    user.value = null;
    localStorage.removeItem('lmsuo_token');
  }

  /**
   * 同步从 localStorage 重新加载 token
   * 用于页面刷新后 store 状态与 localStorage 同步
   */
  function rehydrate() {
    const t = localStorage.getItem('lmsuo_token');
    if (t && t !== token.value) {
      token.value = t;
    }
  }

  return { token, user, isAuthenticated, setAuth, clear, rehydrate };
});
