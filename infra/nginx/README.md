# Nginx 子目录反向代理 · 部署指南

## 目标

将 `https://wxf-prod.huntercat.cn/lvsuo/` 通过 Nginx 反向代理到本地的 Vite dev server。

```
浏览器
  ↓ https://wxf-prod.huntercat.cn/lvsuo/
Nginx (:443) ← 你要配的
  ├─ /lvsuo/api/*  →  http://127.0.0.1:3001/api/counsel/v1/*   (NestJS API)
  └─ /lvsuo/*      →  http://127.0.0.1:5173/lvsuo/*           (Vite dev,带 HMR)
```

## 前置条件

| 服务 | 端口 | 状态 |
|------|------|------|
| **Vite dev**(web-admin) | 5173 | 必须运行 |
| **NestJS API** | 3001 | 必须运行 |
| **Nginx** | 443 | 已运行,SSL 已配 |

## 部署步骤

### Step 1:确保 Vite 已配 base path

检查 `apps/web-admin/vite.config.ts` 是否有:

```ts
base: env.VITE_BASE_PATH || '/',
```

如果生产环境用 `/lvsuo/`,在 `apps/web-admin/.env` 中设置:

```bash
VITE_BASE_PATH=/lvsuo/
```

### Step 2:配置 Vite 启动环境

```bash
# 1. 编辑 .env
cd /root/DataDisk/workspace/LVSUO/apps/web-admin
cat .env

# 应该包含(也接受默认值):
# VITE_BASE_PATH=/lvsuo/
# VITE_API_PROXY_TARGET=http://localhost:3001
```

### Step 3:把 nginx 配置加入现有 server

```bash
# 查看现有 nginx 配置
sudo nginx -T 2>&1 | grep -A 5 "server {" | head -20
ls /etc/nginx/sites-enabled/
ls /etc/nginx/conf.d/
```

#### 方案 A(推荐):整段 include

```bash
sudo cp /root/DataDisk/workspace/LVSUO/infra/nginx/lvsuo.conf /etc/nginx/conf.d/lvsuo.conf

# 编辑文件,删除 "方案 A" 注释以外的所有 location
# 然后把它 include 到现有 server 块里
# 或者直接用方案 B
```

#### 方案 B(最简单):独立 server 块

在 `lvsuo.conf` 文件底部已经有完整 server 块示例,直接:

```bash
sudo cp /root/DataDisk/workspace/LVSUO/infra/nginx/lvsuo.conf /etc/nginx/sites-enabled/lvsuo.conf
# (可选) 移除文件顶部 "方案 A" 的 location 块,只保留底部 "方案 B" 的 server
```

### Step 4:测试并 reload

```bash
# 测试配置语法
sudo nginx -t

# 重载(不中断现有连接)
sudo nginx -s reload
```

### Step 5:验证

```bash
# 1. 健康检查
curl -s https://wxf-prod.huntercat.cn/lvsuo/api/counsel/v1/health

# 2. 检查首页(应返回 HTML)
curl -sI https://wxf-prod.huntercat.cn/lvsuo/ | head -3

# 3. 浏览器访问
# https://wxf-prod.huntercat.cn/lvsuo/
# 登录:
#   租户 ID: cmqg2ohs20000pwifjm13la5s
#   用户名: admin
#   密码: Test12345678
# 或平台超管:
#   租户 ID: platform-root
#   用户名: superadmin
#   密码: SuperAdmin@2026!
```

## 关键设计说明

### 1. 为什么分两个 location?

```
/lvsuo/api/*  →  NestJS (3001)         # 静态直转,日志清晰
/lvsuo/*      →  Vite dev (5173)      # 动态处理,支持 HMR
```

API 走 nginx 直转比走 Vite 代理:
- ✅ 少一次 HTTP 跳转,延迟更低
- ✅ API 路径不被 vite 误判为静态资源
- ✅ 错误日志更清晰(直接看到后端)
- ✅ 可以独立配置 API 缓存 / 限流

### 2. ^~ 修饰符的作用

```nginx
location ^~ /lvsuo/api/ { ... }   # 1. 优先匹配,前缀最长
location ^~ /lvsuo/     { ... }   # 2. 其次匹配
```

`^~` 表示"前缀最长匹配即采用,不进入正则检查"。`/lvsuo/api/foo` 会优先命中 `/lvsuo/api/`。

### 3. Vite 的 `base` 配置

`base: '/lvsuo/'` 让 Vite 在 HTML 里生成:
```html
<script src="/lvsuo/assets/index-xxx.js"></script>
```

浏览器请求 `https://wxf-prod.huntercat.cn/lvsuo/assets/...` → nginx 转发到 vite → vite 服务静态文件。

### 4. HMR WebSocket

Vite HMR 用 WebSocket。Nginx 需要:
```nginx
proxy_set_header Upgrade    $http_upgrade;
proxy_set_header Connection "upgrade";
proxy_read_timeout    86400s;  # 长连接
```

### 5. 路径重写

```
浏览器: GET /lvsuo/api/auth/login
  ↓ nginx
rewrite:  /api/counsel/v1/auth/login   (去掉 /lvsuo/ 前缀,加上后端前缀)
  ↓ proxy_pass
后端: GET /api/counsel/v1/auth/login
```

`rewrite ^/lvsuo/api/(.*)$ /api/counsel/v1/$1 break;` 是核心。

## 故障排查

| 症状 | 可能原因 | 排查方法 |
|------|----------|----------|
| 502 Bad Gateway | Vite/NestJS 没启动 | `curl http://127.0.0.1:5173`、`curl http://127.0.0.1:3001/api/counsel/v1/health` |
| 静态资源 404 | Vite 没设 base,或 BASE_URL 不对 | 浏览器查看 HTML 里的 `<script src=...>` 应是 `/lvsuo/...` |
| HMR 不工作 | WebSocket 没透传 | 浏览器 DevTools → Network → WS 看连接 |
| API 跨域 | rewrite 写错 | `curl -v https://wxf-prod.huntercat.cn/lvsuo/api/health` 看 nginx 日志 |
| 登录后跳 404 | Vite history 模式未配 | 已在 vite.config 配 base,确认生效 |
| 慢 / 504 | proxy_read_timeout 太短 | UI 长连接建议 86400s |

## nginx 错误日志

```bash
# 实时跟踪错误
sudo tail -f /var/log/nginx/error.log

# 只看 lvsuo 相关
sudo grep "lvsuo" /var/log/nginx/error.log
```
