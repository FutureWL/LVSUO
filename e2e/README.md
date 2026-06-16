# E2E Tests (Playwright)

生产级别端到端测试。真实浏览器 + 真实 api + 真实 web + 真实 DB。

## 前置条件

1. **Postgres 可达** — `apps/api/.env` 的 `DATABASE_URL`
2. **Prisma 迁移跑过** — `pnpm --filter @lm-unity/api prisma:migrate`
3. **e2e 租户 seed 跑过**:
   ```bash
   cd apps/api && pnpm exec tsx prisma/e2e-seed.ts
   ```
   创建 `tenantId=e2e-tenant`, `username=e2e-admin`, `password=E2eTest12345678`

可以覆盖: `E2E_TENANT_ID` / `E2E_USERNAME` / `E2E_PASSWORD` 环境变量。

## 跑测试

```bash
# 装浏览器(首次)
pnpm exec playwright install --with-deps chromium

# 跑全部(自动启动 api + web)
pnpm e2e

# 只跑一个文件
pnpm e2e -- e2e/auth.spec.ts

# 看浏览器
pnpm e2e -- --headed

# debug mode
pnpm e2e -- --debug
```

## 端口(避开 3000/5173 dev server)

- api: 3080
- web: 5180

## 当前 spec

### `e2e/auth.spec.ts` — 登录流程(4 例 ✓)

- 错误密码 → 留在 /login
- 正确登录 → api 返回 201 + token(用 request fixture 验证)
- 未登录访问 /dashboard → 跳 /login(带 redirect query)
- setAuth localStorage → 访问 /dashboard 留在 dashboard

### `e2e/lead-flow.spec.ts` — 线索完整流程(部分)

- 看板加载:有标题 + 搜索框 + 新建按钮 ⚠
- 搜索:输入关键字 → 输入框保留值 ⚠
- 新建线索:打开对话框 → 填表 → 保存 ⚠

⚠ lead-flow 测试用 setAuth localStorage 跳过登录 UI,但 web 加载时
import.meta.env.BASE_URL 与 localStorage 的写入存在竞态,导致
API 请求时 token 未注入。需要改成在同一个 page.goto 内完成
setAuth + navigation(用 context.addInitScript)。

## 失败排查

失败自动保留:

- `test-results/` — trace + screenshot + video
- `playwright-report/` — HTML 报告(`pnpm exec playwright show-report`)

## 已知坑

- **web dev server base path**: 必须保留 `VITE_BASE_PATH=/lvsuo/`,
  因为 vite proxy `/lvsuo/api` 才走 rewrite,`/api` 直通不会改路径
- **api JWT_SECRET**: .env 的 JWT_SECRET 是 .env.example 默认值会被 assertRequiredEnv 拦,
  跑前必须改成 ≥32 字符的真 secret
- **port 冲突**: 当前用 3080/5180 避开 3000/5173。如果这些也被占,改 playwright.config.ts
- **pnpm run dev vs pnpm exec vite**: pnpm run dev 在某些环境下不传递 env,
  playwright config 用 pnpm exec vite(更稳)

## CI 集成

`CI=1` 时:

- 2 次重试
- github + html reporter
- trace / video / screenshot 失败保留
