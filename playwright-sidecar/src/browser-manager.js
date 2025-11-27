/**
 * Browser Manager
 * Manages browser instances with isolated profiles, proxies, and fingerprints
 */

import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import path from 'path';
import fs from 'fs-extra';
import { v4 as uuidv4 } from 'uuid';
import { generateFingerprint, applyFingerprintToContext, generateStealthScripts } from './fingerprint.js';

// Add stealth plugin
chromium.use(StealthPlugin());

// Store active browser instances
const activeBrowsers = new Map();

// Base directory for browser profiles
const PROFILES_DIR = path.join(process.cwd(), 'profiles');

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
 * Save local storage for an account
 */
async function saveLocalStorage(accountId, localStorage) {
  const storagePath = path.join(getProfilePath(accountId), 'localStorage.json');
  await fs.writeJson(storagePath, localStorage, { spaces: 2 });
}

/**
 * Launch a browser instance for an account
 * 
 * @param {Object} options
 * @param {string} options.accountId - Unique account identifier
 * @param {Object} options.proxy - Proxy configuration { host, port, username, password }
 * @param {boolean} options.headless - Run in headless mode
 * @returns {Object} Browser session info
 */
export async function launchBrowser(options) {
  const { accountId, proxy, headless = false } = options;
  
  await ensureProfilesDir();
  
  // Check if browser already exists for this account
  if (activeBrowsers.has(accountId)) {
    console.log(`[BrowserManager] Browser already active for account ${accountId}`);
    return { success: true, accountId, message: 'Browser already active' };
  }
  
  // Load or create fingerprint
  const fingerprint = await loadOrCreateFingerprint(accountId);
  const contextOptions = applyFingerprintToContext(fingerprint);
  
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
  
  // Browser launch options
  const launchOptions = {
    headless,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-site-isolation-trials',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920,1080',
      '--start-maximized',
    ],
  };
  
  try {
    console.log(`[BrowserManager] Launching browser for account ${accountId}...`);
    
    // Launch browser
    const browser = await chromium.launch(launchOptions);
    
    // Create context with fingerprint
    const context = await browser.newContext(contextOptions);
    
    // Load existing cookies
    const cookies = await loadCookies(accountId);
    if (cookies.length > 0) {
      await context.addCookies(cookies);
      console.log(`[BrowserManager] Loaded ${cookies.length} cookies for account ${accountId}`);
    }
    
    // Inject stealth scripts on every page
    await context.addInitScript(generateStealthScripts(fingerprint));
    
    // Create page
    const page = await context.newPage();
    
    // Store browser instance
    activeBrowsers.set(accountId, {
      browser,
      context,
      page,
      fingerprint,
      proxy,
      launchedAt: Date.now(),
    });
    
    console.log(`[BrowserManager] Browser launched successfully for account ${accountId}`);
    
    return {
      success: true,
      accountId,
      fingerprint,
      message: 'Browser launched successfully',
    };
  } catch (error) {
    console.error(`[BrowserManager] Failed to launch browser for account ${accountId}:`, error);
    return {
      success: false,
      accountId,
      error: error.message,
    };
  }
}

/**
 * Navigate to a URL in the browser
 */
export async function navigateTo(accountId, url) {
  const session = activeBrowsers.get(accountId);
  if (!session) {
    return { success: false, error: 'No active browser for this account' };
  }
  
  try {
    await session.page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
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
    const url = session.page.url();
    const title = await session.page.title();
    return { success: true, url, title };
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
    // Save cookies
    const cookies = await session.context.cookies();
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
    if (saveSessionBeforeClose) {
      await saveSession(accountId);
    }
    
    await session.browser.close();
    activeBrowsers.delete(accountId);
    
    console.log(`[BrowserManager] Browser closed for account ${accountId}`);
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
    await session.page.screenshot({ path: screenshotPath, fullPage: false });
    return { success: true, path: screenshotPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Execute JavaScript in the page
 */
export async function executeScript(accountId, script) {
  const session = activeBrowsers.get(accountId);
  if (!session) {
    return { success: false, error: 'No active browser for this account' };
  }
  
  try {
    const result = await session.page.evaluate(script);
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
