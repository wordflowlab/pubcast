-- Create browser_sessions table for browser automation sessions
CREATE TABLE IF NOT EXISTS browser_sessions (
    id TEXT PRIMARY KEY NOT NULL,
    account_id TEXT NOT NULL UNIQUE,
    cookies_encrypted BLOB,                      -- AES encrypted cookies JSON
    cookies_nonce BLOB,
    local_storage_encrypted BLOB,                -- AES encrypted local storage
    local_storage_nonce BLOB,
    fingerprint TEXT,                            -- JSON fingerprint configuration
    user_agent TEXT,
    viewport_width INTEGER,
    viewport_height INTEGER,
    timezone TEXT,
    locale TEXT,
    last_used_at INTEGER,
    expires_at INTEGER,                          -- Session expiration time
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);
