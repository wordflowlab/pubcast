# Logging & Statistics

## ADDED Requirements

### Requirement: 发布日志记录
系统 SHALL 详细记录每个发布任务的执行日志。

#### Scenario: 记录任务开始
- **GIVEN** PublishJob 开始执行
- **WHEN** 状态变更为 'running'
- **THEN** 记录 info 级别日志，包含任务 ID、账号、内容信息

#### Scenario: 记录关键步骤
- **GIVEN** 执行登录、上传、发布等关键操作
- **WHEN** 操作完成或失败
- **THEN** 记录操作结果和耗时

#### Scenario: 记录错误详情
- **GIVEN** 任务执行过程中发生错误
- **WHEN** 捕获异常
- **THEN** 记录 error 级别日志，包含错误类型、堆栈、上下文

### Requirement: 日志查询接口
系统 SHALL 提供日志查询和筛选功能。

#### Scenario: 按任务查询日志
- **GIVEN** 用户查看某个任务的详细日志
- **WHEN** 调用 get_logs 接口传入 job_id
- **THEN** 返回该任务的所有日志条目，按时间排序

#### Scenario: 按级别筛选日志
- **GIVEN** 用户只想查看错误日志
- **WHEN** 调用 get_logs 接口传入 level='error'
- **THEN** 仅返回 error 级别的日志

#### Scenario: 按时间范围查询
- **GIVEN** 用户查看特定时间段的日志
- **WHEN** 传入 start_time 和 end_time 参数
- **THEN** 返回该时间范围内的日志

### Requirement: 成功率统计
系统 SHALL 计算和展示发布成功率统计数据。

#### Scenario: 计算总体成功率
- **GIVEN** 用户查看统计面板
- **WHEN** 调用 get_statistics 接口
- **THEN** 返回总任务数、成功数、失败数、成功率

#### Scenario: 按平台统计成功率
- **GIVEN** 用户查看各平台表现
- **WHEN** 请求按 platform 维度的统计
- **THEN** 返回每个平台的成功率和任务数

#### Scenario: 按账号统计成功率
- **GIVEN** 用户查看各账号表现
- **WHEN** 请求按 account 维度的统计
- **THEN** 返回每个账号的成功率和任务数

### Requirement: 时间序列统计
系统 SHALL 提供按时间维度的统计数据，用于趋势分析。

#### Scenario: 每日发布量统计
- **GIVEN** 用户查看发布趋势
- **WHEN** 请求最近 N 天的统计
- **THEN** 返回每天的发布量和成功率

#### Scenario: 实时统计更新
- **GIVEN** 有新的任务完成
- **WHEN** 任务状态变更为 success/failed
- **THEN** 相关统计指标自动更新

### Requirement: 错误归类分析
系统 SHALL 对发布错误进行归类统计。

#### Scenario: 错误类型统计
- **GIVEN** 用户分析失败原因
- **WHEN** 请求错误分类统计
- **THEN** 返回各类错误的出现次数 (如网络超时、账号异常、内容违规)

#### Scenario: 高频错误告警
- **GIVEN** 某类错误频繁出现
- **WHEN** 错误率超过阈值 (如 30%)
- **THEN** 在统计面板突出显示警告
