/**
 * Browser Manager
 * Manages browser instances with isolated profiles, proxies, and fingerprints
 * 
 * 🔥 Anti-detection features inspired by playwright-mcp:
 * - assistantMode: true (official Playwright anti-detection)
 * - channel: 'chrome' (real Chrome instead of Chromium)
 * - launchPersistentContext (persistent user data)
 * - Internal API calls to avoid tracing
 * - Human behavior simulation
 * - Cloudflare challenge handling
 */

import { chromium } from 'playwright';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import net from 'net';
import { generateFingerprint, applyFingerprintToContext, generateStealthScripts } from './fingerprint.js';

// Store active browser instances
const activeBrowsers = new Map();

// Store login watchers
const loginWatchers = new Map();

// Base directory for browser profiles
const PROFILES_DIR = path.join(process.cwd(), 'profiles');

/**
 * 🔥 Key anti-detection: Use internal API to avoid tracing
 */
async function callOnPageNoTrace(page, callback) {
  if (page._wrapApiCall) {
    return await page._wrapApiCall(() => callback(page), { internal: true });
  }
  return await callback(page);
}

/**
 * 🔥 Human behavior simulation
 */
async function humanDelay(min = 100, max = 300) {
  const delay = Math.random() * (max - min) + min;
  await new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * 🔥 Simulate human mouse movement
 */
async function simulateHumanBehavior(page) {
  try {
    const x = Math.random() * 800 + 100;
    const y = Math.random() * 600 + 100;
    const steps = Math.floor(Math.random() * 10) + 5;
    
    await callOnPageNoTrace(page, async (p) => {
      await p.mouse.move(x, y, { steps });
    });
    
    await humanDelay(500, 1500);
  } catch (e) {
    // Ignore errors from mouse movement
  }
}

/**
 * 🔥 Cloudflare challenge detection
 */
async function isCloudflareChallenge(page) {
  try {
    return await callOnPageNoTrace(page, async (p) => {
      const title = await p.title();
      const url = p.url();
      const content = await p.content();
      
      const titleCheck = title.includes('Just a moment') || 
                        title.includes('Please wait') ||
                        title.includes('Checking your browser');
      
      const urlCheck = url.includes('challenge-platform') ||
                      url.includes('cf_challenge');
      
      const contentCheck = content.includes('cf-browser-verification') ||
                          content.includes('checking your browser') ||
                          content.includes('Ray ID:');
      
      return titleCheck || urlCheck || contentCheck;
    });
  } catch {
    return false;
  }
}

/**
 * 🔥 Handle Cloudflare challenge with human simulation
 */
async function handleCloudflareChallenge(page) {
  try {
    console.log('🔍 Cloudflare challenge detected, waiting...');
    
    await simulateHumanBehavior(page);
    
    let attempts = 0;
    const maxAttempts = 12; // 60 seconds
    
    while (attempts < maxAttempts) {
      const isStillChallenge = await isCloudflareChallenge(page);
      
      if (!isStillChallenge) {
        console.log('✅ Cloudflare challenge passed');
        await humanDelay(1000, 2000);
        return true;
      }
      
      if (attempts % 3 === 0) {
        await simulateHumanBehavior(page);
      }
      
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;
      console.log(`🔄 Waiting for Cloudflare... (${attempts}/${maxAttempts})`);
    }
    
    return false;
  } catch (error) {
    console.warn('⚠️ Cloudflare handling error:', error);
    return false;
  }
}

/**
 * Find a free port
 */
async function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
    server.on('error', reject);
  });
}

/**
 * Ensure profiles directory exists
 */
async function ensureProfilesDir() {
  await fs.ensureDir(PROFILES_DIR);
}

/**
 * Get profile path for an account
 */
function getProfilePath(accountId) {
  return path.join(PROFILES_DIR, accountId);
}

/**
 * Load or create fingerprint for an account
 */
async function loadOrCreateFingerprint(accountId) {
  const fingerprintPath = path.join(getProfilePath(accountId), 'fingerprint.json');
  
  if (await fs.pathExists(fingerprintPath)) {
    return await fs.readJson(fingerprintPath);
  }
  
  const fingerprint = generateFingerprint();
  await fs.ensureDir(getProfilePath(accountId));
  await fs.writeJson(fingerprintPath, fingerprint, { spaces: 2 });
  return fingerprint;
}

/**
 * Save cookies for an account
 */
async function saveCookies(accountId, cookies) {
  const cookiesPath = path.join(getProfilePath(accountId), 'cookies.json');
  await fs.writeJson(cookiesPath, cookies, { spaces: 2 });
}

/**
 * Load cookies for an account
 */
async function loadCookies(accountId) {
  const cookiesPath = path.join(getProfilePath(accountId), 'cookies.json');
  if (await fs.pathExists(cookiesPath)) {
    return await fs.readJson(cookiesPath);
  }
  return [];
}

/**
 * Launch a browser instance for an account
 * 
 * 🔥 Uses launchPersistentContext with anti-detection settings
 * 
 * @param {Object} options
 * @param {string} options.accountId - Unique account identifier (UUID)
 * @param {string} options.platformId - Platform identifier (e.g., 'netease', 'toutiao')
 * @param {Object} options.proxy - Proxy configuration { host, port, username, password }
 * @param {boolean} options.headless - Run in headless mode
 * @returns {Object} Browser session info
 */
export async function launchBrowser(options) {
  const { accountId, platformId, proxy, headless = false } = options;
  
  await ensureProfilesDir();
  
  // Check if browser already exists for this account
  if (activeBrowsers.has(accountId)) {
    console.log(`[BrowserManager] Browser already active for account ${accountId}`);
    return { success: true, accountId, message: 'Browser already active' };
  }
  
  // Load or create fingerprint
  const fingerprint = await loadOrCreateFingerprint(accountId);
  const fingerprintOptions = applyFingerprintToContext(fingerprint);
  
  // User data directory for persistent context
  const userDataDir = getProfilePath(accountId);
  await fs.ensureDir(userDataDir);
  
  // Find a free CDP port
  const cdpPort = await findFreePort();
  
  try {
    console.log(`[BrowserManager] 🚀 Launching browser for account ${accountId} (${platformId || 'unknown'})...`);
    console.log(`[BrowserManager] 📁 User data dir: ${userDataDir}`);
    
    // 🔥 Key anti-detection launch options (from playwright-mcp)
    const launchOptions = {
      // 🔥 Key 1: Use real Chrome instead of Chromium
      channel: 'chrome',
      
      // 🔥 Key 2: Headless mode
      headless,
      
      // 🔥 Key 3: Enable sandbox (more realistic)
      chromiumSandbox: true,
      
      // 🔥 Key 4: assistantMode is the MOST IMPORTANT anti-detection config!
      assistantMode: true,
      
      // CDP port
      cdpPort,
      
      // Timeout
      timeout: 60000,
      
      // 🔥 Key 5: Minimal args (avoid detection by excessive flags)
      args: [
        '--no-first-run',
        '--disable-default-apps',
        '--no-default-browser-check',
        '--start-maximized',
      ],
      
      // Signal handling
      handleSIGINT: false,
      handleSIGTERM: false,
    };
    
    // Context options (from fingerprint)
    const contextOptions = {
      ...fingerprintOptions,
      
      // 🔥 Key: Use real viewport
      viewport: null,
      
      // Locale and timezone
      locale: fingerprint.navigator?.language || 'zh-CN',
      timezoneId: 'Asia/Shanghai',
      
      // Enable JavaScript
      javaScriptEnabled: true,
      
      // Ignore HTTPS errors
      ignoreHTTPSErrors: true,
    };
    
    // Configure proxy if provided
    if (proxy) {
      contextOptions.proxy = {
        server: `${proxy.protocol || 'http'}://${proxy.host}:${proxy.port}`,
      };
      if (proxy.username && proxy.password) {
        contextOptions.proxy.username = proxy.username;
        contextOptions.proxy.password = proxy.password;
      }
    }
    
    // Merge options
    const finalOptions = {
      ...launchOptions,
      ...contextOptions,
    };
    
    console.log('[BrowserManager] 🔧 Launch config:', {
      channel: finalOptions.channel,
      assistantMode: finalOptions.assistantMode,
      chromiumSandbox: finalOptions.chromiumSandbox,
      userDataDir,
    });
    
    // 🔥 Use launchPersistentContext for persistent sessions
    const browserContext = await chromium.launchPersistentContext(userDataDir, finalOptions);
    
    // Get or create page
    let page = browserContext.pages()[0];
    if (!page) {
      page = await browserContext.newPage();
    }
    
    // Inject stealth scripts
    await browserContext.addInitScript(generateStealthScripts(fingerprint));
    
    // Store browser instance
    activeBrowsers.set(accountId, {
      browserContext,
      page,
      fingerprint,
      proxy,
      platformId, // Save platformId for login detection
      userDataDir,
      launchedAt: Date.now(),
    });
    
    console.log(`[BrowserManager] ✅ Browser launched successfully for account ${accountId}`);
    
    return {
      success: true,
      accountId,
      fingerprint,
      message: 'Browser launched successfully',
    };
  } catch (error) {
    console.error(`[BrowserManager] ❌ Failed to launch browser for account ${accountId}:`, error);
    
    // Check for Chrome not installed error
    if (error.message?.includes("Executable doesn't exist")) {
      return {
        success: false,
        accountId,
        error: 'Chrome not installed. Please install Google Chrome.',
      };
    }
    
    return {
      success: false,
      accountId,
      error: error.message,
    };
  }
}

/**
 * Navigate to a URL in the browser
 * 🔥 Enhanced with Cloudflare detection and human behavior
 * 🔥 Auto-starts login watcher if navigating to a login page
 */
export async function navigateTo(accountId, url, options = {}) {
  const session = activeBrowsers.get(accountId);
  if (!session) {
    return { success: false, error: 'No active browser for this account' };
  }
  
  const { watchLogin = true } = options;
  
  try {
    // Set timeouts like playwright-mcp
    session.page.setDefaultNavigationTimeout(60000);
    session.page.setDefaultTimeout(5000);
    
    // Navigate with networkidle
    await session.page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    
    // Extra wait for React apps to render
    await humanDelay(1000, 2000);
    
    // 🔥 Check for Cloudflare challenge
    if (await isCloudflareChallenge(session.page)) {
      await handleCloudflareChallenge(session.page);
    }
    
    // 🔥 Simulate human behavior after navigation
    await simulateHumanBehavior(session.page);
    
    // 🔥 Auto-start login watcher
    if (watchLogin) {
      startLoginWatcher(accountId);
    }
    
    return { success: true, url };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get current page info
 */
export async function getPageInfo(accountId) {
  const session = activeBrowsers.get(accountId);
  if (!session) {
    return { success: false, error: 'No active browser for this account' };
  }
  
  try {
    // 🔥 Use internal API to avoid tracing
    return await callOnPageNoTrace(session.page, async (page) => {
      const url = page.url();
      const title = await page.title();
      return { success: true, url, title };
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Save session (cookies and storage) for an account
 */
export async function saveSession(accountId) {
  const session = activeBrowsers.get(accountId);
  if (!session) {
    return { success: false, error: 'No active browser for this account' };
  }
  
  try {
    // Save cookies from browserContext
    const cookies = await session.browserContext.cookies();
    await saveCookies(accountId, cookies);
    
    console.log(`[BrowserManager] Session saved for account ${accountId}`);
    return { success: true, cookieCount: cookies.length };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Close browser for an account
 */
export async function closeBrowser(accountId, saveSessionBeforeClose = true) {
  const session = activeBrowsers.get(accountId);
  if (!session) {
    return { success: false, error: 'No active browser for this account' };
  }
  
  try {
    // Stop login watcher
    stopLoginWatcher(accountId);
    
    if (saveSessionBeforeClose) {
      await saveSession(accountId);
    }
    
    // Close browserContext (this closes the browser too)
    await session.browserContext.close();
    activeBrowsers.delete(accountId);
    
    console.log(`[BrowserManager] ✅ Browser closed for account ${accountId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get all active browser sessions
 */
export function getActiveSessions() {
  const sessions = [];
  for (const [accountId, session] of activeBrowsers) {
    sessions.push({
      accountId,
      launchedAt: session.launchedAt,
      hasProxy: !!session.proxy,
      userDataDir: session.userDataDir,
    });
  }
  return sessions;
}

/**
 * Close all browsers
 */
export async function closeAllBrowsers() {
  const results = [];
  for (const accountId of activeBrowsers.keys()) {
    const result = await closeBrowser(accountId);
    results.push({ accountId, ...result });
  }
  return results;
}

/**
 * Take a screenshot
 */
export async function takeScreenshot(accountId) {
  const session = activeBrowsers.get(accountId);
  if (!session) {
    return { success: false, error: 'No active browser for this account' };
  }
  
  try {
    const screenshotPath = path.join(getProfilePath(accountId), `screenshot-${Date.now()}.png`);
    // 🔥 Use internal API for screenshot
    await callOnPageNoTrace(session.page, async (page) => {
      await page.screenshot({ path: screenshotPath, fullPage: false });
    });
    return { success: true, path: screenshotPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Execute JavaScript in the page
 * 🔥 Use internal API to avoid tracing
 */
export async function executeScript(accountId, script) {
  const session = activeBrowsers.get(accountId);
  if (!session) {
    return { success: false, error: 'No active browser for this account' };
  }
  
  try {
    // 🔥 Use internal API to avoid detection
    const result = await callOnPageNoTrace(session.page, async (page) => {
      return await page.evaluate(script);
    });
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Import adapters
import { 
  getAdapter, 
  getAllPlatforms, 
  getContentPlatforms,
  getAIPlatforms,
  checkLoginStatus as checkPlatformLogin,
  publishContent as adapterPublish,
  sendAIPrompt as adapterAIChat,
  PlatformType,
  ContentType,
} from './adapters/index.js';

/**
 * Check login status for an account
 * Uses platform-specific adapter to detect login
 */
export async function checkLoginStatus(accountId) {
  const session = activeBrowsers.get(accountId);
  if (!session) {
    return { success: false, error: 'No active browser for this account' };
  }
  
  try {
    // Get platform adapter using platformId from session
    // If not available (old session?), fallback to accountId (for backward compatibility if needed)
    const platformId = session.platformId || accountId;
    const adapter = getAdapter(platformId);
    
    if (!adapter) {
      // Fallback: just check if there are cookies
      const cookies = await session.browserContext.cookies();
      return { 
        success: true, 
        isLoggedIn: cookies.length > 5,
        cookieCount: cookies.length,
        platformId,
      };
    }
    
    // Use adapter to check login status
    const status = await adapter.checkLoginStatus(session.page);
    return { success: true, ...status, platformId };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Start watching for login status changes
 * Automatically saves session when login is detected
 */
export function startLoginWatcher(accountId, onLoginDetected) {
  // Stop existing watcher if any
  stopLoginWatcher(accountId);
  
  console.log(`[BrowserManager] 👀 Starting login watcher for ${accountId}`);
  
  let wasLoggedIn = false;
  let checkCount = 0;
  const maxChecks = 120; // 2 minutes max (1 check per second)
  
  const intervalId = setInterval(async () => {
    checkCount++;
    
    // Stop after max checks
    if (checkCount > maxChecks) {
      console.log(`[BrowserManager] ⏱️ Login watcher timeout for ${accountId}`);
      stopLoginWatcher(accountId);
      return;
    }
    
    const session = activeBrowsers.get(accountId);
    if (!session) {
      console.log(`[BrowserManager] 🛑 Browser closed, stopping watcher for ${accountId}`);
      stopLoginWatcher(accountId);
      return;
    }
    
    try {
      const status = await checkLoginStatus(accountId);
      
      if (status.success && status.isLoggedIn && !wasLoggedIn) {
        console.log(`[BrowserManager] ✅ Login detected for ${accountId}!`);
        wasLoggedIn = true;
        
        // Auto-save session
        await saveSession(accountId);
        console.log(`[BrowserManager] 💾 Session auto-saved for ${accountId}`);
        
        // Mark session as logged in
        session.isLoggedIn = true;
        session.loginDetectedAt = Date.now();
        
        // Callback
        if (onLoginDetected) {
          onLoginDetected(accountId, status);
        }
        
        // Keep watching for logout (don't stop)
      } else if (status.success && !status.isLoggedIn && wasLoggedIn) {
        console.log(`[BrowserManager] ⚠️ Logout detected for ${accountId}`);
        wasLoggedIn = false;
        session.isLoggedIn = false;
      }
    } catch (e) {
      // Ignore errors during check
    }
  }, 1000);
  
  loginWatchers.set(accountId, intervalId);
}

/**
 * Stop login watcher for an account
 */
export function stopLoginWatcher(accountId) {
  const intervalId = loginWatchers.get(accountId);
  if (intervalId) {
    clearInterval(intervalId);
    loginWatchers.delete(accountId);
    console.log(`[BrowserManager] 🛑 Stopped login watcher for ${accountId}`);
  }
}

/**
 * Get login status from session (cached)
 */
export function getLoginState(accountId) {
  const session = activeBrowsers.get(accountId);
  if (!session) {
    return { success: false, error: 'No active browser' };
  }
  return {
    success: true,
    accountId,
    isLoggedIn: session.isLoggedIn || false,
    loginDetectedAt: session.loginDetectedAt || null,
  };
}

/**
 * Get platform info
 */
export function getPlatformInfo(platformId) {
  const adapter = getAdapter(platformId);
  if (!adapter) {
    return null;
  }
  return {
    id: adapter.id,
    name: adapter.name,
    loginUrl: adapter.loginUrl,
    homeUrl: adapter.homeUrl,
    color: adapter.color,
    authCookies: adapter.getAuthCookieNames(),
  };
}

/**
 * Get all supported platforms
 */
export function listPlatforms() {
  return getAllPlatforms();
}

/**
 * Check if platform has saved profile
 */
export async function hasProfile(platformId) {
  const profilePath = getProfilePath(platformId);
  const exists = await fs.pathExists(profilePath);
  
  if (!exists) {
    return { hasProfile: false };
  }
  
  // Check for fingerprint (indicates initialized)
  const fingerprintPath = path.join(profilePath, 'fingerprint.json');
  const hasFingerprint = await fs.pathExists(fingerprintPath);
  
  // Check for Default folder (Chrome user data)
  const defaultPath = path.join(profilePath, 'Default');
  const hasUserData = await fs.pathExists(defaultPath);
  
  // Get profile stats
  let lastModified = null;
  try {
    const stat = await fs.stat(profilePath);
    lastModified = stat.mtime.getTime();
  } catch {}
  
  return {
    hasProfile: hasFingerprint || hasUserData,
    hasFingerprint,
    hasUserData,
    lastModified,
  };
}

/**
 * Delete platform profile
 */
export async function deleteProfile(platformId) {
  const profilePath = getProfilePath(platformId);
  try {
    await fs.remove(profilePath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============ Content Publishing ============

/**
 * Publish content to a platform
 * @param {string} accountId - Platform ID
 * @param {Object} content - Content to publish
 */
export async function publishContent(accountId, content) {
  const session = activeBrowsers.get(accountId);
  if (!session) {
    return { success: false, error: 'No active browser for this account' };
  }
  
  try {
    const platformId = session.platformId || accountId;
    const adapter = getAdapter(platformId);
    if (!adapter) {
      return { success: false, error: 'Unknown platform' };
    }
    
    if (adapter.type !== PlatformType.CONTENT) {
      return { success: false, error: 'Not a content platform' };
    }
    
    console.log(`[BrowserManager] Publishing to ${adapter.name}...`);
    const result = await adapter.publish(session.page, content);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Navigate to publish page
 */
export async function goToPublish(accountId, contentType = 'article') {
  const session = activeBrowsers.get(accountId);
  if (!session) {
    return { success: false, error: 'No active browser for this account' };
  }
  
  try {
    const platformId = session.platformId || accountId;
    const adapter = getAdapter(platformId);
    if (!adapter) {
      return { success: false, error: 'Unknown platform' };
    }
    
    await adapter.goToPublish(session.page, contentType);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============ AI Chat ============

/**
 * Send prompt to AI platform
 * @param {string} accountId - AI Platform ID
 * @param {string} prompt - The prompt to send
 */
export async function sendAIPrompt(accountId, prompt) {
  const session = activeBrowsers.get(accountId);
  if (!session) {
    return { success: false, error: 'No active browser for this account' };
  }
  
  try {
    const platformId = session.platformId || accountId;
    const adapter = getAdapter(platformId);
    if (!adapter) {
      return { success: false, error: 'Unknown platform' };
    }
    
    if (adapter.type !== PlatformType.AI_CHAT) {
      return { success: false, error: 'Not an AI platform' };
    }
    
    console.log(`[BrowserManager] Sending prompt to ${adapter.name}...`);
    const result = await adapter.chat(session.page, prompt);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Start new AI conversation
 */
export async function newAIConversation(accountId) {
  const session = activeBrowsers.get(accountId);
  if (!session) {
    return { success: false, error: 'No active browser for this account' };
  }
  
  try {
    const platformId = session.platformId || accountId;
    const adapter = getAdapter(platformId);
    if (!adapter || adapter.type !== PlatformType.AI_CHAT) {
      return { success: false, error: 'Not an AI platform' };
    }
    
    await adapter.newConversation(session.page);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Export utility functions for external use
export { 
  humanDelay, 
  simulateHumanBehavior, 
  isCloudflareChallenge, 
  handleCloudflareChallenge, 
  getAllPlatforms,
  getContentPlatforms,
  getAIPlatforms,
  PlatformType,
  ContentType,
};
