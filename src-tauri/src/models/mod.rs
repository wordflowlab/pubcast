//! Domain models
//!
//! Contains the core data structures used throughout the application.

pub mod account;
pub mod ai;
pub mod content;
pub mod proxy;
pub mod publish;

pub use account::{Account, AccountStatus, AuthBackup, AuthStatus, CreateAccountRequest, UpdateAccountRequest};
pub use ai::{AIConfig, AICheckLog, AIPlatformStatus};
pub use content::{Content, ContentStatus, RemoteContent, RemoteContentListResponse};
pub use proxy::{
    CreateProxyRequest, Proxy, ProxyHealthResult, ProxyProtocol, ProxyStatus, ProxyStrategy,
};
pub use publish::{
    CreateDistributionTaskRequest, DistributionTask, DistributionTaskStatus, PublishJob,
    PublishJobStatus, PublishResult, ScheduleType,
};
