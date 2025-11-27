# Account Management

## ADDED Requirements

### Requirement: 账号 OAuth 授权
系统 SHALL 支持用户通过 OAuth 或 Cookie 方式授权添加平台账号。

#### Scenario: 通过浏览器完成 OAuth 授权
- **GIVEN** 用户点击"添加账号"并选择目标平台
- **WHEN** 系统打开嵌入式浏览器进行 OAuth 授权流程
- **THEN** 授权成功后自动提取并加密存储凭证，关闭浏览器窗口

#### Scenario: 通过 Cookie 方式授权
- **GIVEN** 用户选择使用 Cookie 方式登录
- **WHEN** 用户在浏览器中完成手动登录
- **THEN** 系统自动提取 cookies 并加密存储

#### Scenario: 授权失败处理
- **GIVEN** OAuth 授权过程中发生错误
- **WHEN** 平台返回授权失败或用户取消
- **THEN** 系统显示错误信息并允许用户重试

### Requirement: 账号凭证加密存储
系统 SHALL 使用 AES-256-GCM 算法加密存储所有账号凭证。

#### Scenario: 保存账号凭证
- **GIVEN** 用户完成账号授权
- **WHEN** 系统保存凭证到数据库
- **THEN** 凭证字段使用 AES-256-GCM 加密，每个账号使用独立 salt

#### Scenario: 读取账号凭证
- **GIVEN** 系统需要使用账号发布内容
- **WHEN** 从数据库读取凭证
- **THEN** 成功解密凭证并返回明文数据

#### Scenario: 密钥派生
- **GIVEN** 需要为新账号生成加密密钥
- **WHEN** 系统使用 Argon2id 从主密钥派生
- **THEN** 派生出唯一的 256 位加密密钥

### Requirement: 账号状态监控
系统 SHALL 定期检查账号状态，并标记异常账号。

#### Scenario: 检测账号授权过期
- **GIVEN** 账号 token 已过期或即将过期
- **WHEN** 系统尝试验证 session
- **THEN** 更新账号状态为 'expired' 并提示用户重新授权

#### Scenario: 检测账号被封禁
- **GIVEN** 账号在平台被封禁或限制
- **WHEN** 系统尝试执行发布操作
- **THEN** 更新账号状态为 'disabled' 并通知用户

#### Scenario: 自动刷新 token
- **GIVEN** 账号支持 token 刷新且即将过期
- **WHEN** 系统检测到 token 有效期不足
- **THEN** 自动调用刷新接口更新 token

### Requirement: 账号 CRUD 操作
系统 SHALL 提供账号的增删查改接口。

#### Scenario: 列出所有账号
- **GIVEN** 用户进入账号管理页面
- **WHEN** 调用 list_accounts 接口
- **THEN** 返回所有账号列表，包含平台、名称、状态信息

#### Scenario: 按平台筛选账号
- **GIVEN** 用户需要查看特定平台的账号
- **WHEN** 调用 list_accounts 并传入 platform 参数
- **THEN** 仅返回该平台的账号列表

#### Scenario: 删除账号
- **GIVEN** 用户选择删除某个账号
- **WHEN** 调用 delete_account 接口
- **THEN** 删除账号及其关联的 session 数据，清理加密凭证
