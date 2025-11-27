# PubCast Playwright Sidecar

浏览器自动化服务，集成反检测指纹伪装。

## 功能

- ✅ **playwright-extra + stealth** - 反检测插件
- ✅ **指纹生成与管理** - Canvas、WebGL、Navigator、屏幕分辨率
- ✅ **账号独立 Profile** - 每个账号独立的浏览器配置
- ✅ **代理集成** - 支持 HTTP/HTTPS/SOCKS5 代理
- ✅ **Session 持久化** - Cookies 和 LocalStorage 保存

## 安装

```bash
cd playwright-sidecar
npm install
npx playwright install chromium
```

## 启动

```bash
npm start
```

服务默认运行在 `http://localhost:3002`

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | 健康检查 |
| GET | `/sessions` | 获取所有活跃会话 |
| POST | `/browser/launch` | 启动浏览器 |
| POST | `/browser/navigate` | 导航到 URL |
| GET | `/browser/:accountId/info` | 获取页面信息 |
| POST | `/browser/:accountId/save` | 保存会话 |
| POST | `/browser/:accountId/close` | 关闭浏览器 |
| POST | `/browser/:accountId/screenshot` | 截图 |
| POST | `/browser/close-all` | 关闭所有浏览器 |

## 启动浏览器示例

```bash
curl -X POST http://localhost:3002/browser/launch \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "account-123",
    "headless": false,
    "proxy": {
      "protocol": "http",
      "host": "proxy.example.com",
      "port": 8080,
      "username": "user",
      "password": "pass"
    }
  }'
```

## 指纹配置

每个账号的指纹配置保存在 `profiles/<accountId>/fingerprint.json`，包括：

- 屏幕分辨率
- User-Agent
- 时区
- 语言
- WebGL Vendor/Renderer
- Canvas Noise
- 硬件并发数
- 设备内存
