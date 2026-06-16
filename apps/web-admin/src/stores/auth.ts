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
  const token = ref<string | null>(localStorage.getItem('lmsuo_token'));
  const user = ref<AuthUser | null>(null);

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

  return { token, user, isAuthenticated, setAuth, clear };
});
