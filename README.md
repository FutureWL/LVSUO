# LM Unity · Counsel · 智法云枢

> 面向律师事务所与独立律师的 **合规增长 + AI 办案 + 客户成功 + 知识沉淀** 一体化平台
> 数字人: **律时** · 任务书 **V3.0** · 仓库: `ssh://git@localhost:2222/FutureWL/LVSUO.git`

[![Status](https://img.shields.io/badge/status-MVP%20scaffolding-blue.svg)]()
[![Tasks](https://img.shields.io/badge/任务书%20V3.0-19%20章%20✅-success.svg)](./docs/00-产品定义/开发任务书V3.0.md)
[![Stack](https://img.shields.io/badge/stack-NestJS%20%2B%20Vue3%20%2B%20Prisma-orange.svg)]()

---

## 仓库结构(Monorepo)

```
LVSUO/
├── packages/
│   └── shared/              # 共享 TS 类型 / 枚举 / 常量(任务书 V3.0 第 4-8 章沉淀)
├── apps/
│   ├── api/                 # NestJS 后端 API(MVP 主战场)
│   ├── web-admin/           # 律所管理端(Vue 3)
│   ├── web-lawyer/          # 律师端(Vue 3)         — 脚手架待建
│   ├── web-solo/            # 独立律师端(Vue 3)     — 脚手架待建
│   └── web-client/          # 客户端(uni-app)       — 脚手架待建
├── infra/                   # Docker Compose(PostgreSQL / Redis / MinIO)
├── docs/                    # 任务书 V3.0(19 章完整)
├── package.json             # 根 package.json
├── pnpm-workspace.yaml      # pnpm workspace 配置
├── turbo.json               # Turborepo 配置
├── tsconfig.base.json       # TS 基础配置
└── [root configs]           # .gitignore .editorconfig .prettierrc.json
```

## 技术栈

| 层 | 选型 |
|----|------|
| 包管理 | pnpm + Turborepo |
| 后端 | NestJS 10 + TypeScript + Prisma 5 |
| 前端 | Vue 3 + Vite + TypeScript + Element Plus + Pinia |
| 客户端 | uni-app(待启动) |
| 数据库 | PostgreSQL 16 + Redis 7 + MinIO |
| 鉴权 | JWT + 自研 7 维权限(任务书 5.1) |
| 状态机 | XState(待引入) |
| AI | 公有云大模型(Qwen / DeepSeek,可切换) |
| 部署 | Docker Compose(本地)→ K8s(三期) |
| 日志 | Pino |
| 测试 | Jest(后端)+ Vitest(前端) |

## 快速启动(开发者)

### 前置条件

- **Node.js** ≥ 20
- **pnpm** ≥ 9 (`npm install -g pnpm`)
- **Docker** + Docker Compose

### 启动顺序

```bash
# 1. 克隆与安装
git clone ssh://git@localhost:2222/FutureWL/LVSUO.git
cd LVSUO
pnpm install

# 2. 启动基础设施
cd infra && docker compose up -d && cd ..

# 3. 配置后端环境变量
cp apps/api/.env.example apps/api/.env
# 编辑 .env 填入 JWT_SECRET、API keys 等

# 4. 数据库迁移
pnpm prisma:migrate

# 5. 启动开发服务(monorepo 根目录)
pnpm dev
```

访问:
- **律所管理端**: http://localhost:5173
- **API 服务**: http://localhost:3000
- **Swagger 文档**: http://localhost:3000/api/counsel/v1/docs
- **Prisma Studio**: 通过 `pnpm prisma:studio` 启动
- **MinIO Console**: http://localhost:9001(minioadmin / minioadmin)

## 任务书 V3.0 落地进度

| 章节 | 标题 | 状态 | 落地位置 |
|------|------|------|----------|
| 第 1 章 | 总体判断与设计原则 | ✅ | `docs/00-产品定义/01-` |
| 第 2 章 | 规则·商业·技术三重定位 | ✅ | `docs/00-产品定义/02-` |
| 第 3 章 | 产品总架构 | ✅ | `docs/00-产品定义/03-` |
| 第 4 章 | 用户角色体系(5 类 33 角色) | ✅ | `packages/shared` `RoleType` |
| 第 5 章 | 权限模型(7 维 + 6 密级) | ✅ | `apps/api/src/common/permission/` |
| 第 6 章 | 核心业务状态机(4 大) | ✅ | `packages/shared` 状态枚举 + `matter.service.ts` `transition` |
| 第 7 章 | 核心模块开发任务(10 大) | 🟡 | 部分落地(lead / product / quote / matter / time-entry / knowledge-card) |
| 第 8 章 | 数据库设计(15 张表) | ✅ | `apps/api/prisma/schema.prisma` |
| 第 9 章 | API 接口设计(6 大) | 🟡 | 部分端点(后续 PR 补全) |
| 第 10 章 | AI 系统设计 | 🟡 | L6 守卫(其他 AI 能力待二期) |
| 第 11 章 | 前端页面清单 | 🟡 | web-admin 5 个页面 / 其他端待建 |
| 第 12 章 | 商业指标与运营看板 | 🟡 | Dashboard 占位,具体指标待接 |
| 第 13 章 | 安全、合规与审计 | 🟡 | 审计日志中间件 + AuditLog 表 |
| 第 14 章 | MVP(19 项) | 🟡 12/19 | 见下方进度 |
| 第 15-19 章 | 二/三期 / 验收 / 交付 / 判断 | ✅ | `docs/00-产品定义/` |

### MVP 14.2 19 项进度(12/19)

| # | 能力 | 状态 | 落地位置 |
|---|------|------|----------|
| 1 | 多租户与用户权限 | ✅ | `apps/api/src/modules/auth/` + `user/` |
| 2 | 客户中心 | 🟡 | `clients` 表 + 后续补 UI |
| 3 | 推广内容合规审查 | 🟡 | `marketing_contents` 表 + `redline-words` 常量 |
| 4 | 线索管理 | ✅ | `apps/api/src/modules/lead/` |
| 5 | 律时初步接待 | 🟡 | `LushiRole.COMPLIANCE_FRONT` + 框架 |
| 6 | 结构化分诊 | 🟡 | `intake_triages` 表 |
| 7 | 服务产品库 | ✅ | `apps/api/src/modules/product/` |
| 8 | 报价卡 | ✅ | `apps/api/src/modules/quote/` + 10.4 阻断规则 |
| 9 | 风险揭示 | 🟡 | `risk-disclosure-templates` 常量 + UI 待建 |
| 10 | 委托签约记录 | 🟡 | `engagements` 待建(quote 中部分) |
| 11 | 案件作战室 | 🟡 | `matter` 基础 + 9 本账待建 |
| 12 | 任务看板 | ⏳ | 待二期 |
| 13 | 律时语音计时 | ✅ | `apps/api/src/modules/time-entry/` |
| 14 | 客户门户基础版 | ⏳ | 待 web-client 启动 |
| 15 | 客户周报 | ⏳ | 待二期 |
| 16 | 质检记录 | 🟡 | `service_quality_checks` 表 + 框架 |
| 17 | 结案复盘 | ⏳ | 待二期 |
| 18 | 知识卡片 | ✅ | `apps/api/src/modules/knowledge-card/` |
| 19 | 操作日志 | ✅ | `apps/api/src/common/audit/` + `AuditLog` 表 |

## 文档导航

- 📘 [任务书 V3.0 封面 + 完整目录](./docs/00-产品定义/开发任务书V3.0.md)
- 📗 [第 1 章 总体判断与设计原则](./docs/00-产品定义/01-总体判断与设计原则.md)
- 📙 [第 5 章 权限模型(7 维 + 6 密级)](./docs/00-产品定义/05-权限模型.md)
- 📒 [第 6 章 核心业务状态机(4 大)](./docs/00-产品定义/06-核心业务状态机.md)
- 📕 [第 7 章 核心模块开发任务(10 大)](./docs/00-产品定义/07-核心模块开发任务.md)
- 📓 [第 8 章 数据库设计(15 张表)](./docs/00-产品定义/08-数据库设计.md)
- 📔 [后端 API README](./apps/api/README.md)
- 📄 [律所管理端 README](./apps/web-admin/README.md)
- ⚙️ [本地基础设施 README](./infra/README.md)
- 🌐 [Nginx 子目录反向代理部署指南](./infra/nginx/README.md)

## 战略使命

> 把律师的专业能力 **产品化**,把律所的组织能力 **系统化**,把客户的真实需求 **结构化**,
> 把增长行为 **合规化**,把案件交付质量 **可视化**,把无形经验 **资产化**。
> 这才是 LM Unity · Counsel + 律时 在未来律师行业中的真正价值。

---

**内部使用** · © FutureWL 律师事务所 · [任务书 V3.0](./docs/00-产品定义/开发任务书V3.0.md)

---

## 部署选项

### A. 开发模式(Vite + HMR)· 推荐迭代

`https://wxf-prod.huntercat.cn/lvsuo/` → `http://localhost:5173/lvsuo/`(vite dev)

详见 [`infra/nginx/lvsuo.conf`](./infra/nginx/lvsuo.conf) 与 [部署指南](./infra/nginx/README.md)

```bash
# 本地启动 vite dev
cd /root/DataDisk/workspace/LVSUO/apps/web-admin
cat > .env << 'EOF'
VITE_BASE_PATH=/lvsuo/
VITE_API_PROXY_TARGET=http://localhost:3001
EOF
python3 -c "
import os; pid = os.fork()
if pid > 0: os._exit(0)
os.setsid(); os.chdir('/root/DataDisk/workspace/LVSUO/apps/web-admin')
sin = open('/dev/null','r'); sout = open('/tmp/lmsuo-web.log','wb')
os.dup2(sin.fileno(),0); os.dup2(sout.fileno(),1); os.dup2(sout.fileno(),2)
os.execvp('pnpm', ['pnpm','dev'])
"

# nginx 配置
sudo cp infra/nginx/lvsuo.conf /etc/nginx/sites-enabled/lvsuo.conf
sudo nginx -t && sudo nginx -s reload
```

### B. 生产模式(直接 serve dist)· 推荐发布

`https://wxf-prod.huntercat.cn/lvsuo/` → 直接 serve `dist/` + API 代理到 3001

详见 [`infra/nginx/lvsuo-production.conf`](./infra/nginx/lvsuo-production.conf)

```bash
VITE_BASE_PATH=/lvsuo/ pnpm --filter @lm-unity/web-admin build
sudo cp infra/nginx/lvsuo-production.conf /etc/nginx/sites-enabled/lvsuo.conf
sudo nginx -t && sudo nginx -s reload
```

### 验证配置语法

```bash
sudo bash infra/nginx/test.sh both   # 同时测试 dev + prod
```
