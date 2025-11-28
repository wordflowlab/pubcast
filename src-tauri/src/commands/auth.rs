//! Auth commands for managing platform authorization and cross-device migration

use serde::{Deserialize, Serialize};
use tauri::State;
use crate::AppState;
use crate::models::account::{AuthBackup, AuthStatus};

/// Response for auth operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthResponse {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// Sync auth from browser session to database
#[tauri::command]
pub async fn sync_auth_from_browser(
    state: State<'_, AppState>,
    platform: String,
) -> Result<AuthResponse, String> {
    // First get cookies and fingerprint from sidecar
    let browser_service = state.browser_service.read().await;
    
    // Get session info to check if browser is running
    let sessions = browser_service.get_sessions().await.map_err(|e| e.to_string())?;
    let has_session = sessions.iter().any(|s| s.account_id == platform);
    
    if !has_session {
        return Ok(AuthResponse {
            success: false,
            error: Some("No active browser session for this platform".to_string()),
        });
    }

    // Save session to file first
    browser_service.save_session(&platform).await.map_err(|e| e.to_string())?;

    // Now fetch the saved cookies and fingerprint from sidecar
    let client = reqwest::Client::new();
    let base_url = "http://localhost:8857";
    
    // Get cookies
    let cookies_resp = client
        .get(format!("{}/platforms/{}/cookies", base_url, platform))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    
    let cookies: serde_json::Value = if cookies_resp.status().is_success() {
        cookies_resp.json().await.map_err(|e| e.to_string())?
    } else {
        serde_json::json!([])
    };

    // Get fingerprint
    let fp_resp = client
        .get(format!("{}/platforms/{}/fingerprint", base_url, platform))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    
    let fingerprint: serde_json::Value = if fp_resp.status().is_success() {
        fp_resp.json().await.map_err(|e| e.to_string())?
    } else {
        serde_json::json!({})
    };

    // Save to database
    let auth_service = state.auth_service.read().await;
    auth_service
        .backup_auth(&platform, &cookies, &fingerprint)
        .await
        .map_err(|e| e.to_string())?;

    Ok(AuthResponse {
        success: true,
        error: None,
    })
}

/// Update auth status for a platform
#[tauri::command]
pub async fn update_auth_status(
    state: State<'_, AppState>,
    platform: String,
    auth_status: String,
) -> Result<AuthResponse, String> {
    let status: AuthStatus = auth_status.parse().map_err(|e: String| e)?;
    
    let auth_service = state.auth_service.read().await;
    auth_service
        .update_auth_status(&platform, status, Some(&platform))
        .await
        .map_err(|e| e.to_string())?;

    Ok(AuthResponse {
        success: true,
        error: None,
    })
}

/// Get auth status for a platform
#[tauri::command]
pub async fn get_auth_status(
    state: State<'_, AppState>,
    platform: String,
) -> Result<String, String> {
    let auth_service = state.auth_service.read().await;
    let status = auth_service
        .get_auth_status(&platform)
        .await
        .map_err(|e| e.to_string())?;
    
    Ok(status.to_string())
}

/// Export all auth backups for migration
#[tauri::command]
pub async fn export_auth_backups(
    state: State<'_, AppState>,
) -> Result<Vec<AuthBackup>, String> {
    let auth_service = state.auth_service.read().await;
    auth_service
        .export_all_auth()
        .await
        .map_err(|e| e.to_string())
}

/// Import auth backup from another device
#[tauri::command]
pub async fn import_auth_backup(
    state: State<'_, AppState>,
    backup: AuthBackup,
) -> Result<AuthResponse, String> {
    let auth_service = state.auth_service.read().await;
    auth_service
        .import_auth(&backup)
        .await
        .map_err(|e| e.to_string())?;

    Ok(AuthResponse {
        success: true,
        error: None,
    })
}

/// Clear auth for a platform
#[tauri::command]
pub async fn clear_auth(
    state: State<'_, AppState>,
    platform: String,
) -> Result<AuthResponse, String> {
    let auth_service = state.auth_service.read().await;
    auth_service
        .clear_auth(&platform)
        .await
        .map_err(|e| e.to_string())?;

    Ok(AuthResponse {
        success: true,
        error: None,
    })
}

/// Restore auth backup to browser (restore cookies/fingerprint to sidecar)
#[tauri::command]
pub async fn restore_auth_to_browser(
    state: State<'_, AppState>,
    platform: String,
) -> Result<AuthResponse, String> {
    // Get backup from database
    let auth_service = state.auth_service.read().await;
    let backup = auth_service
        .restore_auth(&platform)
        .await
        .map_err(|e| e.to_string())?;

    match backup {
        Some(b) => {
            // Send to sidecar to restore
            let client = reqwest::Client::new();
            let base_url = "http://localhost:8857";
            
            let resp = client
                .post(format!("{}/platforms/{}/restore", base_url, platform))
                .json(&serde_json::json!({
                    "cookies": b.cookies,
                    "fingerprint": b.fingerprint,
                }))
                .send()
                .await
                .map_err(|e| e.to_string())?;

            if resp.status().is_success() {
                Ok(AuthResponse {
                    success: true,
                    error: None,
                })
            } else {
                Ok(AuthResponse {
                    success: false,
                    error: Some("Failed to restore to browser".to_string()),
                })
            }
        }
        None => Ok(AuthResponse {
            success: false,
            error: Some("No backup found for this platform".to_string()),
        }),
    }
}
