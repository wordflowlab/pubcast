# Browser Automation

## ADDED Requirements

### Requirement: Playwright 集成
系统 SHALL 通过 Playwright 实现浏览器自动化操作。

#### Scenario: 启动浏览器实例
- **GIVEN** 需要执行登录或发布操作
- **WHEN** 调用 BrowserService 创建会话
- **THEN** 启动 Chromium 浏览器实例，应用指定配置

#### Scenario: 执行 Playwright 脚本
- **GIVEN** 有平台特定的自动化脚本
- **WHEN** 通过 Rust 调用 Node.js subprocess
- **THEN** 执行脚本并通过 JSON 返回结果

#### Scenario: 关闭浏览器会话
- **GIVEN** 发布任务完成或发生错误
- **WHEN** 调用会话清理方法
- **THEN** 关闭浏览器上下文，释放资源

### Requirement: 反检测 Stealth 插件
系统 SHALL 集成 Stealth 插件绕过常见的浏览器自动化检测。

#### Scenario: 隐藏 WebDriver 标识
- **GIVEN** 启动浏览器会话
- **WHEN** 应用 Stealth 脚本
- **THEN** navigator.webdriver 返回 undefined

#### Scenario: 模拟真实浏览器特征
- **GIVEN** 平台检测浏览器环境
- **WHEN** 执行自动化操作
- **THEN** plugins、permissions、languages 等特征与真实浏览器一致

#### Scenario: 随机化行为模式
- **GIVEN** 执行页面操作
- **WHEN** 点击、输入、滚动时
- **THEN** 添加随机延迟，模拟人类操作节奏

### Requirement: Fingerprint 管理
系统 SHALL 为每个账号生成和管理独立的浏览器指纹。

#### Scenario: 生成浏览器指纹
- **GIVEN** 新账号需要浏览器配置
- **WHEN** 调用 fingerprint 生成服务
- **THEN** 创建包含 UA、viewport、timezone、locale 的唯一指纹

#### Scenario: 应用账号指纹
- **GIVEN** 账号已有保存的指纹
- **WHEN** 创建浏览器上下文
- **THEN** 使用保存的指纹配置浏览器

#### Scenario: Canvas/WebGL 指纹随机化
- **GIVEN** 平台检测 Canvas 指纹
- **WHEN** 渲染页面
- **THEN** 添加微小噪声使指纹唯一但稳定

### Requirement: 代理配置支持
系统 SHALL 支持为账号配置 HTTP/HTTPS/SOCKS5 代理。

#### Scenario: 配置 HTTP 代理
- **GIVEN** 账号需要使用代理
- **WHEN** 创建浏览器上下文
- **THEN** 通过指定代理服务器发送请求

#### Scenario: 代理认证
- **GIVEN** 代理服务器需要认证
- **WHEN** 配置代理参数
- **THEN** 自动处理代理认证头

#### Scenario: 代理故障处理
- **GIVEN** 代理服务器连接失败
- **WHEN** 执行网络请求
- **THEN** 返回明确的代理错误，不影响其他账号

### Requirement: 浏览器会话持久化
系统 SHALL 保存和恢复浏览器会话状态以减少重复登录。

#### Scenario: 保存会话状态
- **GIVEN** 登录成功后
- **WHEN** 调用会话保存方法
- **THEN** 将 cookies、localStorage 加密存储到数据库

#### Scenario: 恢复会话状态
- **GIVEN** 账号有已保存的会话
- **WHEN** 创建新浏览器上下文
- **THEN** 加载已保存的 cookies，尝试复用会话

#### Scenario: 会话过期处理
- **GIVEN** 恢复的会话已过期
- **WHEN** 验证会话有效性失败
- **THEN** 触发重新登录流程
