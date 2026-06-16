#!/bin/bash
# LVSUO Nginx 配置自测脚本
# 用法: sudo bash test.sh [mode]
#   <空>     测试所有 4 个文件
#   dev      仅测试 lvsuo.conf (snippet)
#   prod     仅测试 lvsuo-production.conf
#   public   仅测试 public-nginx.conf
#   local    仅测试 lvsuo-local-nginx.conf

set -e

MODE=${1:-all}

NGINX_DIR="/root/DataDisk/workspace/LVSUO/infra/nginx"
TMPDIR=$(mktemp -d)

echo "═══════════════════════════════════════════════"
echo "  LM Unity · Counsel · Nginx 配置测试"
echo "═══════════════════════════════════════════════"
echo
echo "📁 测试目录: $TMPDIR"
echo

if ! command -v nginx >/dev/null 2>&1; then
    echo "❌ nginx 未安装"
    exit 1
fi
echo "✅ nginx: $(nginx -v 2>&1)"
echo

# 把 snippet 包成完整 nginx.conf
wrap_snippet() {
    local snippet_file=$1
    local out_file=$2

    cat > "$out_file" << 'HEADER'
worker_processes 1;
pid /tmp/test-nginx.pid;
events {
    worker_connections 1024;
}
error_log /tmp/test-nginx-error.log warn;
http {
    access_log off;
    client_body_temp_path /tmp/test-nginx-body;
    proxy_temp_path /tmp/test-nginx-proxy;
    fastcgi_temp_path /tmp/test-nginx-fastcgi;
    uwsgi_temp_path /tmp/test-nginx-uwsgi;
    scgi_temp_path /tmp/test-nginx-scgi;
    server {
        listen 18099;
        server_name _;

HEADER
    cat "$snippet_file" >> "$out_file"
    cat >> "$out_file" << 'FOOTER'
    }
}
FOOTER
}

test_one() {
    local name=$1
    local conf_file=$2
    local use_https=$3  # "yes" or "no"

    echo "─── $name ───"

    if [ "$use_https" = "yes" ]; then
        # 生成自签证书(防 ssl_certificate 找不到)
        if [ ! -f /tmp/test-selfsigned.crt ]; then
            openssl req -x509 -nodes -newkey rsa:2048 \
                -keyout /tmp/test-selfsigned.key \
                -out /tmp/test-selfsigned.crt \
                -days 1 -subj "/CN=test" 2>/dev/null || true
        fi
        local tmpconf="$TMPDIR/$name-sub.conf"
        sed 's|/etc/nginx/ssl/wxf-prod.huntercat.cn|/tmp/test-selfsigned|g' \
            "$conf_file" > "$tmpconf"
        wrap_snippet "$tmpconf" "$TMPDIR/$name.conf"
    else
        wrap_snippet "$conf_file" "$TMPDIR/$name.conf"
    fi

    mkdir -p /tmp/test-nginx-body /tmp/test-nginx-proxy /tmp/test-nginx-fastcgi \
             /tmp/test-nginx-uwsgi /tmp/test-nginx-scgi 2>/dev/null || true

    local out
    out=$(nginx -t -c "$TMPDIR/$name.conf" -p /tmp 2>&1)
    if echo "$out" | grep -qE "syntax is ok|test is successful"; then
        echo "  ✅ $name: 语法正确"
        return 0
    else
        echo "  ❌ $name: 语法错误"
        echo "$out" | tail -5
        return 1
    fi
}

test_complete_config() {
    local name=$1
    local conf_file=$2
    local use_https=$3

    echo "─── $name ───"

    if [ "$use_https" = "yes" ]; then
        if [ ! -f /tmp/test-selfsigned.crt ]; then
            openssl req -x509 -nodes -newkey rsa:2048 \
                -keyout /tmp/test-selfsigned.key \
                -out /tmp/test-selfsigned.crt \
                -days 1 -subj "/CN=test" 2>/dev/null || true
        fi
        local tmpconf="$TMPDIR/$name-sub.conf"
        sed 's|/etc/nginx/ssl/wxf-prod.huntercat.cn|/tmp/test-selfsigned|g' \
            "$conf_file" > "$tmpconf"
    else
        cp "$conf_file" "$TMPDIR/$name-sub.conf"
    fi

    # 包装为完整 nginx.conf(包含 http 块)
    cat > "$TMPDIR/$name.conf" << 'HEADER'
worker_processes 1;
pid /tmp/test-nginx.pid;
events { worker_connections 1024; }
error_log /tmp/test-nginx-error.log warn;
http {
    access_log off;
    client_body_temp_path /tmp/test-nginx-body;
    proxy_temp_path /tmp/test-nginx-proxy;
    fastcgi_temp_path /tmp/test-nginx-fastcgi;
    uwsgi_temp_path /tmp/test-nginx-uwsgi;
    scgi_temp_path /tmp/test-nginx-scgi;

HEADER
    cat "$TMPDIR/$name-sub.conf" >> "$TMPDIR/$name.conf"
    echo "}" >> "$TMPDIR/$name.conf"

    mkdir -p /tmp/test-nginx-body /tmp/test-nginx-proxy /tmp/test-nginx-fastcgi \
             /tmp/test-nginx-uwsgi /tmp/test-nginx-scgi 2>/dev/null || true

    if nginx -t -c "$TMPDIR/$name.conf" -p /tmp 2>&1 | grep -qE "syntax is ok|test is successful"; then
        echo "  ✅ $name: 语法正确"
    else
        echo "  ❌ $name: 语法错误"
        nginx -t -c "$TMPDIR/$name.conf" -p /tmp 2>&1 | tail -5
    fi
}

case $MODE in
    dev)
        test_one "dev-snippet" "$NGINX_DIR/lvsuo.conf" "no"
        ;;
    prod)
        test_one "prod-snippet" "$NGINX_DIR/lvsuo-production.conf" "no"
        ;;
    public)
        test_complete_config "public-nginx" "$NGINX_DIR/public-nginx.conf" "yes"
        ;;
    local)
        test_complete_config "local-nginx" "$NGINX_DIR/lvsuo-local-nginx.conf" "no"
        ;;
    all|"")
        test_one "dev-snippet"  "$NGINX_DIR/lvsuo.conf"                "no"
        test_one "prod-snippet" "$NGINX_DIR/lvsuo-production.conf"   "no"
        test_complete_config "public-nginx" "$NGINX_DIR/public-nginx.conf" "yes"
        test_complete_config "local-nginx"  "$NGINX_DIR/lvsuo-local-nginx.conf" "no"
        ;;
    *)
        echo "用法: $0 [dev|prod|public|local|all]"
        exit 1
        ;;
esac

echo
echo "═══════════════════════════════════════════════"
echo "  ✅ 全部通过"
echo "═══════════════════════════════════════════════"
echo
echo "部署清单(你的 47.96.122.117):"
echo "  Public : /etc/nginx/sites-enabled/wxf-prod.huntercat.cn  ← public-nginx.conf"
echo "  Local  : /etc/nginx/sites-enabled/lvsuo                   ← lvsuo-local-nginx.conf"
echo
echo "  sudo cp $NGINX_DIR/public-nginx.conf        /etc/nginx/sites-enabled/wxf-prod.huntercat.cn"
echo "  sudo cp $NGINX_DIR/lvsuo-local-nginx.conf  /etc/nginx/sites-enabled/lvsuo"
echo "  sudo nginx -t && sudo nginx -s reload"
