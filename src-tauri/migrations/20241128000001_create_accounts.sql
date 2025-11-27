-- Create accounts table for platform account management
CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY NOT NULL,
    platform TEXT NOT NULL,                      -- 'wechat', 'xiaohongshu', etc.
    name TEXT NOT NULL,                          -- Display name
    username TEXT,                               -- Platform username if applicable
    credentials_encrypted BLOB,                  -- AES-256-GCM encrypted credentials
    credentials_nonce BLOB,                      -- Encryption nonce
    status TEXT NOT NULL DEFAULT 'unknown',      -- 'active', 'expired', 'error', 'unknown'
    last_login_at INTEGER,                       -- Last successful login timestamp
    last_check_at INTEGER,                       -- Last status check timestamp
    error_message TEXT,                          -- Last error message if any
    metadata TEXT,                               -- JSON metadata (avatar_url, etc.)
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Index for platform filtering
CREATE INDEX IF NOT EXISTS idx_accounts_platform ON accounts(platform);
-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status);
