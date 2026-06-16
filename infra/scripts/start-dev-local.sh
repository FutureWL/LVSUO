#!/bin/bash
# ============================================================================
# LM Unity · Counsel · 开发模式启动脚本(本地直接访问版)
# 用途: Vite dev 直接跑在 /,localhost:5173/ 即可访问
# 不通过 nginx,适合本地开发
# ============================================================================

set -e

ROOT_DIR="/root/DataDisk/workspace/LVSUO"
API_DIR="$ROOT_DIR/apps/api"
WEB_DIR="$ROOT_DIR/apps/web-admin"

echo "═══════════════════════════════════════════════"
echo "  LM Unity · 开发模式(本地直接访问)"
echo "═══════════════════════════════════════════════"
echo

# ---------- 1. 检查环境 ----------
command -v node >/dev/null || { echo "❌ node 未安装"; exit 1; }
command -v pnpm >/dev/null || { echo "❌ pnpm 未安装"; exit 1; }
command -v docker >/dev/null || { echo "❌ docker 未安装"; exit 1; }
echo "✅ node $(node --version) | pnpm $(pnpm --version)"

# ---------- 2. 启动基础设施 ----------
echo
echo "📦 启动基础设施..."
cd "$ROOT_DIR/infra"
docker compose up -d 2>&1 | tail -3

# ---------- 3. 启动 API ----------
echo
echo "🚀 启动后端 API..."
pkill -9 -f "node dist/main" 2>/dev/null || true
sleep 1

cd "$API_DIR"
nohup setsid bash -c '
    cd /root/DataDisk/workspace/LVSUO/apps/api
    export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/lmsuo?schema=public"
    export JWT_SECRET="this-is-a-test-jwt-secret-min-32-chars-long-ok"
    export APP_PORT=3000
    exec node dist/main.js
' </dev/null >/tmp/lmsuo-api.log 2>&1 &
disown

# ---------- 4. 启动 Vite(本地模式,base = /) ----------
echo
echo "🎨 启动 Vite dev(端口 5173,base = /)..."
pkill -9 -f "vite" 2>/dev/null || true
sleep 1

# 写 .env(本地模式,空 base)
cat > "$WEB_DIR/.env" << 'EOF'
VITE_BASE_PATH=
VITE_API_PROXY_TARGET=http://localhost:3000
VITE_APP_TITLE=智法云枢
EOF

cd "$WEB_DIR"
nohup setsid bash -c '
    cd /root/DataDisk/workspace/LVSUO/apps/web-admin
    export VITE_BASE_PATH=""
    exec pnpm dev --host 0.0.0.0
' </dev/null >/tmp/lmsuo-web.log 2>&1 &
disown

# ---------- 5. 等待 ----------
echo
echo "⏳ 等待启动(可能需要 10s)..."
sleep 10

# ---------- 6. 验证 ----------
echo
echo "═══════════════════════════════════════════════"
echo "  ✅ 启动结果"
echo "═══════════════════════════════════════════════"
echo

# API
for i in 1 2 3 4 5 6 7 8; do
    if curl -s -o /dev/null -w "" http://localhost:3000/api/counsel/v1/health 2>/dev/null; then
        echo "✅ API (3000): $(curl -s http://localhost:3000/api/counsel/v1/health)"
        break
    fi
    sleep 1
done

# Vite(无 /lvsuo 前缀!)
for i in 1 2 3 4 5 6 7 8; do
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/ 2>/dev/null | grep -q 200; then
        echo "✅ Vite dev (5173): HTTP 200 @ /  (本地模式,无 /lvsuo 前缀)"
        break
    fi
    sleep 1
done

echo
echo "📍 访问入口:"
echo "   本地直接:  http://localhost:5173/"
echo "   Swagger:   http://localhost:3000/api/counsel/v1/docs"
echo "   健康检查: http://localhost:3000/api/counsel/v1/health"
echo
echo "🔑 测试账号:"
echo "   平台超管: platform-root / superadmin / SuperAdmin@2026!"
echo "   普通用户: cmqg2ohs20000pwifjm13la5s / admin / Test12345678"
echo
echo "📋 进程:"
pgrep -af "node dist/main" | head -2
pgrep -af "vite" | head -2
echo
echo "🛑 停止: bash $ROOT_DIR/infra/scripts/stop-dev.sh"
echo
echo "💡 切换到 nginx 模式:"
echo "   bash $ROOT_DIR/infra/scripts/start-dev-nginx.sh"
