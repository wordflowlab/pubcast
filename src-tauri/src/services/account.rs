//! Account management service

use sqlx::SqlitePool;
use uuid::Uuid;

use crate::error::{PubCastError, Result};
use crate::infrastructure::encryption::EncryptionService;
use crate::models::{Account, AccountStatus, AuthStatus, CreateAccountRequest, UpdateAccountRequest};

/// Account management service
pub struct AccountService {
    pool: SqlitePool,
    encryption: EncryptionService,
}

impl AccountService {
    /// Create a new account service
    pub fn new(pool: SqlitePool, encryption: EncryptionService) -> Self {
        Self { pool, encryption }
    }

    /// List all accounts
    pub async fn list_accounts(&self) -> Result<Vec<Account>> {
        let rows = sqlx::query!(
            r#"
            SELECT id, platform, name, username, status,
                   last_login_at, last_check_at, error_message,
                   metadata, created_at, updated_at
            FROM accounts
            ORDER BY created_at DESC
            "#
        )
        .fetch_all(&self.pool)
        .await?;

        let accounts = rows
            .into_iter()
            .map(|row| Account {
                id: row.id,
                platform: row.platform,
                name: row.name,
                username: row.username,
                status: row.status.parse().unwrap_or(AccountStatus::Unknown),
                last_login_at: row.last_login_at,
                last_check_at: row.last_check_at,
                error_message: row.error_message,
                metadata: row.metadata.as_ref().and_then(|m| serde_json::from_str(m).ok()),
                created_at: row.created_at,
                updated_at: row.updated_at,
                auth_status: AuthStatus::default(),
                profile_id: None,
                last_auth_sync_at: None,
            })
            .collect();

        Ok(accounts)
    }

    /// Get accounts by platform
    pub async fn list_accounts_by_platform(&self, platform: &str) -> Result<Vec<Account>> {
        let rows = sqlx::query!(
            r#"
            SELECT id, platform, name, username, status,
                   last_login_at, last_check_at, error_message,
                   metadata, created_at, updated_at
            FROM accounts
            WHERE platform = ?
            ORDER BY created_at DESC
            "#,
            platform
        )
        .fetch_all(&self.pool)
        .await?;

        let accounts = rows
            .into_iter()
            .map(|row| Account {
                id: row.id,
                platform: row.platform,
                name: row.name,
                username: row.username,
                status: row.status.parse().unwrap_or(AccountStatus::Unknown),
                last_login_at: row.last_login_at,
                last_check_at: row.last_check_at,
                error_message: row.error_message,
                metadata: row.metadata.as_ref().and_then(|m| serde_json::from_str(m).ok()),
                created_at: row.created_at,
                updated_at: row.updated_at,
                auth_status: AuthStatus::default(),
                profile_id: None,
                last_auth_sync_at: None,
            })
            .collect();

        Ok(accounts)
    }

    /// Get an account by ID
    pub async fn get_account(&self, id: &str) -> Result<Account> {
        let row = sqlx::query!(
            r#"
            SELECT id, platform, name, username, status,
                   last_login_at, last_check_at, error_message,
                   metadata, created_at, updated_at
            FROM accounts WHERE id = ?
            "#,
            id
        )
        .fetch_optional(&self.pool)
        .await?
        .ok_or_else(|| PubCastError::NotFound(format!("Account not found: {}", id)))?;

        Ok(Account {
            id: row.id,
            platform: row.platform,
            name: row.name,
            username: row.username,
            status: row.status.parse().unwrap_or(AccountStatus::Unknown),
            last_login_at: row.last_login_at,
            last_check_at: row.last_check_at,
            error_message: row.error_message,
            metadata: row.metadata.as_ref().and_then(|m| serde_json::from_str(m).ok()),
            created_at: row.created_at,
            updated_at: row.updated_at,
            auth_status: AuthStatus::default(),
            profile_id: None,
            last_auth_sync_at: None,
        })
    }

    /// Create a new account
    pub async fn create_account(&self, req: CreateAccountRequest) -> Result<Account> {
        let id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp();

        // Encrypt credentials if provided
        let (credentials_encrypted, credentials_nonce): (Option<Vec<u8>>, Option<Vec<u8>>) =
            if let Some(credentials) = &req.credentials {
                let json = serde_json::to_string(credentials)?;
                let (encrypted, nonce) = self.encryption.encrypt(json.as_bytes())?;
                (Some(encrypted), Some(nonce))
            } else {
                (None, None)
            };

        let status = AccountStatus::Unknown.to_string();

        sqlx::query!(
            r#"
            INSERT INTO accounts (id, platform, name, username, credentials_encrypted, credentials_nonce, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
            id,
            req.platform,
            req.name,
            req.username,
            credentials_encrypted,
            credentials_nonce,
            status,
            now,
            now
        )
        .execute(&self.pool)
        .await?;

        self.get_account(&id).await
    }

    /// Update an account
    pub async fn update_account(&self, id: &str, req: UpdateAccountRequest) -> Result<Account> {
        let now = chrono::Utc::now().timestamp();

        // Get existing account first
        let existing = self.get_account(id).await?;

        let name = req.name.unwrap_or(existing.name);
        let username = req.username.or(existing.username);
        let status = req.status.unwrap_or(existing.status).to_string();

        // Handle credentials update
        if let Some(credentials) = &req.credentials {
            let json = serde_json::to_string(credentials)?;
            let (encrypted, nonce) = self.encryption.encrypt(json.as_bytes())?;

            sqlx::query!(
                r#"
                UPDATE accounts
                SET name = ?, username = ?, status = ?, 
                    credentials_encrypted = ?, credentials_nonce = ?,
                    updated_at = ?
                WHERE id = ?
                "#,
                name,
                username,
                status,
                encrypted,
                nonce,
                now,
                id
            )
            .execute(&self.pool)
            .await?;
        } else {
            sqlx::query!(
                r#"
                UPDATE accounts
                SET name = ?, username = ?, status = ?, updated_at = ?
                WHERE id = ?
                "#,
                name,
                username,
                status,
                now,
                id
            )
            .execute(&self.pool)
            .await?;
        }

        self.get_account(id).await
    }

    /// Delete an account
    pub async fn delete_account(&self, id: &str) -> Result<()> {
        let result = sqlx::query!("DELETE FROM accounts WHERE id = ?", id)
            .execute(&self.pool)
            .await?;

        if result.rows_affected() == 0 {
            return Err(PubCastError::NotFound(format!("Account not found: {}", id)));
        }

        Ok(())
    }

    /// Update account status
    pub async fn update_account_status(
        &self,
        id: &str,
        status: AccountStatus,
        error_message: Option<String>,
    ) -> Result<()> {
        let now = chrono::Utc::now().timestamp();
        let status_str = status.to_string();

        sqlx::query!(
            r#"
            UPDATE accounts
            SET status = ?, error_message = ?, last_check_at = ?, updated_at = ?
            WHERE id = ?
            "#,
            status_str,
            error_message,
            now,
            now,
            id
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Update last login time
    pub async fn update_last_login(&self, id: &str) -> Result<()> {
        let now = chrono::Utc::now().timestamp();

        sqlx::query!(
            r#"
            UPDATE accounts
            SET last_login_at = ?, status = 'active', error_message = NULL, updated_at = ?
            WHERE id = ?
            "#,
            now,
            now,
            id
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Get decrypted credentials for an account
    pub async fn get_credentials(&self, id: &str) -> Result<Option<serde_json::Value>> {
        let row = sqlx::query!(
            "SELECT credentials_encrypted, credentials_nonce FROM accounts WHERE id = ?",
            id
        )
        .fetch_optional(&self.pool)
        .await?
        .ok_or_else(|| PubCastError::NotFound(format!("Account not found: {}", id)))?;

        match (&row.credentials_encrypted, &row.credentials_nonce) {
            (Some(encrypted), Some(nonce)) => {
                let decrypted = self.encryption.decrypt(encrypted, nonce)?;
                let json: serde_json::Value = serde_json::from_slice(&decrypted)?;
                Ok(Some(json))
            }
            _ => Ok(None),
        }
    }
}
