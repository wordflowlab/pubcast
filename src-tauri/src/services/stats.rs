//! Statistics service
//!
//! Provides publishing statistics and reporting.

use sqlx::SqlitePool;

use crate::error::Result;

/// Statistics for a time period
#[derive(Debug, serde::Serialize)]
pub struct PublishStats {
    pub total_publishes: i64,
    pub successful_publishes: i64,
    pub failed_publishes: i64,
    pub success_rate: f64,
    pub avg_duration_ms: Option<i64>,
}

/// Platform statistics
#[derive(Debug, serde::Serialize)]
pub struct PlatformStats {
    pub platform: String,
    pub total_publishes: i64,
    pub successful_publishes: i64,
    pub failed_publishes: i64,
}

/// Daily statistics
#[derive(Debug, serde::Serialize)]
pub struct DailyStats {
    pub date: String,
    pub total_publishes: i64,
    pub successful_publishes: i64,
    pub failed_publishes: i64,
}

/// Statistics service
pub struct StatsService {
    pool: SqlitePool,
}

impl StatsService {
    /// Create a new statistics service
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    /// Get overall statistics
    pub async fn get_overall_stats(&self) -> Result<PublishStats> {
        let row = sqlx::query!(
            r#"
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
                AVG(CASE WHEN completed_at IS NOT NULL AND started_at IS NOT NULL 
                    THEN (completed_at - started_at) * 1000 ELSE NULL END) as avg_duration
            FROM publish_jobs
            WHERE status IN ('success', 'failed')
            "#
        )
        .fetch_one(&self.pool)
        .await?;

        let total = row.total;
        let success = row.success.unwrap_or(0);
        let failed = row.failed.unwrap_or(0);
        let success_rate = if total > 0 {
            (success as f64 / total as f64) * 100.0
        } else {
            0.0
        };

        Ok(PublishStats {
            total_publishes: total,
            successful_publishes: success,
            failed_publishes: failed,
            success_rate,
            avg_duration_ms: row.avg_duration.map(|d| d as i64),
        })
    }

    /// Get statistics by platform
    pub async fn get_platform_stats(&self) -> Result<Vec<PlatformStats>> {
        let rows = sqlx::query!(
            r#"
            SELECT 
                platform,
                COUNT(*) as total,
                SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
            FROM publish_jobs
            WHERE status IN ('success', 'failed')
            GROUP BY platform
            ORDER BY total DESC
            "#
        )
        .fetch_all(&self.pool)
        .await?;

        let stats = rows
            .into_iter()
            .map(|row| PlatformStats {
                platform: row.platform,
                total_publishes: row.total,
                successful_publishes: row.success,
                failed_publishes: row.failed,
            })
            .collect();

        Ok(stats)
    }

    /// Get daily statistics for the last N days
    pub async fn get_daily_stats(&self, days: i32) -> Result<Vec<DailyStats>> {
        let days_str = format!("-{}", days);
        let rows = sqlx::query!(
            r#"
            SELECT 
                date(datetime(created_at, 'unixepoch')) as stat_date,
                COUNT(*) as total,
                SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
            FROM publish_jobs
            WHERE status IN ('success', 'failed')
              AND created_at >= strftime('%s', 'now', ? || ' days')
            GROUP BY stat_date
            ORDER BY stat_date DESC
            "#,
            days_str
        )
        .fetch_all(&self.pool)
        .await?;

        let stats = rows
            .into_iter()
            .filter_map(|row| {
                row.stat_date.map(|date| DailyStats {
                    date,
                    total_publishes: row.total,
                    successful_publishes: row.success,
                    failed_publishes: row.failed,
                })
            })
            .collect();

        Ok(stats)
    }

    /// Record a publish log entry
    pub async fn record_publish_log(
        &self,
        job_id: &str,
        account_id: &str,
        platform: &str,
        status: &str,
        duration_ms: Option<i64>,
        error_message: Option<&str>,
    ) -> Result<()> {
        let now = chrono::Utc::now().timestamp();
        let id = uuid::Uuid::new_v4().to_string();

        sqlx::query!(
            r#"
            INSERT INTO publish_logs (id, publish_job_id, account_id, platform, status, duration_ms, error_message, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            "#,
            id,
            job_id,
            account_id,
            platform,
            status,
            duration_ms,
            error_message,
            now
        )
        .execute(&self.pool)
        .await?;

        // Update daily statistics
        let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
        let success_count: i32 = if status == "success" { 1 } else { 0 };
        let failed_count: i32 = if status == "failed" { 1 } else { 0 };
        
        sqlx::query!(
            r#"
            INSERT INTO daily_statistics (stat_date, platform, account_id, total_publishes, successful_publishes, failed_publishes)
            VALUES (?, ?, ?, 1, ?, ?)
            ON CONFLICT (stat_date, platform, account_id) DO UPDATE SET
                total_publishes = total_publishes + 1,
                successful_publishes = successful_publishes + excluded.successful_publishes,
                failed_publishes = failed_publishes + excluded.failed_publishes
            "#,
            today,
            platform,
            account_id,
            success_count,
            failed_count
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }
}
