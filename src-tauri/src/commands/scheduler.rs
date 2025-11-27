//! Scheduler Tauri commands

use tauri::State;

use crate::models::{CreateDistributionTaskRequest, DistributionTask, ScheduleType};
use crate::AppState;

/// Create a distribution task
#[tauri::command]
pub async fn create_distribution_task(
    state: State<'_, AppState>,
    content_id: String,
    name: Option<String>,
    target_account_ids: Vec<String>,
    schedule_type: String,
    scheduled_at: Option<i64>,
) -> Result<DistributionTask, String> {
    let schedule_type = match schedule_type.as_str() {
        "scheduled" => ScheduleType::Scheduled,
        _ => ScheduleType::Immediate,
    };

    let req = CreateDistributionTaskRequest {
        content_id,
        name,
        target_account_ids,
        schedule_type,
        scheduled_at,
    };

    let service = state.scheduler_service.read().await;
    service
        .create_distribution_task(req)
        .await
        .map_err(|e| e.to_string())
}

/// Get a distribution task by ID
#[tauri::command]
pub async fn get_distribution_task(
    state: State<'_, AppState>,
    id: String,
) -> Result<DistributionTask, String> {
    let service = state.scheduler_service.read().await;
    service
        .get_distribution_task(&id)
        .await
        .map_err(|e| e.to_string())
}

/// List distribution tasks
#[tauri::command]
pub async fn list_distribution_tasks(
    state: State<'_, AppState>,
) -> Result<Vec<DistributionTask>, String> {
    let service = state.scheduler_service.read().await;
    service
        .list_distribution_tasks()
        .await
        .map_err(|e| e.to_string())
}

/// Cancel a distribution task
#[tauri::command]
pub async fn cancel_distribution_task(
    state: State<'_, AppState>,
    id: String,
) -> Result<(), String> {
    let service = state.scheduler_service.read().await;
    service
        .cancel_distribution_task(&id)
        .await
        .map_err(|e| e.to_string())
}
