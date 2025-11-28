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
use std::process::{Command, Child, Stdio};

use sqlx::SqlitePool;
use tauri::Manager;
use tokio::sync::RwLock;

/// Global sidecar process handle
static SIDECAR_PROCESS: std::sync::OnceLock<std::sync::Mutex<Option<Child>>> = std::sync::OnceLock::new();

use infrastructure::database::{DatabaseConfig, init_database};
use infrastructure::encryption::{EncryptionService, KeychainService};
use services::{AccountService, AIService, AuthService, BrowserService, ContentService, ContentApiConfig, ProxyService, SchedulerService, StatsService};

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
}

impl AppState {
    /// Initialize application state with database and services
    pub async fn init(data_dir: PathBuf) -> error::Result<Self> {
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
        })
    }
}

/// Start the playwright sidecar process
fn start_sidecar(app_handle: &tauri::AppHandle) {
    // Initialize the global process holder
    let _ = SIDECAR_PROCESS.get_or_init(|| std::sync::Mutex::new(None));

    // Get the sidecar directory (relative to the app)
    let resource_dir = app_handle.path().resource_dir().ok();
    let sidecar_dir = if let Some(dir) = resource_dir {
        dir.join("playwright-sidecar")
    } else {
        // Fallback for development: use relative path
        std::env::current_dir()
            .unwrap_or_default()
            .parent()
            .map(|p| p.join("playwright-sidecar"))
            .unwrap_or_else(|| PathBuf::from("../playwright-sidecar"))
    };

    tracing::info!("Looking for sidecar in: {:?}", sidecar_dir);

    // Check if sidecar directory exists
    if !sidecar_dir.exists() {
        tracing::warn!("Sidecar directory not found: {:?}", sidecar_dir);
        tracing::info!("Please start sidecar manually: cd playwright-sidecar && npm start");
        return;
    }

    #[cfg(target_os = "windows")]
    let npm_cmd = "npm.cmd";
    #[cfg(not(target_os = "windows"))]
    let npm_cmd = "npm";

    // Check if node_modules exists, if not run npm install first
    let node_modules = sidecar_dir.join("node_modules");
    if !node_modules.exists() {
        tracing::info!("Installing sidecar dependencies...");
        match Command::new(npm_cmd)
            .arg("install")
            .current_dir(&sidecar_dir)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
        {
            Ok(output) => {
                if output.status.success() {
                    tracing::info!("Sidecar dependencies installed successfully");
                } else {
                    let stderr = String::from_utf8_lossy(&output.stderr);
                    tracing::warn!("Failed to install sidecar dependencies: {}", stderr);
                    return;
                }
            }
            Err(e) => {
                tracing::warn!("Failed to run npm install: {}. Is Node.js installed?", e);
                return;
            }
        }
    }

    // Try to start the sidecar
    // Use Stdio::null() to prevent zombie processes from piped but unconsumed output
    match Command::new(npm_cmd)
        .arg("start")
        .current_dir(&sidecar_dir)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
    {
        Ok(child) => {
            tracing::info!("Sidecar started with PID: {}", child.id());
            if let Some(mutex) = SIDECAR_PROCESS.get() {
                if let Ok(mut guard) = mutex.lock() {
                    *guard = Some(child);
                }
            }
            
            // Wait for sidecar to be ready (up to 10 seconds)
            tracing::info!("Waiting for sidecar to be ready...");
            for i in 0..20 {
                std::thread::sleep(std::time::Duration::from_millis(500));
                if let Ok(resp) = reqwest::blocking::get("http://localhost:8857/health") {
                    if resp.status().is_success() {
                        tracing::info!("Sidecar is ready after {}ms", (i + 1) * 500);
                        return;
                    }
                }
            }
            tracing::warn!("Sidecar may not be ready yet, continuing anyway...");
        }
        Err(e) => {
            tracing::warn!("Failed to start sidecar: {}. Please start manually.", e);
        }
    }
}

/// Stop the sidecar process
fn stop_sidecar() {
    if let Some(mutex) = SIDECAR_PROCESS.get() {
        if let Ok(mut guard) = mutex.lock() {
            if let Some(mut child) = guard.take() {
                tracing::info!("Stopping sidecar process...");
                let _ = child.kill();
                let _ = child.wait();
                tracing::info!("Sidecar process stopped");
            }
        }
    }
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

            // Start playwright sidecar
            start_sidecar(app.handle());

            // Get app data directory
            let data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data directory");

            // Initialize state asynchronously
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                match AppState::init(data_dir).await {
                    Ok(state) => {
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
            // Auth commands (for cross-device migration)
            commands::sync_auth_from_browser,
            commands::update_auth_status,
            commands::get_auth_status,
            commands::export_auth_backups,
            commands::import_auth_backup,
            commands::clear_auth,
            commands::restore_auth_to_browser,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app_handle, event| {
            if let tauri::RunEvent::Exit = event {
                stop_sidecar();
            }
        });
}
