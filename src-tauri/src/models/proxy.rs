//! Proxy model

use serde::{Deserialize, Serialize};

/// Proxy protocol
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ProxyProtocol {
    Http,
    Https,
    Socks5,
}

impl std::fmt::Display for ProxyProtocol {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Http => write!(f, "http"),
            Self::Https => write!(f, "https"),
            Self::Socks5 => write!(f, "socks5"),
        }
    }
}

impl std::str::FromStr for ProxyProtocol {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "http" => Ok(Self::Http),
            "https" => Ok(Self::Https),
            "socks5" => Ok(Self::Socks5),
            _ => Err(format!("Unknown proxy protocol: {}", s)),
        }
    }
}

/// Proxy status
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ProxyStatus {
    Healthy,
    Unhealthy,
    Unknown,
}

impl Default for ProxyStatus {
    fn default() -> Self {
        Self::Unknown
    }
}

impl std::fmt::Display for ProxyStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Healthy => write!(f, "healthy"),
            Self::Unhealthy => write!(f, "unhealthy"),
            Self::Unknown => write!(f, "unknown"),
        }
    }
}

impl std::str::FromStr for ProxyStatus {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "healthy" => Ok(Self::Healthy),
            "unhealthy" => Ok(Self::Unhealthy),
            "unknown" => Ok(Self::Unknown),
            _ => Err(format!("Unknown proxy status: {}", s)),
        }
    }
}

/// Proxy rotation strategy
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ProxyStrategy {
    Fixed,
    RoundRobin,
    Random,
}

impl Default for ProxyStrategy {
    fn default() -> Self {
        Self::Fixed
    }
}

/// Proxy configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Proxy {
    pub id: String,
    pub protocol: ProxyProtocol,
    pub host: String,
    pub port: u16,
    pub username: Option<String>,
    pub status: ProxyStatus,
    pub last_check_at: Option<i64>,
    pub last_check_ip: Option<String>,
    pub last_check_location: Option<String>,
    pub fail_count: i64,
    pub created_at: i64,
    pub updated_at: i64,
}

impl Proxy {
    /// Get the proxy URL
    pub fn url(&self) -> String {
        match (&self.username, self.protocol.clone()) {
            (Some(username), _) => {
                format!(
                    "{}://{}@{}:{}",
                    self.protocol, username, self.host, self.port
                )
            }
            (None, _) => {
                format!("{}://{}:{}", self.protocol, self.host, self.port)
            }
        }
    }
}

/// Create proxy request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateProxyRequest {
    pub protocol: ProxyProtocol,
    pub host: String,
    pub port: u16,
    pub username: Option<String>,
    pub password: Option<String>,
}

/// Proxy health check result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxyHealthResult {
    pub proxy_id: String,
    pub is_healthy: bool,
    pub exit_ip: Option<String>,
    pub location: Option<String>,
    pub latency_ms: Option<u64>,
    pub error: Option<String>,
}
