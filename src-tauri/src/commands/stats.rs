//! Statistics Tauri commands

use tauri::State;

use crate::services::stats::{DailyStats, PlatformStats, PublishStats};
use crate::AppState;

/// Get overall publish statistics
#[tauri::command]
pub async fn get_overall_stats(state: State<'_, AppState>) -> Result<PublishStats, String> {
    let service = state.stats_service.read().await;
    service.get_overall_stats().await.map_err(|e| e.to_string())
}

/// Get statistics by platform
#[tauri::command]
pub async fn get_platform_stats(state: State<'_, AppState>) -> Result<Vec<PlatformStats>, String> {
    let service = state.stats_service.read().await;
    service.get_platform_stats().await.map_err(|e| e.to_string())
}

/// Get daily statistics for the last N days
#[tauri::command]
pub async fn get_daily_stats(
    state: State<'_, AppState>,
    days: Option<i32>,
) -> Result<Vec<DailyStats>, String> {
    let days = days.unwrap_or(30);
    let service = state.stats_service.read().await;
    service.get_daily_stats(days).await.map_err(|e| e.to_string())
}
