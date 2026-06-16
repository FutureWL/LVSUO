# @lm-unity/api

LM Unity · Counsel 后端服务(NestJS)

## 技术栈

- **框架**: NestJS 10
- **语言**: TypeScript 5
- **ORM**: Prisma 5
- **数据库**: PostgreSQL 15+
- **缓存**: Redis 7+
- **对象存储**: MinIO (S3 兼容)
- **鉴权**: JWT + 自研 7 维权限(任务书 5.1)
- **日志**: Pino

## 启动

```bash
# 1. 安装依赖(在 monorepo 根目录)
cd ../..
pnpm install

# 2. 启动 PostgreSQL / Redis / MinIO
cd infra && docker compose up -d

# 3. 复制环境变量
cp .env.example .env
# 修改 DATABASE_URL / JWT_SECRET / AI_API_KEY 等

# 4. 数据库迁移
pnpm --filter @lm-unity/api prisma:migrate

# 5. 启动开发服务
pnpm --filter @lm-unity/api dev
# 或在 monorepo 根:
pnpm dev
```

服务地址:http://localhost:3000
Swagger 文档:http://localhost:3000/api/counsel/v1/docs

## 目录结构

```
src/
├── main.ts                    # 入口
├── app.module.ts              # 根模块
├── common/                    # 公共设施
│   ├── prisma/                # 数据库连接
│   ├── tenant/                # 4 级租户隔离(任务书 3.2)
│   ├── permission/            # 7 维权限模型(任务书 5.1)
│   ├── audit/                 # 审计日志(任务书 13.2)
│   ├── auth/                  # JWT 鉴权
│   ├── health/                # 健康检查
│   └── filter/                # 全局异常
└── modules/                   # 业务模块(对应 7 大模块)
    ├── auth/                  # 认证(14.2 第 1 项)
    ├── user/                  # 用户
    ├── lead/                  # 线索(第 2 项)
    ├── product/               # 服务产品(第 7 项)
    ├── quote/                 # 报价(第 8 项)
    ├── matter/                # 案件(第 11 项)
    ├── conversation/          # 律时(第 5/6 项)
    ├── time-entry/            # 工时(第 13 项)
    └── knowledge-card/        # 知识卡(第 18 项)
```

## 任务书 V3.0 落地映射

| 任务书章节 | 本项目实现 |
|------------|------------|
| 4.x 33 角色 | `@lm-unity/shared` 中 `RoleType` 枚举 |
| 5.1 7 维权限 | `common/permission/` |
| 5.2 L1-L6 数据密级 | `common/permission/permission.service.ts` `maxDataLevelForRole` |
| 5.2.1 L6 AI 限制 | `conversation.service.ts` `sendMessage` 守卫 |
| 6.x 4 大状态机 | `@lm-unity/shared` 状态枚举 + `matter.service.ts` `transition` |
| 7.x 推广合规 | 见后续 PR |
| 8.x 15 张表 | `prisma/schema.prisma` |
| 9.x 6 大 API | 各 module 的 controller |
| 10.x AI 设计 | L6 守卫(其他 AI 能力待 14.x MVP 后续) |
| 13.x 安全审计 | `common/audit/` |
| 14.x MVP 19 项 | 见本目录 + monorepo README |

## 脚本

```bash
pnpm dev               # 启动 dev server
pnpm build             # 构建
pnpm test              # 单元测试
pnpm test:e2e          # E2E 测试
pnpm test:cov          # 覆盖率
pnpm typecheck         # 类型检查
pnpm lint              # ESLint
pnpm prisma:generate   # 生成 Prisma client
pnpm prisma:migrate    # 数据库迁移
pnpm prisma:studio     # Prisma Studio(数据库 GUI)
```
