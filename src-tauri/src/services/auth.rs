//! Auth service for managing platform authorization
//! Handles cookie backup/restore for cross-device migration

use sqlx::{Row, SqlitePool};
use std::time::{SystemTime, UNIX_EPOCH};

use crate::error::Result;
use crate::infrastructure::encryption::EncryptionService;
use crate::models::account::{AuthBackup, AuthStatus};

pub struct AuthService {
    pool: SqlitePool,
    encryption: EncryptionService,
}

impl AuthService {
    pub fn new(pool: SqlitePool, encryption: EncryptionService) -> Self {
        Self { pool, encryption }
    }
    
    fn now() -> i64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64
    }

    /// Update auth status for a platform
    pub async fn update_auth_status(
        &self,
        platform: &str,
        auth_status: AuthStatus,
        profile_id: Option<&str>,
    ) -> Result<()> {
        let now = Self::now();
        
        sqlx::query(
            r#"UPDATE accounts 
               SET auth_status = ?, profile_id = ?, last_auth_sync_at = ?, updated_at = ?
               WHERE platform = ?"#
        )
        .bind(auth_status.to_string())
        .bind(profile_id)
        .bind(now)
        .bind(now)
        .bind(platform)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Backup cookies and fingerprint for an account
    pub async fn backup_auth(
        &self,
        account_id: &str,
        cookies: &serde_json::Value,
        fingerprint: &serde_json::Value,
    ) -> Result<()> {
        let now = Self::now();

        // Encrypt cookies
        let cookies_json = serde_json::to_string(cookies)?;
        let (cookies_encrypted, cookies_nonce) = self.encryption.encrypt(cookies_json.as_bytes())?;

        // Encrypt fingerprint
        let fingerprint_json = serde_json::to_string(fingerprint)?;
        let (fingerprint_encrypted, fingerprint_nonce) = self.encryption.encrypt(fingerprint_json.as_bytes())?;

        sqlx::query(
            r#"UPDATE accounts 
               SET cookies_backup = ?, cookies_nonce = ?,
                   fingerprint_backup = ?, fingerprint_nonce = ?,
                   auth_status = 'authorized', last_auth_sync_at = ?, updated_at = ?
               WHERE id = ?"#
        )
        .bind(&cookies_encrypted)
        .bind(&cookies_nonce)
        .bind(&fingerprint_encrypted)
        .bind(&fingerprint_nonce)
        .bind(now)
        .bind(now)
        .bind(account_id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Restore auth backup for a platform
    pub async fn restore_auth(&self, platform: &str) -> Result<Option<AuthBackup>> {
        let row = sqlx::query(
            r#"SELECT profile_id, cookies_backup, cookies_nonce, 
                      fingerprint_backup, fingerprint_nonce, last_auth_sync_at
               FROM accounts
               WHERE platform = ? AND auth_status = 'authorized'"#
        )
        .bind(platform)
        .fetch_optional(&self.pool)
        .await?;

        match row {
            Some(r) => {
                let profile_id: Option<String> = r.get("profile_id");
                let cookies_backup: Option<Vec<u8>> = r.get("cookies_backup");
                let cookies_nonce: Option<Vec<u8>> = r.get("cookies_nonce");
                let fingerprint_backup: Option<Vec<u8>> = r.get("fingerprint_backup");
                let fingerprint_nonce: Option<Vec<u8>> = r.get("fingerprint_nonce");
                let last_auth_sync_at: Option<i64> = r.get("last_auth_sync_at");

                // Check if we have backup data
                let cookies = match (cookies_backup, cookies_nonce) {
                    (Some(encrypted), Some(nonce)) => {
                        let decrypted = self.encryption.decrypt(&encrypted, &nonce)?;
                        serde_json::from_slice(&decrypted)?
                    }
                    _ => return Ok(None),
                };

                let fingerprint = match (fingerprint_backup, fingerprint_nonce) {
                    (Some(encrypted), Some(nonce)) => {
                        let decrypted = self.encryption.decrypt(&encrypted, &nonce)?;
                        serde_json::from_slice(&decrypted)?
                    }
                    _ => serde_json::json!({}),
                };

                Ok(Some(AuthBackup {
                    platform: platform.to_string(),
                    profile_id: profile_id.unwrap_or_else(|| platform.to_string()),
                    cookies,
                    fingerprint,
                    exported_at: last_auth_sync_at.unwrap_or(0),
                }))
            }
            None => Ok(None),
        }
    }

    /// Export all auth backups for migration
    pub async fn export_all_auth(&self) -> Result<Vec<AuthBackup>> {
        let rows = sqlx::query(
            r#"SELECT platform, profile_id, cookies_backup, cookies_nonce,
                      fingerprint_backup, fingerprint_nonce, last_auth_sync_at
               FROM accounts
               WHERE auth_status = 'authorized' AND cookies_backup IS NOT NULL"#
        )
        .fetch_all(&self.pool)
        .await?;

        let mut backups = Vec::new();

        for r in rows {
            let platform: String = r.get("platform");
            let profile_id: Option<String> = r.get("profile_id");
            let cookies_backup: Option<Vec<u8>> = r.get("cookies_backup");
            let cookies_nonce: Option<Vec<u8>> = r.get("cookies_nonce");
            let fingerprint_backup: Option<Vec<u8>> = r.get("fingerprint_backup");
            let fingerprint_nonce: Option<Vec<u8>> = r.get("fingerprint_nonce");
            let last_auth_sync_at: Option<i64> = r.get("last_auth_sync_at");

            if let (Some(cookies_enc), Some(cookies_nonce)) = (cookies_backup, cookies_nonce) {
                let cookies_decrypted = self.encryption.decrypt(&cookies_enc, &cookies_nonce)?;
                let cookies: serde_json::Value = serde_json::from_slice(&cookies_decrypted)?;

                let fingerprint = match (fingerprint_backup, fingerprint_nonce) {
                    (Some(fp_enc), Some(fp_nonce)) => {
                        let fp_decrypted = self.encryption.decrypt(&fp_enc, &fp_nonce)?;
                        serde_json::from_slice(&fp_decrypted)?
                    }
                    _ => serde_json::json!({}),
                };

                backups.push(AuthBackup {
                    platform,
                    profile_id: profile_id.unwrap_or_default(),
                    cookies,
                    fingerprint,
                    exported_at: last_auth_sync_at.unwrap_or(0),
                });
            }
        }

        Ok(backups)
    }

    /// Import auth backups from another device
    pub async fn import_auth(&self, backup: &AuthBackup) -> Result<()> {
        // First check if account exists, if not create it
        let existing = sqlx::query("SELECT id FROM accounts WHERE platform = ?")
            .bind(&backup.platform)
            .fetch_optional(&self.pool)
            .await?;

        if existing.is_none() {
            // Create new account
            let id = uuid::Uuid::new_v4().to_string();
            let now = Self::now();

            sqlx::query(
                r#"INSERT INTO accounts (id, platform, name, status, created_at, updated_at)
                   VALUES (?, ?, ?, 'unknown', ?, ?)"#
            )
            .bind(&id)
            .bind(&backup.platform)
            .bind(&backup.platform)
            .bind(now)
            .bind(now)
            .execute(&self.pool)
            .await?;
        }

        // Now backup the auth data
        self.backup_auth(&backup.platform, &backup.cookies, &backup.fingerprint).await?;

        // Update profile_id
        sqlx::query("UPDATE accounts SET profile_id = ? WHERE platform = ?")
            .bind(&backup.profile_id)
            .bind(&backup.platform)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    /// Get auth status for a platform
    pub async fn get_auth_status(&self, platform: &str) -> Result<AuthStatus> {
        let row = sqlx::query("SELECT auth_status FROM accounts WHERE platform = ?")
            .bind(platform)
            .fetch_optional(&self.pool)
            .await?;

        match row {
            Some(r) => {
                let auth_status: Option<String> = r.get("auth_status");
                let status: AuthStatus = auth_status
                    .unwrap_or_else(|| "none".to_string())
                    .parse()
                    .unwrap_or(AuthStatus::None);
                Ok(status)
            }
            None => Ok(AuthStatus::None),
        }
    }

    /// Clear auth for a platform
    pub async fn clear_auth(&self, platform: &str) -> Result<()> {
        let now = Self::now();

        sqlx::query(
            r#"UPDATE accounts 
               SET auth_status = 'none', 
                   cookies_backup = NULL, cookies_nonce = NULL,
                   fingerprint_backup = NULL, fingerprint_nonce = NULL,
                   profile_id = NULL, last_auth_sync_at = NULL,
                   updated_at = ?
               WHERE platform = ?"#
        )
        .bind(now)
        .bind(platform)
        .execute(&self.pool)
        .await?;

        Ok(())
    }
}
