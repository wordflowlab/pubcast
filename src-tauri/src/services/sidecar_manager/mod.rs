mod health_checker;
mod log_manager;
mod types;

pub use health_checker::{HealthCheckConfig, HealthChecker};
pub use log_manager::{LogFileInfo, LogManager};
pub use types::*;

use std::sync::Arc;
use std::time::{Duration, Instant};
use tauri::Manager;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tokio::sync::{RwLock, Notify};

/// Sidecar 进程管理器
pub struct SidecarManager {
    /// 当前状态
    state: Arc<RwLock<SidecarState>>,
    /// 配置
    config: SidecarConfig,
    /// 进程句柄（仅在 Running 状态时存在）
    child: Arc<RwLock<Option<tokio::process::Child>>>,
    /// 日志管理器
    log_manager: Arc<LogManager>,
    /// 健康检查器
    health_checker: Arc<HealthChecker>,
    /// 停止监控信号
    stop_monitoring: Arc<Notify>,
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

        // 初始化日志管理器
        let log_manager = Arc::new(
            LogManager::new(config.log_dir.clone())
                .map_err(|e| SidecarError::Other(format!("Failed to create LogManager: {}", e)))?
        );

        // 初始化健康检查器
        let health_check_config = HealthCheckConfig {
            interval: config.health_check_interval,
            timeout: config.health_check_timeout,
            failure_threshold: 3,
            success_threshold: 2,
        };

        let health_checker = Arc::new(
            HealthChecker::new(config.port, health_check_config)
                .map_err(|e| SidecarError::Other(format!("Failed to create HealthChecker: {}", e)))?
        );

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
            log_manager,
            health_checker,
            stop_monitoring: Arc::new(Notify::new()),
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

        let mut child = self.spawn_process().await?;
        let pid = child.id().ok_or_else(|| {
            SidecarError::ProcessSpawn("Failed to get process ID".to_string())
        })?;

        tracing::info!("Sidecar spawned with PID: {}", pid);

        // 启动日志收集任务
        if let Some(stdout) = child.stdout.take() {
            let log_manager = self.log_manager.clone();
            tokio::spawn(async move {
                let reader = BufReader::new(stdout);
                let mut lines = reader.lines();

                while let Ok(Some(line)) = lines.next_line().await {
                    if let Err(e) = log_manager.write_stdout(line).await {
                        tracing::warn!("Failed to write stdout log: {}", e);
                    }
                }
            });
        }

        if let Some(stderr) = child.stderr.take() {
            let log_manager = self.log_manager.clone();
            tokio::spawn(async move {
                let reader = BufReader::new(stderr);
                let mut lines = reader.lines();

                while let Ok(Some(line)) = lines.next_line().await {
                    if let Err(e) = log_manager.write_stderr(line).await {
                        tracing::warn!("Failed to write stderr log: {}", e);
                    }
                }
            });
        }

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

        // 6. 启动后台健康监控
        self.start_health_monitoring();

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

                // 停止健康监控
                self.stop_monitoring.notify_waiters();

                // 取出进程句柄
                let mut child_opt = self.child.write().await;
                if let Some(mut child) = child_opt.take() {
                    self.graceful_shutdown(&mut child, pid).await?;
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

    /// 优雅关闭进程
    async fn graceful_shutdown(&self, child: &mut tokio::process::Child, pid: u32) -> Result<(), SidecarError> {
        #[cfg(unix)]
        {
            use nix::sys::signal::{kill, Signal};
            use nix::unistd::Pid;

            // 1. 发送 SIGTERM（优雅关闭信号）
            tracing::info!("Sending SIGTERM to sidecar (PID: {})...", pid);

            let nix_pid = Pid::from_raw(pid as i32);
            if let Err(e) = kill(nix_pid, Signal::SIGTERM) {
                tracing::warn!("Failed to send SIGTERM: {}", e);
                // SIGTERM 失败，直接 SIGKILL
                return self.force_kill(child, pid).await;
            }

            // 2. 等待进程退出（带超时）
            tracing::debug!("Waiting for graceful shutdown (timeout: {:?})...", self.config.shutdown_timeout);

            let shutdown_result = tokio::time::timeout(
                self.config.shutdown_timeout,
                child.wait()
            ).await;

            match shutdown_result {
                Ok(Ok(status)) => {
                    tracing::info!("Sidecar exited gracefully with status: {:?}", status);
                    Ok(())
                }
                Ok(Err(e)) => {
                    tracing::warn!("Error waiting for sidecar exit: {}", e);
                    Err(SidecarError::Other(format!("Wait error: {}", e)))
                }
                Err(_) => {
                    // 3. 超时，发送 SIGKILL（强制终止）
                    tracing::warn!("Graceful shutdown timeout, sending SIGKILL...");
                    self.force_kill(child, pid).await
                }
            }
        }

        #[cfg(not(unix))]
        {
            // Windows: 直接使用 kill (相当于 TerminateProcess)
            tracing::info!("Terminating sidecar (PID: {})...", pid);

            match child.kill().await {
                Ok(_) => {
                    tracing::info!("Sent termination signal to sidecar");
                    // 等待进程退出（带超时）
                    let shutdown_result = tokio::time::timeout(
                        self.config.shutdown_timeout,
                        child.wait()
                    ).await;

                    match shutdown_result {
                        Ok(Ok(status)) => {
                            tracing::info!("Sidecar exited with status: {:?}", status);
                            Ok(())
                        }
                        Ok(Err(e)) => {
                            tracing::warn!("Error waiting for sidecar exit: {}", e);
                            Err(SidecarError::Other(format!("Wait error: {}", e)))
                        }
                        Err(_) => {
                            tracing::warn!("Shutdown timeout reached");
                            Ok(()) // 已发送终止信号，认为成功
                        }
                    }
                }
                Err(e) => {
                    tracing::warn!("Failed to terminate sidecar: {}", e);
                    Err(SidecarError::Other(format!("Termination failed: {}", e)))
                }
            }
        }
    }

    /// 强制终止进程（SIGKILL）
    #[cfg(unix)]
    async fn force_kill(&self, child: &mut tokio::process::Child, pid: u32) -> Result<(), SidecarError> {
        use nix::sys::signal::{kill, Signal};
        use nix::unistd::Pid;

        tracing::info!("Force killing sidecar (PID: {})...", pid);

        let nix_pid = Pid::from_raw(pid as i32);
        if let Err(e) = kill(nix_pid, Signal::SIGKILL) {
            tracing::error!("Failed to send SIGKILL: {}", e);
            return Err(SidecarError::Other(format!("SIGKILL failed: {}", e)));
        }

        // 等待进程退出
        match child.wait().await {
            Ok(status) => {
                tracing::info!("Sidecar force killed, exit status: {:?}", status);
                Ok(())
            }
            Err(e) => {
                tracing::warn!("Error waiting after SIGKILL: {}", e);
                // SIGKILL 通常不会失败，即使 wait 失败也认为成功
                Ok(())
            }
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

    /// 获取最近的日志
    pub fn get_logs(&self, log_type: &str, lines: usize) -> Result<Vec<String>, SidecarError> {
        self.log_manager
            .get_recent_logs(log_type, lines)
            .map_err(|e| SidecarError::Other(format!("Failed to get logs: {}", e)))
    }

    /// 获取所有日志文件列表
    pub fn list_log_files(&self) -> Result<Vec<LogFileInfo>, SidecarError> {
        self.log_manager
            .list_log_files()
            .map_err(|e| SidecarError::Other(format!("Failed to list log files: {}", e)))
    }

    /// 清空所有日志
    pub async fn clear_logs(&self) -> Result<(), SidecarError> {
        self.log_manager
            .clear_all_logs()
            .await
            .map_err(|e| SidecarError::Other(format!("Failed to clear logs: {}", e)))
    }

    /// 等待健康检查通过
    async fn wait_for_health(&self) -> Result<(), SidecarError> {
        self.health_checker
            .wait_until_healthy(self.config.startup_timeout)
            .await
            .map_err(|_| SidecarError::StartupTimeout(self.config.startup_timeout))
    }

    /// 启动后台健康监控
    fn start_health_monitoring(&self) {
        let state = self.state.clone();
        let health_checker = self.health_checker.clone();
        let stop_signal = self.stop_monitoring.clone();
        let config = self.config.clone();

        tokio::spawn(async move {
            let mut consecutive_failures = 0;
            let mut restart_count = 0;

            tracing::info!("Health monitoring started");

            loop {
                // 等待检查间隔或停止信号
                tokio::select! {
                    _ = stop_signal.notified() => {
                        tracing::info!("Health monitoring stopped");
                        break;
                    }
                    _ = tokio::time::sleep(health_checker.interval()) => {
                        // 执行健康检查
                    }
                }

                // 检查当前状态
                let current_state = state.read().await.clone();
                if !matches!(current_state, SidecarState::Running { .. }) {
                    tracing::debug!("Sidecar not running, stopping health monitoring");
                    break;
                }

                // 执行健康检查
                let is_healthy = health_checker.check_once().await;

                if is_healthy {
                    // 重置失败计数
                    if consecutive_failures > 0 {
                        tracing::info!("Health check recovered after {} failures", consecutive_failures);
                        consecutive_failures = 0;
                    }
                } else {
                    consecutive_failures += 1;
                    tracing::warn!(
                        "Health check failed ({}/{})",
                        consecutive_failures,
                        health_checker.failure_threshold()
                    );

                    // 检查是否达到失败阈值
                    if consecutive_failures >= health_checker.failure_threshold() {
                        tracing::error!("Health check failed {} times, attempting restart", consecutive_failures);

                        // 检查是否超过最大重启次数
                        if restart_count >= config.max_restart_count {
                            tracing::error!(
                                "Max restart count ({}) reached, marking as failed",
                                config.max_restart_count
                            );

                            *state.write().await = SidecarState::Failed {
                                error: format!(
                                    "Health check failed after {} consecutive failures. Max restart count ({}) reached.",
                                    consecutive_failures, config.max_restart_count
                                ),
                                last_attempt: Instant::now(),
                            };
                            break;
                        }

                        // 计算退避时间（指数退避：1s, 2s, 4s, 8s, 16s）
                        let backoff_secs = 2_u64.pow(restart_count.min(4));
                        let backoff_duration = Duration::from_secs(backoff_secs);

                        tracing::info!(
                            "Waiting {:?} before restart (attempt {}/{})",
                            backoff_duration,
                            restart_count + 1,
                            config.max_restart_count
                        );

                        tokio::time::sleep(backoff_duration).await;

                        // 尝试重启（这里只是标记为失败，实际重启需要外部触发）
                        // 在实际应用中，可以通过事件总线或回调通知外部进行重启
                        restart_count += 1;

                        tracing::warn!(
                            "Sidecar health check failed, needs restart (attempt {}/{})",
                            restart_count,
                            config.max_restart_count
                        );

                        // 更新状态为 Failed，需要外部重启
                        *state.write().await = SidecarState::Failed {
                            error: format!(
                                "Health check failed after {} consecutive failures",
                                health_checker.failure_threshold()
                            ),
                            last_attempt: Instant::now(),
                        };

                        // 停止监控，等待外部重启
                        break;
                    }
                }
            }

            tracing::info!("Health monitoring task exited");
        });
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
