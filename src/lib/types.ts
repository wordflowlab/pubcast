/**
 * Type definitions for PubCast
 */

// Account types
export type AccountStatus = "active" | "expired" | "error" | "unknown";

export interface AIConfig {
  id: string;
  platform: string;
  status: "active" | "inactive" | "expired";
  auth_data?: string;
  created_at: number;
  updated_at: number;
}

export interface AICheckLog {
  id: string;
  platform: string;
  status: "success" | "failed" | "running";
  message?: string;
  duration_ms?: number;
  created_at: number;
}

export interface Account {
  id: string;
  platform: string;
  name: string;
  username: string | null;
  status: AccountStatus;
  last_login_at: number | null;
  last_check_at: number | null;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: number;
  updated_at: number;
}

// Proxy types
export type ProxyProtocol = "http" | "https" | "socks5";
export type ProxyStatus = "healthy" | "unhealthy" | "unknown";
export type ProxyStrategy = "fixed" | "round_robin" | "random";

export interface Proxy {
  id: string;
  protocol: ProxyProtocol;
  host: string;
  port: number;
  username: string | null;
  status: ProxyStatus;
  last_check_at: number | null;
  last_check_ip: string | null;
  last_check_location: string | null;
  fail_count: number;
  created_at: number;
  updated_at: number;
}

export interface ProxyHealthResult {
  proxy_id: string;
  is_healthy: boolean;
  exit_ip: string | null;
  location: string | null;
  latency_ms: number | null;
  error: string | null;
}

// Content types
export type ContentStatus = "draft" | "ready" | "published" | "deleted";

export interface Content {
  id: string;
  remote_id: string | null;
  title: string;
  body: string | null;
  cover_image_url: string | null;
  cover_image_local: string | null;
  tags: string[] | null;
  category: string | null;
  author: string | null;
  source_url: string | null;
  status: ContentStatus;
  remote_status: string | null;
  remote_updated_at: number | null;
  local_updated_at: number;
  metadata: Record<string, unknown> | null;
  created_at: number;
  updated_at: number;
}

// Distribution task types
export type DistributionTaskStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "failed"
  | "cancelled";

export type ScheduleType = "immediate" | "scheduled";

export interface DistributionTask {
  id: string;
  content_id: string;
  name: string | null;
  status: DistributionTaskStatus;
  target_accounts: string[];
  schedule_type: ScheduleType;
  scheduled_at: number | null;
  started_at: number | null;
  completed_at: number | null;
  total_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  error_message: string | null;
  created_at: number;
  updated_at: number;
}

export interface CreateDistributionTaskRequest {
  content_id: string;
  name: string | null;
  target_account_ids: string[];
  schedule_type: ScheduleType;
  scheduled_at: number | null;
}

// Publish job types
export type PublishJobStatus =
  | "pending"
  | "running"
  | "success"
  | "failed"
  | "cancelled";

export interface PublishJob {
  id: string;
  distribution_task_id: string;
  content_id: string;
  account_id: string;
  platform: string;
  status: PublishJobStatus;
  priority: number;
  retry_count: number;
  max_retries: number;
  scheduled_at: number | null;
  started_at: number | null;
  completed_at: number | null;
  published_url: string | null;
  published_id: string | null;
  error_code: string | null;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: number;
  updated_at: number;
}

// Platform types
export interface PlatformConfig {
  id: string;
  platform: string;
  display_name: string;
  enabled: boolean;
  max_title_length: number | null;
  max_content_length: number | null;
  supported_media_types: string[];
  rate_limit_per_hour: number | null;
  requires_review: boolean;
  login_url: string | null;
}

// Statistics types
export interface Statistics {
  stat_date: string;
  platform: string | null;
  account_id: string | null;
  total_publishes: number;
  successful_publishes: number;
  failed_publishes: number;
  avg_duration_ms: number | null;
}
