# Data Storage

## ADDED Requirements

### Requirement: SQLite 数据库管理
系统 SHALL 使用 SQLite 作为本地数据存储，通过 SQLx 提供类型安全的数据访问。

#### Scenario: 初始化数据库连接
- **GIVEN** 应用首次启动
- **WHEN** 调用数据库初始化方法
- **THEN** 创建 SQLite 文件，配置 WAL 模式，建立连接池

#### Scenario: 执行数据库迁移
- **GIVEN** 有新的 migration 文件
- **WHEN** 应用启动时检测版本
- **THEN** 自动执行待执行的迁移脚本

#### Scenario: 编译时 SQL 检查
- **GIVEN** 代码中包含 SQLx 查询宏
- **WHEN** 编译 Rust 代码
- **THEN** SQLx 验证 SQL 语法和类型匹配

### Requirement: AES-256-GCM 加密服务
系统 SHALL 使用 AES-256-GCM 算法加密存储敏感数据。

#### Scenario: 加密数据
- **GIVEN** 有明文敏感数据 (如账号凭证)
- **WHEN** 调用加密服务
- **THEN** 返回 AES-256-GCM 加密的密文，包含认证标签

#### Scenario: 解密数据
- **GIVEN** 有加密的数据和正确的密钥
- **WHEN** 调用解密服务
- **THEN** 返回原始明文数据

#### Scenario: 验证数据完整性
- **GIVEN** 加密数据被篡改
- **WHEN** 尝试解密
- **THEN** GCM 认证失败，抛出完整性错误

### Requirement: 密钥管理
系统 SHALL 安全管理加密主密钥，使用系统 keychain 存储。

#### Scenario: 首次初始化主密钥
- **GIVEN** 应用首次运行
- **WHEN** 没有找到已存储的主密钥
- **THEN** 生成随机 256 位主密钥，存储到系统 keychain

#### Scenario: 读取主密钥
- **GIVEN** 需要执行加密/解密操作
- **WHEN** 调用密钥获取方法
- **THEN** 从系统 keychain 读取主密钥

#### Scenario: Argon2id 密钥派生
- **GIVEN** 需要为特定账号派生加密密钥
- **WHEN** 使用主密钥和账号 salt
- **THEN** 通过 Argon2id 派生出 256 位子密钥

### Requirement: 数据库表结构
系统 SHALL 创建支持所有功能模块的数据库表结构。

#### Scenario: accounts 表存储账号信息
- **GIVEN** 用户添加新账号
- **WHEN** 保存到数据库
- **THEN** 记录 platform、display_name、status、加密凭证等字段

#### Scenario: contents 表存储内容
- **GIVEN** 从远程 API 同步内容
- **WHEN** 保存到数据库
- **THEN** 记录 title、body (Markdown)、tags、remote_id 等字段

#### Scenario: publish_jobs 表记录发布任务
- **GIVEN** 创建分发任务
- **WHEN** 生成 PublishJob
- **THEN** 记录 account_id、content_id、status、scheduled_at 等字段

### Requirement: 数据库索引优化
系统 SHALL 为常用查询创建适当的数据库索引。

#### Scenario: 按状态查询任务
- **GIVEN** 调度器频繁查询待执行任务
- **WHEN** 执行 WHERE status = 'queued' 查询
- **THEN** 使用 idx_publish_jobs_status 索引加速

#### Scenario: 按时间范围查询日志
- **GIVEN** 用户查看历史日志
- **WHEN** 执行 WHERE timestamp BETWEEN 查询
- **THEN** 使用 idx_publish_logs_timestamp 索引加速
