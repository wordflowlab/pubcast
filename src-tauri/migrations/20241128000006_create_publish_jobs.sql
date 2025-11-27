-- Create publish_jobs table for individual publish jobs
CREATE TABLE IF NOT EXISTS publish_jobs (
    id TEXT PRIMARY KEY NOT NULL,
    distribution_task_id TEXT NOT NULL,
    content_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',      -- 'pending', 'running', 'success', 'failed', 'cancelled'
    priority INTEGER NOT NULL DEFAULT 0,         -- Higher = more priority
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    scheduled_at INTEGER,
    started_at INTEGER,
    completed_at INTEGER,
    published_url TEXT,                          -- URL of published content
    published_id TEXT,                           -- Platform-specific published ID
    error_code TEXT,
    error_message TEXT,
    metadata TEXT,                               -- JSON metadata
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (distribution_task_id) REFERENCES distribution_tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

-- Index for status and scheduling
CREATE INDEX IF NOT EXISTS idx_publish_jobs_status ON publish_jobs(status);
CREATE INDEX IF NOT EXISTS idx_publish_jobs_account ON publish_jobs(account_id, status);
CREATE INDEX IF NOT EXISTS idx_publish_jobs_pending ON publish_jobs(scheduled_at, priority DESC) 
    WHERE status = 'pending';
