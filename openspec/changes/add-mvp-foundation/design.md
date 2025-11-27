# Design: PubCast MVP 技术设计

## Context
PubCast 是一个桌面端应用，需要集成浏览器自动化、多平台适配、数据加密等复杂技术。MVP 阶段需要在 6-8 周内交付可用产品，因此架构设计需要平衡灵活性和开发效率。

**目标用户**: 内容创作者、自媒体运营者、企业新媒体团队
**核心场景**: 从远程 CMS 拉取内容 → 选择目标平台和账号 → 一键发布到多个平台

## Goals / Non-Goals

### Goals
- 支持微信公众号和小红书两个平台的完整发布流程
- 建立可扩展的平台适配器框架，便于后续新增平台
- 保证账号凭证安全存储 (AES-256-GCM)
- 提供稳定的发布调度和错误处理

### Non-Goals
- 本地内容编辑器 (通过 Remote API 获取内容)
- AI 辅助功能 (后续版本)
- 多设备同步 (单机应用)
- 高级调度如周期性发布 (MVP 仅支持单次定时)

## Decisions

### 1. 使用 Tauri 2.0 而非 Electron
**理由**:
- 更小的打包体积 (~10MB vs ~100MB)
- 更好的性能和资源占用
- Rust 后端天然支持并发和安全

**替代方案**:
- Electron: 生态更成熟但资源占用大
- Flutter Desktop: 性能好但 Rust 集成复杂

### 2. SQLite 作为唯一数据存储
**理由**:
- 零配置，嵌入式
- 完整的 ACID 支持
- SQLx 提供编译时 SQL 检查

**替代方案**:
- PostgreSQL: 功能更强但需要独立服务
- RocksDB: 高性能但缺少 SQL 查询能力

**配置**:
```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;
```

### 3. Playwright 通过 Subprocess 调用
**理由**:
- Rust Playwright bindings 不成熟
- Node.js 版本生态完善 (stealth 插件丰富)
- Subprocess 通信开销可接受 (发布频率不高)

**实现**:
```rust
use tokio::process::Command;

pub async fn run_playwright_script(script: &str, args: Value) -> Result<Value> {
    let output = Command::new("node")
        .arg("playwright-scripts/runner.js")
        .arg(script)
        .arg(serde_json::to_string(&args)?)
        .output()
        .await?;
    
    if output.status.success() {
        Ok(serde_json::from_slice(&output.stdout)?)
    } else {
        Err(Error::Playwright(String::from_utf8_lossy(&output.stderr).to_string()))
    }
}
```

### 4. 平台适配器使用 Trait 抽象
**理由**:
- 编译时多态，零成本抽象
- 强类型约束，减少运行时错误
- 便于单元测试 (mock adapter)

**核心接口**:
```rust
#[async_trait]
pub trait PlatformAdapter: Send + Sync {
    fn platform_id(&self) -> &str;
    fn supported_content_types(&self) -> Vec<ContentType>;
    fn max_content_length(&self) -> Option<usize>;
    
    async fn login(&self, account: &Account) -> Result<Session>;
    async fn validate_session(&self, session: &Session) -> Result<bool>;
    async fn publish(&self, content: &Content, session: &Session) -> Result<PublishResult>;
}

pub struct AdapterRegistry {
    adapters: HashMap<String, Arc<dyn PlatformAdapter>>,
}
```

### 5. 调度器使用 Tokio + Semaphore
**理由**:
- Tokio 异步运行时原生支持
- Semaphore 简洁实现并发控制
- 避免引入额外的任务队列中间件

**实现**:
```rust
pub struct PublishScheduler {
    db: Pool<Sqlite>,
    registry: Arc<AdapterRegistry>,
    global_semaphore: Arc<Semaphore>,      // 全局并发限制 (default: 3)
    account_locks: Arc<Mutex<HashMap<String, Arc<Mutex<()>>>>>, // 账号级锁
}
```

### 6. 加密方案
**算法选择**: AES-256-GCM + Argon2id
- AES-256-GCM: 认证加密，同时提供加密和完整性验证
- Argon2id: 抗 GPU 暴力破解的密钥派生

**密钥管理**:
```
Master Key (from system keychain)
    ↓ Argon2id (with per-account salt)
Derived Key (AES-256)
    ↓ AES-256-GCM
Encrypted Credentials
```

### 7. 代理池管理
**理由**:
- 每个账号需要独立的代理配置以避免平台检测
- 支持代理池实现负载均衡和故障转移
- 健康检测确保代理可用性

**数据库表**:
```sql
CREATE TABLE proxies (
    id TEXT PRIMARY KEY,
    protocol TEXT NOT NULL,      -- 'http', 'https', 'socks5'
    host TEXT NOT NULL,
    port INTEGER NOT NULL,
    username TEXT,
    password_encrypted BLOB,     -- AES 加密
    status TEXT NOT NULL DEFAULT 'unknown',  -- 'healthy', 'unhealthy', 'unknown'
    last_check_at INTEGER,
    last_check_ip TEXT,          -- 出口 IP
    last_check_location TEXT,    -- 地理位置
    fail_count INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE account_proxy (
    account_id TEXT NOT NULL,
    proxy_id TEXT,               -- NULL 表示使用代理池
    strategy TEXT NOT NULL DEFAULT 'fixed',  -- 'fixed', 'round_robin', 'random'
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (proxy_id) REFERENCES proxies(id) ON DELETE SET NULL
);
```

**轮换策略实现**:
```rust
pub enum ProxyStrategy {
    Fixed(ProxyId),      // 固定代理
    RoundRobin,          // 轮询
    Random,              // 随机
}

pub struct ProxyPool {
    proxies: Vec<Proxy>,
    round_robin_index: AtomicUsize,
}

impl ProxyPool {
    pub fn select(&self, strategy: &ProxyStrategy) -> Option<&Proxy> {
        let healthy: Vec<_> = self.proxies.iter()
            .filter(|p| p.status == ProxyStatus::Healthy)
            .collect();
        
        match strategy {
            ProxyStrategy::Fixed(id) => self.proxies.iter().find(|p| &p.id == id),
            ProxyStrategy::RoundRobin => {
                let idx = self.round_robin_index.fetch_add(1, Ordering::Relaxed);
                healthy.get(idx % healthy.len()).copied()
            }
            ProxyStrategy::Random => healthy.choose(&mut rand::thread_rng()).copied(),
        }
    }
}
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Tauri Frontend (React)                   │
│  ┌─────────────┬─────────────┬──────────────┬──────────────┐│
│  │  账号管理    │  内容列表   │   发布配置    │   统计面板   ││
│  └─────────────┴─────────────┴──────────────┴──────────────┘│
└─────────────────────────────────────────────────────────────┘
                              ↕ Tauri IPC (Commands)
┌─────────────────────────────────────────────────────────────┐
│                    Rust Backend (Tokio)                      │
│  ┌──────────────────────────────────────────────────────────┐│
│  │           Service Layer (业务逻辑)                        ││
│  │  • AccountService  • ContentService  • PublishService    ││
│  │  • SchedulerService  • BrowserService  • ProxyService   ││
│  └──────────────────────────────────────────────────────────┘│
│  ┌──────────────────────────────────────────────────────────┐│
│  │         Platform Adapter Layer (适配器)                  ││
│  │  [WechatAdapter] [XiaohongshuAdapter] [...]              ││
│  └──────────────────────────────────────────────────────────┘│
│  ┌──────────────────────────────────────────────────────────┐│
│  │         Infrastructure Layer (基础设施)                  ││
│  │  • SQLite + SQLx  • EncryptionService  • PlaywrightRunner││
│  │  • Reqwest HTTP  • Tokio Runtime                         ││
│  └──────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│              External Dependencies                           │
│  • Remote Content API  • Platform Websites  • Proxy Servers │
└─────────────────────────────────────────────────────────────┘
```

## Module Structure

```
src-tauri/
├── src/
│   ├── main.rs                    # Tauri 入口
│   ├── commands/                  # Tauri Commands
│   │   ├── mod.rs
│   │   ├── accounts.rs
│   │   ├── contents.rs
│   │   ├── distribution.rs
│   │   └── statistics.rs
│   ├── services/
│   │   ├── mod.rs
│   │   ├── account.rs
│   │   ├── proxy.rs               # 代理池管理
│   │   ├── content.rs
│   │   ├── publish.rs
│   │   ├── scheduler.rs
│   │   └── browser.rs
│   ├── adapters/
│   │   ├── mod.rs                 # PlatformAdapter trait
│   │   ├── registry.rs
│   │   ├── wechat.rs
│   │   └── xiaohongshu.rs
│   ├── infrastructure/
│   │   ├── mod.rs
│   │   ├── database.rs            # SQLx pool & migrations
│   │   ├── encryption.rs          # AES + Argon2
│   │   ├── playwright.rs          # Playwright runner
│   │   └── http.rs                # Reqwest client
│   ├── models/
│   │   ├── mod.rs
│   │   ├── account.rs
│   │   ├── content.rs
│   │   ├── task.rs
│   │   └── job.rs
│   └── error.rs
├── migrations/
│   ├── 001_initial.sql
│   └── ...
└── playwright-scripts/
    ├── runner.js
    ├── stealth.js
    ├── wechat/
    │   ├── login.js
    │   └── publish.js
    └── xiaohongshu/
        ├── login.js
        └── publish.js
```

## Data Flow

### 发布流程
```
1. [Frontend] 用户选择内容 + 目标账号 → 创建 DistributionTask
2. [Scheduler] 扫描待执行的 task → 创建 PublishJob (每账号一个)
3. [Worker] 获取 job → acquire global semaphore + account lock
4. [BrowserService] 启动/复用 BrowserSession
5. [Adapter] 执行平台特定的登录验证和发布逻辑
6. [Worker] 更新 job 状态 → 记录日志 → 更新统计
7. [Frontend] 轮询 job 状态展示进度
```

### 内容同步流程
```
1. [Background Task] 定时触发 (every 30 minutes) 或手动触发
2. [RemoteApiClient] 调用 API 获取增量内容 (based on updated_at cursor)
3. [ContentService] 插入或更新 contents 表
4. [Frontend] 用户刷新列表查看新内容
```

## Risks / Trade-offs

### 1. Playwright Subprocess 开销
**风险**: 每次发布启动 Node.js 进程增加延迟 (~1-2s)
**缓解**: 
- 实现 BrowserSession 池，复用浏览器实例
- 使用长期运行的 Node.js 服务 + Unix socket IPC

### 2. 平台反爬虫升级
**风险**: 平台策略变化导致自动化失效
**缓解**:
- 模块化 adapter 设计，便于快速修复
- 监控失败率，超阈值告警
- 提供手动发布降级路径

### 3. 单 SQLite 并发写入
**风险**: 高并发发布可能导致数据库锁竞争
**缓解**:
- 使用 WAL 模式提高并发性
- 批量写入减少事务次数
- 读多写少场景下影响有限

### 4. 账号安全
**风险**: 凭证泄露或被滥用
**缓解**:
- AES-256-GCM 加密存储
- 主密钥存储在系统 keychain
- Tauri 严格权限配置
- 定期自动清理过期 session

## Migration Plan
1. **Phase 1** (Week 1-2): 搭建基础设施 (数据库、加密、Playwright)
2. **Phase 2** (Week 3-4): 实现微信公众号 adapter + 账号管理
3. **Phase 3** (Week 5): 内容分发 + 调度器
4. **Phase 4** (Week 6): 小红书 adapter + 日志统计
5. **Phase 5** (Week 7): E2E 测试 + 优化

## Open Questions
1. **代理管理**: MVP 阶段手动配置，后续可支持代理服务商 API 集成
2. **内容格式转换**: 在各 adapter 内部实现 (不同平台富文本格式差异大)
3. **失败通知**: 应用内通知 + 系统通知，后续可支持 Webhook
