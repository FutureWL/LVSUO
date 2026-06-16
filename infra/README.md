# Infra · 本地开发基础设施

LM Unity · Counsel 本地开发所需的基础设施。

## 启动

```bash
cd infra
docker compose up -d

# 查看状态
docker compose ps

# 查看日志
docker compose logs -f postgres

# 停止
docker compose down
```

## 服务清单

| 服务 | 端口 | 凭据 | 用途 |
|------|------|------|------|
| **PostgreSQL 16** | 5432 | postgres / postgres | 主数据库,Prisma 连接 |
| **Redis 7** | 6379 | 无 | 缓存 / 会话 |
| **MinIO** | 9000 / 9001 | minioadmin / minioadmin | 对象存储(附件 / 文档) |
| **MinIO Console** | http://localhost:9001 | minioadmin / minioadmin | 存储管理 UI |

## 数据库连接

```bash
# 用 psql 连接
psql -h localhost -U postgres -d lmsuo

# 或在 apps/api 目录下用 Prisma Studio
pnpm --filter @lm-unity/api prisma:studio
```

## MinIO 桶

启动后会自动创建 `lmsuo` 桶,用于存放:
- 案件文档
- 推广素材
- 用户头像
- 客户上传材料
- 知识卡片附件
- 律师函 / 文书

## 健康检查

```bash
# PostgreSQL
docker compose exec postgres pg_isready

# Redis
docker compose exec redis redis-cli ping

# MinIO
curl -I http://localhost:9000/minio/health/live
```
