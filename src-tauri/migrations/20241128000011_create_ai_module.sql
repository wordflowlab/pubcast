-- AI Platform Configurations
CREATE TABLE IF NOT EXISTS ai_configs (
    id TEXT PRIMARY KEY,
    platform TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'inactive', -- active, inactive, expired
    auth_data TEXT, -- JSON encrypted credentials or token
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- AI Check Logs
CREATE TABLE IF NOT EXISTS ai_check_logs (
    id TEXT PRIMARY KEY,
    platform TEXT NOT NULL,
    status TEXT NOT NULL, -- success, failed, running
    message TEXT,
    duration_ms INTEGER,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_ai_check_logs_created_at ON ai_check_logs(created_at DESC);
