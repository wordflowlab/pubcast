-- Create contents table for local content cache
CREATE TABLE IF NOT EXISTS contents (
    id TEXT PRIMARY KEY NOT NULL,
    remote_id TEXT UNIQUE,                       -- ID from remote CMS
    title TEXT NOT NULL,
    body TEXT,                                   -- Markdown content
    cover_image_url TEXT,                        -- Cover image URL
    cover_image_local TEXT,                      -- Local cached path
    tags TEXT,                                   -- JSON array of tags
    category TEXT,
    author TEXT,
    source_url TEXT,                             -- Original content URL
    status TEXT NOT NULL DEFAULT 'draft',        -- 'draft', 'ready', 'published', 'deleted'
    remote_status TEXT,                          -- Status from remote system
    remote_updated_at INTEGER,                   -- Last update time from remote
    local_updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    metadata TEXT,                               -- Additional JSON metadata
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Index for remote_id lookups
CREATE INDEX IF NOT EXISTS idx_contents_remote_id ON contents(remote_id);
-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_contents_status ON contents(status);
-- Index for sync ordering
CREATE INDEX IF NOT EXISTS idx_contents_remote_updated ON contents(remote_updated_at);
