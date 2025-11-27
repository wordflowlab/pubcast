-- Create platform_configs table for platform-specific configurations
CREATE TABLE IF NOT EXISTS platform_configs (
    id TEXT PRIMARY KEY NOT NULL,
    platform TEXT NOT NULL UNIQUE,               -- 'wechat', 'xiaohongshu', etc.
    display_name TEXT NOT NULL,                  -- Display name in UI
    enabled INTEGER NOT NULL DEFAULT 1,          -- Whether platform is enabled
    max_title_length INTEGER,                    -- Max title length (NULL = unlimited)
    max_content_length INTEGER,                  -- Max content length
    supported_media_types TEXT,                  -- JSON array of supported types
    rate_limit_per_hour INTEGER,                 -- Max publishes per hour
    requires_review INTEGER NOT NULL DEFAULT 0,  -- Whether content goes through review
    login_url TEXT,                              -- Platform login URL
    config_json TEXT,                            -- Platform-specific config JSON
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Insert default platform configurations
INSERT OR IGNORE INTO platform_configs (id, platform, display_name, max_title_length, max_content_length, supported_media_types)
VALUES 
    ('wechat', 'wechat', '微信公众号', 64, 20000, '["image", "video"]'),
    ('xiaohongshu', 'xiaohongshu', '小红书', 20, 1000, '["image", "video"]');
