import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export interface AuthUser {
  id: string;
  username: string;
  realName: string;
  role: string;
  tenantId: string;
}

const TOKEN_KEY = 'lmsuo_token';
const USER_KEY = 'lmsuo_user';

function loadStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AuthUser>;
    if (parsed.id && parsed.username && parsed.role && parsed.tenantId) {
      return parsed as AuthUser;
    }
  } catch {
    // 解析失败则清空脏数据
    localStorage.removeItem(USER_KEY);
  }
  return null;
}

export const useAuthStore = defineStore('auth', () => {
  // 初始化时同步从 localStorage 读,刷新后也能恢复登录态
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY));
  const user = ref<AuthUser | null>(loadStoredUser());

  // 同时有 token 和用户信息才算已登录
  const isAuthenticated = computed(() => !!token.value && !!user.value);

  function setAuth(accessToken: string, u: AuthUser) {
    token.value = accessToken;
    user.value = u;
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
  }

  function clear() {
    token.value = null;
    user.value = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  /**
   * 同步从 localStorage 重新加载 token 和用户信息
   * 用于页面刷新后 store 状态与 localStorage 同步
   */
  function rehydrate() {
    const t = localStorage.getItem(TOKEN_KEY);
    if (t && t !== token.value) {
      token.value = t;
    }
    const u = loadStoredUser();
    if (u && (!user.value || u.id !== user.value.id)) {
      user.value = u;
    }
  }

  return { token, user, isAuthenticated, setAuth, clear, rehydrate };
});
