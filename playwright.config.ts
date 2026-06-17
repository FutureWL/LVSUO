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
 * CI 模式 (CI=1):
 *  - .env 文件不存在(不在 git tracked),用 env vars 注入配置
 *  - DB 由外部 postgres service container 提供(localhost:5432)
 *  - API 跑 migrate deploy 初始化 schema
 *  - 关掉 reuseExistingServer(强制新进程)
 *
 * 本地:
 *  - apps/api/.env 配好 JWT_SECRET(≥32字符)/ DATABASE_URL
 *  - prisma migrate 跑过
 *  - 跑过 apps/api/prisma/e2e-seed.ts 创建 e2e 租户
 *  - VITE_API_PROXY_TARGET 指 api 端口
 *
 * 端口避开 3000/5173(避免与 dev server 冲突)
 * 全部上移到 37000+ 区间(本地 + CI 统一,避开 30000-37000 大段高占用)
 *  - api: 37002
 *  - web: 37003
 */
const PORT_API = 37002;
const PORT_WEB = 37003;
const HOST = '127.0.0.1';
const IS_CI = !!process.env.CI;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: IS_CI,
  retries: IS_CI ? 2 : 0,
  workers: 1,
  reporter: IS_CI ? [['github'], ['html', { open: 'never' }]] : 'list',
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
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      // api 启动:CI 用 env vars 注入配置,本地用 .env
      command: IS_CI
        ? `bash -c "cd apps/api && APP_PORT=${PORT_API} JWT_SECRET=\${JWT_SECRET} DATABASE_URL=\${DATABASE_URL} APP_GLOBAL_PREFIX=api/counsel/v1 node dist/main.js"`
        : `bash -c "cd apps/api && APP_PORT=${PORT_API} node --env-file=.env dist/main.js"`,
      url: `http://${HOST}:${PORT_API}/api/counsel/v1/health`,
      reuseExistingServer: !IS_CI,
      timeout: 60_000,
      stdout: 'pipe',
      stderr: 'pipe',
      // 把 workflow 里的 env 传给 webServer(api 需要 JWT_SECRET/DATABASE_URL)
      env: IS_CI
        ? {
            JWT_SECRET: process.env.JWT_SECRET,
            DATABASE_URL: process.env.DATABASE_URL,
          }
        : undefined,
    },
    {
      // web 启动:CI 用 VITE_API_PROXY_TARGET 指 api 端口
      command: IS_CI
        ? `bash -c "cd apps/web-admin && VITE_BASE_PATH=/lvsuo/ VITE_API_PROXY_TARGET=http://${HOST}:${PORT_API} pnpm exec vite --port ${PORT_WEB} --strictPort --host ${HOST}"`
        : `bash -c "cd apps/web-admin && pnpm exec vite --port ${PORT_WEB} --strictPort --host ${HOST}"`,
      url: `http://${HOST}:${PORT_WEB}/lvsuo/`,
      reuseExistingServer: !IS_CI,
      timeout: 60_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
