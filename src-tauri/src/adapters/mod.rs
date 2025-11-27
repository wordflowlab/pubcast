//! Platform adapters
//!
//! This module contains the platform adapter trait and implementations.

pub mod traits;
pub mod registry;
pub mod wechat;
pub mod xiaohongshu;

pub use traits::*;
pub use registry::*;
