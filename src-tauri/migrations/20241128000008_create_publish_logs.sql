-- Create publish_logs table for detailed publish history
CREATE TABLE IF NOT EXISTS publish_logs (
    id TEXT PRIMARY KEY NOT NULL,
    publish_job_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    content_id TEXT NOT NULL,
    content_title TEXT,
    status TEXT NOT NULL,                        -- 'success', 'failed'
    published_url TEXT,
    published_id TEXT,
    duration_ms INTEGER,                         -- Time taken in milliseconds
    error_code TEXT,
    error_message TEXT,
    error_category TEXT,                         -- 'auth', 'rate_limit', 'content', 'network', 'unknown'
    request_log TEXT,                            -- JSON log of requests made
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (publish_job_id) REFERENCES publish_jobs(id) ON DELETE CASCADE
);

-- Index for analytics
CREATE INDEX IF NOT EXISTS idx_publish_logs_account ON publish_logs(account_id, created_at);
CREATE INDEX IF NOT EXISTS idx_publish_logs_platform ON publish_logs(platform, created_at);
CREATE INDEX IF NOT EXISTS idx_publish_logs_status ON publish_logs(status, created_at);
CREATE INDEX IF NOT EXISTS idx_publish_logs_date ON publish_logs(created_at);

-- Create statistics table for aggregated stats
CREATE TABLE IF NOT EXISTS statistics (
    id TEXT PRIMARY KEY NOT NULL,
    stat_date TEXT NOT NULL,                     -- Date in YYYY-MM-DD format
    platform TEXT,                               -- NULL for overall stats
    account_id TEXT,                             -- NULL for platform/overall stats
    total_publishes INTEGER NOT NULL DEFAULT 0,
    successful_publishes INTEGER NOT NULL DEFAULT 0,
    failed_publishes INTEGER NOT NULL DEFAULT 0,
    avg_duration_ms INTEGER,
    error_auth_count INTEGER NOT NULL DEFAULT 0,
    error_rate_limit_count INTEGER NOT NULL DEFAULT 0,
    error_content_count INTEGER NOT NULL DEFAULT 0,
    error_network_count INTEGER NOT NULL DEFAULT 0,
    error_unknown_count INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    UNIQUE(stat_date, platform, account_id)
);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_statistics_date ON statistics(stat_date);
