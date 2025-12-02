use reqwest::Client;
use std::time::Duration;

/// 健康检查配置
#[derive(Debug, Clone)]
pub struct HealthCheckConfig {
    /// 检查间隔
    pub interval: Duration,
    /// 单次检查超时
    pub timeout: Duration,
    /// 失败阈值（连续失败多少次触发重启）
    pub failure_threshold: u32,
    /// 成功阈值（连续成功多少次认为稳定）
    pub success_threshold: u32,
}

impl Default for HealthCheckConfig {
    fn default() -> Self {
        Self {
            interval: Duration::from_secs(30),
            timeout: Duration::from_secs(5),
            failure_threshold: 3,
            success_threshold: 2,
        }
    }
}

/// 健康检查器
pub struct HealthChecker {
    /// HTTP 客户端
    client: Client,
    /// 健康检查端点
    endpoint: String,
    /// 配置
    config: HealthCheckConfig,
}

impl HealthChecker {
    /// 创建新的健康检查器
    pub fn new(port: u16, config: HealthCheckConfig) -> Result<Self, String> {
        let client = Client::builder()
            .timeout(config.timeout)
            .build()
            .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

        Ok(Self {
            client,
            endpoint: format!("http://localhost:{}/health", port),
            config,
        })
    }

    /// 执行一次健康检查
    pub async fn check_once(&self) -> bool {
        match self.client.get(&self.endpoint).send().await {
            Ok(resp) => {
                let is_healthy = resp.status().is_success();
                if is_healthy {
                    tracing::debug!("Health check passed");
                } else {
                    tracing::debug!("Health check failed with status: {}", resp.status());
                }
                is_healthy
            }
            Err(e) => {
                tracing::debug!("Health check failed: {}", e);
                false
            }
        }
    }

    /// 等待服务变得健康（用于启动时）
    pub async fn wait_until_healthy(&self, max_duration: Duration) -> Result<(), String> {
        let start = std::time::Instant::now();
        let mut attempts = 0;

        loop {
            if start.elapsed() > max_duration {
                return Err(format!(
                    "Health check timeout after {:?} ({} attempts)",
                    max_duration, attempts
                ));
            }

            if self.check_once().await {
                tracing::info!(
                    "Health check passed after {} attempts ({:?})",
                    attempts + 1,
                    start.elapsed()
                );
                return Ok(());
            }

            attempts += 1;
            tokio::time::sleep(Duration::from_millis(500)).await;
        }
    }

    /// 获取检查间隔
    pub fn interval(&self) -> Duration {
        self.config.interval
    }

    /// 获取失败阈值
    pub fn failure_threshold(&self) -> u32 {
        self.config.failure_threshold
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_health_check_config_default() {
        let config = HealthCheckConfig::default();
        assert_eq!(config.interval, Duration::from_secs(30));
        assert_eq!(config.timeout, Duration::from_secs(5));
        assert_eq!(config.failure_threshold, 3);
        assert_eq!(config.success_threshold, 2);
    }

    #[test]
    fn test_health_checker_creation() {
        let config = HealthCheckConfig::default();
        let checker = HealthChecker::new(8857, config);
        assert!(checker.is_ok());

        let checker = checker.unwrap();
        assert_eq!(checker.endpoint, "http://localhost:8857/health");
    }

    #[tokio::test]
    async fn test_check_once_failure() {
        // 使用一个不存在的端口
        let config = HealthCheckConfig {
            timeout: Duration::from_millis(100),
            ..Default::default()
        };
        let checker = HealthChecker::new(19999, config).unwrap();

        // 应该失败，因为没有服务监听
        let result = checker.check_once().await;
        assert!(!result);
    }
}
