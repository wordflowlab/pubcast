//! Publish models

use serde::{Deserialize, Serialize};

/// Distribution task status
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DistributionTaskStatus {
    Pending,
    InProgress,
    Completed,
    Failed,
    Cancelled,
}

impl Default for DistributionTaskStatus {
    fn default() -> Self {
        Self::Pending
    }
}

impl std::fmt::Display for DistributionTaskStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Pending => write!(f, "pending"),
            Self::InProgress => write!(f, "in_progress"),
            Self::Completed => write!(f, "completed"),
            Self::Failed => write!(f, "failed"),
            Self::Cancelled => write!(f, "cancelled"),
        }
    }
}

impl std::str::FromStr for DistributionTaskStatus {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "pending" => Ok(Self::Pending),
            "in_progress" => Ok(Self::InProgress),
            "completed" => Ok(Self::Completed),
            "failed" => Ok(Self::Failed),
            "cancelled" => Ok(Self::Cancelled),
            _ => Err(format!("Unknown status: {}", s)),
        }
    }
}

/// Publish job status
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PublishJobStatus {
    Pending,
    Running,
    Success,
    Failed,
    Cancelled,
}

impl Default for PublishJobStatus {
    fn default() -> Self {
        Self::Pending
    }
}

impl std::fmt::Display for PublishJobStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Pending => write!(f, "pending"),
            Self::Running => write!(f, "running"),
            Self::Success => write!(f, "success"),
            Self::Failed => write!(f, "failed"),
            Self::Cancelled => write!(f, "cancelled"),
        }
    }
}

impl std::str::FromStr for PublishJobStatus {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "pending" => Ok(Self::Pending),
            "running" => Ok(Self::Running),
            "success" => Ok(Self::Success),
            "failed" => Ok(Self::Failed),
            "cancelled" => Ok(Self::Cancelled),
            _ => Err(format!("Unknown status: {}", s)),
        }
    }
}

/// Schedule type
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ScheduleType {
    Immediate,
    Scheduled,
}

impl Default for ScheduleType {
    fn default() -> Self {
        Self::Immediate
    }
}

/// Distribution task
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DistributionTask {
    pub id: String,
    pub content_id: String,
    pub name: Option<String>,
    pub status: DistributionTaskStatus,
    pub target_accounts: Vec<String>,
    pub schedule_type: ScheduleType,
    pub scheduled_at: Option<i64>,
    pub started_at: Option<i64>,
    pub completed_at: Option<i64>,
    pub total_jobs: i64,
    pub completed_jobs: i64,
    pub failed_jobs: i64,
    pub error_message: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

/// Publish job
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PublishJob {
    pub id: String,
    pub distribution_task_id: String,
    pub content_id: String,
    pub account_id: String,
    pub platform: String,
    pub status: PublishJobStatus,
    pub priority: i64,
    pub retry_count: i64,
    pub max_retries: i64,
    pub scheduled_at: Option<i64>,
    pub started_at: Option<i64>,
    pub completed_at: Option<i64>,
    pub published_url: Option<String>,
    pub published_id: Option<String>,
    pub error_code: Option<String>,
    pub error_message: Option<String>,
    pub metadata: Option<serde_json::Value>,
    pub created_at: i64,
    pub updated_at: i64,
}

/// Create distribution task request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateDistributionTaskRequest {
    pub content_id: String,
    pub name: Option<String>,
    pub target_account_ids: Vec<String>,
    pub schedule_type: ScheduleType,
    pub scheduled_at: Option<i64>,
}

/// Publish result for a single job
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PublishResult {
    pub success: bool,
    pub published_url: Option<String>,
    pub published_id: Option<String>,
    pub error_code: Option<String>,
    pub error_message: Option<String>,
}

/// Error category for analytics
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ErrorCategory {
    Auth,
    RateLimit,
    Content,
    Network,
    Unknown,
}

impl std::fmt::Display for ErrorCategory {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Auth => write!(f, "auth"),
            Self::RateLimit => write!(f, "rate_limit"),
            Self::Content => write!(f, "content"),
            Self::Network => write!(f, "network"),
            Self::Unknown => write!(f, "unknown"),
        }
    }
}
