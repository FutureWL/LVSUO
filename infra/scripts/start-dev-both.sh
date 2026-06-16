#!/bin/bash
# ============================================================================
# LM Unity · Counsel · 双 Vite 启动脚本
# 用途: 同时跑两个 Vite 实例
#       Vite A (5173, base=/)    → http://127.0.0.1:5173/         (本地直接)
#       Vite B (5174, base=/lvsuo/) → http://127.0.0.1:5174/lvsuo/   (走 nginx)
#       API 共享 3000
# ============================================================================

set -e

ROOT_DIR="/root/DataDisk/workspace/LVSUO"
API_DIR="$ROOT_DIR/apps/api"
WEB_DIR="$ROOT_DIR/apps/web-admin"

echo "═══════════════════════════════════════════════"
echo "  LM Unity · 双 Vite 启动(本地 + nginx)"
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
echo "🚀 启动后端 API(共享 3000)..."
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

# ---------- 4. 启动 Vite A (5173, base=/) ----------
echo
echo "🎨 启动 Vite A (5173, base=/) — 本地直接..."
pkill -9 -f "vite" 2>/dev/null || true
sleep 1

cd "$WEB_DIR"
nohup setsid bash -c '
    cd /root/DataDisk/workspace/LVSUO/apps/web-admin
    export VITE_BASE_PATH=""
    exec pnpm dev --host 0.0.0.0 --port 5173 --strictPort
' </dev/null >/tmp/lmsuo-web-a.log 2>&1 &
disown

# ---------- 5. 启动 Vite B (5174, base=/lvsuo/) ----------
echo
echo "🎨 启动 Vite B (5174, base=/lvsuo/) — nginx 子目录..."
sleep 2

cd "$WEB_DIR"
nohup setsid bash -c '
    cd /root/DataDisk/workspace/LVSUO/apps/web-admin
    export VITE_BASE_PATH="/lvsuo/"
    exec pnpm dev --host 0.0.0.0 --port 5174 --strictPort
' </dev/null >/tmp/lmsuo-web-b.log 2>&1 &
disown

# ---------- 6. 等待 ----------
echo
echo "⏳ 等待启动(可能需要 15s)..."
sleep 15

# ---------- 7. 验证 ----------
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

# Vite A
for i in 1 2 3 4 5 6 7 8; do
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/ 2>/dev/null | grep -q 200; then
        echo "✅ Vite A (5173, base=/):     HTTP 200 @ /"
        break
    fi
    sleep 1
done

# Vite B
for i in 1 2 3 4 5 6 7 8; do
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:5174/lvsuo/ 2>/dev/null | grep -q 200; then
        echo "✅ Vite B (5174, base=/lvsuo/): HTTP 200 @ /lvsuo/"
        break
    fi
    sleep 1
done

echo
echo "📍 访问入口:"
echo "   本地直接:   http://127.0.0.1:5173/"
echo "   走 nginx:   http://127.0.0.1:80/lvsuo/    (需先配 local nginx)"
echo "   远程 nginx: https://wxf-prod.huntercat.cn/lvsuo/"
echo "   Swagger:   http://localhost:3000/api/counsel/v1/docs"
echo
echo "🔑 测试账号:"
echo "   平台超管: platform-root / superadmin / SuperAdmin@2026!"
echo "   普通用户: cmqg2ohs20000pwifjm13la5s / admin / Test12345678"
echo
echo "📋 nginx 配置(若未部署):"
echo "   sudo cp $ROOT_DIR/infra/nginx/public-nginx.conf /etc/nginx/sites-enabled/wxf-prod.huntercat.cn"
echo "   sudo cp $ROOT_DIR/infra/nginx/lvsuo-local-nginx.conf /etc/nginx/sites-enabled/lvsuo"
echo "   sudo nginx -t && sudo nginx -s reload"
echo
echo "🛑 停止: bash $ROOT_DIR/infra/scripts/stop-dev.sh"
echo
echo "💡 切换到单 Vite 模式:"
echo "   bash $ROOT_DIR/infra/scripts/start-dev-local.sh   # 只 5173,base=/"
echo "   bash $ROOT_DIR/infra/scripts/start-dev-nginx.sh   # 只 5173,base=/lvsuo/"
