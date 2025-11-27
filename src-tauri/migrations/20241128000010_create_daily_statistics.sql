-- Daily statistics table
CREATE TABLE IF NOT EXISTS daily_statistics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stat_date TEXT NOT NULL,
    platform TEXT NOT NULL,
    account_id TEXT,
    total_publishes INTEGER NOT NULL DEFAULT 0,
    successful_publishes INTEGER NOT NULL DEFAULT 0,
    failed_publishes INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    UNIQUE(stat_date, platform, account_id)
);

CREATE INDEX IF NOT EXISTS idx_daily_statistics_date ON daily_statistics(stat_date);
CREATE INDEX IF NOT EXISTS idx_daily_statistics_platform ON daily_statistics(platform);
