//! Browser automation service
//! Communicates with the Playwright sidecar for browser automation

use reqwest::Client;
use serde::{Deserialize, Serialize};
use crate::error::{PubCastError, Result};
use crate::models::Proxy;

const SIDECAR_URL: &str = "http://localhost:3002";

#[derive(Debug, Clone, Serialize)]
pub struct LaunchBrowserRequest {
    #[serde(rename = "accountId")]
    pub account_id: String,
    #[serde(rename = "platformId")]
    pub platform_id: String,
    pub proxy: Option<ProxyConfig>,
    pub headless: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct ProxyConfig {
    pub protocol: String,
    pub host: String,
    pub port: u16,
    pub username: Option<String>,
    pub password: Option<String>,
}

impl From<&Proxy> for ProxyConfig {
    fn from(proxy: &Proxy) -> Self {
        Self {
            protocol: proxy.protocol.to_string(),
            host: proxy.host.clone(),
            port: proxy.port,
            username: proxy.username.clone(),
            password: None, // Password should be fetched from encrypted storage
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct NavigateRequest {
    #[serde(rename = "accountId")]
    pub account_id: String,
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrowserResponse {
    pub success: bool,
    #[serde(default)]
    pub error: Option<String>,
    #[serde(default)]
    pub message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PageInfoResponse {
    pub success: bool,
    #[serde(default)]
    pub url: Option<String>,
    #[serde(default)]
    pub title: Option<String>,
    #[serde(default)]
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionInfo {
    #[serde(rename = "accountId")]
    pub account_id: String,
    #[serde(rename = "launchedAt")]
    pub launched_at: i64,
    #[serde(rename = "hasProxy")]
    pub has_proxy: bool,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SessionsResponse {
    pub success: bool,
    pub sessions: Vec<SessionInfo>,
}

pub struct BrowserService {
    client: Client,
    sidecar_url: String,
}

impl BrowserService {
    pub fn new() -> Self {
        Self {
            client: Client::new(),
            sidecar_url: SIDECAR_URL.to_string(),
        }
    }

    /// Check if sidecar is running
    pub async fn health_check(&self) -> Result<bool> {
        let url = format!("{}/health", self.sidecar_url);
        match self.client.get(&url).send().await {
            Ok(resp) => Ok(resp.status().is_success()),
            Err(_) => Ok(false),
        }
    }

    /// Launch a browser for an account
    pub async fn launch_browser(
        &self,
        account_id: &str,
        platform_id: &str,
        proxy: Option<&Proxy>,
        headless: bool,
    ) -> Result<BrowserResponse> {
        let url = format!("{}/browser/launch", self.sidecar_url);
        
        let request = LaunchBrowserRequest {
            account_id: account_id.to_string(),
            platform_id: platform_id.to_string(),
            proxy: proxy.map(ProxyConfig::from),
            headless,
        };

        let response = self.client
            .post(&url)
            .json(&request)
            .send()
            .await
            .map_err(|e| PubCastError::Network(e.to_string()))?;

        response
            .json()
            .await
            .map_err(|e| PubCastError::Network(e.to_string()))
    }

    /// Navigate to a URL
    pub async fn navigate(&self, account_id: &str, url: &str) -> Result<BrowserResponse> {
        let api_url = format!("{}/browser/navigate", self.sidecar_url);
        
        let request = NavigateRequest {
            account_id: account_id.to_string(),
            url: url.to_string(),
        };

        let response = self.client
            .post(&api_url)
            .json(&request)
            .send()
            .await
            .map_err(|e| PubCastError::Network(e.to_string()))?;

        response
            .json()
            .await
            .map_err(|e| PubCastError::Network(e.to_string()))
    }

    /// Get page info
    pub async fn get_page_info(&self, account_id: &str) -> Result<PageInfoResponse> {
        let url = format!("{}/browser/{}/info", self.sidecar_url, account_id);

        let response = self.client
            .get(&url)
            .send()
            .await
            .map_err(|e| PubCastError::Network(e.to_string()))?;

        response
            .json()
            .await
            .map_err(|e| PubCastError::Network(e.to_string()))
    }

    /// Save browser session
    pub async fn save_session(&self, account_id: &str) -> Result<BrowserResponse> {
        let url = format!("{}/browser/{}/save", self.sidecar_url, account_id);

        let response = self.client
            .post(&url)
            .send()
            .await
            .map_err(|e| PubCastError::Network(e.to_string()))?;

        response
            .json()
            .await
            .map_err(|e| PubCastError::Network(e.to_string()))
    }

    /// Close browser
    pub async fn close_browser(&self, account_id: &str) -> Result<BrowserResponse> {
        let url = format!("{}/browser/{}/close", self.sidecar_url, account_id);

        let response = self.client
            .post(&url)
            .json(&serde_json::json!({ "saveSession": true }))
            .send()
            .await
            .map_err(|e| PubCastError::Network(e.to_string()))?;

        response
            .json()
            .await
            .map_err(|e| PubCastError::Network(e.to_string()))
    }

    /// Get all active sessions
    pub async fn get_sessions(&self) -> Result<Vec<SessionInfo>> {
        let url = format!("{}/sessions", self.sidecar_url);

        let response = self.client
            .get(&url)
            .send()
            .await
            .map_err(|e| PubCastError::Network(e.to_string()))?;

        let result: SessionsResponse = response
            .json()
            .await
            .map_err(|e| PubCastError::Network(e.to_string()))?;

        Ok(result.sessions)
    }

    /// Close all browsers
    pub async fn close_all(&self) -> Result<BrowserResponse> {
        let url = format!("{}/browser/close-all", self.sidecar_url);

        let response = self.client
            .post(&url)
            .send()
            .await
            .map_err(|e| PubCastError::Network(e.to_string()))?;

        response
            .json()
            .await
            .map_err(|e| PubCastError::Network(e.to_string()))
    }
}
