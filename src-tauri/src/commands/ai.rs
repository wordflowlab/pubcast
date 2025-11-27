//! AI module commands

use tauri::State;
use crate::AppState;
use crate::models::ai::{AIConfig, AICheckLog};

/// List all AI configurations
#[tauri::command]
pub async fn list_ai_configs(state: State<'_, AppState>) -> Result<Vec<AIConfig>, String> {
    let service = state.ai_service.read().await;
    service.list_configs().await.map_err(|e| e.to_string())
}

/// Toggle AI platform authorization
#[tauri::command]
pub async fn toggle_ai_auth(state: State<'_, AppState>, platform: String) -> Result<AIConfig, String> {
    let service = state.ai_service.read().await;
    service.toggle_auth(&platform).await.map_err(|e| e.to_string())
}

/// Run AI check task
#[tauri::command]
pub async fn run_ai_check(state: State<'_, AppState>) -> Result<(), String> {
    let service = state.ai_service.read().await;
    service.run_check().await.map_err(|e| e.to_string())
}

/// List AI check logs
#[tauri::command]
pub async fn list_ai_logs(state: State<'_, AppState>, limit: Option<i32>) -> Result<Vec<AICheckLog>, String> {
    let limit = limit.unwrap_or(100);
    let service = state.ai_service.read().await;
    service.list_logs(limit).await.map_err(|e| e.to_string())
}

/// Clear AI check logs
#[tauri::command]
pub async fn clear_ai_logs(state: State<'_, AppState>) -> Result<(), String> {
    let service = state.ai_service.read().await;
    service.clear_logs().await.map_err(|e| e.to_string())
}
