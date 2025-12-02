//! PubCast - Multi-platform content publishing tool
//!
//! This is the main library for the Tauri backend.

pub mod adapters;
pub mod commands;
pub mod error;
pub mod infrastructure;
pub mod models;
pub mod services;

use std::path::PathBuf;
use std::sync::Arc;

use sqlx::SqlitePool;
use tauri::Manager;
use tokio::sync::RwLock;

use infrastructure::database::{DatabaseConfig, init_database};
use infrastructure::encryption::{EncryptionService, KeychainService};
use services::{AccountService, AIService, AuthService, BrowserService, ContentService, ContentApiConfig, ProxyService, SchedulerService, StatsService, SidecarManager};

/// Application state shared across commands
pub struct AppState {
    pub db: SqlitePool,
    pub encryption: EncryptionService,
    pub proxy_service: Arc<RwLock<ProxyService>>,
    pub account_service: Arc<RwLock<AccountService>>,
    pub scheduler_service: Arc<RwLock<SchedulerService>>,
    pub content_service: Arc<RwLock<ContentService>>,
    pub stats_service: Arc<RwLock<StatsService>>,
    pub ai_service: Arc<RwLock<AIService>>,
    pub browser_service: Arc<RwLock<BrowserService>>,
    pub auth_service: Arc<RwLock<AuthService>>,
    pub sidecar_manager: Arc<RwLock<SidecarManager>>,
}

impl AppState {
    /// Initialize application state with database and services
    pub async fn init(app_handle: &tauri::AppHandle, data_dir: PathBuf) -> error::Result<Self> {
        // Ensure data directory exists
        std::fs::create_dir_all(&data_dir).map_err(|e| {
            error::PubCastError::Configuration(format!("Failed to create data dir: {}", e))
        })?;

        // Initialize database
        let db_path = data_dir.join("pubcast.db");
        let db_config = DatabaseConfig::new(db_path);
        let db = init_database(&db_config).await?;

        // Initialize encryption
        let keychain = KeychainService::new("com.pubcast.app");
        let master_key = keychain.get_or_create_master_key()?;
        let salt = EncryptionService::generate_salt();
        let encryption = EncryptionService::new(&master_key, &salt)?;

        // Initialize services
        let proxy_service = Arc::new(RwLock::new(ProxyService::new(
            db.clone(),
            encryption.clone(),
        )));

        let account_service = Arc::new(RwLock::new(AccountService::new(
            db.clone(),
            encryption.clone(),
        )));

        let scheduler_service = Arc::new(RwLock::new(SchedulerService::new(db.clone())));

        let content_service = Arc::new(RwLock::new(ContentService::new(
            db.clone(),
            ContentApiConfig::default(),
        )));

        let stats_service = Arc::new(RwLock::new(StatsService::new(db.clone())));
        let ai_service = Arc::new(RwLock::new(AIService::new(db.clone())));
        let browser_service = Arc::new(RwLock::new(BrowserService::new()));
        let auth_service = Arc::new(RwLock::new(AuthService::new(
            db.clone(),
            encryption.clone(),
        )));

        // Initialize SidecarManager
        let sidecar_manager = Arc::new(RwLock::new(
            SidecarManager::new(app_handle)
                .map_err(|e| error::PubCastError::Configuration(format!("Failed to create SidecarManager: {}", e)))?
        ));

        Ok(Self {
            db,
            encryption,
            proxy_service,
            account_service,
            scheduler_service,
            content_service,
            stats_service,
            ai_service,
            browser_service,
            auth_service,
            sidecar_manager,
        })
    }
}

/// Restart the sidecar process (Tauri command)
#[tauri::command]
async fn restart_sidecar(state: tauri::State<'_, AppState>) -> Result<(), String> {
    tracing::info!("Restarting sidecar...");
    let manager = state.sidecar_manager.read().await;
    manager.restart().await.map_err(|e| e.to_user_message())
}

/// Get sidecar status (Tauri command)
#[tauri::command]
async fn get_sidecar_status(state: tauri::State<'_, AppState>) -> Result<services::SidecarStatusInfo, String> {
    let manager = state.sidecar_manager.read().await;
    Ok(manager.get_status_info().await)
}

/// Configure and run the Tauri application
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            // Initialize logging
            tracing_subscriber::fmt()
                .with_env_filter(
                    tracing_subscriber::EnvFilter::from_default_env()
                        .add_directive(tracing::Level::INFO.into()),
                )
                .init();

            tracing::info!("PubCast application starting...");

            // Get app data directory
            let data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data directory");

            // Initialize state asynchronously
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                match AppState::init(&handle, data_dir).await {
                    Ok(state) => {
                        // Start sidecar asynchronously
                        let sidecar_manager = state.sidecar_manager.clone();
                        tokio::spawn(async move {
                            match sidecar_manager.read().await.start().await {
                                Ok(_) => tracing::info!("Sidecar started successfully"),
                                Err(e) => tracing::error!("Failed to start sidecar: {}", e),
                            }
                        });

                        handle.manage(state);
                        tracing::info!("PubCast application initialized successfully");
                    }
                    Err(e) => {
                        tracing::error!("Failed to initialize application: {}", e);
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::greet,
            commands::get_app_version,
            // Proxy commands
            commands::list_proxies,
            commands::get_proxy,
            commands::add_proxy,
            commands::delete_proxy,
            commands::check_proxy,
            commands::import_proxies,
            // Account commands
            commands::list_accounts,
            commands::list_accounts_by_platform,
            commands::get_account,
            commands::add_account,
            commands::update_account,
            commands::delete_account,
            commands::update_account_status,
            // Content commands
            commands::list_contents,
            commands::get_content,
            commands::sync_contents,
            // Scheduler commands
            commands::create_distribution_task,
            commands::get_distribution_task,
            commands::list_distribution_tasks,
            commands::cancel_distribution_task,
            // Stats commands
            commands::get_overall_stats,
            commands::get_platform_stats,
            commands::get_daily_stats,
            // AI commands
            commands::list_ai_configs,
            commands::toggle_ai_auth,
            commands::run_ai_check,
            commands::list_ai_logs,
            commands::clear_ai_logs,
            // Browser commands
            commands::browser_health_check,
            commands::launch_browser,
            commands::browser_navigate,
            commands::browser_get_page_info,
            commands::browser_save_session,
            commands::browser_close,
            commands::browser_get_sessions,
            commands::browser_close_all,
            commands::browser_get_login_state,
            // Auth commands (for cross-device migration)
            commands::sync_auth_from_browser,
            commands::update_auth_status,
            commands::get_auth_status,
            commands::export_auth_backups,
            commands::import_auth_backup,
            commands::clear_auth,
            commands::restore_auth_to_browser,
            // Sidecar commands
            restart_sidecar,
            get_sidecar_status,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            if let tauri::RunEvent::Exit = event {
                // Stop sidecar on exit
                if let Some(state) = app_handle.try_state::<AppState>() {
                    tauri::async_runtime::block_on(async {
                        if let Ok(manager) = state.sidecar_manager.try_read() {
                            if let Err(e) = manager.stop().await {
                                tracing::error!("Failed to stop sidecar: {}", e);
                            }
                        }
                    });
                }
            }
        });
}
