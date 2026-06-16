import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E 配置(生产级别)
 *  - 跨浏览器:chromium(主)+ webkit/firefox(可打开)
 *  - webServer: 自动启动 api + web-admin
 *  - 串行执行(serial)避免 dev server 互相干扰
 *  - trace + video + screenshot 全开,失败可看
 *
 * 用法:
 *  pnpm e2e              # 跑全部
 *  pnpm e2e -- --headed  # 看浏览器
 *  pnpm e2e -- login    # 跑 login spec
 *
 * 前提:
 *  - apps/api/.env 配好 JWT_SECRET(≥32字符)/ DATABASE_URL(Postgres 可达)
 *  - prisma migrate 跑过
 *  - 跑过 apps/api/prisma/e2e-seed.ts 创建 e2e 租户
 *
 * 端口避开 3000/5173(避免与 dev server 冲突)
 *  - api: 3080
 *  - web: 5180
 */
const PORT_API = 3080;
const PORT_WEB = 5180;
const HOST = '127.0.0.1';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  timeout: 60_000,
  expect: { timeout: 8_000 },
  use: {
    baseURL: `http://${HOST}:${PORT_WEB}/lvsuo/`,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // 注释掉 webkit / firefox — 需要本地装浏览器才不挂
    // { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    // { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
  webServer: [
    {
      // apps/api 在 3080(node --env-file 依赖 cwd 找 .env)
      // APP_PORT 覆盖默认 3000
      command: `bash -c "cd apps/api && APP_PORT=${PORT_API} node --env-file=.env dist/main.js"`,
      url: `http://${HOST}:${PORT_API}/api/counsel/v1/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      // apps/web-admin 在 5180
      // 保持 .env 的 VITE_BASE_PATH=/lvsuo/(与生产部署一致)
      // pnpm exec vite 避开 pnpm run dev 的环境变量传递问题
      command: `bash -c "cd apps/web-admin && pnpm exec vite --port ${PORT_WEB} --strictPort --host ${HOST}"`,
      url: `http://${HOST}:${PORT_WEB}/lvsuo/`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
