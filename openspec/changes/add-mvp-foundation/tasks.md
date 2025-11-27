# MVP Foundation Implementation Tasks

## 1. 项目初始化
- [ ] 1.1 创建 Tauri 2.0 项目脚手架
- [ ] 1.2 配置 Rust 工作空间和依赖 (Tokio, SQLx, Reqwest, AES-GCM, Argon2)
- [ ] 1.3 配置 React + TypeScript + Tailwind CSS + Radix UI
- [ ] 1.4 设置 Git hooks 和 CI/CD (rustfmt, clippy, eslint, prettier)
- [ ] 1.5 配置 Tauri permissions 和 capabilities

## 2. 数据库基础设施 (data-storage)
- [ ] 2.1 实现 SQLx 连接池和初始化逻辑
- [ ] 2.2 创建 accounts 表 migration
- [ ] 2.3 创建 platform_configs 表 migration
- [ ] 2.4 创建 contents 表 migration
- [ ] 2.5 创建 distribution_tasks 表 migration
- [ ] 2.6 创建 publish_jobs 表 migration
- [ ] 2.7 创建 browser_sessions 表 migration
- [ ] 2.8 创建 publish_logs 和 statistics 表 migration
- [ ] 2.9 创建 encryption_metadata 和 content_sync_status 表 migration
- [ ] 2.10 编写数据库初始化和迁移测试

## 3. 加密服务 (data-storage)
- [ ] 3.1 实现 AES-256-GCM 加密/解密服务
- [ ] 3.2 集成系统 keychain 管理主密钥 (keyring crate)
- [ ] 3.3 实现 Argon2id 密钥派生
- [ ] 3.4 实现加密元数据管理
- [ ] 3.5 编写加密服务单元测试

## 4. 代理池管理 (proxy-management)
- [ ] 4.1 创建 proxies 表 migration
- [ ] 4.2 实现 Proxy 模型和 CRUD 操作
- [ ] 4.3 实现批量导入代理功能
- [ ] 4.4 实现代理健康检测服务 (连通性测试、IP 检测)
- [ ] 4.5 实现定时健康检查后台任务
- [ ] 4.6 实现代理轮换策略 (固定/轮询/随机)
- [ ] 4.7 实现账号-代理关联管理
- [ ] 4.8 实现 Tauri Commands: list_proxies, add_proxy, delete_proxy, check_proxy
- [ ] 4.9 实现代理管理 UI 组件
- [ ] 4.10 编写代理管理单元测试

## 5. 浏览器自动化 (browser-automation)
- [ ] 5.1 评估 Playwright Rust bindings vs subprocess 方案
- [ ] 5.2 创建 Playwright Node.js 脚本框架
- [ ] 5.3 实现 BrowserSession 抽象和 Rust-Node IPC
- [ ] 5.4 实现 Stealth 插件集成
- [ ] 5.5 实现 Fingerprint 生成和管理
- [ ] 5.6 集成代理池服务，按策略选择代理
- [ ] 5.7 编写反检测效果验证测试

## 6. 平台适配器框架 (platform-adapter)
- [ ] 6.1 定义 PlatformAdapter trait 和核心接口
- [ ] 6.2 实现 AdapterRegistry 适配器注册机制
- [ ] 6.3 定义 LoginStrategy trait 登录流程抽象
- [ ] 6.4 实现 platform_configs 表 CRUD
- [ ] 6.5 实现微信公众号 adapter (WechatAdapter)
- [ ] 6.6 实现小红书 adapter (XiaohongshuAdapter)
- [ ] 6.7 编写适配器集成测试

## 7. 账号管理 (account-management)
- [ ] 7.1 实现 Account 模型和 CRUD 操作
- [ ] 7.2 实现账号凭证加密存储和读取
- [ ] 7.3 实现 OAuth 授权流程 (通过浏览器)
- [ ] 7.4 实现 Cookie/Session 授权方式
- [ ] 7.5 实现账号状态检测和刷新逻辑
- [ ] 7.6 实现 Tauri Commands: list_accounts, add_account, delete_account
- [ ] 7.7 实现账号列表 UI 组件
- [ ] 7.8 实现添加账号对话框 UI
- [ ] 7.9 编写账号管理单元测试

## 8. 远程内容 API 客户端 (remote-content-api)
> 注: 远程内容管理是外部系统，此处仅实现客户端对接

- [ ] 8.1 创建 Mock Server (Express/Fastify) 用于开发测试
- [ ] 8.2 定义 Mock 数据结构和示例内容
- [ ] 8.3 实现 API 端点配置和连接测试
- [ ] 8.4 定义 Remote API 客户端接口 (Reqwest)
- [ ] 8.5 实现内容列表拉取 (GET /api/v1/contents)
- [ ] 8.6 实现单条内容获取 (GET /api/v1/contents/:id)
- [ ] 8.7 实现发布状态回写 (POST /api/v1/contents/:id/published)
- [ ] 8.8 实现内容同步后台任务 (增量同步)
- [ ] 8.9 实现 content_sync_status 管理
- [ ] 8.10 实现 Tauri Command: sync_contents, list_contents, configure_api
- [ ] 8.11 编写 API 客户端集成测试

## 9. 内容分发 (content-distribution)
- [ ] 9.1 实现 Content 模型和 CRUD
- [ ] 9.2 实现 Markdown → 平台富文本转换抽象
- [ ] 9.3 实现媒体文件处理 (下载、缓存、上传)
- [ ] 9.4 实现 DistributionTask 创建和管理
- [ ] 9.5 实现 Tauri Command: create_distribution_task
- [ ] 9.6 实现内容列表 UI 组件
- [ ] 9.7 实现发布配置 UI (选择账号、设置定时)
- [ ] 9.8 编写内容分发单元测试

## 10. 发布调度器 (publishing-scheduler)
- [ ] 10.1 实现 PublishJob 模型和队列管理
- [ ] 10.2 实现调度器后台任务 (Tokio spawn)
- [ ] 10.3 实现全局并发控制 (Semaphore)
- [ ] 10.4 实现账号级串行执行
- [ ] 10.5 实现指数退避重试机制
- [ ] 10.6 实现 Tauri Command: get_publish_jobs
- [ ] 10.7 实现发布进度 UI 组件 (实时状态)
- [ ] 10.8 编写调度器并发测试

## 11. 日志与统计 (logging-statistics)
- [ ] 11.1 实现发布日志记录服务
- [ ] 11.2 实现日志查询接口
- [ ] 11.3 实现统计数据计算 (成功率、平台分析)
- [ ] 11.4 实现 Tauri Command: get_statistics
- [ ] 11.5 实现发布历史 UI 组件
- [ ] 11.6 实现统计面板 UI
- [ ] 11.7 编写统计准确性测试

## 12. E2E 测试与优化
- [ ] 12.1 编写微信公众号完整发布 E2E 测试
- [ ] 12.2 编写小红书完整发布 E2E 测试
- [ ] 12.3 编写多账号并发发布压力测试
- [ ] 12.4 性能基准测试和优化
- [ ] 12.5 数据库索引优化
- [ ] 12.6 文档更新
