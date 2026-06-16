# @lm-unity/web-admin

LM Unity · Counsel · 律所管理端(Vue 3)

## 技术栈

- **框架**: Vue 3 + TypeScript
- **构建**: Vite 5
- **UI**: Element Plus
- **状态**: Pinia
- **路由**: Vue Router 4
- **HTTP**: Axios
- **共享类型**: `@lm-unity/shared`(workspace 协议)

## 启动

```bash
# 在 monorepo 根目录
pnpm install
pnpm --filter @lm-unity/api dev    # 先启动 API

# 启动 web-admin
pnpm --filter @lm-unity/web-admin dev
```

访问 http://localhost:5173

## 任务书 V3.0 落地映射

| 任务书章节 | 本项目页面 |
|------------|------------|
| 11.1 律所管理端 · 总览驾驶舱 | `views/Dashboard.vue` |
| 11.1 · 线索看板 | `views/leads/LeadList.vue` |
| 11.1 · 内容合规审查 | `views/marketing/ContentList.vue` |
| 11.1 · 服务产品库 | `views/products/ProductList.vue` |
| 11.1 · 案件看板 | `views/matters/MatterList.vue` |
| 11.1 · 报价审批 / 客户成功 / 团队负荷 / 质检 / 知识中心 / 合规报表 | 待开发(对应 7-10 业务模块逐步上线) |
