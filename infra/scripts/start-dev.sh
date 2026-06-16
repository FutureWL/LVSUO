#!/bin/bash
# ============================================================================
# LM Unity · Counsel · 开发模式启动脚本
# 用途: 一键启动 Vite dev (带 /lvsuo/ base path) + 后端 API
# 适用: nginx 反向代理 → https://wxf-prod.huntercat.cn/lvsuo/
# ============================================================================

set -e

ROOT_DIR="/root/DataDisk/workspace/LVSUO"
API_DIR="$ROOT_DIR/apps/api"
WEB_DIR="$ROOT_DIR/apps/web-admin"

# ---------- 1. 检查环境 ----------
echo "═══════════════════════════════════════════════"
echo "  LM Unity · Counsel · 开发模式启动"
echo "═══════════════════════════════════════════════"
echo
echo "📋 检查前置..."

# Node + pnpm
command -v node >/dev/null || { echo "❌ node 未安装"; exit 1; }
command -v pnpm >/dev/null || { echo "❌ pnpm 未安装"; exit 1; }
echo "  ✅ node $(node --version)"
echo "  ✅ pnpm $(pnpm --version)"

# Docker (PostgreSQL/Redis/MinIO)
command -v docker >/dev/null || { echo "❌ docker 未安装"; exit 1; }
echo "  ✅ docker $(docker --version | cut -d' ' -f3 | tr -d ',')"

# 端口可用
for port in 3001 5173; do
    if lsof -i :$port >/dev/null 2>&1; then
        echo "  ⚠️  端口 $port 已被占用(可能是上次残留,稍后自动复用)"
    fi
done

# ---------- 2. 启动基础设施 ----------
echo
echo "📦 启动基础设施(PostgreSQL/Redis/MinIO)..."
cd "$ROOT_DIR/infra"
docker compose up -d 2>&1 | tail -5

# ---------- 3. 启动 API ----------
echo
echo "🚀 启动后端 API(端口 3001)..."
pkill -9 -f "node dist/main" 2>/dev/null || true
sleep 1

nohup setsid bash -c "
    cd $API_DIR
    export DATABASE_URL='postgresql://postgres:postgres@localhost:5432/lmsuo?schema=public'
    export JWT_SECRET='this-is-a-test-jwt-secret-min-32-chars-long-ok'
    export APP_PORT=3001
    exec node dist/main.js
" </dev/null >/tmp/lmsuo-api.log 2>&1 &
disown

# ---------- 4. 启动 Vite dev ----------
echo
echo "🎨 启动 Vite dev(端口 5173,base=/lvsuo/)..."
pkill -9 -f "vite" 2>/dev/null || true
sleep 1

# 先 build 一次(防 dist 旧)
cd "$WEB_DIR" && pnpm build >/dev/null 2>&1 || true

# 写 .env(开发模式)
cat > .env << 'EOF'
VITE_BASE_PATH=/lvsuo/
VITE_API_PROXY_TARGET=http://localhost:3001
VITE_APP_TITLE=智法云枢
EOF

# 启动
nohup setsid bash -c "
    cd $WEB_DIR
    export VITE_BASE_PATH=/lvsuo/
    exec pnpm dev --host 0.0.0.0
" </dev/null >/tmp/lmsuo-web.log 2>&1 &
disown

# ---------- 5. 等待启动 ----------
echo
echo "⏳ 等待服务启动..."
sleep 6

# ---------- 6. 验证 ----------
echo
echo "═══════════════════════════════════════════════"
echo "  ✅ 启动结果"
echo "═══════════════════════════════════════════════"
echo

# API
for i in 1 2 3 4 5; do
    if curl -s -o /dev/null -w "" http://localhost:3001/api/counsel/v1/health 2>/dev/null; then
        echo "✅ API (3001): $(curl -s http://localhost:3001/api/counsel/v1/health)"
        break
    fi
    sleep 1
done

# Vite
for i in 1 2 3 4 5; do
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/lvsuo/ 2>/dev/null | grep -q 200; then
        echo "✅ Vite dev (5173): HTTP 200 @ /lvsuo/"
        break
    fi
    sleep 1
done

echo
echo "📍 访问入口:"
echo "   本地:       http://localhost:5173/lvsuo/"
echo "   Nginx:     https://wxf-prod.huntercat.cn/lvsuo/"
echo "   Swagger:   http://localhost:3001/api/counsel/v1/docs"
echo "   健康检查: http://localhost:3001/api/counsel/v1/health"
echo
echo "🔑 测试账号:"
echo "   平台超管: platform-root / superadmin / SuperAdmin@2026!"
echo "   普通用户: cmqg2ohs20000pwifjm13la5s / admin / Test12345678"
echo
echo "📊 进程:"
pgrep -af "node dist/main" | head -2
pgrep -af "vite" | head -2
echo
echo "📜 日志(实时跟踪):"
echo "   tail -f /tmp/lmsuo-api.log"
echo "   tail -f /tmp/lmsuo-web.log"
echo
echo "🛑 停止服务:"
echo "   pkill -9 -f 'node dist/main'"
echo "   pkill -9 -f vite"
