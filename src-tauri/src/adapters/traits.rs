//! Platform adapter traits
//!
//! Defines the core interfaces for platform adapters.

use async_trait::async_trait;
use serde::{Deserialize, Serialize};

use crate::error::Result;
use crate::models::{Account, Content, PublishResult};

/// Content prepared for publishing to a specific platform
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PreparedContent {
    /// Adapted title (may be truncated or modified)
    pub title: String,
    /// Adapted body content (HTML or platform-specific format)
    pub body: String,
    /// Cover image (local path or URL)
    pub cover_image: Option<String>,
    /// Tags adapted for the platform
    pub tags: Vec<String>,
    /// Additional platform-specific fields
    pub extra: Option<serde_json::Value>,
}

/// Login credentials for a platform
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum LoginCredentials {
    /// Cookie-based authentication
    #[serde(rename = "cookies")]
    Cookies { cookies: String },
    /// OAuth tokens
    #[serde(rename = "oauth")]
    OAuth {
        access_token: String,
        refresh_token: Option<String>,
        expires_at: Option<i64>,
    },
    /// Username/password (not recommended)
    #[serde(rename = "password")]
    Password { username: String, password: String },
    /// QR code scan (requires browser automation)
    #[serde(rename = "qrcode")]
    QRCode,
}

/// Platform capabilities
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlatformCapabilities {
    /// Maximum title length
    pub max_title_length: Option<usize>,
    /// Maximum content length
    pub max_content_length: Option<usize>,
    /// Supported media types
    pub supported_media: Vec<String>,
    /// Whether scheduling is supported
    pub supports_scheduling: bool,
    /// Whether draft saving is supported
    pub supports_draft: bool,
    /// Whether HTML content is supported
    pub supports_html: bool,
    /// Rate limits (publishes per hour)
    pub rate_limit_per_hour: Option<u32>,
}

/// Platform adapter trait
///
/// Each platform must implement this trait to provide publishing functionality.
#[async_trait]
pub trait PlatformAdapter: Send + Sync {
    /// Get the platform identifier (e.g., "wechat", "xiaohongshu")
    fn platform_id(&self) -> &'static str;

    /// Get the platform display name
    fn platform_name(&self) -> &'static str;

    /// Get platform capabilities
    fn capabilities(&self) -> PlatformCapabilities;

    /// Check if an account is authenticated and valid
    async fn check_auth(&self, account: &Account) -> Result<bool>;

    /// Refresh authentication if needed
    async fn refresh_auth(&self, account: &Account) -> Result<LoginCredentials>;

    /// Prepare content for this platform
    ///
    /// Adapts the generic content to platform-specific format.
    async fn prepare_content(&self, content: &Content) -> Result<PreparedContent>;

    /// Publish content to the platform
    async fn publish(&self, account: &Account, content: &PreparedContent) -> Result<PublishResult>;

    /// Get login URL for OAuth flow (if applicable)
    fn login_url(&self) -> Option<String> {
        None
    }
}

/// Login strategy for platforms that require browser automation
#[async_trait]
pub trait LoginStrategy: Send + Sync {
    /// Get the platform this strategy is for
    fn platform_id(&self) -> &'static str;

    /// Perform login via browser automation
    async fn perform_login(&self, browser_session_id: &str) -> Result<LoginCredentials>;

    /// Check if login is still valid
    async fn check_login(&self, credentials: &LoginCredentials) -> Result<bool>;
}
