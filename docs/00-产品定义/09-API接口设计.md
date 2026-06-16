# 第 9 章 · API 接口设计

> 本章定义 LM Unity · Counsel + 律时 的 **6 大 API 接口组**。所有接口遵循 RESTful 风格,统一前缀 `/api/counsel/v1/`。
>
> **接口约定**:
> - 鉴权:Bearer Token (JWT),所有接口必带 `Authorization` 头
> - 租户隔离:所有接口从 JWT 中解析 `tenant_id`,自动注入
> - 数据密级:返回结构中包含 `data_level` 字段,前端按 5.2 规则渲染
> - 错误码:统一 `4xx`(客户端)/ `5xx`(服务端),详细错误码表见 OpenAPI 规范

---

## 9.1 推广合规接口

| 方法 | 路径 | 用途 |
|------|------|------|
| `POST` | `/api/counsel/v1/marketing/accounts` | 创建推广账号 |
| `GET`  | `/api/counsel/v1/marketing/accounts` | 查询推广账号列表 |
| `POST` | `/api/counsel/v1/marketing/contents` | 提交推广内容 |
| `POST` | `/api/counsel/v1/marketing/contents/{id}/ai-risk-check` | AI 风险初审 |
| `POST` | `/api/counsel/v1/marketing/contents/{id}/submit-review` | 提交审核 |
| `POST` | `/api/counsel/v1/marketing/contents/{id}/approve` | 审核通过 |
| `POST` | `/api/counsel/v1/marketing/contents/{id}/reject` | 审核拒绝 |
| `POST` | `/api/counsel/v1/marketing/contents/{id}/publish` | 发布 |

## 9.2 线索分诊接口

| 方法 | 路径 | 用途 |
|------|------|------|
| `POST` | `/api/counsel/v1/leads` | 创建线索 |
| `GET`  | `/api/counsel/v1/leads` | 查询线索列表 |
| `GET`  | `/api/counsel/v1/leads/{id}` | 查询线索详情 |
| `POST` | `/api/counsel/v1/leads/{id}/privacy-consent` | 客户隐私授权 |
| `POST` | `/api/counsel/v1/leads/{id}/lushi-intake` | 律时初步接待 |
| `POST` | `/api/counsel/v1/leads/{id}/triage` | 结构化分诊 |
| `POST` | `/api/counsel/v1/leads/{id}/assign-lawyer` | 分配律师 |
| `POST` | `/api/counsel/v1/leads/{id}/convert-to-client` | 转为客户 |

## 9.3 服务产品接口

| 方法 | 路径 | 用途 |
|------|------|------|
| `POST` | `/api/counsel/v1/service-products` | 创建服务产品 |
| `GET`  | `/api/counsel/v1/service-products` | 查询服务产品列表 |
| `GET`  | `/api/counsel/v1/service-products/{id}` | 查询服务产品详情 |
| `PUT`  | `/api/counsel/v1/service-products/{id}` | 更新服务产品 |
| `POST` | `/api/counsel/v1/service-products/{id}/enable` | 启用 |
| `POST` | `/api/counsel/v1/service-products/{id}/disable` | 停用 |

## 9.4 报价与签约接口

| 方法 | 路径 | 用途 |
|------|------|------|
| `POST` | `/api/counsel/v1/quotes` | 创建报价卡 |
| `GET`  | `/api/counsel/v1/quotes/{id}` | 查询报价卡 |
| `POST` | `/api/counsel/v1/quotes/{id}/approve` | 内部审批 |
| `POST` | `/api/counsel/v1/quotes/{id}/send-to-client` | 发送客户 |
| `POST` | `/api/counsel/v1/quotes/{id}/client-confirm` | 客户确认(含风险揭示) |
| `POST` | `/api/counsel/v1/engagements` | 创建委托 |
| `POST` | `/api/counsel/v1/engagements/{id}/sign` | 电子签约 |

## 9.5 律时接口

| 方法 | 路径 | 用途 |
|------|------|------|
| `POST` | `/api/counsel/v1/lushi/message` | 文本对话 |
| `POST` | `/api/counsel/v1/lushi/voice` | 语音对话 |
| `POST` | `/api/counsel/v1/lushi/intake` | 触发初步接待 |
| `POST` | `/api/counsel/v1/lushi/time/start` | 语音开始计时 |
| `POST` | `/api/counsel/v1/lushi/time/stop` | 语音停止计时 |
| `POST` | `/api/counsel/v1/lushi/client-question` | 客户侧提问 |
| `GET`  | `/api/counsel/v1/lushi/conversations` | 查询对话历史 |

## 9.6 案件接口

| 方法 | 路径 | 用途 |
|------|------|------|
| `POST` | `/api/counsel/v1/matters` | 创建案件 |
| `GET`  | `/api/counsel/v1/matters` | 查询案件列表 |
| `GET`  | `/api/counsel/v1/matters/{id}` | 查询案件详情 |
| `POST` | `/api/counsel/v1/matters/{id}/transition` | 状态机流转 |
| `POST` | `/api/counsel/v1/matters/{id}/close` | 结案 |
| `POST` | `/api/counsel/v1/matters/{id}/knowledge-extract` | 知识提取 |

---

> **补充设计要点**
>
> - 所有 `POST` 写入接口需经过 **StageGate 校验**(见 5.1 权限模型)
> - 所有 `GET` 列表接口默认带 **分页**(`page` / `page_size`)+ **租户隔离过滤**
> - 所有 `AI` 接口(`/lushi/*` 等)需经过 **L6 数据前置过滤**(见 5.2.1)
> - 错误响应统一结构:
>   ```json
>   {
>     "code": "QUOTE_SCOPE_EMPTY",
>     "message": "服务范围不能为空",
>     "data_level": "L2",
>     "trace_id": "uuid"
>   }
>   ```
> - **OpenAPI 3.1** 规范文件 `openapi.yaml` 作为接口单一事实源
