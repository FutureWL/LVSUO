#!/bin/bash
# LVSUO Nginx 配置自测脚本
# 用法: sudo bash test.sh <mode>
#   <mode> = dev      测试开发模式配置(lvsuo.conf)
#   <mode> = prod     测试生产模式配置(lvsuo-production.conf)
#   <mode> = both     测试两种

set -e

MODE=${1:-both}

echo "═══════════════════════════════════════════════"
echo "  LVSUO Nginx 配置测试"
echo "═══════════════════════════════════════════════"
echo

# 1. 检查 nginx 是否安装
if ! command -v nginx &> /dev/null; then
    echo "❌ nginx 未安装"
    exit 1
fi
echo "✅ nginx: $(nginx -v 2>&1)"

# 2. 准备测试目录
TMPDIR=$(mktemp -d)
echo "📁 测试目录: $TMPDIR"
echo

# 3. 复制配置并包装成完整 server 块
test_config() {
    local name=$1
    local conf_file=$2
    local listen_port=$3

    echo "─── 测试 [$name] 配置 (监听 :$listen_port) ───"

    # 包成完整 server 块
    cat > "$TMPDIR/test-$name.conf" << EOF
server {
    listen $listen_port;
    server_name _;

$(cat "$conf_file")

    access_log off;
    error_log /tmp/lvsuo-nginx-test-error.log;
}
EOF

    # 用临时前缀测试
    if nginx -t -c "$TMPDIR/test-$name.conf" -p /tmp 2>&1 | grep -E "syntax is ok|test is successful"; then
        echo "✅ [$name] 配置语法正确"
    else
        echo "❌ [$name] 配置有错误,见上"
        return 1
    fi
    echo
}

# 4. 测试 dev / prod
case $MODE in
    dev)
        test_config "dev" "/root/DataDisk/workspace/LVSUO/infra/nginx/lvsuo.conf" "18080"
        ;;
    prod)
        test_config "prod" "/root/DataDisk/workspace/LVSUO/infra/nginx/lvsuo-production.conf" "18081"
        ;;
    both)
        test_config "dev"  "/root/DataDisk/workspace/LVSUO/infra/nginx/lvsuo.conf"                "18080"
        test_config "prod" "/root/DataDisk/workspace/LVSUO/infra/nginx/lvsuo-production.conf" "18081"
        ;;
    *)
        echo "用法: $0 {dev|prod|both}"
        exit 1
        ;;
esac

echo
echo "═══════════════════════════════════════════════"
echo "  ✅ 全部测试通过"
echo "═══════════════════════════════════════════════"
echo
echo "下一步:"
echo "  1. 把对应配置复制到 /etc/nginx/conf.d/ 或 sites-enabled/"
echo "  2. sudo nginx -t  # 最终验证"
echo "  3. sudo nginx -s reload  # 热重载"
