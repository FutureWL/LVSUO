// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore, type AuthUser } from './auth';

/**
 * auth store 单测
 *  - setAuth / clear / rehydrate 三个核心 action
 *  - isAuthenticated 计算属性
 *  - localStorage 持久化 + 解析容错
 *
 * 每个测试: setActivePinia(createPinia()) + localStorage.clear()
 */

const SAMPLE_USER: AuthUser = {
  id: 'user-1',
  username: 'admin',
  realName: '测试管理员',
  role: 'FIRM_ADMIN',
  tenantId: 'tenant-1',
};

beforeEach(() => {
  setActivePinia(createPinia());
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('useAuthStore', () => {
  describe('初始状态', () => {
    it('localStorage 空 → token/user 都是 null,isAuthenticated=false', () => {
      const auth = useAuthStore();
      expect(auth.token).toBeNull();
      expect(auth.user).toBeNull();
      expect(auth.isAuthenticated).toBe(false);
    });

    it('localStorage 有 token + user → 初始化时自动恢复', () => {
      localStorage.setItem('lmsuo_token', 'jwt-xxx');
      localStorage.setItem('lmsuo_user', JSON.stringify(SAMPLE_USER));
      const auth = useAuthStore();
      expect(auth.token).toBe('jwt-xxx');
      expect(auth.user).toEqual(SAMPLE_USER);
      expect(auth.isAuthenticated).toBe(true);
    });

    it('localStorage 脏数据(非 JSON)→ 启动时清掉,user=null', () => {
      localStorage.setItem('lmsuo_token', 'jwt-xxx');
      localStorage.setItem('lmsuo_user', 'not-json{{');
      const auth = useAuthStore();
      expect(auth.user).toBeNull();
      // 解析失败时 loadStoredUser 会 removeItem 清掉
      expect(localStorage.getItem('lmsuo_user')).toBeNull();
      // token 还在(user 失败不影响 token)
      expect(auth.token).toBe('jwt-xxx');
    });

    it('localStorage user 缺字段 → 视为无效,user=null', () => {
      localStorage.setItem('lmsuo_token', 'jwt-xxx');
      localStorage.setItem('lmsuo_user', JSON.stringify({ id: 'u1' })); // 缺 username/role/tenantId
      const auth = useAuthStore();
      expect(auth.user).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('有 token 无 user → false', () => {
      localStorage.setItem('lmsuo_token', 'jwt-xxx');
      const auth = useAuthStore();
      expect(auth.isAuthenticated).toBe(false);
    });

    it('有 user 无 token → false', () => {
      localStorage.setItem('lmsuo_user', JSON.stringify(SAMPLE_USER));
      const auth = useAuthStore();
      expect(auth.isAuthenticated).toBe(false);
    });

    it('两者都有 → true', () => {
      localStorage.setItem('lmsuo_token', 'jwt-xxx');
      localStorage.setItem('lmsuo_user', JSON.stringify(SAMPLE_USER));
      const auth = useAuthStore();
      expect(auth.isAuthenticated).toBe(true);
    });
  });

  describe('setAuth', () => {
    it('写 token + user 到 ref 和 localStorage', () => {
      const auth = useAuthStore();
      auth.setAuth('jwt-new', SAMPLE_USER);
      expect(auth.token).toBe('jwt-new');
      expect(auth.user).toEqual(SAMPLE_USER);
      expect(localStorage.getItem('lmsuo_token')).toBe('jwt-new');
      expect(localStorage.getItem('lmsuo_user')).toBe(JSON.stringify(SAMPLE_USER));
    });

    it('setAuth 后 isAuthenticated=true', () => {
      const auth = useAuthStore();
      auth.setAuth('jwt-new', SAMPLE_USER);
      expect(auth.isAuthenticated).toBe(true);
    });
  });

  describe('clear', () => {
    it('清空 ref 和 localStorage', () => {
      localStorage.setItem('lmsuo_token', 'jwt-xxx');
      localStorage.setItem('lmsuo_user', JSON.stringify(SAMPLE_USER));
      const auth = useAuthStore();
      auth.clear();
      expect(auth.token).toBeNull();
      expect(auth.user).toBeNull();
      expect(localStorage.getItem('lmsuo_token')).toBeNull();
      expect(localStorage.getItem('lmsuo_user')).toBeNull();
    });

    it('clear 后 isAuthenticated=false', () => {
      const auth = useAuthStore();
      auth.setAuth('jwt', SAMPLE_USER);
      auth.clear();
      expect(auth.isAuthenticated).toBe(false);
    });
  });

  describe('rehydrate', () => {
    it('从 localStorage 拉新 token(原 token 不同时)', () => {
      const auth = useAuthStore();
      auth.setAuth('jwt-old', SAMPLE_USER);
      // 模拟另一个标签页修改了 localStorage
      localStorage.setItem('lmsuo_token', 'jwt-new-from-other-tab');
      auth.rehydrate();
      expect(auth.token).toBe('jwt-new-from-other-tab');
    });

    it('localStorage token 与当前相同时,不重复赋值', () => {
      const auth = useAuthStore();
      auth.setAuth('jwt-xxx', SAMPLE_USER);
      const tokenBefore = auth.token;
      // 模拟 rehydrate 内部 token.value === t 分支
      const t = localStorage.getItem('lmsuo_token');
      expect(t).toBe(tokenBefore); // 不会变
      auth.rehydrate();
      expect(auth.token).toBe(tokenBefore);
    });

    it('从 localStorage 拉新 user(id 不同时)', () => {
      const auth = useAuthStore();
      auth.setAuth('jwt', SAMPLE_USER);
      const otherUser = { ...SAMPLE_USER, id: 'user-2' };
      localStorage.setItem('lmsuo_user', JSON.stringify(otherUser));
      auth.rehydrate();
      expect(auth.user?.id).toBe('user-2');
    });

    it('user id 相同时不重复赋值', () => {
      const auth = useAuthStore();
      auth.setAuth('jwt', SAMPLE_USER);
      const userRefBefore = auth.user;
      auth.rehydrate();
      expect(auth.user).toBe(userRefBefore); // 同一引用
    });
  });

  describe('end-to-end 持久化', () => {
    it('setAuth → 新 store 实例 → 数据自动恢复', () => {
      const a1 = useAuthStore();
      a1.setAuth('jwt-xxx', SAMPLE_USER);
      // 模拟"刷新":新 pinia 实例 + 重新调 useAuthStore
      setActivePinia(createPinia());
      const a2 = useAuthStore();
      expect(a2.token).toBe('jwt-xxx');
      expect(a2.user).toEqual(SAMPLE_USER);
      expect(a2.isAuthenticated).toBe(true);
    });
  });
});
