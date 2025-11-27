-- Create distribution_tasks table for content distribution jobs
CREATE TABLE IF NOT EXISTS distribution_tasks (
    id TEXT PRIMARY KEY NOT NULL,
    content_id TEXT NOT NULL,
    name TEXT,                                   -- Optional task name
    status TEXT NOT NULL DEFAULT 'pending',      -- 'pending', 'in_progress', 'completed', 'failed', 'cancelled'
    target_accounts TEXT NOT NULL,               -- JSON array of account IDs
    schedule_type TEXT NOT NULL DEFAULT 'immediate', -- 'immediate', 'scheduled'
    scheduled_at INTEGER,                        -- Scheduled publish time (NULL = immediate)
    started_at INTEGER,
    completed_at INTEGER,
    total_jobs INTEGER NOT NULL DEFAULT 0,
    completed_jobs INTEGER NOT NULL DEFAULT 0,
    failed_jobs INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE
);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_distribution_tasks_status ON distribution_tasks(status);
-- Index for scheduled tasks
CREATE INDEX IF NOT EXISTS idx_distribution_tasks_scheduled ON distribution_tasks(scheduled_at) 
    WHERE schedule_type = 'scheduled' AND status = 'pending';
