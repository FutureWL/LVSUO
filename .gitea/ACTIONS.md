# Gitea Actions 集成

LVSUO 项目的 CI 配置在 `.gitea/workflows/ci.yml`。

## 文件结构

```
.gitea/
├── workflows/
│   └── ci.yml           # 单元测试 + jest e2e(后端带 Postgres)
├── ACTIONS.md            # 本文档
```

## 触发条件

`.gitea/workflows/ci.yml` 在以下事件触发:

- `push` 到 `main` 分支
- `pull_request` 打开/更新到 `main` 分支

并发策略：相同 ref 的新 run 会**取消旧 run**（节省 CI 资源）。

## Jobs 流水线

```
typecheck (3 步,~30s)
  ↓
test-unit (~3 min)        test-e2e-api (~3 min)
  ↑                          ↑
  └─────── 不依赖 ─────────────┘
```

- **typecheck**: `pnpm typecheck`(前后端)
- **test-unit**: 后端 149 单元 + 前端 237 单元
- **test-e2e-api**: 后端 jest e2e(需要 Postgres,GitHub service container)

## 查看 CI 结果

Gitea UI: `http://localhost:30000/gitea/FutureWL/LVSUO/actions`

## 本地跑 CI 步骤(调试用)

`ci.yml` 的步骤可以直接在本地复现:

```bash
# 1. typecheck
pnpm install --frozen-lockfile
pnpm typecheck

# 2. unit tests
pnpm --filter @lm-unity/api test
pnpm --filter @lm-unity/web-admin test

# 3. e2e(需 Postgres)
docker run -d --name pg-test -p 5432:5432 \
  -e POSTGRES_USER=lmsuo -e POSTGRES_PASSWORD=lmsuo_test_pw -e POSTGRES_DB=lmsuo_test \
  postgres:16-alpine
DATABASE_URL=postgresql://lmsuo:lmsuo_test_pw@localhost:5432/lmsuo_test?schema=public \
JWT_SECRET=ci-jwt-secret-must-be-at-least-32-characters-long \
  pnpm --filter @lm-unity/api prisma migrate deploy
pnpm --filter @lm-unity/api exec tsx prisma/e2e-seed.ts
pnpm --filter @lm-unity/api test:e2e
docker rm -f pg-test
```

## 已知限制

- **不含 playwright e2e**：playwright e2e 需要起 api + web + chromium,跑得慢(~5 min),在 Gitea runner + Docker 环境下需要更多调试。后续单独加 `ci-e2e.yml`(只在 push main 跑,失败不阻塞 PR)
- **PG 版本**:用 16-alpine,生产用 16,一致
- **镜像拉取**:首次跑会拉 `postgres:16-alpine`、`node:20`、`pnpm/action-setup@v4` 等镜像,网络不好会慢或失败
- **Gitea runner 必须先装好**:没 runner 的话 push workflow 文件不报错,但 CI 不会真跑

## Runner 安装(在 `../gitea/docker-compose.yml`)

```yaml
gitea-runner:
  image: gitea/act_runner:latest
  environment:
    - GITEA_INSTANCE_URL=http://gitea:3000
    - GITEA_RUNNER_REGISTRATION_TOKEN=<从 Gitea admin 拿>
    - GITEA_RUNNER_LABELS=ubuntu-latest:host
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock
```

注册 token: `http://localhost:30000/gitea/-/admin/actions/runners` → Create new runner
