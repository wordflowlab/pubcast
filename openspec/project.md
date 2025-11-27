# PubCast Project Context

## Purpose
PubCast 是一款桌面端多平台内容自动发布工具，通过浏览器自动化实现内容的一键多平台分发。目标用户为内容创作者、自媒体运营者和企业新媒体团队。

## Tech Stack
- **Frontend**: React 18 + TypeScript + Tailwind CSS + Radix UI
- **Desktop**: Tauri 2.0
- **Backend**: Rust (Tokio + SQLx + Reqwest)
- **Database**: SQLite + AES-256-GCM encryption
- **Browser Automation**: Playwright + Fingerprint + Stealth + Proxy

## Project Conventions

### Code Style
- **Rust**: `rustfmt` + `clippy` 标准配置
- **TypeScript**: Prettier + ESLint (Airbnb)
- **命名规范**: snake_case (Rust), camelCase (TypeScript)
- **文件命名**: kebab-case for components, snake_case for Rust modules

### Architecture Patterns
- **分层架构**: UI → Service → Adapter → Infrastructure
- **依赖注入**: 通过 trait 和接口实现
- **错误处理**: `Result<T, Error>` 统一错误类型
- **异步模式**: Tokio async runtime with structured concurrency

### Testing Strategy
- 单元测试覆盖率 >80%
- 每个 platform adapter 必须有集成测试
- E2E 测试覆盖核心发布流程
- 工具: `cargo test`, React Testing Library, Playwright

### Git Workflow
- Main branch 保护，PR review 必需
- Commit message: `type(scope): description`
- 每个 change 对应独立分支: `feature/add-wechat-adapter`
- Squash merge to main

## Domain Context
- **平台 (Platform)**: 微信公众号、头条号、小红书、知乎等内容平台
- **发布 (Publish)**: 将内容从源系统分发到多个目标平台的过程
- **账号 (Account)**: 用户在各平台的已授权账号实例
- **适配器 (Adapter)**: 针对特定平台的发布逻辑封装
- **任务 (Task)**: 一次内容分发请求，可包含多个目标账号
- **作业 (Job)**: 单个账号的发布执行单元

## Important Constraints
- 必须遵守各平台服务条款
- 敏感数据（凭证）必须使用 AES-256-GCM 加密存储
- 浏览器自动化需考虑反检测措施
- 单机运行，无需服务端
- 每个账号发布串行执行，避免平台检测

## External Dependencies
- **Remote Content API**: 内容源系统 (HTTP REST API)
- **Platform Websites**: 各社交媒体平台官网
- **Proxy Servers**: 可选的代理服务 (HTTP/HTTPS/SOCKS5)
- **System Keychain**: macOS Keychain / Windows Credential Manager / Linux Secret Service
