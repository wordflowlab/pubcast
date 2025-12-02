mod types;

pub use types::*;

use std::sync::Arc;
use tauri::Manager;
use tokio::process::Command;
use tokio::sync::RwLock;
use std::time::Instant;

/// Sidecar 进程管理器
pub struct SidecarManager {
    /// 当前状态
    state: Arc<RwLock<SidecarState>>,
    /// 配置
    config: SidecarConfig,
    /// 进程句柄（仅在 Running 状态时存在）
    child: Arc<RwLock<Option<tokio::process::Child>>>,
}

impl SidecarManager {
    /// 创建新的 SidecarManager
    pub fn new(app_handle: &tauri::AppHandle) -> Result<Self, SidecarError> {
        // 获取 sidecar 目录
        let sidecar_dir = app_handle
            .path()
            .resource_dir()
            .map_err(|e| SidecarError::Other(format!("Failed to get resource dir: {}", e)))?
            .join("playwright-sidecar");

        // 获取日志目录（使用 app_data_dir）
        let log_dir = app_handle
            .path()
            .app_data_dir()
            .map_err(|e| SidecarError::Other(format!("Failed to get app data dir: {}", e)))?
            .join("logs");

        // 确保日志目录存在
        std::fs::create_dir_all(&log_dir)?;

        let config = SidecarConfig {
            sidecar_dir,
            log_dir,
            ..Default::default()
        };

        tracing::info!(
            "SidecarManager initialized with config: port={}, sidecar_dir={}, log_dir={}",
            config.port,
            config.sidecar_dir.display(),
            config.log_dir.display()
        );

        Ok(Self {
            state: Arc::new(RwLock::new(SidecarState::Stopped)),
            config,
            child: Arc::new(RwLock::new(None)),
        })
    }

    /// 获取当前状态
    pub async fn get_state(&self) -> SidecarState {
        self.state.read().await.clone()
    }

    /// 获取状态信息（用于前端）
    pub async fn get_status_info(&self) -> SidecarStatusInfo {
        let state = self.state.read().await;
        SidecarStatusInfo::from(&*state)
    }

    /// 启动 sidecar
    pub async fn start(&self) -> Result<(), SidecarError> {
        // 检查当前状态
        {
            let state = self.state.read().await;
            if matches!(*state, SidecarState::Running { .. }) {
                return Err(SidecarError::AlreadyRunning);
            }
        }

        tracing::info!("Starting sidecar...");

        // 1. 检查 sidecar 目录
        self.update_progress(
            StartStage::CheckingDependencies,
            "检查 Sidecar 目录...",
        )
        .await;

        if !self.config.sidecar_dir.exists() {
            return Err(SidecarError::DirectoryNotFound(
                self.config.sidecar_dir.clone(),
            ));
        }

        // 2. 检查并安装依赖
        let node_modules = self.config.sidecar_dir.join("node_modules");
        if !node_modules.exists() {
            self.update_progress(
                StartStage::InstallingDependencies,
                "安装 npm 依赖...",
            )
            .await;

            self.install_dependencies().await?;
        }

        // 3. 启动进程
        self.update_progress(StartStage::SpawningProcess, "启动 Sidecar 进程...")
            .await;

        let child = self.spawn_process().await?;
        let pid = child.id().ok_or_else(|| {
            SidecarError::ProcessSpawn("Failed to get process ID".to_string())
        })?;

        tracing::info!("Sidecar spawned with PID: {}", pid);

        // 保存进程句柄
        *self.child.write().await = Some(child);

        // 4. 等待健康检查
        self.update_progress(StartStage::WaitingForHealth, "等待服务就绪...")
            .await;

        self.wait_for_health().await?;

        // 5. 更新为运行状态
        *self.state.write().await = SidecarState::Running {
            pid,
            started_at: Instant::now(),
            restart_count: 0,
        };

        self.update_progress(StartStage::Ready, "Sidecar 已就绪")
            .await;

        tracing::info!("Sidecar started successfully on port {}", self.config.port);

        Ok(())
    }

    /// 停止 sidecar
    pub async fn stop(&self) -> Result<(), SidecarError> {
        let current_state = {
            let state = self.state.read().await;
            state.clone()
        };

        match current_state {
            SidecarState::Running { pid, .. } => {
                tracing::info!("Stopping sidecar (PID: {})...", pid);

                // 更新状态为 Stopping
                *self.state.write().await = SidecarState::Stopping;

                // 取出进程句柄
                let mut child_opt = self.child.write().await;
                if let Some(mut child) = child_opt.take() {
                    // 尝试优雅停止
                    match child.kill().await {
                        Ok(_) => {
                            tracing::info!("Sent kill signal to sidecar");
                            // 等待进程退出
                            let _ = child.wait().await;
                            tracing::info!("Sidecar stopped successfully");
                        }
                        Err(e) => {
                            tracing::warn!("Failed to kill sidecar: {}", e);
                        }
                    }
                }

                // 更新状态为 Stopped
                *self.state.write().await = SidecarState::Stopped;

                Ok(())
            }
            SidecarState::Stopped => {
                tracing::warn!("Sidecar is already stopped");
                Ok(())
            }
            _ => Err(SidecarError::NotRunning),
        }
    }

    /// 重启 sidecar
    pub async fn restart(&self) -> Result<(), SidecarError> {
        tracing::info!("Restarting sidecar...");

        // 先停止
        self.stop().await?;

        // 等待一会儿
        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

        // 再启动
        self.start().await?;

        Ok(())
    }

    /// 更新启动进度
    async fn update_progress(&self, stage: StartStage, message: &str) {
        let mut state = self.state.write().await;
        *state = SidecarState::Starting {
            progress: StartProgress {
                stage,
                message: message.to_string(),
                timestamp: Instant::now(),
            },
        };
        tracing::info!("[{:?}] {}", stage, message);
    }

    /// 安装 npm 依赖
    async fn install_dependencies(&self) -> Result<(), SidecarError> {
        tracing::info!("Installing npm dependencies...");

        #[cfg(target_os = "windows")]
        const NPM_CMD: &str = "npm.cmd";
        #[cfg(not(target_os = "windows"))]
        const NPM_CMD: &str = "npm";

        let output = Command::new(NPM_CMD)
            .arg("install")
            .current_dir(&self.config.sidecar_dir)
            .output()
            .await
            .map_err(|e| SidecarError::ProcessSpawn(format!("Failed to run npm install: {}", e)))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(SidecarError::ProcessSpawn(format!(
                "npm install failed: {}",
                stderr
            )));
        }

        tracing::info!("npm dependencies installed successfully");
        Ok(())
    }

    /// 生成 sidecar 进程
    async fn spawn_process(&self) -> Result<tokio::process::Child, SidecarError> {
        #[cfg(target_os = "windows")]
        const NPM_CMD: &str = "npm.cmd";
        #[cfg(not(target_os = "windows"))]
        const NPM_CMD: &str = "npm";

        let child = Command::new(NPM_CMD)
            .arg("start")
            .current_dir(&self.config.sidecar_dir)
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .kill_on_drop(true)
            .spawn()
            .map_err(|e| SidecarError::ProcessSpawn(format!("Failed to spawn process: {}", e)))?;

        Ok(child)
    }

    /// 等待健康检查通过
    async fn wait_for_health(&self) -> Result<(), SidecarError> {
        let start = Instant::now();
        let endpoint = format!("http://localhost:{}/health", self.config.port);
        let client = reqwest::Client::builder()
            .timeout(self.config.health_check_timeout)
            .build()
            .map_err(|e| SidecarError::Other(format!("Failed to create HTTP client: {}", e)))?;

        let mut attempts = 0;

        loop {
            if start.elapsed() > self.config.startup_timeout {
                return Err(SidecarError::StartupTimeout(self.config.startup_timeout));
            }

            match client.get(&endpoint).send().await {
                Ok(resp) if resp.status().is_success() => {
                    tracing::info!(
                        "Health check passed after {} attempts ({:?})",
                        attempts + 1,
                        start.elapsed()
                    );
                    return Ok(());
                }
                Ok(resp) => {
                    tracing::debug!(
                        "Health check attempt {} failed with status: {}",
                        attempts + 1,
                        resp.status()
                    );
                }
                Err(e) => {
                    tracing::debug!("Health check attempt {} failed: {}", attempts + 1, e);
                }
            }

            attempts += 1;
            tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sidecar_config_default() {
        let config = SidecarConfig::default();
        assert_eq!(config.port, 8857);
        assert_eq!(config.health_check_interval, std::time::Duration::from_secs(30));
        assert_eq!(config.max_restart_count, 5);
    }

    #[test]
    fn test_sidecar_status_info_from_stopped() {
        let state = SidecarState::Stopped;
        let info = SidecarStatusInfo::from(&state);
        assert_eq!(info.state, "stopped");
        assert!(info.message.is_none());
        assert!(info.uptime.is_none());
    }

    #[test]
    fn test_sidecar_status_info_from_starting() {
        let state = SidecarState::Starting {
            progress: StartProgress {
                stage: StartStage::SpawningProcess,
                message: "启动中".to_string(),
                timestamp: Instant::now(),
            },
        };
        let info = SidecarStatusInfo::from(&state);
        assert_eq!(info.state, "starting");
        assert_eq!(info.message, Some("启动中".to_string()));
    }

    #[test]
    fn test_sidecar_error_user_message() {
        let error = SidecarError::AlreadyRunning;
        assert_eq!(error.to_user_message(), "Sidecar 已在运行");

        let error = SidecarError::NotRunning;
        assert_eq!(error.to_user_message(), "Sidecar 未运行");
    }
}
