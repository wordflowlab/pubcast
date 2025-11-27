//! Account model

use serde::{Deserialize, Serialize};

/// Account status enum
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AccountStatus {
    Active,
    Expired,
    Error,
    Unknown,
}

impl Default for AccountStatus {
    fn default() -> Self {
        Self::Unknown
    }
}

impl std::fmt::Display for AccountStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Active => write!(f, "active"),
            Self::Expired => write!(f, "expired"),
            Self::Error => write!(f, "error"),
            Self::Unknown => write!(f, "unknown"),
        }
    }
}

impl std::str::FromStr for AccountStatus {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "active" => Ok(Self::Active),
            "expired" => Ok(Self::Expired),
            "error" => Ok(Self::Error),
            "unknown" => Ok(Self::Unknown),
            _ => Err(format!("Unknown account status: {}", s)),
        }
    }
}

/// Platform account
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Account {
    pub id: String,
    pub platform: String,
    pub name: String,
    pub username: Option<String>,
    pub status: AccountStatus,
    pub last_login_at: Option<i64>,
    pub last_check_at: Option<i64>,
    pub error_message: Option<String>,
    pub metadata: Option<serde_json::Value>,
    pub created_at: i64,
    pub updated_at: i64,
}

/// Account creation request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateAccountRequest {
    pub platform: String,
    pub name: String,
    pub username: Option<String>,
    pub credentials: Option<serde_json::Value>,
}

/// Account update request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateAccountRequest {
    pub name: Option<String>,
    pub username: Option<String>,
    pub credentials: Option<serde_json::Value>,
    pub status: Option<AccountStatus>,
}
