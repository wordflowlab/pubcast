/**
 * Platform Adapter Factory
 * Manages all platform adapters (Content + AI Chat)
 */

import { PlatformType, ContentType } from './base.js';

// Content platforms
import {
  NeteaseAdapter,
  SohuAdapter,
  BaijiahaoAdapter,
  ToutiaoAdapter,
  PenguinAdapter,
  ZhihuAdapter,
  WechatAdapter,
  XiaohongshuAdapter,
  DouyinAdapter,
  BilibiliAdapter,
  CSDNAdapter,
  JianshuAdapter,
} from './platforms.js';

// AI platforms
import {
  ChatGPTAdapter,
  ClaudeAdapter,
  GeminiAdapter,
  KimiAdapter,
  QwenAdapter,
  WenxinAdapter,
  DeepSeekAdapter,
  DoubaoAdapter,
  YuanbaoAdapter,
  ZhipuAdapter,
} from './ai-platforms.js';

// Create singleton instances
const adapters = new Map();

// Content platform adapters
const contentAdapterClasses = [
  NeteaseAdapter,
  SohuAdapter,
  BaijiahaoAdapter,
  ToutiaoAdapter,
  PenguinAdapter,
  ZhihuAdapter,
  WechatAdapter,
  XiaohongshuAdapter,
  DouyinAdapter,
  BilibiliAdapter,
  CSDNAdapter,
  JianshuAdapter,
];

// AI platform adapters
const aiAdapterClasses = [
  ChatGPTAdapter,
  ClaudeAdapter,
  GeminiAdapter,
  KimiAdapter,
  QwenAdapter,
  WenxinAdapter,
  DeepSeekAdapter,
  DoubaoAdapter,
  YuanbaoAdapter,
  ZhipuAdapter,
];

// Register all adapters
for (const AdapterClass of [...contentAdapterClasses, ...aiAdapterClasses]) {
  const adapter = new AdapterClass();
  adapters.set(adapter.id, adapter);
}

/**
 * Get adapter by platform ID
 * @param {string} platformId
 * @returns {BasePlatformAdapter|null}
 */
export function getAdapter(platformId) {
  return adapters.get(platformId) || null;
}

/**
 * Get all platforms (content + AI)
 */
export function getAllPlatforms() {
  return Array.from(adapters.values()).map(adapter => ({
    id: adapter.id,
    name: adapter.name,
    type: adapter.type,
    loginUrl: adapter.loginUrl,
    homeUrl: adapter.homeUrl,
    publishUrl: adapter.publishUrl,
    color: adapter.color,
    supportedContentTypes: adapter.supportedContentTypes,
  }));
}

/**
 * Get content platforms only (includes CONTENT and SOCIAL types)
 */
export function getContentPlatforms() {
  return getAllPlatforms().filter(p => 
    p.type === PlatformType.CONTENT || p.type === PlatformType.SOCIAL
  );
}

/**
 * Get AI platforms only
 */
export function getAIPlatforms() {
  return getAllPlatforms().filter(p => p.type === PlatformType.AI_CHAT);
}

/**
 * Check login status for a platform
 */
export async function checkLoginStatus(platformId, page) {
  const adapter = getAdapter(platformId);
  if (!adapter) {
    return { isLoggedIn: false, error: 'Unknown platform' };
  }
  return adapter.checkLoginStatus(page);
}

/**
 * Get auth cookie names for a platform
 */
export function getAuthCookieNames(platformId) {
  const adapter = getAdapter(platformId);
  return adapter?.getAuthCookieNames() || [];
}

/**
 * Publish content to a platform
 * @param {string} platformId
 * @param {Page} page
 * @param {Object} content - Content to publish
 */
export async function publishContent(platformId, page, content) {
  const adapter = getAdapter(platformId);
  if (!adapter) {
    return { success: false, error: 'Unknown platform' };
  }
  if (adapter.type !== PlatformType.CONTENT) {
    return { success: false, error: 'Not a content platform' };
  }
  return adapter.publish(page, content);
}

/**
 * Send AI chat prompt
 * @param {string} platformId
 * @param {Page} page
 * @param {string} prompt
 */
export async function sendAIPrompt(platformId, page, prompt) {
  const adapter = getAdapter(platformId);
  if (!adapter) {
    return { success: false, error: 'Unknown platform' };
  }
  if (adapter.type !== PlatformType.AI_CHAT) {
    return { success: false, error: 'Not an AI platform' };
  }
  return adapter.chat(page, prompt);
}

export { adapters, PlatformType, ContentType };
