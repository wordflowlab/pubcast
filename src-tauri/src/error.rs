//! Error types for PubCast
//!
//! This module defines custom error types used throughout the application.

use thiserror::Error;

/// Main error type for PubCast operations
#[derive(Error, Debug)]
pub enum PubCastError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("HTTP request error: {0}")]
    Http(#[from] reqwest::Error),

    #[error("Encryption error: {0}")]
    Encryption(String),

    #[error("Keychain error: {0}")]
    Keychain(#[from] keyring::Error),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("Platform adapter error: {0}")]
    PlatformAdapter(String),

    #[error("Browser automation error: {0}")]
    BrowserAutomation(String),

    #[error("Configuration error: {0}")]
    Configuration(String),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Validation error: {0}")]
    Validation(String),

    #[error("Network error: {0}")]
    Network(String),
}

/// Result type alias for PubCast operations
pub type Result<T> = std::result::Result<T, PubCastError>;

/// Convert PubCastError to a serializable format for Tauri
impl serde::Serialize for PubCastError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
