//! Content Tauri commands

use tauri::State;

use crate::models::Content;
use crate::AppState;

/// List all local contents
#[tauri::command]
pub async fn list_contents(state: State<'_, AppState>) -> Result<Vec<Content>, String> {
    let service = state.content_service.read().await;
    service.list_contents().await.map_err(|e| e.to_string())
}

/// Get a single content by ID
#[tauri::command]
pub async fn get_content(state: State<'_, AppState>, id: String) -> Result<Content, String> {
    let service = state.content_service.read().await;
    service.get_content(&id).await.map_err(|e| e.to_string())
}

/// Sync all contents from remote API
#[tauri::command]
pub async fn sync_contents(state: State<'_, AppState>) -> Result<SyncResultDto, String> {
    let service = state.content_service.read().await;
    let result = service.sync_all().await.map_err(|e| e.to_string())?;

    Ok(SyncResultDto {
        synced: result.synced,
        failed: result.failed,
    })
}

/// DTO for sync result
#[derive(serde::Serialize)]
pub struct SyncResultDto {
    pub synced: i32,
    pub failed: i32,
}
