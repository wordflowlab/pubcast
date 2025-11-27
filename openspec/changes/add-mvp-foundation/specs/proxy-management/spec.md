# Proxy Management

## ADDED Requirements

### Requirement: 代理池 CRUD
系统 SHALL 支持代理服务器的增删查改管理。

#### Scenario: 添加代理
- **GIVEN** 用户进入代理管理页面
- **WHEN** 填写代理地址、端口、协议、认证信息并提交
- **THEN** 系统验证格式后保存代理配置

#### Scenario: 批量导入代理
- **GIVEN** 用户有多个代理需要添加
- **WHEN** 上传代理列表文件或粘贴多行文本
- **THEN** 系统解析并批量创建代理记录

#### Scenario: 删除代理
- **GIVEN** 代理不再使用
- **WHEN** 用户删除代理
- **THEN** 解除与账号的关联后删除代理记录

#### Scenario: 列出所有代理
- **GIVEN** 用户查看代理列表
- **WHEN** 调用 list_proxies 接口
- **THEN** 返回所有代理及其状态、关联账号数

### Requirement: 代理健康检测
系统 SHALL 定期检测代理可用性并标记状态。

#### Scenario: 定时健康检查
- **GIVEN** 系统配置了健康检查间隔 (默认 30 分钟)
- **WHEN** 到达检查时间
- **THEN** 对所有代理执行连通性测试

#### Scenario: 标记代理状态
- **GIVEN** 健康检查完成
- **WHEN** 代理连接失败或超时
- **THEN** 更新代理状态为 'unhealthy'，记录失败次数

#### Scenario: 手动触发检测
- **GIVEN** 用户怀疑代理不可用
- **WHEN** 点击"检测"按钮
- **THEN** 立即执行该代理的健康检查

#### Scenario: 检测 IP 地址
- **GIVEN** 需要验证代理实际出口 IP
- **WHEN** 执行健康检查
- **THEN** 记录代理的出口 IP 和地理位置信息

### Requirement: 代理轮换策略
系统 SHALL 支持多种代理轮换策略以分散请求。

#### Scenario: 固定分配策略
- **GIVEN** 账号配置了指定代理
- **WHEN** 该账号执行发布任务
- **THEN** 始终使用指定的代理

#### Scenario: 轮询分配策略
- **GIVEN** 账号配置为使用代理池
- **WHEN** 执行发布任务
- **THEN** 从可用代理中按轮询方式选择

#### Scenario: 随机分配策略
- **GIVEN** 账号配置为随机选择代理
- **WHEN** 执行发布任务
- **THEN** 从可用代理中随机选择一个

#### Scenario: 跳过不可用代理
- **GIVEN** 代理池中有 unhealthy 代理
- **WHEN** 执行代理选择
- **THEN** 只从 healthy 状态的代理中选择

### Requirement: 账号代理关联
系统 SHALL 支持将代理分配给账号。

#### Scenario: 为账号指定代理
- **GIVEN** 账号需要使用特定代理
- **WHEN** 在账号设置中选择代理
- **THEN** 保存账号与代理的关联关系

#### Scenario: 为账号使用代理池
- **GIVEN** 账号需要动态使用代理
- **WHEN** 选择"使用代理池"选项
- **THEN** 每次发布时按策略从池中选择代理

#### Scenario: 查看代理使用情况
- **GIVEN** 用户查看某个代理详情
- **WHEN** 打开代理信息页
- **THEN** 显示关联的账号列表和使用统计

### Requirement: 代理协议支持
系统 SHALL 支持多种代理协议。

#### Scenario: HTTP/HTTPS 代理
- **GIVEN** 配置 HTTP 或 HTTPS 代理
- **WHEN** 浏览器发起请求
- **THEN** 通过 HTTP CONNECT 方法代理请求

#### Scenario: SOCKS5 代理
- **GIVEN** 配置 SOCKS5 代理
- **WHEN** 浏览器发起请求
- **THEN** 通过 SOCKS5 协议代理请求

#### Scenario: 代理认证
- **GIVEN** 代理需要用户名密码认证
- **WHEN** 发起代理连接
- **THEN** 自动附加认证信息
