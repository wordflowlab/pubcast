//! Account management Tauri commands

use tauri::State;

use crate::models::{Account, AccountStatus, CreateAccountRequest, UpdateAccountRequest};
use crate::AppState;

/// List all accounts
#[tauri::command]
pub async fn list_accounts(state: State<'_, AppState>) -> Result<Vec<Account>, String> {
    let service = state.account_service.read().await;
    service.list_accounts().await.map_err(|e| e.to_string())
}

/// List accounts by platform
#[tauri::command]
pub async fn list_accounts_by_platform(
    state: State<'_, AppState>,
    platform: String,
) -> Result<Vec<Account>, String> {
    let service = state.account_service.read().await;
    service
        .list_accounts_by_platform(&platform)
        .await
        .map_err(|e| e.to_string())
}

/// Get a single account by ID
#[tauri::command]
pub async fn get_account(state: State<'_, AppState>, id: String) -> Result<Account, String> {
    let service = state.account_service.read().await;
    service.get_account(&id).await.map_err(|e| e.to_string())
}

/// Add a new account
#[tauri::command]
pub async fn add_account(
    state: State<'_, AppState>,
    platform: String,
    name: String,
    username: Option<String>,
) -> Result<Account, String> {
    let req = CreateAccountRequest {
        platform,
        name,
        username,
        credentials: None,
    };

    let service = state.account_service.read().await;
    service.create_account(req).await.map_err(|e| e.to_string())
}

/// Update an account
#[tauri::command]
pub async fn update_account(
    state: State<'_, AppState>,
    id: String,
    name: Option<String>,
    username: Option<String>,
    status: Option<String>,
) -> Result<Account, String> {
    let status = status.and_then(|s| s.parse::<AccountStatus>().ok());

    let req = UpdateAccountRequest {
        name,
        username,
        credentials: None,
        status,
    };

    let service = state.account_service.read().await;
    service
        .update_account(&id, req)
        .await
        .map_err(|e| e.to_string())
}

/// Delete an account
#[tauri::command]
pub async fn delete_account(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let service = state.account_service.read().await;
    service.delete_account(&id).await.map_err(|e| e.to_string())
}

/// Update account status
#[tauri::command]
pub async fn update_account_status(
    state: State<'_, AppState>,
    id: String,
    status: String,
    error_message: Option<String>,
) -> Result<(), String> {
    let status = status
        .parse::<AccountStatus>()
        .map_err(|e| format!("Invalid status: {}", e))?;

    let service = state.account_service.read().await;
    service
        .update_account_status(&id, status, error_message)
        .await
        .map_err(|e| e.to_string())
}
