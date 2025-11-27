-- Create encryption_metadata table for encryption key management
CREATE TABLE IF NOT EXISTS encryption_metadata (
    id TEXT PRIMARY KEY NOT NULL,
    key_id TEXT NOT NULL UNIQUE,                 -- Unique key identifier
    salt BLOB NOT NULL,                          -- Argon2id salt
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    rotated_at INTEGER,                          -- Last key rotation time
    version INTEGER NOT NULL DEFAULT 1
);

-- Create content_sync_status table for remote API sync tracking
CREATE TABLE IF NOT EXISTS content_sync_status (
    id TEXT PRIMARY KEY NOT NULL,
    api_endpoint TEXT NOT NULL UNIQUE,           -- Remote API base URL
    last_sync_at INTEGER,
    last_sync_cursor TEXT,                       -- Cursor for incremental sync
    sync_status TEXT NOT NULL DEFAULT 'idle',    -- 'idle', 'syncing', 'error'
    total_synced INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    last_error_at INTEGER,
    config_json TEXT,                            -- API configuration JSON
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Create app_settings table for application settings
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Insert default settings
INSERT OR IGNORE INTO app_settings (key, value) VALUES
    ('sync_interval_minutes', '30'),
    ('max_concurrent_publishes', '3'),
    ('default_retry_count', '3'),
    ('proxy_health_check_interval_minutes', '30');
