-- Create proxies table for proxy pool management
CREATE TABLE IF NOT EXISTS proxies (
    id TEXT PRIMARY KEY NOT NULL,
    protocol TEXT NOT NULL,                      -- 'http', 'https', 'socks5'
    host TEXT NOT NULL,
    port INTEGER NOT NULL,
    username TEXT,
    password_encrypted BLOB,                     -- AES encrypted
    password_nonce BLOB,
    status TEXT NOT NULL DEFAULT 'unknown',      -- 'healthy', 'unhealthy', 'unknown'
    last_check_at INTEGER,
    last_check_ip TEXT,                          -- Detected exit IP
    last_check_location TEXT,                    -- Geo location (country, city)
    fail_count INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Create account_proxy table for account-proxy associations
CREATE TABLE IF NOT EXISTS account_proxy (
    account_id TEXT NOT NULL,
    proxy_id TEXT,                               -- NULL means use proxy pool
    strategy TEXT NOT NULL DEFAULT 'fixed',      -- 'fixed', 'round_robin', 'random'
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    PRIMARY KEY (account_id),
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (proxy_id) REFERENCES proxies(id) ON DELETE SET NULL
);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_proxies_status ON proxies(status);
