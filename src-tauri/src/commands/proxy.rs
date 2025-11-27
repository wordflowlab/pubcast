//! Proxy management Tauri commands

use tauri::State;

use crate::error::PubCastError;
use crate::models::{CreateProxyRequest, Proxy, ProxyHealthResult};
use crate::AppState;

/// List all proxies
#[tauri::command]
pub async fn list_proxies(state: State<'_, AppState>) -> Result<Vec<Proxy>, String> {
    let service = state.proxy_service.read().await;
    service.list_proxies().await.map_err(|e| e.to_string())
}

/// Get a single proxy by ID
#[tauri::command]
pub async fn get_proxy(state: State<'_, AppState>, id: String) -> Result<Proxy, String> {
    let service = state.proxy_service.read().await;
    service.get_proxy(&id).await.map_err(|e| e.to_string())
}

/// Add a new proxy
#[tauri::command]
pub async fn add_proxy(
    state: State<'_, AppState>,
    protocol: String,
    host: String,
    port: u16,
    username: Option<String>,
    password: Option<String>,
) -> Result<Proxy, String> {
    let protocol = protocol
        .parse()
        .map_err(|e: String| PubCastError::Validation(e).to_string())?;

    let req = CreateProxyRequest {
        protocol,
        host,
        port,
        username,
        password,
    };

    let service = state.proxy_service.read().await;
    service.create_proxy(req).await.map_err(|e| e.to_string())
}

/// Delete a proxy
#[tauri::command]
pub async fn delete_proxy(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let service = state.proxy_service.read().await;
    service.delete_proxy(&id).await.map_err(|e| e.to_string())
}

/// Check proxy health
#[tauri::command]
pub async fn check_proxy(
    state: State<'_, AppState>,
    id: String,
) -> Result<ProxyHealthResult, String> {
    let service = state.proxy_service.read().await;
    service
        .check_proxy_health(&id)
        .await
        .map_err(|e| e.to_string())
}

/// Import proxies from text
#[tauri::command]
pub async fn import_proxies(
    state: State<'_, AppState>,
    text: String,
) -> Result<Vec<Proxy>, String> {
    let service = state.proxy_service.read().await;
    service
        .import_proxies(&text)
        .await
        .map_err(|e| e.to_string())
}
