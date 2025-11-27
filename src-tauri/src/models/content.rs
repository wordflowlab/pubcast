//! Content model

use serde::{Deserialize, Serialize};

/// Content status
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ContentStatus {
    Draft,
    Ready,
    Published,
    Deleted,
}

impl Default for ContentStatus {
    fn default() -> Self {
        Self::Draft
    }
}

impl std::fmt::Display for ContentStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Draft => write!(f, "draft"),
            Self::Ready => write!(f, "ready"),
            Self::Published => write!(f, "published"),
            Self::Deleted => write!(f, "deleted"),
        }
    }
}

impl std::str::FromStr for ContentStatus {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "draft" => Ok(Self::Draft),
            "ready" => Ok(Self::Ready),
            "published" => Ok(Self::Published),
            "deleted" => Ok(Self::Deleted),
            _ => Err(format!("Unknown content status: {}", s)),
        }
    }
}

/// Content item
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Content {
    pub id: String,
    pub remote_id: Option<String>,
    pub title: String,
    pub body: Option<String>,
    pub cover_image_url: Option<String>,
    pub cover_image_local: Option<String>,
    pub tags: Option<Vec<String>>,
    pub category: Option<String>,
    pub author: Option<String>,
    pub source_url: Option<String>,
    pub status: ContentStatus,
    pub remote_status: Option<String>,
    pub remote_updated_at: Option<i64>,
    pub local_updated_at: i64,
    pub metadata: Option<serde_json::Value>,
    pub created_at: i64,
    pub updated_at: i64,
}

/// Remote content from CMS API
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RemoteContent {
    pub id: String,
    pub title: String,
    pub body: Option<String>,
    pub cover_image_url: Option<String>,
    pub tags: Option<Vec<String>>,
    pub category: Option<String>,
    pub author: Option<String>,
    pub source_url: Option<String>,
    pub status: Option<String>,
    pub updated_at: i64,
    pub created_at: i64,
}

/// Content list response from remote API
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RemoteContentListResponse {
    pub contents: Vec<RemoteContent>,
    pub total: i64,
    pub page: i32,
    pub per_page: i32,
    pub has_more: bool,
}
