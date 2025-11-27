/**
 * Tauri API wrapper
 */

import { invoke } from "@tauri-apps/api/core";
import type {
  Account,
  Proxy,
  ProxyHealthResult,
  AIConfig,
  AICheckLog,
  Content,
  DistributionTask,
  CreateDistributionTaskRequest,
} from "./types";

// ============ Proxy Commands ============

export async function listProxies(): Promise<Proxy[]> {
  return invoke("list_proxies");
}

export async function getProxy(id: string): Promise<Proxy> {
  return invoke("get_proxy", { id });
}

export async function addProxy(
  protocol: string,
  host: string,
  port: number,
  username?: string,
  password?: string
): Promise<Proxy> {
  return invoke("add_proxy", { protocol, host, port, username, password });
}

export async function deleteProxy(id: string): Promise<void> {
  return invoke("delete_proxy", { id });
}

export async function checkProxy(id: string): Promise<ProxyHealthResult> {
  return invoke("check_proxy", { id });
}

export async function importProxies(text: string): Promise<Proxy[]> {
  return invoke("import_proxies", { text });
}

// ============ Account Commands ============

export async function listAccounts(): Promise<Account[]> {
  return invoke("list_accounts");
}

export async function listAccountsByPlatform(
  platform: string
): Promise<Account[]> {
  return invoke("list_accounts_by_platform", { platform });
}

export async function getAccount(id: string): Promise<Account> {
  return invoke("get_account", { id });
}

export async function addAccount(
  platform: string,
  name: string,
  username?: string
): Promise<Account> {
  return invoke("add_account", { platform, name, username });
}

export async function updateAccount(
  id: string,
  name?: string,
  username?: string,
  status?: string
): Promise<Account> {
  return invoke("update_account", { id, name, username, status });
}

export async function deleteAccount(id: string): Promise<void> {
  return invoke("delete_account", { id });
}

export async function updateAccountStatus(
  id: string,
  status: string,
  errorMessage?: string
): Promise<void> {
  return invoke("update_account_status", {
    id,
    status,
    error_message: errorMessage,
  });
}

// ============ Content Commands ============

export async function listContents(): Promise<Content[]> {
  return invoke("list_contents");
}

export async function getContent(id: string): Promise<Content> {
  return invoke("get_content", { id });
}

export interface SyncResult {
  synced: number;
  failed: number;
}

export async function syncContents(): Promise<SyncResult> {
  return invoke("sync_contents");
}

// ============ Scheduler Commands ============

export async function createDistributionTask(req: CreateDistributionTaskRequest): Promise<DistributionTask> {
  return invoke("create_distribution_task", { req });
}

export async function getDistributionTask(id: string): Promise<DistributionTask> {
  return invoke("get_distribution_task", { id });
}

export async function listDistributionTasks(): Promise<DistributionTask[]> {
  return invoke("list_distribution_tasks");
}

export async function cancelDistributionTask(id: string): Promise<void> {
  return invoke("cancel_distribution_task", { id });
}

// ============ AI Commands ============

export async function listAIConfigs(): Promise<AIConfig[]> {
  return invoke("list_ai_configs");
}

export async function toggleAIAuth(platform: string): Promise<AIConfig> {
  return invoke("toggle_ai_auth", { platform });
}

export async function runAICheck(): Promise<void> {
  return invoke("run_ai_check");
}

export async function listAILogs(limit?: number): Promise<AICheckLog[]> {
  return invoke("list_ai_logs", { limit });
}

export async function clearAILogs(): Promise<void> {
  return invoke("clear_ai_logs");
}

// ============ Browser Commands ============

export interface BrowserResponse {
  success: boolean;
  error?: string;
  message?: string;
}

export interface PageInfoResponse {
  success: boolean;
  url?: string;
  title?: string;
  error?: string;
}

export interface BrowserSession {
  accountId: string;
  launchedAt: number;
  hasProxy: boolean;
}

export async function browserHealthCheck(): Promise<boolean> {
  return invoke("browser_health_check");
}

export async function launchBrowser(
  accountId: string,
  proxyId?: string,
  headless: boolean = false
): Promise<BrowserResponse> {
  return invoke("launch_browser", { accountId, proxyId, headless });
}

export async function browserNavigate(
  accountId: string,
  url: string
): Promise<BrowserResponse> {
  return invoke("browser_navigate", { accountId, url });
}

export async function browserGetPageInfo(
  accountId: string
): Promise<PageInfoResponse> {
  return invoke("browser_get_page_info", { accountId });
}

export async function browserSaveSession(
  accountId: string
): Promise<BrowserResponse> {
  return invoke("browser_save_session", { accountId });
}

export async function browserClose(accountId: string): Promise<BrowserResponse> {
  return invoke("browser_close", { accountId });
}

export async function browserGetSessions(): Promise<BrowserSession[]> {
  return invoke("browser_get_sessions");
}

export async function browserCloseAll(): Promise<BrowserResponse> {
  return invoke("browser_close_all");
}

// ============ Utility Commands ============

export async function greet(name: string): Promise<string> {
  return invoke("greet", { name });
}

export async function getAppVersion(): Promise<string> {
  return invoke("get_app_version");
}
