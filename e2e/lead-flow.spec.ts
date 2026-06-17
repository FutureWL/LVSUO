import { test, expect, Page, APIRequestContext } from '@playwright/test';

/**
 * Lead 完整流程 e2e
 *  - setAuth 直接写 localStorage(登录 UI 单独测)
 *  - 验证:看板加载、搜索、新建
 */

const TEST_TENANT = {
  tenantId: process.env.E2E_TENANT_ID ?? 'e2e-tenant',
  username: process.env.E2E_USERNAME ?? 'e2e-admin',
  password: process.env.E2E_PASSWORD ?? 'E2eTest12345678',
};
const API = 'http://127.0.0.1:3080/api/counsel/v1';

async function setAuth(page: Page, request: APIRequestContext) {
  const res = await request.post(`${API}/auth/login`, {
    data: {
      tenantId: TEST_TENANT.tenantId,
      username: TEST_TENANT.username,
      password: TEST_TENANT.password,
    },
  });
  const { accessToken, user } = await res.json();
  await page.goto('/lvsuo/');
  await page.evaluate(
    ({ token, userStr }) => {
      localStorage.setItem('lmsuo_token', token);
      localStorage.setItem('lmsuo_user', userStr);
    },
    { token: accessToken, userStr: JSON.stringify(user) },
  );
}

test.describe('线索完整流程(e2e)', () => {
  test('线索看板加载:有标题 + 搜索框 + 新建按钮', async ({ page, request }) => {
    await setAuth(page, request);
    page.on('response', (res) => {
      if (res.url().includes('/api/')) {
        console.log('API RES:', res.status(), res.url());
      }
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.log('CONSOLE ERR:', msg.text().slice(0, 200));
    });
    await page.goto('/lvsuo/leads');
    await expect(page.getByText('线索看板').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByPlaceholder('按客户名 / 手机号搜索')).toBeVisible();
    await expect(page.getByRole('button', { name: /新建线索/ })).toBeVisible();
  });

  test('搜索:输入关键字 → 输入框保留值', async ({ page, request }) => {
    await setAuth(page, request);
    await page.goto('/lvsuo/leads');
    const searchBox = page.getByPlaceholder('按客户名 / 手机号搜索');
    await searchBox.fill('王');
    await searchBox.press('Enter');
    await page.waitForTimeout(800);
    await expect(searchBox).toHaveValue('王');
  });

  test('新建线索:打开对话框 → 填表 → 保存 → 列表出现', async ({ page, request }) => {
    await setAuth(page, request);
    await page.goto('/lvsuo/leads');
    await page.getByRole('button', { name: /新建线索/ }).click();
    await expect(page.getByText('新建线索').first()).toBeVisible();
    const unique = `E2E测试-${Date.now()}`;
    await page.getByLabel('客户名称').fill(unique);
    await page.getByLabel('来源渠道').fill('e2e');
    await page.getByLabel('问题类型').fill('劳动');
    await page.getByLabel('联系电话').fill('13800138000');
    await page.getByRole('button', { name: /保存/ }).click();
    await page.waitForTimeout(1500);
    // 搜索查找
    const searchBox = page.getByPlaceholder('按客户名 / 手机号搜索');
    await searchBox.fill(unique);
    await searchBox.press('Enter');
    await page.waitForTimeout(800);
    await expect(page.getByText(unique).first()).toBeVisible({ timeout: 5_000 });
  });
});
