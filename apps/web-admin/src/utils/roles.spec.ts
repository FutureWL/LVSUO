import { describe, it, expect } from 'vitest';
import { isPlatformRole } from './roles';

/**
 * isPlatformRole 单测 —— 路由守卫 requiresPlatform + 菜单显隐都依赖
 */

describe('isPlatformRole', () => {
  it('PLATFORM_SUPER_ADMIN → true', () => {
    expect(isPlatformRole('PLATFORM_SUPER_ADMIN')).toBe(true);
  });

  it('PLATFORM_OPERATOR → true', () => {
    expect(isPlatformRole('PLATFORM_OPERATOR')).toBe(true);
  });

  it('PLATFORM_COMPLIANCE → true(任何 PLATFORM_ 开头都算)', () => {
    expect(isPlatformRole('PLATFORM_COMPLIANCE')).toBe(true);
  });

  it('PLATFORM_ 部分前缀 → true(前缀匹配)', () => {
    expect(isPlatformRole('PLATFORM_FAKE_FUTURE_ROLE')).toBe(true);
  });

  it('FIRM_ADMIN → false', () => {
    expect(isPlatformRole('FIRM_ADMIN')).toBe(false);
  });

  it('SOLO_LAWYER → false', () => {
    expect(isPlatformRole('SOLO_LAWYER')).toBe(false);
  });

  it('小写 platform_ → false(大小写敏感)', () => {
    expect(isPlatformRole('platform_super_admin')).toBe(false);
  });

  it('包含 PLATFORM_ 但不在开头 → false(必须以 PLATFORM_ 开头)', () => {
    expect(isPlatformRole('FIRM_PLATFORM_ADMIN')).toBe(false);
  });

  it('null / undefined / 空字符串 → false(防御)', () => {
    expect(isPlatformRole(null)).toBe(false);
    expect(isPlatformRole(undefined)).toBe(false);
    expect(isPlatformRole('')).toBe(false);
  });
});
