# PubCast

多平台内容自动发布工具 - 基于 Tauri 2.0 构建

## 功能特性

- **账号管理**: 支持微信公众号、小红书等平台的账号授权和管理
- **代理池管理**: 代理 CRUD、健康检测、轮换策略
- **内容分发**: 一对多批量发布、内容格式适配
- **发布调度**: 即时/定时发布、队列管理、重试机制
- **浏览器自动化**: Playwright 集成、Stealth 反检测
- **数据安全**: AES-256-GCM 加密、系统 Keychain 密钥管理

## 技术栈

### 前端
- React 18 + TypeScript
- Tailwind CSS + Radix UI
- Vite

### 后端 (Tauri)
- Rust + Tokio 异步运行时
- SQLite + SQLx
- AES-GCM + Argon2id 加密

### 浏览器自动化
- Playwright (Node.js sidecar)
- Stealth 反检测

## 安装说明

### macOS 首次打开

由于应用未经 Apple 签名，首次打开时 macOS 可能会提示「应用已损坏」。请在终端运行以下命令后重新打开：

```bash
# 移除隔离属性
xattr -cr /Applications/pubcast.app
```

或者：右键点击应用 → 选择「打开」→ 在弹窗中点击「打开」按钮。

### Playwright 服务

首次使用账号授权功能前，需要确保系统已安装 Node.js，应用会自动启动 Playwright 服务。

如果出现「Playwright 服务未启动」提示，请手动启动：

```bash
# 进入应用资源目录
cd /Applications/pubcast.app/Contents/Resources/playwright-sidecar

# 安装依赖并启动
npm install && npm start
```

## 开发环境

### 前置要求

- Node.js >= 18
- pnpm >= 8
- Rust >= 1.70
- 系统依赖 (macOS): Xcode Command Line Tools

### 安装依赖

```bash
# 安装前端依赖
pnpm install

# Rust 依赖会在首次构建时自动下载
```

### 开发模式

```bash
# 启动前端开发服务器
pnpm dev

# 启动完整 Tauri 应用 (推荐)
pnpm tauri dev
```

### 构建

```bash
# 构建生产版本
pnpm tauri build
```

## 项目结构

```
pubcast/
├── src/                    # React 前端
│   ├── components/         # UI 组件
│   ├── hooks/              # React Hooks
│   ├── lib/                # 工具函数
│   └── App.tsx             # 主应用
├── src-tauri/              # Tauri 后端
│   ├── src/
│   │   ├── commands/       # Tauri Commands
│   │   ├── infrastructure/ # 数据库、加密等
│   │   ├── models/         # 数据模型
│   │   ├── services/       # 业务逻辑
│   │   └── lib.rs          # 入口
│   └── migrations/         # SQLite 迁移
├── playwright-scripts/     # 浏览器自动化脚本
└── openspec/               # 规格文档
```

## 数据库表

- `accounts` - 平台账号
- `proxies` - 代理池
- `account_proxy` - 账号-代理关联
- `platform_configs` - 平台配置
- `contents` - 内容缓存
- `distribution_tasks` - 分发任务
- `publish_jobs` - 发布作业
- `browser_sessions` - 浏览器会话
- `publish_logs` - 发布日志
- `statistics` - 统计数据

## 配置

应用配置存储在系统应用数据目录:

- **macOS**: `~/Library/Application Support/com.pubcast.app/`
- **Windows**: `%APPDATA%\com.pubcast.app\`
- **Linux**: `~/.local/share/com.pubcast.app/`

## 安全

- 所有敏感数据使用 AES-256-GCM 加密存储
- 主密钥存储在系统 Keychain 中
- 密钥派生使用 Argon2id 算法

## License

MIT
