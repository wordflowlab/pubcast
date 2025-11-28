//! Browser automation commands

use tauri::State;
use crate::AppState;
use crate::services::browser::{BrowserResponse, PageInfoResponse, SessionInfo};

const SIDECAR_URL: &str = "http://localhost:8857";

/// Check if sidecar is running (independent of AppState)
#[tauri::command]
pub async fn browser_health_check() -> Result<bool, String> {
    let client = reqwest::Client::new();
    match client.get(format!("{}/health", SIDECAR_URL)).send().await {
        Ok(resp) => Ok(resp.status().is_success()),
        Err(_) => Ok(false),
    }
}

/// Launch browser for an account
#[tauri::command]
pub async fn launch_browser(
    state: State<'_, AppState>,
    account_id: String,
    platform_id: String,
    proxy_id: Option<String>,
    headless: bool,
) -> Result<BrowserResponse, String> {
    // Get proxy if specified
    let proxy = if let Some(pid) = proxy_id {
        let proxy_service = state.proxy_service.read().await;
        Some(proxy_service.get_proxy(&pid).await.map_err(|e| e.to_string())?)
    } else {
        None
    };

    let browser_service = state.browser_service.read().await;
    browser_service
        .launch_browser(&account_id, &platform_id, proxy.as_ref(), headless)
        .await
        .map_err(|e| e.to_string())
}

/// Navigate to URL
#[tauri::command]
pub async fn browser_navigate(
    state: State<'_, AppState>,
    account_id: String,
    url: String,
) -> Result<BrowserResponse, String> {
    let service = state.browser_service.read().await;
    service.navigate(&account_id, &url).await.map_err(|e| e.to_string())
}

/// Get page info
#[tauri::command]
pub async fn browser_get_page_info(
    state: State<'_, AppState>,
    account_id: String,
) -> Result<PageInfoResponse, String> {
    let service = state.browser_service.read().await;
    service.get_page_info(&account_id).await.map_err(|e| e.to_string())
}

/// Save browser session
#[tauri::command]
pub async fn browser_save_session(
    state: State<'_, AppState>,
    account_id: String,
) -> Result<BrowserResponse, String> {
    let service = state.browser_service.read().await;
    service.save_session(&account_id).await.map_err(|e| e.to_string())
}

/// Close browser
#[tauri::command]
pub async fn browser_close(
    state: State<'_, AppState>,
    account_id: String,
) -> Result<BrowserResponse, String> {
    let service = state.browser_service.read().await;
    service.close_browser(&account_id).await.map_err(|e| e.to_string())
}

/// Get all active browser sessions
#[tauri::command]
pub async fn browser_get_sessions(
    state: State<'_, AppState>,
) -> Result<Vec<SessionInfo>, String> {
    let service = state.browser_service.read().await;
    service.get_sessions().await.map_err(|e| e.to_string())
}

/// Close all browsers
#[tauri::command]
pub async fn browser_close_all(
    state: State<'_, AppState>,
) -> Result<BrowserResponse, String> {
    let service = state.browser_service.read().await;
    service.close_all().await.map_err(|e| e.to_string())
}

/// Get login state from sidecar (cached from login watcher)
#[tauri::command]
pub async fn browser_get_login_state(account_id: String) -> Result<LoginStateResponse, String> {
    let client = reqwest::Client::new();
    let url = format!("{}/browser/{}/login-state", SIDECAR_URL, account_id);
    
    match client.get(&url).send().await {
        Ok(resp) => {
            if resp.status().is_success() {
                resp.json().await.map_err(|e| e.to_string())
            } else {
                Ok(LoginStateResponse {
                    success: false,
                    account_id: Some(account_id),
                    is_logged_in: false,
                    login_detected_at: None,
                    error: Some("Failed to get login state".to_string()),
                })
            }
        }
        Err(e) => Ok(LoginStateResponse {
            success: false,
            account_id: Some(account_id),
            is_logged_in: false,
            login_detected_at: None,
            error: Some(e.to_string()),
        }),
    }
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginStateResponse {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub account_id: Option<String>,
    #[serde(default)]
    pub is_logged_in: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub login_detected_at: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}
