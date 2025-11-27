use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AIPlatformStatus {
    Active,
    Inactive,
    Expired,
}

impl Default for AIPlatformStatus {
    fn default() -> Self {
        Self::Inactive
    }
}

impl std::str::FromStr for AIPlatformStatus {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "active" => Ok(Self::Active),
            "inactive" => Ok(Self::Inactive),
            "expired" => Ok(Self::Expired),
            _ => Err(format!("Unknown status: {}", s)),
        }
    }
}

impl std::fmt::Display for AIPlatformStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Active => write!(f, "active"),
            Self::Inactive => write!(f, "inactive"),
            Self::Expired => write!(f, "expired"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIConfig {
    pub id: String,
    pub platform: String,
    pub status: AIPlatformStatus,
    pub auth_data: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AICheckLog {
    pub id: String,
    pub platform: String,
    pub status: String,
    pub message: Option<String>,
    pub duration_ms: Option<i64>,
    pub created_at: i64,
}
