//! Content service
//!
//! Handles local content storage and remote API synchronization.

use sqlx::SqlitePool;
use uuid::Uuid;

use crate::error::{PubCastError, Result};
use crate::models::{Content, ContentStatus, RemoteContent, RemoteContentListResponse};

/// Content API client configuration
#[derive(Debug, Clone)]
pub struct ContentApiConfig {
    pub base_url: String,
    pub api_key: Option<String>,
}

impl Default for ContentApiConfig {
    fn default() -> Self {
        Self {
            base_url: "http://localhost:3001/api/v1".to_string(),
            api_key: None,
        }
    }
}

/// Content service for managing local content and syncing with remote API
pub struct ContentService {
    pool: SqlitePool,
    http_client: reqwest::Client,
    api_config: ContentApiConfig,
}

impl ContentService {
    /// Create a new content service
    pub fn new(pool: SqlitePool, api_config: ContentApiConfig) -> Self {
        let http_client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .expect("Failed to create HTTP client");

        Self {
            pool,
            http_client,
            api_config,
        }
    }

    /// List all local contents
    pub async fn list_contents(&self) -> Result<Vec<Content>> {
        let rows = sqlx::query!(
            r#"
            SELECT id, remote_id, title, body, cover_image_url, cover_image_local,
                   tags, category, author, source_url, status, remote_status,
                   remote_updated_at, local_updated_at, metadata, created_at, updated_at
            FROM contents
            ORDER BY updated_at DESC
            "#
        )
        .fetch_all(&self.pool)
        .await?;

        let contents = rows
            .into_iter()
            .map(|row| Content {
                id: row.id,
                remote_id: row.remote_id,
                title: row.title,
                body: row.body,
                cover_image_url: row.cover_image_url,
                cover_image_local: row.cover_image_local,
                tags: row.tags.as_ref().and_then(|t| serde_json::from_str(t).ok()),
                category: row.category,
                author: row.author,
                source_url: row.source_url,
                status: row.status.parse().unwrap_or(ContentStatus::Draft),
                remote_status: row.remote_status,
                remote_updated_at: row.remote_updated_at,
                local_updated_at: row.local_updated_at,
                metadata: row.metadata.as_ref().and_then(|m| serde_json::from_str(m).ok()),
                created_at: row.created_at,
                updated_at: row.updated_at,
            })
            .collect();

        Ok(contents)
    }

    /// Get a single content by ID
    pub async fn get_content(&self, id: &str) -> Result<Content> {
        let row = sqlx::query!(
            r#"
            SELECT id, remote_id, title, body, cover_image_url, cover_image_local,
                   tags, category, author, source_url, status, remote_status,
                   remote_updated_at, local_updated_at, metadata, created_at, updated_at
            FROM contents WHERE id = ?
            "#,
            id
        )
        .fetch_optional(&self.pool)
        .await?
        .ok_or_else(|| PubCastError::NotFound(format!("Content not found: {}", id)))?;

        Ok(Content {
            id: row.id,
            remote_id: row.remote_id,
            title: row.title,
            body: row.body,
            cover_image_url: row.cover_image_url,
            cover_image_local: row.cover_image_local,
            tags: row.tags.as_ref().and_then(|t| serde_json::from_str(t).ok()),
            category: row.category,
            author: row.author,
            source_url: row.source_url,
            status: row.status.parse().unwrap_or(ContentStatus::Draft),
            remote_status: row.remote_status,
            remote_updated_at: row.remote_updated_at,
            local_updated_at: row.local_updated_at,
            metadata: row.metadata.as_ref().and_then(|m| serde_json::from_str(m).ok()),
            created_at: row.created_at,
            updated_at: row.updated_at,
        })
    }

    /// Fetch contents from remote API
    pub async fn fetch_remote_contents(
        &self,
        page: i32,
        per_page: i32,
        status: Option<&str>,
    ) -> Result<RemoteContentListResponse> {
        let mut url = format!(
            "{}/contents?page={}&per_page={}",
            self.api_config.base_url, page, per_page
        );

        if let Some(status) = status {
            url.push_str(&format!("&status={}", status));
        }

        let mut request = self.http_client.get(&url);

        if let Some(api_key) = &self.api_config.api_key {
            request = request.header("Authorization", format!("Bearer {}", api_key));
        }

        let response = request.send().await?;

        if !response.status().is_success() {
            return Err(PubCastError::Http(
                reqwest::Error::from(response.error_for_status().unwrap_err()),
            ));
        }

        let data: RemoteContentListResponse = response.json().await?;
        Ok(data)
    }

    /// Sync content from remote to local database
    pub async fn sync_remote_content(&self, remote: &RemoteContent) -> Result<Content> {
        let now = chrono::Utc::now().timestamp();

        // Check if content already exists
        let existing = sqlx::query!(
            "SELECT id FROM contents WHERE remote_id = ?",
            remote.id
        )
        .fetch_optional(&self.pool)
        .await?;

        let tags_json = remote.tags.as_ref().map(|t| serde_json::to_string(t).ok()).flatten();
        let status = ContentStatus::Ready.to_string();

        let id = if let Some(existing) = existing {
            // Update existing content
            sqlx::query!(
                r#"
                UPDATE contents SET
                    title = ?, body = ?, cover_image_url = ?, tags = ?,
                    category = ?, author = ?, source_url = ?, status = ?,
                    remote_status = ?, remote_updated_at = ?, local_updated_at = ?, updated_at = ?
                WHERE id = ?
                "#,
                remote.title,
                remote.body,
                remote.cover_image_url,
                tags_json,
                remote.category,
                remote.author,
                remote.source_url,
                status,
                remote.status,
                remote.updated_at,
                now,
                now,
                existing.id
            )
            .execute(&self.pool)
            .await?;

            existing.id
        } else {
            // Insert new content
            let id = Uuid::new_v4().to_string();

            sqlx::query!(
                r#"
                INSERT INTO contents (id, remote_id, title, body, cover_image_url, tags,
                    category, author, source_url, status, remote_status, remote_updated_at,
                    local_updated_at, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                "#,
                id,
                remote.id,
                remote.title,
                remote.body,
                remote.cover_image_url,
                tags_json,
                remote.category,
                remote.author,
                remote.source_url,
                status,
                remote.status,
                remote.updated_at,
                now,
                now,
                now
            )
            .execute(&self.pool)
            .await?;

            id
        };

        self.get_content(&id).await
    }

    /// Sync all contents from remote API
    pub async fn sync_all(&self) -> Result<SyncResult> {
        let mut synced = 0;
        let mut failed = 0;
        let mut page = 1;
        let per_page = 50;

        loop {
            let response = self.fetch_remote_contents(page, per_page, Some("ready")).await?;

            for remote in response.contents {
                match self.sync_remote_content(&remote).await {
                    Ok(_) => synced += 1,
                    Err(e) => {
                        tracing::warn!("Failed to sync content {}: {}", remote.id, e);
                        failed += 1;
                    }
                }
            }

            if !response.has_more {
                break;
            }

            page += 1;
        }

        tracing::info!("Sync completed: {} synced, {} failed", synced, failed);

        Ok(SyncResult { synced, failed })
    }

    /// Report publish status to remote API
    pub async fn report_publish_status(
        &self,
        content_id: &str,
        platform: &str,
        published_url: &str,
    ) -> Result<()> {
        let content = self.get_content(content_id).await?;

        let remote_id = content
            .remote_id
            .ok_or_else(|| PubCastError::Validation("Content has no remote_id".to_string()))?;

        let url = format!(
            "{}/contents/{}/published",
            self.api_config.base_url, remote_id
        );

        let payload = serde_json::json!({
            "platform": platform,
            "published_url": published_url,
            "published_at": chrono::Utc::now().timestamp_millis()
        });

        let mut request = self.http_client.post(&url).json(&payload);

        if let Some(api_key) = &self.api_config.api_key {
            request = request.header("Authorization", format!("Bearer {}", api_key));
        }

        let response = request.send().await?;

        if !response.status().is_success() {
            return Err(PubCastError::Http(
                reqwest::Error::from(response.error_for_status().unwrap_err()),
            ));
        }

        Ok(())
    }
}

/// Sync operation result
#[derive(Debug)]
pub struct SyncResult {
    pub synced: i32,
    pub failed: i32,
}
