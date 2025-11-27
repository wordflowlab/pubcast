//! WeChat Official Account adapter
//!
//! Implements the PlatformAdapter trait for WeChat MP (公众号).

use async_trait::async_trait;

use crate::error::{PubCastError, Result};
use crate::models::{Account, Content, PublishResult};

use super::traits::{LoginCredentials, PlatformAdapter, PlatformCapabilities, PreparedContent};

/// WeChat Official Account adapter
pub struct WechatAdapter;

impl WechatAdapter {
    pub fn new() -> Self {
        Self
    }

    /// Convert Markdown to WeChat-compatible HTML
    fn markdown_to_wechat_html(markdown: &str) -> String {
        // TODO: Implement proper Markdown to WeChat HTML conversion
        // For now, just wrap in basic HTML
        format!(
            r#"<section style="font-size: 16px; line-height: 1.8;">{}</section>"#,
            markdown
                .replace("\n\n", "</p><p>")
                .replace("\n", "<br/>")
        )
    }
}

impl Default for WechatAdapter {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl PlatformAdapter for WechatAdapter {
    fn platform_id(&self) -> &'static str {
        "wechat"
    }

    fn platform_name(&self) -> &'static str {
        "微信公众号"
    }

    fn capabilities(&self) -> PlatformCapabilities {
        PlatformCapabilities {
            max_title_length: Some(64),
            max_content_length: Some(20000),
            supported_media: vec!["image".to_string(), "video".to_string()],
            supports_scheduling: true,
            supports_draft: true,
            supports_html: true,
            rate_limit_per_hour: Some(10),
        }
    }

    async fn check_auth(&self, account: &Account) -> Result<bool> {
        // TODO: Implement actual auth check via browser automation
        // For now, just check if account status is active
        Ok(account.status == crate::models::AccountStatus::Active)
    }

    async fn refresh_auth(&self, _account: &Account) -> Result<LoginCredentials> {
        // TODO: Implement auth refresh
        Err(PubCastError::PlatformAdapter(
            "WeChat auth refresh not implemented".to_string(),
        ))
    }

    async fn prepare_content(&self, content: &Content) -> Result<PreparedContent> {
        let title = content.title.clone();

        // Truncate title if too long
        let title = if title.len() > 64 {
            format!("{}...", &title[..61])
        } else {
            title
        };

        // Convert body to WeChat HTML
        let body = content
            .body
            .as_ref()
            .map(|b| Self::markdown_to_wechat_html(b))
            .unwrap_or_default();

        // Truncate if too long
        let body = if body.len() > 20000 {
            format!("{}...", &body[..19997])
        } else {
            body
        };

        Ok(PreparedContent {
            title,
            body,
            cover_image: content.cover_image_local.clone().or(content.cover_image_url.clone()),
            tags: content.tags.clone().unwrap_or_default(),
            extra: None,
        })
    }

    async fn publish(&self, _account: &Account, _content: &PreparedContent) -> Result<PublishResult> {
        // TODO: Implement actual publishing via browser automation
        Err(PubCastError::PlatformAdapter(
            "WeChat publishing not implemented - requires browser automation".to_string(),
        ))
    }

    fn login_url(&self) -> Option<String> {
        Some("https://mp.weixin.qq.com/".to_string())
    }
}
