//! Browser automation commands

use tauri::State;
use crate::AppState;
use crate::services::browser::{BrowserResponse, PageInfoResponse, SessionInfo};

/// Check if sidecar is running
#[tauri::command]
pub async fn browser_health_check(state: State<'_, AppState>) -> Result<bool, String> {
    let service = state.browser_service.read().await;
    service.health_check().await.map_err(|e| e.to_string())
}

/// Launch browser for an account
#[tauri::command]
pub async fn launch_browser(
    state: State<'_, AppState>,
    account_id: String,
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
        .launch_browser(&account_id, proxy.as_ref(), headless)
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
