#!/bin/bash
# 停止所有开发服务
echo "停止 API..."
pkill -9 -f "node dist/main" 2>/dev/null
echo "停止 Vite..."
pkill -9 -f "vite" 2>/dev/null
sleep 1
echo "✅ 全部停止"
pgrep -af "node dist/main|vite" | head -3
