use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::time::{Duration, Instant};

/// Sidecar 管理器的配置
#[derive(Debug, Clone)]
pub struct SidecarConfig {
    /// Sidecar HTTP 服务端口
    pub port: u16,
    /// Sidecar 目录路径
    pub sidecar_dir: PathBuf,
    /// 日志目录路径
    pub log_dir: PathBuf,
    /// 健康检查间隔
    pub health_check_interval: Duration,
    /// 健康检查超时
    pub health_check_timeout: Duration,
    /// 启动超时
    pub startup_timeout: Duration,
    /// 关闭超时
    pub shutdown_timeout: Duration,
    /// 最大重启次数
    pub max_restart_count: u32,
    /// 重启冷却时间
    pub restart_cooldown: Duration,
}

impl Default for SidecarConfig {
    fn default() -> Self {
        Self {
            port: 8857,
            sidecar_dir: PathBuf::new(),
            log_dir: PathBuf::new(),
            health_check_interval: Duration::from_secs(30),
            health_check_timeout: Duration::from_secs(5),
            startup_timeout: Duration::from_secs(30),
            shutdown_timeout: Duration::from_secs(5),
            max_restart_count: 5,
            restart_cooldown: Duration::from_secs(60),
        }
    }
}

/// Sidecar 进程状态
#[derive(Debug, Clone)]
pub enum SidecarState {
    /// 已停止
    Stopped,
    /// 启动中
    Starting {
        /// 启动进度
        progress: StartProgress,
    },
    /// 运行中
    Running {
        /// 进程 PID
        pid: u32,
        /// 启动时间
        started_at: Instant,
        /// 重启次数
        restart_count: u32,
    },
    /// 停止中
    Stopping,
    /// 启动失败
    Failed {
        /// 错误信息
        error: String,
        /// 失败时间
        last_attempt: Instant,
    },
}

/// 启动进度信息
#[derive(Debug, Clone)]
pub struct StartProgress {
    /// 当前阶段
    pub stage: StartStage,
    /// 进度消息
    pub message: String,
    /// 时间戳
    pub timestamp: Instant,
}

/// 启动阶段
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum StartStage {
    /// 检查依赖
    CheckingDependencies,
    /// 安装依赖
    InstallingDependencies,
    /// 生成进程
    SpawningProcess,
    /// 等待健康检查
    WaitingForHealth,
    /// 就绪
    Ready,
}

/// Sidecar 状态信息（用于前端）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SidecarStatusInfo {
    /// 状态
    pub state: String,
    /// 消息
    pub message: Option<String>,
    /// 运行时间（秒）
    pub uptime: Option<u64>,
    /// 重启次数
    pub restart_count: Option<u32>,
    /// 进程 PID
    pub pid: Option<u32>,
}

impl From<&SidecarState> for SidecarStatusInfo {
    fn from(state: &SidecarState) -> Self {
        match state {
            SidecarState::Stopped => Self {
                state: "stopped".to_string(),
                message: None,
                uptime: None,
                restart_count: None,
                pid: None,
            },
            SidecarState::Starting { progress } => Self {
                state: "starting".to_string(),
                message: Some(progress.message.clone()),
                uptime: None,
                restart_count: None,
                pid: None,
            },
            SidecarState::Running {
                pid,
                started_at,
                restart_count,
            } => Self {
                state: "running".to_string(),
                message: None,
                uptime: Some(started_at.elapsed().as_secs()),
                restart_count: Some(*restart_count),
                pid: Some(*pid),
            },
            SidecarState::Stopping => Self {
                state: "stopping".to_string(),
                message: None,
                uptime: None,
                restart_count: None,
                pid: None,
            },
            SidecarState::Failed { error, .. } => Self {
                state: "failed".to_string(),
                message: Some(error.clone()),
                uptime: None,
                restart_count: None,
                pid: None,
            },
        }
    }
}

/// Sidecar 错误类型
#[derive(Debug, thiserror::Error)]
pub enum SidecarError {
    #[error("Sidecar directory not found: {0}")]
    DirectoryNotFound(PathBuf),

    #[error("Failed to spawn process: {0}")]
    ProcessSpawn(String),

    #[error("Startup timeout after {0:?}")]
    StartupTimeout(Duration),

    #[error("Health check failed: {0}")]
    HealthCheckFailed(String),

    #[error("Sidecar is not running")]
    NotRunning,

    #[error("Sidecar is already running")]
    AlreadyRunning,

    #[error("Restart limit exceeded: {0}/{1}")]
    RestartLimitExceeded(u32, u32),

    #[error("Failed to stop process: {0}")]
    StopFailed(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Other error: {0}")]
    Other(String),
}

impl SidecarError {
    pub fn to_user_message(&self) -> String {
        match self {
            Self::DirectoryNotFound(path) => {
                format!("找不到 Sidecar 目录: {}", path.display())
            }
            Self::ProcessSpawn(msg) => format!("启动进程失败: {}", msg),
            Self::StartupTimeout(duration) => {
                format!("启动超时 ({:?})，请检查日志", duration)
            }
            Self::HealthCheckFailed(msg) => format!("健康检查失败: {}", msg),
            Self::NotRunning => "Sidecar 未运行".to_string(),
            Self::AlreadyRunning => "Sidecar 已在运行".to_string(),
            Self::RestartLimitExceeded(current, max) => {
                format!("重启次数超限 ({}/{})", current, max)
            }
            Self::StopFailed(msg) => format!("停止进程失败: {}", msg),
            Self::Io(e) => format!("IO 错误: {}", e),
            Self::Other(msg) => msg.clone(),
        }
    }
}
