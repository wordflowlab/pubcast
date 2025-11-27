//! Adapter registry
//!
//! Manages registration and lookup of platform adapters.

use std::collections::HashMap;
use std::sync::Arc;

use crate::error::{PubCastError, Result};

use super::traits::PlatformAdapter;
use super::wechat::WechatAdapter;
use super::xiaohongshu::XiaohongshuAdapter;

/// Registry for platform adapters
pub struct AdapterRegistry {
    adapters: HashMap<String, Arc<dyn PlatformAdapter>>,
}

impl AdapterRegistry {
    /// Create a new adapter registry with default adapters
    pub fn new() -> Self {
        let mut registry = Self {
            adapters: HashMap::new(),
        };

        // Register default adapters
        registry.register(Arc::new(WechatAdapter::new()));
        registry.register(Arc::new(XiaohongshuAdapter::new()));

        registry
    }

    /// Register an adapter
    pub fn register(&mut self, adapter: Arc<dyn PlatformAdapter>) {
        let id = adapter.platform_id().to_string();
        self.adapters.insert(id, adapter);
    }

    /// Get an adapter by platform ID
    pub fn get(&self, platform_id: &str) -> Result<Arc<dyn PlatformAdapter>> {
        self.adapters
            .get(platform_id)
            .cloned()
            .ok_or_else(|| PubCastError::NotFound(format!("Adapter not found: {}", platform_id)))
    }

    /// List all registered platform IDs
    pub fn list_platforms(&self) -> Vec<&str> {
        self.adapters.keys().map(|s| s.as_str()).collect()
    }

    /// Check if a platform is registered
    pub fn has_platform(&self, platform_id: &str) -> bool {
        self.adapters.contains_key(platform_id)
    }
}

impl Default for AdapterRegistry {
    fn default() -> Self {
        Self::new()
    }
}
