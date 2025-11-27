//! Tauri commands module
//!
//! This module contains all the Tauri commands that can be invoked from the frontend.

pub mod account;
pub mod ai;
pub mod browser;
pub mod content;
pub mod proxy;
pub mod scheduler;
pub mod stats;

pub use account::*;
pub use ai::*;
pub use browser::*;
pub use content::*;
pub use proxy::*;
pub use scheduler::*;
pub use stats::*;

/// Greet command for testing
#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to PubCast.", name)
}

/// Get application version
#[tauri::command]
pub fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}
