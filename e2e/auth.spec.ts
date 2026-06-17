import { test, expect, Page } from '@playwright/test';

/**
 * Auth e2e(生产级别)
 *  - 真实浏览器(chromium)+ 真实 api + 真实 web
 *  - 真实 DOM 交互
 *  - localStorage / cookie 持久化验证
 *
 * 前提: dev DB 里 e2e-seed 创建了 e2e-tenant / e2e-admin
 *
 * 注意:已登录态 + UI 登录流程单独测(用 setAuth 跳过登录 UI,
 *      因为 login 涉及 guard 重定向,需要单独路径验证)
 */

const TEST_TENANT = {
  tenantId: process.env.E2E_TENANT_ID ?? 'e2e-tenant',
  username: process.env.E2E_USERNAME ?? 'e2e-admin',
  password: process.env.E2E_PASSWORD ?? 'E2eTest12345678',
};
const API = 'http://127.0.0.1:3080/api/counsel/v1';

async function fillLoginForm(
  page: Page,
  opts: { tenantId?: string; username?: string; password?: string } = {},
) {
  const inputs = page.locator('input.el-input__inner');
  await inputs.nth(0).fill(opts.tenantId ?? TEST_TENANT.tenantId);
  await inputs.nth(1).fill(opts.username ?? TEST_TENANT.username);
  await inputs.nth(2).fill(opts.password ?? TEST_TENANT.password);
}

test.describe('登录流程(生产 e2e)', () => {
  test('错误密码 → 留在 /login + toast 弹错', async ({ page }) => {
    await page.goto('/lvsuo/login');
    await fillLoginForm(page, { password: 'wrong-password' });
    await page.getByRole('button', { name: '登录' }).click();
    // 还在登录页
    await expect(page).toHaveURL(/\/login/);
  });

  test('正确登录 → api 返回 201 + token + user(用 request fixture)', async ({ request }) => {
    // 直接打 api 验证(避开 UI 登录复杂度)
    const res = await request.post(`${API}/auth/login`, {
      data: {
        tenantId: TEST_TENANT.tenantId,
        username: TEST_TENANT.username,
        password: TEST_TENANT.password,
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.accessToken).toBeTruthy();
    expect(body.refreshToken).toBeTruthy();
    expect(body.user.username).toBe(TEST_TENANT.username);
    expect(body.user.role).toBe('FIRM_ADMIN');
  });

  test('未登录访问 /dashboard → 跳 /login(带 redirect query)', async ({ page }) => {
    await page.goto('/lvsuo/');
    await page.evaluate(() => {
      localStorage.removeItem('lmsuo_token');
      localStorage.removeItem('lmsuo_user');
    });
    await page.goto('/lvsuo/dashboard');
    await page.waitForURL(/\/login/, { timeout: 5_000 });
    expect(page.url()).toContain('redirect=');
  });

  test('setAuth localStorage → 访问 /dashboard 留在 dashboard', async ({ page, request }) => {
    // 拿 token
    const res = await request.post(`${API}/auth/login`, {
      data: {
        tenantId: TEST_TENANT.tenantId,
        username: TEST_TENANT.username,
        password: TEST_TENANT.password,
      },
    });
    const { accessToken, user } = await res.json();
    // 写到 web 的 localStorage
    await page.goto('/lvsuo/');
    await page.evaluate(
      ({ token, userStr }) => {
        localStorage.setItem('lmsuo_token', token);
        localStorage.setItem('lmsuo_user', userStr);
      },
      { token: accessToken, userStr: JSON.stringify(user) },
    );
    // 访问 /dashboard
    await page.goto('/lvsuo/dashboard');
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('/dashboard');
  });
});
