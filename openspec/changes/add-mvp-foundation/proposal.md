# Change: 添加 PubCast MVP 基础能力

## Why
PubCast 需要完整的技术基础设施和核心功能模块，以支持多平台内容自动发布。本变更定义了 MVP 阶段的 9 个核心能力，为后续迭代奠定基础。

## What Changes
- **ADDED** account-management: 账号 OAuth 授权、凭证加密存储、状态监控
- **ADDED** proxy-management: 代理池 CRUD、健康检测、轮换策略、账号关联
- **ADDED** platform-adapter: 平台抽象框架、PlatformAdapter trait、适配器注册
- **ADDED** content-distribution: 一对多批量发布、内容格式适配、媒体处理
- **ADDED** publishing-scheduler: 即时/定时发布、队列管理、并发控制、重试机制
- **ADDED** browser-automation: Playwright 集成、Stealth 反检测、Fingerprint 管理
- **ADDED** data-storage: SQLite 数据库设计、AES-256-GCM 加密、密钥管理
- **ADDED** logging-statistics: 发布日志、成功率统计、错误归类
- **ADDED** remote-content-api: 外部 CMS 对接客户端、Mock Server、内容同步

## Impact
- **Affected specs**: 新增 9 个核心能力规格
- **Affected code**: 
  - `src-tauri/src/` - Rust 后端全部模块
  - `src/` - React 前端组件
  - `migrations/` - SQLite 数据库迁移文件
  - `playwright-scripts/` - 浏览器自动化脚本
- **Database**: 新增 9 张核心数据表 + 索引 (含 proxies 表)
- **External dependencies**: Playwright, SQLx, AES-GCM, Argon2, Tauri 2.0
