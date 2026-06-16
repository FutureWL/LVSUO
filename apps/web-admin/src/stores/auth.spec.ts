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

  describe('rehydrate 边界场景', () => {
    it('localStorage 有 token 但无 user → 只同步 token(不等 user)', () => {
      localStorage.setItem('lmsuo_token', 'jwt-only');
      const auth = useAuthStore();
      // store 初始化时 user 是 null(localStorage 没 user)
      auth.rehydrate();
      expect(auth.token).toBe('jwt-only');
      expect(auth.user).toBeNull();
      // isAuthenticated 仍是 false(需 token + user)
      expect(auth.isAuthenticated).toBe(false);
    });

    it('localStorage 有 user 但无 token → 只同步 user(不等 token)', () => {
      localStorage.setItem('lmsuo_user', JSON.stringify(SAMPLE_USER));
      const auth = useAuthStore();
      auth.rehydrate();
      expect(auth.user).toEqual(SAMPLE_USER);
      expect(auth.token).toBeNull();
      expect(auth.isAuthenticated).toBe(false);
    });

    it('localStorage 都不同(store 是别的值)→ 都同步', () => {
      // store 初始有 'jwt-old' + 别的 user
      const auth = useAuthStore();
      auth.setAuth('jwt-old', { ...SAMPLE_USER, id: 'old-user' });
      // localStorage 有 'jwt-new' + 新 user
      localStorage.setItem('lmsuo_token', 'jwt-new');
      localStorage.setItem('lmsuo_user', JSON.stringify(SAMPLE_USER));
      auth.rehydrate();
      expect(auth.token).toBe('jwt-new');
      expect(auth.user?.id).toBe(SAMPLE_USER.id);
    });

    it('localStorage 脏数据(非 JSON)→ 静默吞掉,user 不变', () => {
      const auth = useAuthStore();
      auth.setAuth('jwt', SAMPLE_USER);
      // 另一个标签页写脏数据
      localStorage.setItem('lmsuo_user', 'not-json{{');
      auth.rehydrate();
      // loadStoredUser 内部 catch + removeItem,user 保持不变
      expect(auth.user).toEqual(SAMPLE_USER);
      expect(localStorage.getItem('lmsuo_user')).toBeNull();
    });

    it('多 tab 同步场景:另一个 tab 改了 user id,rehydrate 拉新', () => {
      const auth = useAuthStore();
      auth.setAuth('jwt', SAMPLE_USER);
      // tab B 改了 user(id 变了,但 token 没变)
      const otherUser = { ...SAMPLE_USER, id: 'tab-b-user', realName: '另一个 tab' };
      localStorage.setItem('lmsuo_user', JSON.stringify(otherUser));
      auth.rehydrate();
      // user id 不同 → 重新赋值
      expect(auth.user?.id).toBe('tab-b-user');
      // token 没变,保持原值
      expect(auth.token).toBe('jwt');
    });

    it('rehydrate 幂等:连续调两次,第二次不再变', () => {
      const auth = useAuthStore();
      localStorage.setItem('lmsuo_token', 'jwt');
      localStorage.setItem('lmsuo_user', JSON.stringify(SAMPLE_USER));
      auth.rehydrate();
      const t1 = auth.token;
      const u1 = auth.user;
      auth.rehydrate();
      expect(auth.token).toBe(t1);
      expect(auth.user).toBe(u1);
    });
  });
});
