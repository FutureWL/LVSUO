import { describe, it, expect } from 'vitest';
import { resolveRedirectTarget } from '@/utils/redirect';

/**
 * Login 重定向目标解析 —— 防开放重定向
 *  规则: query.redirect 以 '/' 开头 → 使用(内部路径)
 *  其他(包含 http://、//、空、缺省)→ 回 /dashboard
 */

describe('resolveRedirectTarget', () => {
  it('query.redirect 为 undefined → /dashboard', () => {
    expect(resolveRedirectTarget({})).toBe('/dashboard');
    expect(resolveRedirectTarget(undefined)).toBe('/dashboard');
  });

  it('query.redirect = "/leads" → /leads', () => {
    expect(resolveRedirectTarget({ redirect: '/leads' })).toBe('/leads');
  });

  it('query.redirect = "/leads/abc?status=NEW" → 原样(query 保留)', () => {
    expect(resolveRedirectTarget({ redirect: '/leads/abc?status=NEW' })).toBe(
      '/leads/abc?status=NEW',
    );
  });

  it('query.redirect = "/leads#section" → 原样(hash 保留)', () => {
    expect(resolveRedirectTarget({ redirect: '/leads#section' })).toBe('/leads#section');
  });

  it('query.redirect = ""(空)→ /dashboard', () => {
    expect(resolveRedirectTarget({ redirect: '' })).toBe('/dashboard');
  });

  it('防开放重定向:http://evil.com → /dashboard(不跳外站)', () => {
    expect(resolveRedirectTarget({ redirect: 'http://evil.com' })).toBe('/dashboard');
  });

  it('防开放重定向:https://evil.com → /dashboard', () => {
    expect(resolveRedirectTarget({ redirect: 'https://evil.com' })).toBe('/dashboard');
  });

  it('防开放重定向://evil.com(protocol-relative)→ /dashboard', () => {
    expect(resolveRedirectTarget({ redirect: '//evil.com' })).toBe('/dashboard');
  });

  it('防开放重定向:javascript:alert(1) → /dashboard', () => {
    expect(resolveRedirectTarget({ redirect: 'javascript:alert(1)' })).toBe('/dashboard');
  });

  it('防开放重定向:无 / 开头(相对路径)→ /dashboard', () => {
    expect(resolveRedirectTarget({ redirect: 'leads' })).toBe('/dashboard');
    expect(resolveRedirectTarget({ redirect: './leads' })).toBe('/dashboard');
  });

  it('query.redirect = 数字 / null / 对象(非字符串)→ /dashboard', () => {
    expect(resolveRedirectTarget({ redirect: 123 } as any)).toBe('/dashboard');
    expect(resolveRedirectTarget({ redirect: null } as any)).toBe('/dashboard');
    expect(resolveRedirectTarget({ redirect: { foo: 'bar' } } as any)).toBe('/dashboard');
  });
});
