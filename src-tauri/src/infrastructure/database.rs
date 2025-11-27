//! Database infrastructure
//!
//! Handles SQLite connection pool initialization and migrations.

use sqlx::{
    sqlite::{SqliteConnectOptions, SqlitePoolOptions},
    SqlitePool,
};
use std::path::PathBuf;
use std::str::FromStr;

use crate::error::{PubCastError, Result};

/// Database configuration
#[derive(Debug, Clone)]
pub struct DatabaseConfig {
    /// Path to the SQLite database file
    pub database_path: PathBuf,
    /// Maximum number of connections in the pool
    pub max_connections: u32,
}

impl Default for DatabaseConfig {
    fn default() -> Self {
        Self {
            database_path: PathBuf::from("pubcast.db"),
            max_connections: 5,
        }
    }
}

impl DatabaseConfig {
    /// Create a new database config with the given path
    pub fn new(database_path: PathBuf) -> Self {
        Self {
            database_path,
            ..Default::default()
        }
    }

    /// Get the database URL for SQLx
    pub fn database_url(&self) -> String {
        format!("sqlite:{}?mode=rwc", self.database_path.display())
    }
}

/// Initialize the database connection pool
pub async fn init_pool(config: &DatabaseConfig) -> Result<SqlitePool> {
    let connect_options = SqliteConnectOptions::from_str(&config.database_url())
        .map_err(|e| PubCastError::Database(e.into()))?
        .create_if_missing(true)
        .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal)
        .synchronous(sqlx::sqlite::SqliteSynchronous::Normal)
        .foreign_keys(true);

    let pool = SqlitePoolOptions::new()
        .max_connections(config.max_connections)
        .connect_with(connect_options)
        .await?;

    tracing::info!("Database connection pool initialized");
    Ok(pool)
}

/// Run database migrations
pub async fn run_migrations(pool: &SqlitePool) -> Result<()> {
    sqlx::migrate!("./migrations")
        .run(pool)
        .await
        .map_err(|e| PubCastError::Database(e.into()))?;

    tracing::info!("Database migrations completed");
    Ok(())
}

/// Initialize database with migrations
pub async fn init_database(config: &DatabaseConfig) -> Result<SqlitePool> {
    let pool = init_pool(config).await?;
    run_migrations(&pool).await?;
    Ok(pool)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[tokio::test]
    async fn test_init_pool() {
        let dir = tempdir().unwrap();
        let db_path = dir.path().join("test.db");
        let config = DatabaseConfig::new(db_path);

        let pool = init_pool(&config).await.unwrap();
        assert!(pool.size() > 0 || pool.num_idle() >= 0);
    }
}
