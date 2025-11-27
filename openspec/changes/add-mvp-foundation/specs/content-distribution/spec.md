# Content Distribution

## ADDED Requirements

### Requirement: 一对多批量发布
系统 SHALL 支持将单个内容同时发布到多个目标账号。

#### Scenario: 创建分发任务
- **GIVEN** 用户选择了一篇内容和多个目标账号
- **WHEN** 点击"发布"按钮
- **THEN** 系统创建 DistributionTask，为每个账号生成对应的 PublishJob

#### Scenario: 即时发布
- **GIVEN** 用户选择立即发布
- **WHEN** 分发任务创建完成
- **THEN** 所有 PublishJob 立即进入调度队列

#### Scenario: 查看发布进度
- **GIVEN** 分发任务正在执行
- **WHEN** 用户查看任务详情
- **THEN** 显示每个账号的发布状态 (排队中/进行中/成功/失败)

### Requirement: 内容格式适配
系统 SHALL 将 Markdown 格式内容转换为各平台所需的富文本格式。

#### Scenario: 转换为微信公众号格式
- **GIVEN** 内容为 Markdown 格式
- **WHEN** 发布到微信公众号
- **THEN** 转换为微信富文本格式，保留标题、段落、图片、代码块等

#### Scenario: 转换为小红书格式
- **GIVEN** 内容为 Markdown 格式
- **WHEN** 发布到小红书
- **THEN** 提取标题和正文，图片作为笔记图集

#### Scenario: 处理不支持的格式
- **GIVEN** 内容包含平台不支持的元素
- **WHEN** 执行格式转换
- **THEN** 降级处理或跳过，记录警告日志

### Requirement: 媒体文件处理
系统 SHALL 处理内容中的媒体文件，包括下载、缓存和上传。

#### Scenario: 下载远程图片
- **GIVEN** 内容包含远程图片 URL
- **WHEN** 准备发布内容
- **THEN** 下载图片到本地缓存目录

#### Scenario: 上传图片到平台
- **GIVEN** 有本地缓存的图片
- **WHEN** 执行发布流程
- **THEN** 将图片上传到目标平台的素材库，获取平台内部 URL

#### Scenario: 处理图片上传失败
- **GIVEN** 图片上传过程中出错
- **WHEN** 平台返回错误或超时
- **THEN** 记录错误，尝试重新上传或标记任务失败

### Requirement: 内容 CRUD 操作
系统 SHALL 提供本地内容的增删查改接口。

#### Scenario: 列出所有内容
- **GIVEN** 用户进入内容列表页面
- **WHEN** 调用 list_contents 接口
- **THEN** 返回内容列表，支持分页和筛选

#### Scenario: 查看内容详情
- **GIVEN** 用户点击某篇内容
- **WHEN** 调用 get_content 接口
- **THEN** 返回完整的内容信息，包括标题、正文、标签、封面图

#### Scenario: 本地缓存内容
- **GIVEN** 从远程 API 同步的内容
- **WHEN** 存储到本地数据库
- **THEN** 记录 remote_id 用于关联，支持离线访问
