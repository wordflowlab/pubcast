//! AI Service for authorization and content checking

use sqlx::SqlitePool;
use uuid::Uuid;
use crate::error::Result;
use crate::models::ai::{AIConfig, AIPlatformStatus, AICheckLog};

const DEFAULT_PLATFORMS: &[&str] = &[
    "deepseek", "doubao", "yuanbao", "tongyi", 
    "wenxin", "nanmi", "kimi", "zhipu"
];

pub struct AIService {
    pool: SqlitePool,
}

impl AIService {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    /// Ensure default platforms exist in database
    pub async fn ensure_defaults(&self) -> Result<()> {
        let now = chrono::Utc::now().timestamp();
        for platform in DEFAULT_PLATFORMS {
            let id = Uuid::new_v4().to_string();
            sqlx::query!(
                r#"
                INSERT OR IGNORE INTO ai_configs (id, platform, status, created_at, updated_at)
                VALUES (?, ?, 'inactive', ?, ?)
                "#,
                id,
                platform,
                now,
                now
            )
            .execute(&self.pool)
            .await?;
        }
        Ok(())
    }

    /// Get all AI configurations
    pub async fn list_configs(&self) -> Result<Vec<AIConfig>> {
        self.ensure_defaults().await?;

        let rows = sqlx::query!(
            r#"
            SELECT id, platform, status, auth_data, created_at, updated_at
            FROM ai_configs
            ORDER BY platform ASC
            "#
        )
        .fetch_all(&self.pool)
        .await?;

        let configs = rows
            .into_iter()
            .map(|row| AIConfig {
                id: row.id.unwrap_or_default(),
                platform: row.platform,
                status: row.status.parse().unwrap_or(AIPlatformStatus::Inactive),
                auth_data: row.auth_data,
                created_at: row.created_at,
                updated_at: row.updated_at,
            })
            .collect();

        Ok(configs)
    }

    /// Toggle authorization status (Simulation)
    pub async fn toggle_auth(&self, platform: &str) -> Result<AIConfig> {
        // In a real app, this would handle OAuth or API key validation
        // For MVP, we just toggle between active and inactive
        
        let current = sqlx::query!(
            "SELECT status FROM ai_configs WHERE platform = ?",
            platform
        )
        .fetch_optional(&self.pool)
        .await?;

        let new_status = match current {
            Some(row) => if row.status == "active" { "inactive" } else { "active" },
            None => "active", // Should not happen due to ensure_defaults
        };

        let now = chrono::Utc::now().timestamp();
        
        sqlx::query!(
            r#"
            UPDATE ai_configs 
            SET status = ?, updated_at = ?
            WHERE platform = ?
            "#,
            new_status,
            now,
            platform
        )
        .execute(&self.pool)
        .await?;

        // Fetch updated config
        let row = sqlx::query!(
            "SELECT id, platform, status, auth_data, created_at, updated_at FROM ai_configs WHERE platform = ?",
            platform
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(AIConfig {
            id: row.id.unwrap_or_default(),
            platform: row.platform,
            status: row.status.parse().unwrap_or(AIPlatformStatus::Inactive),
            auth_data: row.auth_data,
            created_at: row.created_at,
            updated_at: row.updated_at,
        })
    }

    /// Run check task (Simulation)
    pub async fn run_check(&self) -> Result<()> {
        let active_platforms = sqlx::query!(
            "SELECT platform FROM ai_configs WHERE status = 'active'"
        )
        .fetch_all(&self.pool)
        .await?;

        if active_platforms.is_empty() {
            return Ok(());
        }

        let now = chrono::Utc::now().timestamp();
        
        // Create a log entry for each active platform
        for row in active_platforms {
            let id = Uuid::new_v4().to_string();
            // Simulate random success/fail
            let success = rand::random::<bool>();
            let status = if success { "success" } else { "failed" };
            let message = if success { "收录检查通过" } else { "未收录或请求超时" };
            
            sqlx::query!(
                r#"
                INSERT INTO ai_check_logs (id, platform, status, message, duration_ms, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                "#,
                id,
                row.platform,
                status,
                message,
                1500, // Simulated duration
                now
            )
            .execute(&self.pool)
            .await?;
        }

        Ok(())
    }

    /// List logs
    pub async fn list_logs(&self, limit: i32) -> Result<Vec<AICheckLog>> {
        let rows = sqlx::query!(
            r#"
            SELECT id, platform, status, message, duration_ms, created_at
            FROM ai_check_logs
            ORDER BY created_at DESC
            LIMIT ?
            "#,
            limit
        )
        .fetch_all(&self.pool)
        .await?;

        let logs = rows
            .into_iter()
            .map(|row| AICheckLog {
                id: row.id.unwrap_or_default(),
                platform: row.platform,
                status: row.status,
                message: row.message,
                duration_ms: row.duration_ms,
                created_at: row.created_at,
            })
            .collect();

        Ok(logs)
    }

    /// Clear logs
    pub async fn clear_logs(&self) -> Result<()> {
        sqlx::query!("DELETE FROM ai_check_logs").execute(&self.pool).await?;
        Ok(())
    }
}
