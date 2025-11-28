-- Add auth backup fields for cross-device migration
-- Stores encrypted cookies and fingerprint for account migration

-- Auth status: 'authorized', 'expired', 'none'
ALTER TABLE accounts ADD COLUMN auth_status TEXT NOT NULL DEFAULT 'none';

-- Encrypted cookies backup (JSON format, encrypted with AES-256-GCM)
ALTER TABLE accounts ADD COLUMN cookies_backup BLOB;
ALTER TABLE accounts ADD COLUMN cookies_nonce BLOB;

-- Encrypted fingerprint backup (JSON format, encrypted with AES-256-GCM)
ALTER TABLE accounts ADD COLUMN fingerprint_backup BLOB;
ALTER TABLE accounts ADD COLUMN fingerprint_nonce BLOB;

-- Profile directory identifier
ALTER TABLE accounts ADD COLUMN profile_id TEXT;

-- Last auth sync timestamp
ALTER TABLE accounts ADD COLUMN last_auth_sync_at INTEGER;

-- Index for auth status filtering
CREATE INDEX IF NOT EXISTS idx_accounts_auth_status ON accounts(auth_status);
