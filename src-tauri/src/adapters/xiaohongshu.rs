//! Xiaohongshu (小红书) adapter
//!
//! Implements the PlatformAdapter trait for Xiaohongshu.

use async_trait::async_trait;

use crate::error::{PubCastError, Result};
use crate::models::{Account, Content, PublishResult};

use super::traits::{LoginCredentials, PlatformAdapter, PlatformCapabilities, PreparedContent};

/// Xiaohongshu adapter
pub struct XiaohongshuAdapter;

impl XiaohongshuAdapter {
    pub fn new() -> Self {
        Self
    }

    /// Extract hashtags from content
    fn extract_hashtags(content: &str) -> Vec<String> {
        // Simple hashtag extraction
        content
            .split_whitespace()
            .filter(|word| word.starts_with('#'))
            .map(|tag| tag.trim_start_matches('#').to_string())
            .collect()
    }
}

impl Default for XiaohongshuAdapter {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl PlatformAdapter for XiaohongshuAdapter {
    fn platform_id(&self) -> &'static str {
        "xiaohongshu"
    }

    fn platform_name(&self) -> &'static str {
        "小红书"
    }

    fn capabilities(&self) -> PlatformCapabilities {
        PlatformCapabilities {
            max_title_length: Some(20),
            max_content_length: Some(1000),
            supported_media: vec!["image".to_string(), "video".to_string()],
            supports_scheduling: false,
            supports_draft: true,
            supports_html: false,
            rate_limit_per_hour: Some(5),
        }
    }

    async fn check_auth(&self, account: &Account) -> Result<bool> {
        // TODO: Implement actual auth check
        Ok(account.status == crate::models::AccountStatus::Active)
    }

    async fn refresh_auth(&self, _account: &Account) -> Result<LoginCredentials> {
        Err(PubCastError::PlatformAdapter(
            "Xiaohongshu auth refresh not implemented".to_string(),
        ))
    }

    async fn prepare_content(&self, content: &Content) -> Result<PreparedContent> {
        let title = content.title.clone();

        // Truncate title if too long (小红书标题限制20字)
        let title = if title.chars().count() > 20 {
            title.chars().take(17).collect::<String>() + "..."
        } else {
            title
        };

        // Get body and truncate if needed
        let body = content.body.clone().unwrap_or_default();
        let body = if body.chars().count() > 1000 {
            body.chars().take(997).collect::<String>() + "..."
        } else {
            body
        };

        // Extract hashtags from body or use provided tags
        let mut tags = content.tags.clone().unwrap_or_default();
        let extracted_tags = Self::extract_hashtags(&body);
        tags.extend(extracted_tags);
        tags.dedup();

        // Limit to 10 tags
        tags.truncate(10);

        Ok(PreparedContent {
            title,
            body,
            cover_image: content.cover_image_local.clone().or(content.cover_image_url.clone()),
            tags,
            extra: None,
        })
    }

    async fn publish(&self, _account: &Account, _content: &PreparedContent) -> Result<PublishResult> {
        // TODO: Implement actual publishing via browser automation
        Err(PubCastError::PlatformAdapter(
            "Xiaohongshu publishing not implemented - requires browser automation".to_string(),
        ))
    }

    fn login_url(&self) -> Option<String> {
        Some("https://creator.xiaohongshu.com/".to_string())
    }
}
