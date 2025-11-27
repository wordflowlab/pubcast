# Publishing Scheduler

## ADDED Requirements

### Requirement: 即时发布调度
系统 SHALL 支持内容的即时发布，任务创建后立即进入执行队列。

#### Scenario: 即时任务入队
- **GIVEN** 用户选择立即发布
- **WHEN** DistributionTask 创建完成
- **THEN** 所有关联的 PublishJob 状态设为 'queued'，scheduled_at 设为当前时间

#### Scenario: 调度器扫描待执行任务
- **GIVEN** 调度器后台任务运行中
- **WHEN** 每隔固定间隔 (5秒) 扫描队列
- **THEN** 获取所有 scheduled_at <= now 且 status = 'queued' 的任务

### Requirement: 定时单次发布
系统 SHALL 支持设置未来某个时间点执行发布。

#### Scenario: 创建定时任务
- **GIVEN** 用户选择定时发布并设置时间
- **WHEN** 分发任务创建完成
- **THEN** PublishJob 的 scheduled_at 设为用户指定时间

#### Scenario: 定时任务触发
- **GIVEN** 当前时间到达 scheduled_at
- **WHEN** 调度器扫描队列
- **THEN** 任务被选中并开始执行

#### Scenario: 取消定时任务
- **GIVEN** 定时任务尚未执行
- **WHEN** 用户取消发布
- **THEN** 任务状态更新为 'cancelled'，不再被调度器选中

### Requirement: 并发控制
系统 SHALL 限制同时执行的发布任务数量，避免资源耗尽。

#### Scenario: 全局并发限制
- **GIVEN** 调度器配置全局并发数为 N (默认 3)
- **WHEN** 正在执行的任务数达到 N
- **THEN** 新任务等待直到有空闲槽位

#### Scenario: 账号级串行执行
- **GIVEN** 同一账号有多个待执行任务
- **WHEN** 调度器选择任务执行
- **THEN** 该账号的任务按顺序串行执行，避免平台检测

### Requirement: 失败重试机制
系统 SHALL 对失败的发布任务进行自动重试。

#### Scenario: 可重试错误自动重试
- **GIVEN** 任务因网络超时或临时错误失败
- **WHEN** 错误类型判定为可重试
- **THEN** 任务状态保持 'queued'，retry_count 增加，scheduled_at 延后 (指数退避)

#### Scenario: 达到最大重试次数
- **GIVEN** 任务已重试 max_retries 次 (默认 3)
- **WHEN** 再次失败
- **THEN** 任务状态更新为 'failed'，记录最终错误信息

#### Scenario: 不可重试错误直接失败
- **GIVEN** 任务因账号被封或内容违规失败
- **WHEN** 错误类型判定为不可重试
- **THEN** 任务立即标记为 'failed'，不进行重试

### Requirement: 任务状态管理
系统 SHALL 维护每个 PublishJob 的完整状态生命周期。

#### Scenario: 任务状态流转
- **GIVEN** 任务创建后
- **WHEN** 经历完整生命周期
- **THEN** 状态依次为: queued → running → success/failed

#### Scenario: 查询任务状态
- **GIVEN** 前端需要展示任务进度
- **WHEN** 调用 get_publish_jobs 接口
- **THEN** 返回任务列表及其当前状态

#### Scenario: 记录执行时间
- **GIVEN** 任务开始和结束执行
- **WHEN** 状态变更时
- **THEN** 更新 started_at 和 completed_at 时间戳
