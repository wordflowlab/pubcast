//! Proxy pool management service

use rand::seq::SliceRandom;
use sqlx::SqlitePool;
use std::sync::atomic::{AtomicUsize, Ordering};
use uuid::Uuid;

use crate::error::{PubCastError, Result};
use crate::infrastructure::encryption::EncryptionService;
use crate::models::{
    CreateProxyRequest, Proxy, ProxyHealthResult, ProxyProtocol, ProxyStatus, ProxyStrategy,
};

/// Proxy pool service for managing proxies
pub struct ProxyService {
    pool: SqlitePool,
    encryption: EncryptionService,
    round_robin_index: AtomicUsize,
}

impl ProxyService {
    /// Create a new proxy service
    pub fn new(pool: SqlitePool, encryption: EncryptionService) -> Self {
        Self {
            pool,
            encryption,
            round_robin_index: AtomicUsize::new(0),
        }
    }

    /// List all proxies
    pub async fn list_proxies(&self) -> Result<Vec<Proxy>> {
        let rows = sqlx::query!(
            r#"
            SELECT id, protocol, host, port, username, status,
                   last_check_at, last_check_ip, last_check_location,
                   fail_count, created_at, updated_at
            FROM proxies
            ORDER BY created_at DESC
            "#
        )
        .fetch_all(&self.pool)
        .await?;

        let proxies = rows
            .into_iter()
            .map(|row| Proxy {
                id: row.id,
                protocol: row.protocol.parse().unwrap_or(ProxyProtocol::Http),
                host: row.host,
                port: row.port as u16,
                username: row.username,
                status: row.status.parse().unwrap_or(ProxyStatus::Unknown),
                last_check_at: row.last_check_at,
                last_check_ip: row.last_check_ip,
                last_check_location: row.last_check_location,
                fail_count: row.fail_count,
                created_at: row.created_at,
                updated_at: row.updated_at,
            })
            .collect();

        Ok(proxies)
    }

    /// Get a proxy by ID
    pub async fn get_proxy(&self, id: &str) -> Result<Proxy> {
        let row = sqlx::query!(
            r#"
            SELECT id, protocol, host, port, username, status,
                   last_check_at, last_check_ip, last_check_location,
                   fail_count, created_at, updated_at
            FROM proxies WHERE id = ?
            "#,
            id
        )
        .fetch_optional(&self.pool)
        .await?
        .ok_or_else(|| PubCastError::NotFound(format!("Proxy not found: {}", id)))?;

        Ok(Proxy {
            id: row.id,
            protocol: row.protocol.parse().unwrap_or(ProxyProtocol::Http),
            host: row.host,
            port: row.port as u16,
            username: row.username,
            status: row.status.parse().unwrap_or(ProxyStatus::Unknown),
            last_check_at: row.last_check_at,
            last_check_ip: row.last_check_ip,
            last_check_location: row.last_check_location,
            fail_count: row.fail_count,
            created_at: row.created_at,
            updated_at: row.updated_at,
        })
    }

    /// Create a new proxy
    pub async fn create_proxy(&self, req: CreateProxyRequest) -> Result<Proxy> {
        let id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp();
        let protocol = req.protocol.to_string();

        // Encrypt password if provided
        let (password_encrypted, password_nonce): (Option<Vec<u8>>, Option<Vec<u8>>) =
            if let Some(password) = &req.password {
                let (encrypted, nonce) = self.encryption.encrypt(password.as_bytes())?;
                (Some(encrypted), Some(nonce))
            } else {
                (None, None)
            };

        sqlx::query!(
            r#"
            INSERT INTO proxies (id, protocol, host, port, username, password_encrypted, password_nonce, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'unknown', ?, ?)
            "#,
            id,
            protocol,
            req.host,
            req.port,
            req.username,
            password_encrypted,
            password_nonce,
            now,
            now
        )
        .execute(&self.pool)
        .await?;

        self.get_proxy(&id).await
    }

    /// Delete a proxy
    pub async fn delete_proxy(&self, id: &str) -> Result<()> {
        let result = sqlx::query!("DELETE FROM proxies WHERE id = ?", id)
            .execute(&self.pool)
            .await?;

        if result.rows_affected() == 0 {
            return Err(PubCastError::NotFound(format!("Proxy not found: {}", id)));
        }

        Ok(())
    }

    /// Update proxy status after health check
    pub async fn update_proxy_status(&self, result: &ProxyHealthResult) -> Result<()> {
        let now = chrono::Utc::now().timestamp();
        let status = if result.is_healthy {
            "healthy"
        } else {
            "unhealthy"
        };

        if result.is_healthy {
            sqlx::query!(
                r#"
                UPDATE proxies 
                SET status = ?, last_check_at = ?, last_check_ip = ?, 
                    last_check_location = ?, fail_count = 0, updated_at = ?
                WHERE id = ?
                "#,
                status,
                now,
                result.exit_ip,
                result.location,
                now,
                result.proxy_id
            )
            .execute(&self.pool)
            .await?;
        } else {
            sqlx::query!(
                r#"
                UPDATE proxies 
                SET status = ?, last_check_at = ?, fail_count = fail_count + 1, updated_at = ?
                WHERE id = ?
                "#,
                status,
                now,
                now,
                result.proxy_id
            )
            .execute(&self.pool)
            .await?;
        }

        Ok(())
    }

    /// Get healthy proxies
    pub async fn get_healthy_proxies(&self) -> Result<Vec<Proxy>> {
        let rows = sqlx::query!(
            r#"
            SELECT id, protocol, host, port, username, status,
                   last_check_at, last_check_ip, last_check_location,
                   fail_count, created_at, updated_at
            FROM proxies
            WHERE status = 'healthy'
            ORDER BY fail_count ASC, last_check_at DESC
            "#
        )
        .fetch_all(&self.pool)
        .await?;

        let proxies = rows
            .into_iter()
            .map(|row| Proxy {
                id: row.id,
                protocol: row.protocol.parse().unwrap_or(ProxyProtocol::Http),
                host: row.host,
                port: row.port as u16,
                username: row.username,
                status: ProxyStatus::Healthy,
                last_check_at: row.last_check_at,
                last_check_ip: row.last_check_ip,
                last_check_location: row.last_check_location,
                fail_count: row.fail_count,
                created_at: row.created_at,
                updated_at: row.updated_at,
            })
            .collect();

        Ok(proxies)
    }

    /// Select a proxy based on strategy
    pub async fn select_proxy(&self, strategy: &ProxyStrategy) -> Result<Option<Proxy>> {
        let healthy_proxies = self.get_healthy_proxies().await?;

        if healthy_proxies.is_empty() {
            return Ok(None);
        }

        let selected = match strategy {
            ProxyStrategy::Fixed => {
                // For fixed, caller should use get_proxy directly
                healthy_proxies.first().cloned()
            }
            ProxyStrategy::RoundRobin => {
                let idx = self.round_robin_index.fetch_add(1, Ordering::Relaxed);
                healthy_proxies.get(idx % healthy_proxies.len()).cloned()
            }
            ProxyStrategy::Random => {
                let mut rng = rand::thread_rng();
                healthy_proxies.choose(&mut rng).cloned()
            }
        };

        Ok(selected)
    }

    /// Check proxy health (basic connectivity test)
    pub async fn check_proxy_health(&self, proxy_id: &str) -> Result<ProxyHealthResult> {
        let proxy = self.get_proxy(proxy_id).await?;

        // Build proxy URL
        let proxy_url = proxy.url();

        // Try to connect through proxy to IP check service
        let client = reqwest::Client::builder()
            .proxy(reqwest::Proxy::all(&proxy_url).map_err(|e| {
                PubCastError::Configuration(format!("Invalid proxy URL: {}", e))
            })?)
            .timeout(std::time::Duration::from_secs(10))
            .build()
            .map_err(|e| PubCastError::Http(e))?;

        let start = std::time::Instant::now();

        match client.get("https://api.ipify.org?format=json").send().await {
            Ok(response) => {
                let latency_ms = start.elapsed().as_millis() as u64;

                if response.status().is_success() {
                    // Try to get IP from response
                    let ip_result: Option<String> = response
                        .json::<serde_json::Value>()
                        .await
                        .ok()
                        .and_then(|v| v.get("ip").and_then(|ip| ip.as_str().map(String::from)));

                    let result = ProxyHealthResult {
                        proxy_id: proxy_id.to_string(),
                        is_healthy: true,
                        exit_ip: ip_result,
                        location: None, // Could add geo lookup later
                        latency_ms: Some(latency_ms),
                        error: None,
                    };

                    self.update_proxy_status(&result).await?;
                    Ok(result)
                } else {
                    let result = ProxyHealthResult {
                        proxy_id: proxy_id.to_string(),
                        is_healthy: false,
                        exit_ip: None,
                        location: None,
                        latency_ms: Some(latency_ms),
                        error: Some(format!("HTTP status: {}", response.status())),
                    };

                    self.update_proxy_status(&result).await?;
                    Ok(result)
                }
            }
            Err(e) => {
                let result = ProxyHealthResult {
                    proxy_id: proxy_id.to_string(),
                    is_healthy: false,
                    exit_ip: None,
                    location: None,
                    latency_ms: None,
                    error: Some(e.to_string()),
                };

                self.update_proxy_status(&result).await?;
                Ok(result)
            }
        }
    }

    /// Batch import proxies from text
    /// Format: protocol://[user:pass@]host:port (one per line)
    pub async fn import_proxies(&self, text: &str) -> Result<Vec<Proxy>> {
        let mut imported = Vec::new();

        for line in text.lines() {
            let line = line.trim();
            if line.is_empty() || line.starts_with('#') {
                continue;
            }

            if let Some(req) = Self::parse_proxy_line(line) {
                match self.create_proxy(req).await {
                    Ok(proxy) => imported.push(proxy),
                    Err(e) => {
                        tracing::warn!("Failed to import proxy '{}': {}", line, e);
                    }
                }
            } else {
                tracing::warn!("Invalid proxy format: {}", line);
            }
        }

        Ok(imported)
    }

    /// Parse a proxy line into CreateProxyRequest
    fn parse_proxy_line(line: &str) -> Option<CreateProxyRequest> {
        // Try to parse as URL
        let url = url::Url::parse(line).ok()?;

        let protocol = match url.scheme() {
            "http" => ProxyProtocol::Http,
            "https" => ProxyProtocol::Https,
            "socks5" => ProxyProtocol::Socks5,
            _ => return None,
        };

        let host = url.host_str()?.to_string();
        let port = url.port().unwrap_or(match protocol {
            ProxyProtocol::Http => 80,
            ProxyProtocol::Https => 443,
            ProxyProtocol::Socks5 => 1080,
        });

        let username = if url.username().is_empty() {
            None
        } else {
            Some(url.username().to_string())
        };

        let password = url.password().map(String::from);

        Some(CreateProxyRequest {
            protocol,
            host,
            port,
            username,
            password,
        })
    }
}
