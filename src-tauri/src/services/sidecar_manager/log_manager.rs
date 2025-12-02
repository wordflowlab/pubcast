use std::fs::{File, OpenOptions};
use std::io::{BufWriter, Write};
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::Mutex;

/// 日志管理器，负责收集和管理 sidecar 的日志
pub struct LogManager {
    /// 日志目录
    log_dir: PathBuf,
    /// 单个日志文件最大大小（字节）
    max_log_size: u64,
    /// 保留的最大日志文件数
    max_log_files: usize,
    /// stdout 日志写入器
    stdout_writer: Arc<Mutex<BufWriter<File>>>,
    /// stderr 日志写入器
    stderr_writer: Arc<Mutex<BufWriter<File>>>,
}

impl LogManager {
    /// 创建新的日志管理器
    pub fn new(log_dir: PathBuf) -> std::io::Result<Self> {
        // 确保日志目录存在
        std::fs::create_dir_all(&log_dir)?;

        let stdout_path = log_dir.join("sidecar-stdout.log");
        let stderr_path = log_dir.join("sidecar-stderr.log");

        // 打开日志文件（追加模式）
        let stdout_file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&stdout_path)?;

        let stderr_file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&stderr_path)?;

        Ok(Self {
            log_dir,
            max_log_size: 10 * 1024 * 1024, // 10 MB
            max_log_files: 5,
            stdout_writer: Arc::new(Mutex::new(BufWriter::new(stdout_file))),
            stderr_writer: Arc::new(Mutex::new(BufWriter::new(stderr_file))),
        })
    }

    /// 写入 stdout 日志
    pub async fn write_stdout(&self, line: String) -> std::io::Result<()> {
        let mut writer = self.stdout_writer.lock().await;
        writeln!(writer, "{}", line)?;
        writer.flush()?;

        // 检查是否需要轮转
        if let Ok(metadata) = writer.get_ref().metadata() {
            if metadata.len() > self.max_log_size {
                drop(writer); // 释放锁
                self.rotate_stdout().await?;
            }
        }

        Ok(())
    }

    /// 写入 stderr 日志
    pub async fn write_stderr(&self, line: String) -> std::io::Result<()> {
        let mut writer = self.stderr_writer.lock().await;
        writeln!(writer, "{}", line)?;
        writer.flush()?;

        // 检查是否需要轮转
        if let Ok(metadata) = writer.get_ref().metadata() {
            if metadata.len() > self.max_log_size {
                drop(writer); // 释放锁
                self.rotate_stderr().await?;
            }
        }

        Ok(())
    }

    /// 轮转 stdout 日志
    async fn rotate_stdout(&self) -> std::io::Result<()> {
        self.rotate_log("stdout").await
    }

    /// 轮转 stderr 日志
    async fn rotate_stderr(&self) -> std::io::Result<()> {
        self.rotate_log("stderr").await
    }

    /// 轮转日志文件
    async fn rotate_log(&self, log_type: &str) -> std::io::Result<()> {
        let base_name = format!("sidecar-{}", log_type);
        let current_file = self.log_dir.join(format!("{}.log", base_name));

        // 生成归档文件名
        let timestamp = chrono::Local::now().format("%Y%m%d-%H%M%S");
        let archived_name = format!("{}-{}.log", base_name, timestamp);
        let archived_path = self.log_dir.join(&archived_name);

        // 重命名当前文件
        if current_file.exists() {
            std::fs::rename(&current_file, &archived_path)?;
        }

        // 清理旧文件
        self.cleanup_old_logs(&base_name)?;

        // 重新打开文件
        let new_file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&current_file)?;

        // 更新写入器
        if log_type == "stdout" {
            let mut writer = self.stdout_writer.lock().await;
            *writer = BufWriter::new(new_file);
        } else {
            let mut writer = self.stderr_writer.lock().await;
            *writer = BufWriter::new(new_file);
        }

        tracing::info!("Rotated {} log to {}", log_type, archived_name);
        Ok(())
    }

    /// 清理旧的日志文件
    fn cleanup_old_logs(&self, prefix: &str) -> std::io::Result<()> {
        let current_log_name = format!("{}.log", prefix);
        let mut logs: Vec<_> = std::fs::read_dir(&self.log_dir)?
            .filter_map(|e| e.ok())
            .filter(|e| {
                let file_name = e.file_name().to_string_lossy().to_string();
                file_name.starts_with(prefix)
                    && file_name.ends_with(".log")
                    && file_name != current_log_name
            })
            .collect();

        // 按修改时间排序（旧的在前）
        logs.sort_by_key(|e| e.metadata().ok().and_then(|m| m.modified().ok()));

        // 保留最新的 N 个文件
        if logs.len() > self.max_log_files {
            for log in logs.iter().take(logs.len() - self.max_log_files) {
                let _ = std::fs::remove_file(log.path());
                tracing::debug!("Removed old log file: {:?}", log.path());
            }
        }

        Ok(())
    }

    /// 获取最近的 N 行日志
    pub fn get_recent_logs(&self, log_type: &str, n: usize) -> std::io::Result<Vec<String>> {
        let log_path = self.log_dir.join(format!("sidecar-{}.log", log_type));

        if !log_path.exists() {
            return Ok(Vec::new());
        }

        use std::io::{BufRead, BufReader};
        let file = File::open(log_path)?;
        let reader = BufReader::new(file);

        let lines: Vec<String> = reader
            .lines()
            .filter_map(|l| l.ok())
            .collect();

        // 返回最后 N 行
        let start = if lines.len() > n {
            lines.len() - n
        } else {
            0
        };

        Ok(lines[start..].to_vec())
    }

    /// 获取所有日志文件列表
    pub fn list_log_files(&self) -> std::io::Result<Vec<LogFileInfo>> {
        let mut files = Vec::new();

        for entry in std::fs::read_dir(&self.log_dir)? {
            let entry = entry?;
            let path = entry.path();

            if path.extension().and_then(|s| s.to_str()) == Some("log") {
                let metadata = entry.metadata()?;
                let file_name = entry.file_name().to_string_lossy().to_string();

                files.push(LogFileInfo {
                    name: file_name,
                    path: path.to_string_lossy().to_string(),
                    size: metadata.len(),
                    modified: metadata
                        .modified()
                        .ok()
                        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                        .map(|d| d.as_secs()),
                });
            }
        }

        // 按修改时间降序排序（最新的在前）
        files.sort_by(|a, b| {
            b.modified
                .unwrap_or(0)
                .cmp(&a.modified.unwrap_or(0))
        });

        Ok(files)
    }

    /// 清空所有日志文件
    pub async fn clear_all_logs(&self) -> std::io::Result<()> {
        // 清空当前日志文件
        let stdout_path = self.log_dir.join("sidecar-stdout.log");
        let stderr_path = self.log_dir.join("sidecar-stderr.log");

        // 重新创建空文件
        if stdout_path.exists() {
            std::fs::write(&stdout_path, "")?;
        }
        if stderr_path.exists() {
            std::fs::write(&stderr_path, "")?;
        }

        // 删除所有归档文件
        for entry in std::fs::read_dir(&self.log_dir)? {
            let entry = entry?;
            let path = entry.path();
            let file_name = entry.file_name().to_string_lossy().to_string();

            if file_name.starts_with("sidecar-")
                && file_name.ends_with(".log")
                && file_name != "sidecar-stdout.log"
                && file_name != "sidecar-stderr.log"
            {
                std::fs::remove_file(path)?;
            }
        }

        // 重新打开文件
        let stdout_file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&stdout_path)?;

        let stderr_file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&stderr_path)?;

        *self.stdout_writer.lock().await = BufWriter::new(stdout_file);
        *self.stderr_writer.lock().await = BufWriter::new(stderr_file);

        tracing::info!("Cleared all sidecar logs");
        Ok(())
    }
}

/// 日志文件信息
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct LogFileInfo {
    /// 文件名
    pub name: String,
    /// 文件路径
    pub path: String,
    /// 文件大小（字节）
    pub size: u64,
    /// 修改时间（Unix 时间戳）
    pub modified: Option<u64>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[tokio::test]
    async fn test_log_manager_creation() {
        let temp_dir = tempdir().unwrap();
        let log_manager = LogManager::new(temp_dir.path().to_path_buf()).unwrap();

        // 验证日志目录存在
        assert!(temp_dir.path().exists());

        // 验证日志文件被创建
        assert!(temp_dir.path().join("sidecar-stdout.log").exists());
        assert!(temp_dir.path().join("sidecar-stderr.log").exists());
    }

    #[tokio::test]
    async fn test_write_logs() {
        let temp_dir = tempdir().unwrap();
        let log_manager = LogManager::new(temp_dir.path().to_path_buf()).unwrap();

        // 写入日志
        log_manager.write_stdout("Test stdout line 1".to_string()).await.unwrap();
        log_manager.write_stdout("Test stdout line 2".to_string()).await.unwrap();
        log_manager.write_stderr("Test stderr line 1".to_string()).await.unwrap();

        // 读取日志
        let stdout_logs = log_manager.get_recent_logs("stdout", 10).unwrap();
        let stderr_logs = log_manager.get_recent_logs("stderr", 10).unwrap();

        assert_eq!(stdout_logs.len(), 2);
        assert_eq!(stderr_logs.len(), 1);
        assert!(stdout_logs[0].contains("Test stdout line 1"));
        assert!(stderr_logs[0].contains("Test stderr line 1"));
    }

    #[tokio::test]
    async fn test_get_recent_logs() {
        let temp_dir = tempdir().unwrap();
        let log_manager = LogManager::new(temp_dir.path().to_path_buf()).unwrap();

        // 写入多行日志
        for i in 0..10 {
            log_manager
                .write_stdout(format!("Line {}", i))
                .await
                .unwrap();
        }

        // 获取最近 5 行
        let logs = log_manager.get_recent_logs("stdout", 5).unwrap();
        assert_eq!(logs.len(), 5);
        assert!(logs[4].contains("Line 9"));
        assert!(logs[0].contains("Line 5"));
    }

    #[tokio::test]
    async fn test_clear_logs() {
        let temp_dir = tempdir().unwrap();
        let log_manager = LogManager::new(temp_dir.path().to_path_buf()).unwrap();

        // 写入日志
        log_manager.write_stdout("Test line".to_string()).await.unwrap();

        // 验证日志存在
        let logs_before = log_manager.get_recent_logs("stdout", 10).unwrap();
        assert_eq!(logs_before.len(), 1);

        // 清空日志
        log_manager.clear_all_logs().await.unwrap();

        // 验证日志已清空
        let logs_after = log_manager.get_recent_logs("stdout", 10).unwrap();
        assert_eq!(logs_after.len(), 0);
    }
}
