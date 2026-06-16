# Nginx 双层部署 · 配置 & 部署指南

## 架构总览

```
Internet 用户
  │  https://wxf-prod.huntercat.cn/lvsuo
  ↓
┌──────────────────────────────────────────────────────────────┐
│  ① Public Nginx  (47.96.122.117:443)                          │
│     - SSL 终结 (wxf-prod.huntercat.cn.crt)                    │
│     - 安全网关(Strict-Transport-Security 等)                │
│     - HMR WebSocket 透传                                      │
│     - 反向代理到 127.0.0.1:80                                │
│     配置文件: public-nginx.conf                                │
└──────────────────────────────────────────────────────────────┘
  │  http://127.0.0.1/lvsuo   (或 http://127.0.0.1:80)
  ↓
┌──────────────────────────────────────────────────────────────┐
│  ② Local Nginx  (本机 :80,无 SSL)                              │
│     - 子目录路由(/lvsuo/* 的拆解)                            │
│     - HMR WebSocket 二次透传                                  │
│     配置文件: lvsuo-local-nginx.conf                          │
└──────────────────────────────────────────────────────────────┘
  │
  ├─ /lvsuo/api/*  →  http://127.0.0.1:3001/api/counsel/v1/*   (NestJS)
  └─ /lvsuo/*      →  http://127.0.0.1:5173/lvsuo/*            (Vite dev,带 HMR)
```

> **两层职责分明**:
> - Public 负责"对外可见性"(SSL、攻击面、HTTPS 跳转)
> - Local 负责"业务路由"(子目录拆分、内部代理)
> 这样切分后,改业务路由不影响 SSL,反之亦然

---

## 文件清单

| 文件 | 部署位置 | 类型 | 用途 |
|------|----------|------|------|
| `public-nginx.conf` | Public Nginx | **完整 server 块** | SSL 终结 + 反向代理到 Local |
| `lvsuo-local-nginx.conf` | Local Nginx | **完整 server 块** | 子目录路由 + Vite/API 代理 |
| `lvsuo.conf` | 任意 Nginx | **snippet**(无 server) | 同 local 的 location,适合插入到现有 server 块里 |
| `lvsuo-production.conf` | 任意 Nginx | **snippet**(无 server) | 生产模式,直接 serve dist |
| `test.sh` | 本地测试 | 脚本 | `nginx -t` 验证所有配置语法 |

> **选哪种**?
> - **两台 nginx 在不同机器**:用 `public-nginx.conf` + `lvsuo-local-nginx.conf`
> - **只有一台 nginx**(直接对外):把 `lvsuo.conf` 的 location 块插入到现有 server 块里

---

## 部署步骤(47.96.122.117)

### Step 0:前提

```bash
# 1. 域名解析
dig wxf-prod.huntercat.cn +short   # 应返回 47.96.122.117

# 2. SSL 证书(Let's Encrypt 范例)
sudo certbot certonly --nginx -d wxf-prod.huntercat.cn
# 证书位置:
#   /etc/letsencrypt/live/wxf-prod.huntercat.cn/fullchain.pem
#   /etc/letsencrypt/live/wxf-prod.huntercat.cn/privkey.pem
```

如果证书路径不是 `/etc/nginx/ssl/...`,需要修改 `public-nginx.conf` 里的 `ssl_certificate` 行。

### Step 1:复制配置

```bash
# ① Public Nginx
sudo cp /root/DataDisk/workspace/LVSUO/infra/nginx/public-nginx.conf \
        /etc/nginx/sites-enabled/wxf-prod.huntercat.cn

# ② Local Nginx
sudo cp /root/DataDisk/workspace/LVSUO/infra/nginx/lvsuo-local-nginx.conf \
        /etc/nginx/sites-enabled/lvsuo
```

### Step 2:验证

```bash
# 语法测试
sudo nginx -t
# 应输出:
#   nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### Step 3:重载

```bash
sudo nginx -s reload
# 或
sudo systemctl reload nginx
```

### Step 4:端到端验证

```bash
# 1. 域名解析
curl -I https://wxf-prod.huntercat.cn/lvsuo/
# 应 200,带 HSTS / X-Frame-Options 头

# 2. API 走通
curl -s https://wxf-prod.huntercat.cn/lvsuo/api/counsel/v1/health
# 应 {"status":"ok","database":"up"}

# 3. 浏览器访问
# https://wxf-prod.huntercat.cn/lvsuo/
# 登录:
#   平台超管: platform-root / superadmin / SuperAdmin@2026!
#   普通用户: cmqg2ohs20000pwifjm13la5s / admin / Test12345678
```

---

## 配置本地自测

`test.sh` 包装好完整的 nginx.conf 上下文,在你本地(不需要真的启动 nginx)就能验证语法:

```bash
# 测全部 4 个
bash /root/DataDisk/workspace/LVSUO/infra/nginx/test.sh

# 单独测某个
bash /root/DataDisk/workspace/LVSUO/infra/nginx/test.sh public
bash /root/DataDisk/workspace/LVSUO/infra/nginx/test.sh local
bash /root/DataDisk/workspace/LVSUO/infra/nginx/test.sh dev
bash /root/DataDisk/workspace/LVSUO/infra/nginx/test.sh prod
```

测试输出:
```
─── dev-snippet ───
  ✅ dev-snippet: 语法正确
─── prod-snippet ───
  ✅ prod-snippet: 语法正确
─── public-nginx ───
  ✅ public-nginx: 语法正确
─── local-nginx ───
  ✅ local-nginx: 语法正确
```

---

## 关键设计说明

### 1. 为什么分两层 nginx?

```
✅ 关注点分离
   Public:  SSL + 安全头 + HTTPS 跳转
   Local:   业务路由 + 子目录拆分
   
✅ 易于换底层
   要换 vite → fastapi 只需改 local nginx,不动 public
   
✅ 安全分层
   Public 暴露在公网,加固(限流、防火墙)
   Local 只对 Public 暴露,127.0.0.1 监听更安全
   
✅ 调试友好
   两层独立 access log,定位问题更快
```

### 2. WebSocket 透传链

```
Vite (HMR WS)  →  Local nginx (proxy)  →  Public nginx (proxy)  →  Browser
                ↑ 必须透传 Upgrade/Connection
                ↑ 必须有 86400s 长超时
```

每层都需要:
```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade    $http_upgrade;
proxy_set_header Connection $connection_upgrade;  # 来自 map
proxy_read_timeout    86400s;
```

`$connection_upgrade` 是 map 变量(在 `http {}` 顶层定义):
```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}
```

### 3. Host 头透传

```
Internet: Host: wxf-prod.huntercat.cn
  → Public: proxy_set_header Host $host;  (透传)
  → Local:  proxy_set_header Host $host;  (再次透传)
  → Vite:   看到 wxf-prod.huntercat.cn(看到真实域名)
```

如果中间任何一层覆盖了 Host,可能引起 301 重定向循环或 cookie scope 错误。

### 4. X-Forwarded-* 链

每层都设,最终后端能看到完整链路:

```
最终 X-Forwarded-For: client_ip, public_nginx_ip, local_nginx_ip
```

---

## 故障排查

| 症状 | 排查 |
|------|------|
| **502 Bad Gateway** | Vite/NestJS 没起 → `curl 127.0.0.1:5173` 验证 |
| **SSL 错误** | 证书路径不对 → 检查 `public-nginx.conf` 里的 `ssl_certificate` |
| **404 on /lvsuo/api/** | local nginx 配错,`nginx -t` 看是否有错 |
| **HMR 不工作** | 两层都缺 WebSocket 头 → `tail -f /var/log/nginx/*error.log` |
| **301 循环** | Host 头被覆盖 → 检查两层是否都透传 |
| **CSS/JS 404** | Vite base path 没配 → 看 HTML 源码里的 `<script src=...>` 应该是 `/lvsuo/...` |
| **登录跳 404** | SPA fallback 没生效 → 已在 vite.config 配 base,确认生效 |

### 看哪一层出错

```bash
# 看 public nginx 日志
sudo tail -f /var/log/nginx/wxf-prod-error.log

# 看 local nginx 日志
sudo tail -f /var/log/nginx/lvsuo-error.log

# 看 vite 日志
tail -f /tmp/lmsuo-web.log

# 看 API 日志
tail -f /tmp/lmsuo-api.log
```

### 单独测试每一层

```bash
# 跳过 Public,直接测 Local
curl http://localhost/lvsuo/                       # 应返回 Vite HTML
curl http://localhost/lvsuo/api/counsel/v1/health # 应返回 {"status":"ok"}

# 跳过 Local,直接测 Vite
curl http://localhost:5173/lvsuo/
curl http://localhost:5173/lvsuo/api/counsel/v1/health
```

---

## 仅一台 nginx 的简化方案(如果你以后想合并)

把 `lvsuo.conf` 里的 location 块整段插入到 public nginx 的 server 块里(替换 `proxy_pass http://127.0.0.1:80;` 为 `proxy_pass http://127.0.0.1:5173;` 等),然后删除 local nginx 那一层。

但生产推荐保留两层,职责清晰。
