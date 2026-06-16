# LVSUO 律所项目门户

> FutureWL 律师事务所项目管理门户(Law Firm Project Portal)

## 项目简介

LVSUO 是 FutureWL 律师事务所的内部项目门户,用于集中管理律所的案件、项目、客户与文档资源,提升协同办公与项目交付效率。

## 核心功能

- **案件管理**:案件立案、分配、进度跟踪、结案归档
- **客户管理**:客户档案、联系人、合同与历史委托记录
- **项目协作**:任务分配、里程碑、文档共享与审阅流程
- **文档中心**:模板库、案例库、法律法规知识库
- **时间与计费**:工时记录、账单生成、收费统计
- **数据看板**:律师工作台、案件统计、营收分析

## 技术栈

- 前端:Vue 3 / React + TypeScript
- 后端:Node.js (NestJS) / Spring Boot
- 数据库:PostgreSQL / MySQL
- 部署:Docker + CI/CD

## 仓库地址

- SSH:`ssh://git@localhost:2222/FutureWL/LVSUO.git`

## 目录结构

```
LVSUO/
├── README.md        # 项目说明
├── docs/            # 项目文档
├── frontend/        # 前端应用
├── backend/         # 后端服务
└── deploy/          # 部署配置
```

## 协作流程

1. 从 `main` 拉取功能分支:`git checkout -b feature/<name>`
2. 提交并推送:`git push origin feature/<name>`
3. 创建 Merge Request 进行代码评审
4. 合并后自动部署到测试环境

## 许可证

内部使用 · © FutureWL 律师事务所
