# Remote Content API

> **注**: 远程内容管理是独立的外部系统，PubCast 仅作为客户端对接其 API。
> 开发阶段使用 Mock Server 进行测试。

## ADDED Requirements

### Requirement: API 端点配置
系统 SHALL 支持配置远程内容 API 的端点地址。

#### Scenario: 配置 API 地址
- **GIVEN** 用户进入设置页面
- **WHEN** 填写远程 API 地址 (如 https://cms.example.com/api/v1)
- **THEN** 系统保存配置并验证连接

#### Scenario: 使用 Mock Server
- **GIVEN** 开发环境未配置真实 API
- **WHEN** 启动应用
- **THEN** 默认使用内置 Mock Server (localhost:3001)

#### Scenario: API 连接测试
- **GIVEN** 用户配置了 API 地址
- **WHEN** 点击"测试连接"
- **THEN** 显示连接状态 (成功/失败/超时)

### Requirement: 内容列表拉取
系统 SHALL 从远程 API 获取待发布的内容列表。

#### Scenario: 获取内容列表
- **GIVEN** 配置了远程 API 地址
- **WHEN** 调用 sync_contents 方法
- **THEN** 发送 GET /api/v1/contents 请求，返回内容列表

#### Scenario: 分页获取内容
- **GIVEN** 内容数量超过单页限制
- **WHEN** 请求内容列表
- **THEN** 支持 page 和 per_page 参数进行分页

#### Scenario: 按状态筛选内容
- **GIVEN** 只需要获取待发布的内容
- **WHEN** 请求时传入 status=draft 参数
- **THEN** 仅返回草稿状态的内容

### Requirement: 内容详情获取
系统 SHALL 获取单个内容的完整详情。

#### Scenario: 获取完整内容
- **GIVEN** 有内容的 remote_id
- **WHEN** 调用 GET /api/v1/contents/:id
- **THEN** 返回完整的内容信息，包括正文、标签、封面图等

#### Scenario: 内容不存在处理
- **GIVEN** 请求的内容 ID 不存在
- **WHEN** API 返回 404
- **THEN** 标记本地对应记录为已删除

### Requirement: 发布状态回写
系统 SHALL 在发布成功后将结果回写到远程 API。

#### Scenario: 回写发布成功状态
- **GIVEN** 内容成功发布到某平台
- **WHEN** 调用 POST /api/v1/contents/:id/published
- **THEN** 发送平台名称、发布 URL、发布时间

#### Scenario: 回写失败处理
- **GIVEN** 状态回写请求失败
- **WHEN** API 返回错误或超时
- **THEN** 记录日志，不影响本地发布状态

### Requirement: 增量内容同步
系统 SHALL 支持基于时间戳的增量同步，减少数据传输量。

#### Scenario: 首次全量同步
- **GIVEN** 本地无任何内容记录
- **WHEN** 执行同步
- **THEN** 获取所有可用内容

#### Scenario: 增量更新同步
- **GIVEN** 本地已有内容，记录了 last_sync_cursor
- **WHEN** 执行同步
- **THEN** 仅获取 updated_at > last_sync_cursor 的内容

#### Scenario: 处理远程删除
- **GIVEN** 内容在远程被删除
- **WHEN** 同步时发现本地有但远程无
- **THEN** 标记本地内容为已删除 (软删除)

### Requirement: 后台自动同步
系统 SHALL 定期自动同步远程内容。

#### Scenario: 定时同步触发
- **GIVEN** 应用运行中
- **WHEN** 距离上次同步超过配置间隔 (默认 30 分钟)
- **THEN** 自动触发增量同步

#### Scenario: 手动触发同步
- **GIVEN** 用户点击"刷新"按钮
- **WHEN** 调用 sync_contents 命令
- **THEN** 立即执行增量同步

#### Scenario: 同步状态记录
- **GIVEN** 同步过程执行中
- **WHEN** 更新 content_sync_status 表
- **THEN** 记录 sync_status、last_sync_at、error_message

### Requirement: 离线模式支持
系统 SHALL 在网络不可用时使用本地缓存数据。

#### Scenario: 网络不可用
- **GIVEN** 远程 API 无法访问
- **WHEN** 用户查看内容列表
- **THEN** 使用本地数据库缓存的内容

#### Scenario: 网络恢复后同步
- **GIVEN** 网络从不可用恢复
- **WHEN** 检测到连接恢复
- **THEN** 自动触发增量同步
