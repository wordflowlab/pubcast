//! Publishing scheduler service
//!
//! Manages publish job queue, concurrency control, and retry logic.

use std::sync::Arc;

use sqlx::SqlitePool;
use tokio::sync::{mpsc, Semaphore};
use uuid::Uuid;

use crate::error::{PubCastError, Result};
use crate::models::{
    CreateDistributionTaskRequest, DistributionTask, DistributionTaskStatus, PublishJob,
    PublishJobStatus, ScheduleType,
};

/// Maximum concurrent publish jobs
const MAX_CONCURRENT_JOBS: usize = 3;
/// Base retry delay in seconds
const RETRY_BASE_DELAY_SECS: u64 = 5;
/// Maximum retry delay in seconds
const MAX_RETRY_DELAY_SECS: u64 = 300;

/// Scheduler service for managing publish jobs
pub struct SchedulerService {
    pool: SqlitePool,
    /// Semaphore for concurrency control (reserved for future use)
    #[allow(dead_code)]
    semaphore: Arc<Semaphore>,
    /// Shutdown signal sender (reserved for future use)
    #[allow(dead_code)]
    shutdown_tx: Option<mpsc::Sender<()>>,
}

impl SchedulerService {
    /// Create a new scheduler service
    pub fn new(pool: SqlitePool) -> Self {
        Self {
            pool,
            semaphore: Arc::new(Semaphore::new(MAX_CONCURRENT_JOBS)),
            shutdown_tx: None,
        }
    }

    /// Create a distribution task
    pub async fn create_distribution_task(
        &self,
        req: CreateDistributionTaskRequest,
    ) -> Result<DistributionTask> {
        let id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp();
        let target_accounts = serde_json::to_string(&req.target_account_ids)?;
        let schedule_type = match req.schedule_type {
            ScheduleType::Immediate => "immediate",
            ScheduleType::Scheduled => "scheduled",
        };
        let status = DistributionTaskStatus::Pending.to_string();
        let total_jobs = req.target_account_ids.len() as i32;

        sqlx::query!(
            r#"
            INSERT INTO distribution_tasks 
            (id, content_id, name, status, target_accounts, schedule_type, scheduled_at, total_jobs, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
            id,
            req.content_id,
            req.name,
            status,
            target_accounts,
            schedule_type,
            req.scheduled_at,
            total_jobs,
            now,
            now
        )
        .execute(&self.pool)
        .await?;

        // Create individual publish jobs
        for account_id in &req.target_account_ids {
            self.create_publish_job(&id, &req.content_id, account_id, req.scheduled_at)
                .await?;
        }

        self.get_distribution_task(&id).await
    }

    /// Create a single publish job
    async fn create_publish_job(
        &self,
        task_id: &str,
        content_id: &str,
        account_id: &str,
        scheduled_at: Option<i64>,
    ) -> Result<String> {
        let id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp();
        let status = PublishJobStatus::Pending.to_string();

        // Get platform from account
        let account = sqlx::query!("SELECT platform FROM accounts WHERE id = ?", account_id)
            .fetch_optional(&self.pool)
            .await?
            .ok_or_else(|| PubCastError::NotFound(format!("Account not found: {}", account_id)))?;

        sqlx::query!(
            r#"
            INSERT INTO publish_jobs 
            (id, distribution_task_id, content_id, account_id, platform, status, scheduled_at, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
            id,
            task_id,
            content_id,
            account_id,
            account.platform,
            status,
            scheduled_at,
            now,
            now
        )
        .execute(&self.pool)
        .await?;

        Ok(id)
    }

    /// Get a distribution task by ID
    pub async fn get_distribution_task(&self, id: &str) -> Result<DistributionTask> {
        let row = sqlx::query!(
            r#"
            SELECT id, content_id, name, status, target_accounts, schedule_type,
                   scheduled_at, started_at, completed_at, total_jobs, completed_jobs,
                   failed_jobs, error_message, created_at, updated_at
            FROM distribution_tasks WHERE id = ?
            "#,
            id
        )
        .fetch_optional(&self.pool)
        .await?
        .ok_or_else(|| PubCastError::NotFound(format!("Distribution task not found: {}", id)))?;

        let target_accounts: Vec<String> =
            serde_json::from_str(&row.target_accounts).unwrap_or_default();

        Ok(DistributionTask {
            id: row.id,
            content_id: row.content_id,
            name: row.name,
            status: row.status.parse().unwrap_or(DistributionTaskStatus::Pending),
            target_accounts,
            schedule_type: if row.schedule_type == "scheduled" {
                ScheduleType::Scheduled
            } else {
                ScheduleType::Immediate
            },
            scheduled_at: row.scheduled_at,
            started_at: row.started_at,
            completed_at: row.completed_at,
            total_jobs: row.total_jobs,
            completed_jobs: row.completed_jobs,
            failed_jobs: row.failed_jobs,
            error_message: row.error_message,
            created_at: row.created_at,
            updated_at: row.updated_at,
        })
    }

    /// List distribution tasks
    pub async fn list_distribution_tasks(&self) -> Result<Vec<DistributionTask>> {
        let rows = sqlx::query!(
            r#"
            SELECT id, content_id, name, status, target_accounts, schedule_type,
                   scheduled_at, started_at, completed_at, total_jobs, completed_jobs,
                   failed_jobs, error_message, created_at, updated_at
            FROM distribution_tasks
            ORDER BY created_at DESC
            LIMIT 100
            "#
        )
        .fetch_all(&self.pool)
        .await?;

        let tasks = rows
            .into_iter()
            .map(|row| {
                let target_accounts: Vec<String> =
                    serde_json::from_str(&row.target_accounts).unwrap_or_default();

                DistributionTask {
                    id: row.id,
                    content_id: row.content_id,
                    name: row.name,
                    status: row.status.parse().unwrap_or(DistributionTaskStatus::Pending),
                    target_accounts,
                    schedule_type: if row.schedule_type == "scheduled" {
                        ScheduleType::Scheduled
                    } else {
                        ScheduleType::Immediate
                    },
                    scheduled_at: row.scheduled_at,
                    started_at: row.started_at,
                    completed_at: row.completed_at,
                    total_jobs: row.total_jobs,
                    completed_jobs: row.completed_jobs,
                    failed_jobs: row.failed_jobs,
                    error_message: row.error_message,
                    created_at: row.created_at,
                    updated_at: row.updated_at,
                }
            })
            .collect();

        Ok(tasks)
    }

    /// Get pending jobs ready for execution
    pub async fn get_pending_jobs(&self, limit: i32) -> Result<Vec<PublishJob>> {
        let now = chrono::Utc::now().timestamp();

        let rows = sqlx::query!(
            r#"
            SELECT id, distribution_task_id, content_id, account_id, platform, status,
                   priority, retry_count, max_retries, scheduled_at, started_at, completed_at,
                   published_url, published_id, error_code, error_message, metadata,
                   created_at, updated_at
            FROM publish_jobs
            WHERE status = 'pending'
              AND (scheduled_at IS NULL OR scheduled_at <= ?)
            ORDER BY priority DESC, created_at ASC
            LIMIT ?
            "#,
            now,
            limit
        )
        .fetch_all(&self.pool)
        .await?;

        let jobs = rows
            .into_iter()
            .map(|row| PublishJob {
                id: row.id,
                distribution_task_id: row.distribution_task_id,
                content_id: row.content_id,
                account_id: row.account_id,
                platform: row.platform,
                status: row.status.parse().unwrap_or(PublishJobStatus::Pending),
                priority: row.priority,
                retry_count: row.retry_count,
                max_retries: row.max_retries,
                scheduled_at: row.scheduled_at,
                started_at: row.started_at,
                completed_at: row.completed_at,
                published_url: row.published_url,
                published_id: row.published_id,
                error_code: row.error_code,
                error_message: row.error_message,
                metadata: row.metadata.as_ref().and_then(|m| serde_json::from_str(m).ok()),
                created_at: row.created_at,
                updated_at: row.updated_at,
            })
            .collect();

        Ok(jobs)
    }

    /// Update job status to running
    pub async fn mark_job_running(&self, job_id: &str) -> Result<()> {
        let now = chrono::Utc::now().timestamp();
        let status = PublishJobStatus::Running.to_string();

        sqlx::query!(
            "UPDATE publish_jobs SET status = ?, started_at = ?, updated_at = ? WHERE id = ?",
            status,
            now,
            now,
            job_id
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Mark job as successful
    pub async fn mark_job_success(
        &self,
        job_id: &str,
        published_url: Option<String>,
        published_id: Option<String>,
    ) -> Result<()> {
        let now = chrono::Utc::now().timestamp();
        let status = PublishJobStatus::Success.to_string();

        sqlx::query!(
            r#"
            UPDATE publish_jobs 
            SET status = ?, completed_at = ?, published_url = ?, published_id = ?, updated_at = ?
            WHERE id = ?
            "#,
            status,
            now,
            published_url,
            published_id,
            now,
            job_id
        )
        .execute(&self.pool)
        .await?;

        // Update distribution task counters
        self.update_task_counters_for_job(job_id, true).await?;

        Ok(())
    }

    /// Mark job as failed
    pub async fn mark_job_failed(
        &self,
        job_id: &str,
        error_code: Option<String>,
        error_message: Option<String>,
    ) -> Result<()> {
        let now = chrono::Utc::now().timestamp();

        // Get current retry count
        let job = sqlx::query!(
            "SELECT retry_count, max_retries FROM publish_jobs WHERE id = ?",
            job_id
        )
        .fetch_one(&self.pool)
        .await?;

        if job.retry_count < job.max_retries {
            // Schedule retry with exponential backoff
            let delay = Self::calculate_retry_delay(job.retry_count);
            let retry_at = now + delay as i64;
            let status = PublishJobStatus::Pending.to_string();

            sqlx::query!(
                r#"
                UPDATE publish_jobs 
                SET status = ?, retry_count = retry_count + 1, scheduled_at = ?,
                    error_code = ?, error_message = ?, updated_at = ?
                WHERE id = ?
                "#,
                status,
                retry_at,
                error_code,
                error_message,
                now,
                job_id
            )
            .execute(&self.pool)
            .await?;

            tracing::info!(
                "Job {} scheduled for retry {} at {}",
                job_id,
                job.retry_count + 1,
                retry_at
            );
        } else {
            // Max retries reached, mark as failed
            let status = PublishJobStatus::Failed.to_string();

            sqlx::query!(
                r#"
                UPDATE publish_jobs 
                SET status = ?, completed_at = ?, error_code = ?, error_message = ?, updated_at = ?
                WHERE id = ?
                "#,
                status,
                now,
                error_code,
                error_message,
                now,
                job_id
            )
            .execute(&self.pool)
            .await?;

            // Update distribution task counters
            self.update_task_counters_for_job(job_id, false).await?;
        }

        Ok(())
    }

    /// Calculate retry delay with exponential backoff
    fn calculate_retry_delay(retry_count: i64) -> u64 {
        let delay = RETRY_BASE_DELAY_SECS * 2u64.pow(retry_count as u32);
        delay.min(MAX_RETRY_DELAY_SECS)
    }

    /// Update distribution task counters after job completion
    async fn update_task_counters_for_job(&self, job_id: &str, success: bool) -> Result<()> {
        let job = sqlx::query!("SELECT distribution_task_id FROM publish_jobs WHERE id = ?", job_id)
            .fetch_one(&self.pool)
            .await?;

        let now = chrono::Utc::now().timestamp();

        if success {
            sqlx::query!(
                r#"
                UPDATE distribution_tasks 
                SET completed_jobs = completed_jobs + 1, updated_at = ?
                WHERE id = ?
                "#,
                now,
                job.distribution_task_id
            )
            .execute(&self.pool)
            .await?;
        } else {
            sqlx::query!(
                r#"
                UPDATE distribution_tasks 
                SET failed_jobs = failed_jobs + 1, updated_at = ?
                WHERE id = ?
                "#,
                now,
                job.distribution_task_id
            )
            .execute(&self.pool)
            .await?;
        }

        // Check if task is complete
        let task = sqlx::query!(
            "SELECT total_jobs, completed_jobs, failed_jobs FROM distribution_tasks WHERE id = ?",
            job.distribution_task_id
        )
        .fetch_one(&self.pool)
        .await?;

        if task.completed_jobs + task.failed_jobs >= task.total_jobs {
            let status = if task.failed_jobs == 0 {
                DistributionTaskStatus::Completed.to_string()
            } else if task.completed_jobs == 0 {
                DistributionTaskStatus::Failed.to_string()
            } else {
                DistributionTaskStatus::Completed.to_string() // Partial success still counts as completed
            };

            sqlx::query!(
                "UPDATE distribution_tasks SET status = ?, completed_at = ?, updated_at = ? WHERE id = ?",
                status,
                now,
                now,
                job.distribution_task_id
            )
            .execute(&self.pool)
            .await?;
        }

        Ok(())
    }

    /// Cancel a distribution task
    pub async fn cancel_distribution_task(&self, task_id: &str) -> Result<()> {
        let now = chrono::Utc::now().timestamp();
        let task_status = DistributionTaskStatus::Cancelled.to_string();
        let job_status = PublishJobStatus::Cancelled.to_string();

        // Cancel pending jobs
        sqlx::query!(
            "UPDATE publish_jobs SET status = ?, updated_at = ? WHERE distribution_task_id = ? AND status = 'pending'",
            job_status,
            now,
            task_id
        )
        .execute(&self.pool)
        .await?;

        // Cancel task
        sqlx::query!(
            "UPDATE distribution_tasks SET status = ?, completed_at = ?, updated_at = ? WHERE id = ?",
            task_status,
            now,
            now,
            task_id
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }
}
