import { checkRequiredEnv, type EnvCheckResult } from './required-env';

function makeConfig(env: Record<string, string>) {
  return {
    get: (key: string) => env[key],
  } as any;
}

const VALID_SECRET = 'a'.repeat(32); // 32 字符,合法
const VALID_DB = 'postgresql://user:pass@host:5432/db';

describe('checkRequiredEnv', () => {
  describe('必填(全部环境)', () => {
    it('JWT_SECRET + DATABASE_URL 都有 → ok', () => {
      const r = checkRequiredEnv(
        makeConfig({ JWT_SECRET: VALID_SECRET, DATABASE_URL: VALID_DB }),
        false,
      );
      expect(r.ok).toBe(true);
      expect(r.missing).toEqual([]);
    });

    it('JWT_SECRET 缺 → missing', () => {
      const r = checkRequiredEnv(
        makeConfig({ DATABASE_URL: VALID_DB }),
        false,
      );
      expect(r.ok).toBe(false);
      expect(r.missing.some((m) => m.startsWith('JWT_SECRET'))).toBe(true);
    });

    it('DATABASE_URL 缺 → missing', () => {
      const r = checkRequiredEnv(
        makeConfig({ JWT_SECRET: VALID_SECRET }),
        false,
      );
      expect(r.ok).toBe(false);
      expect(r.missing.some((m) => m.startsWith('DATABASE_URL'))).toBe(true);
    });

    it('JWT_SECRET 是空字符串 → missing', () => {
      const r = checkRequiredEnv(
        makeConfig({ JWT_SECRET: '', DATABASE_URL: VALID_DB }),
        false,
      );
      expect(r.missing.some((m) => m.startsWith('JWT_SECRET'))).toBe(true);
    });

    it('JWT_SECRET 还是 .env.example 默认值(以 replace-with 开头)→ missing + 标记', () => {
      const r = checkRequiredEnv(
        makeConfig({
          JWT_SECRET: 'replace-with-strong-secret-min-32-chars',
          DATABASE_URL: VALID_DB,
        }),
        false,
      );
      expect(r.missing.some((m) => m.includes('还是 .env.example 默认值'))).toBe(true);
    });
  });

  describe('弱校验(开发 warn,生产不阻塞)', () => {
    it('JWT_SECRET 长度 < 32 → weak 但 ok', () => {
      const r = checkRequiredEnv(
        makeConfig({ JWT_SECRET: 'short-secret', DATABASE_URL: VALID_DB }),
        false,
      );
      expect(r.ok).toBe(true);
      expect(r.weak.some((w) => w.startsWith('JWT_SECRET'))).toBe(true);
    });

    it('JWT_SECRET 正好 32 字符 → 不 weak', () => {
      const r = checkRequiredEnv(
        makeConfig({ JWT_SECRET: VALID_SECRET, DATABASE_URL: VALID_DB }),
        false,
      );
      expect(r.weak).toEqual([]);
    });
  });

  describe('生产额外必填', () => {
    it('生产缺 APP_CORS_ORIGINS → missing', () => {
      const r = checkRequiredEnv(
        makeConfig({ JWT_SECRET: VALID_SECRET, DATABASE_URL: VALID_DB }),
        true, // production
      );
      expect(r.ok).toBe(false);
      expect(r.missing.some((m) => m.startsWith('APP_CORS_ORIGINS'))).toBe(true);
    });

    it('生产 APP_CORS_ORIGINS 显式声明 → ok', () => {
      const r = checkRequiredEnv(
        makeConfig({
          JWT_SECRET: VALID_SECRET,
          DATABASE_URL: VALID_DB,
          APP_CORS_ORIGINS: 'https://app.example.com',
        }),
        true,
      );
      expect(r.ok).toBe(true);
    });

    it('开发不强制 APP_CORS_ORIGINS', () => {
      const r = checkRequiredEnv(
        makeConfig({ JWT_SECRET: VALID_SECRET, DATABASE_URL: VALID_DB }),
        false,
      );
      expect(r.missing).toEqual([]);
    });
  });

  describe('返回结构', () => {
    it('同时缺多个 → 全列在 missing', () => {
      const r = checkRequiredEnv(makeConfig({}), true);
      expect(r.missing.length).toBeGreaterThanOrEqual(3);
    });

    it('结果对象结构稳定', () => {
      const r: EnvCheckResult = checkRequiredEnv(makeConfig({}), false);
      expect(Array.isArray(r.missing)).toBe(true);
      expect(Array.isArray(r.weak)).toBe(true);
      expect(typeof r.ok).toBe('boolean');
    });
  });
});
