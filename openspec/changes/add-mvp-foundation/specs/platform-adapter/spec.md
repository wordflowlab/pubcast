# Platform Adapter

## ADDED Requirements

### Requirement: 平台适配器抽象接口
系统 SHALL 定义统一的 PlatformAdapter trait，所有平台实现必须遵循此接口。

#### Scenario: 获取平台标识
- **GIVEN** 系统需要识别特定平台
- **WHEN** 调用 adapter 的 platform_id 方法
- **THEN** 返回唯一的平台标识符 (如 'wechat', 'xiaohongshu')

#### Scenario: 查询支持的内容类型
- **GIVEN** 系统需要验证内容兼容性
- **WHEN** 调用 supported_content_types 方法
- **THEN** 返回该平台支持的内容类型列表 (如 article, note, video)

#### Scenario: 执行登录流程
- **GIVEN** 账号需要建立会话
- **WHEN** 调用 adapter 的 login 方法
- **THEN** 通过浏览器自动化完成登录，返回有效的 Session 对象

#### Scenario: 验证会话有效性
- **GIVEN** 发布前需要确认会话状态
- **WHEN** 调用 validate_session 方法
- **THEN** 返回 true 表示会话有效，false 表示需要重新登录

#### Scenario: 执行内容发布
- **GIVEN** 有待发布的内容和有效会话
- **WHEN** 调用 publish 方法
- **THEN** 完成发布并返回 PublishResult (包含平台文章 ID 和 URL)

### Requirement: 适配器注册机制
系统 SHALL 提供 AdapterRegistry 管理所有平台适配器的注册和获取。

#### Scenario: 注册新适配器
- **GIVEN** 系统启动时初始化适配器
- **WHEN** 调用 register 方法注册 adapter
- **THEN** 适配器按 platform_id 存储，可供后续获取

#### Scenario: 获取指定平台适配器
- **GIVEN** 需要为特定平台执行操作
- **WHEN** 调用 get 方法并传入 platform_id
- **THEN** 返回对应的 adapter 实例，不存在则返回 None

#### Scenario: 列出所有支持的平台
- **GIVEN** 前端需要展示可选平台列表
- **WHEN** 调用 list_platforms 方法
- **THEN** 返回所有已注册平台的 ID 和配置信息

### Requirement: 登录策略抽象
系统 SHALL 定义 LoginStrategy trait 抽象各平台的登录流程差异。

#### Scenario: 导航到登录页
- **GIVEN** 开始登录流程
- **WHEN** 调用 navigate_to_login 方法
- **THEN** 浏览器导航到平台登录页面

#### Scenario: 处理验证码
- **GIVEN** 登录过程中出现验证码
- **WHEN** 调用 handle_captcha 方法
- **THEN** 尝试自动识别或提示用户手动输入

#### Scenario: 提取会话信息
- **GIVEN** 登录成功后
- **WHEN** 调用 extract_session 方法
- **THEN** 从浏览器提取 cookies/tokens 构建 Session 对象

### Requirement: 微信公众号适配器
系统 SHALL 提供微信公众号 (WeChat Official Account) 平台的完整适配器实现。

#### Scenario: 微信公众号登录
- **GIVEN** 用户添加微信公众号账号
- **WHEN** 执行登录流程
- **THEN** 通过扫码或账号密码方式完成登录，获取有效 session

#### Scenario: 发布微信公众号文章
- **GIVEN** 有 Markdown 格式的文章内容
- **WHEN** 调用 publish 方法
- **THEN** 转换为微信富文本格式，完成素材上传和文章发布

#### Scenario: 处理微信公众号发布限制
- **GIVEN** 账号达到每日发布上限
- **WHEN** 尝试发布新文章
- **THEN** 返回明确的错误信息，标记账号临时受限

### Requirement: 小红书适配器
系统 SHALL 提供小红书 (Xiaohongshu) 平台的完整适配器实现。

#### Scenario: 小红书登录
- **GIVEN** 用户添加小红书账号
- **WHEN** 执行登录流程
- **THEN** 通过扫码或短信方式完成登录

#### Scenario: 发布小红书笔记
- **GIVEN** 有图文内容
- **WHEN** 调用 publish 方法
- **THEN** 上传图片，填写标题和正文，完成笔记发布
