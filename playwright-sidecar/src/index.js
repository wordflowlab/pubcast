/**
 * PubCast Playwright Sidecar
 * HTTP API server for browser automation with anti-detection
 */

import express from 'express';
import * as browserManager from './browser-manager.js';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8857;

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'playwright-sidecar' });
});

// Get all active sessions
app.get('/sessions', (req, res) => {
  const sessions = browserManager.getActiveSessions();
  res.json({ success: true, sessions });
});

// Launch browser for an account
app.post('/browser/launch', async (req, res) => {
  try {
    const { accountId, platformId, proxy, headless } = req.body;
    
    if (!accountId) {
      return res.status(400).json({ success: false, error: 'accountId is required' });
    }
    
    const result = await browserManager.launchBrowser({
      accountId,
      platformId, // Pass platformId for login detection
      proxy,
      headless: headless ?? false,
    });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Navigate to URL
app.post('/browser/navigate', async (req, res) => {
  try {
    const { accountId, url } = req.body;
    
    if (!accountId || !url) {
      return res.status(400).json({ success: false, error: 'accountId and url are required' });
    }
    
    const result = await browserManager.navigateTo(accountId, url);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get page info
app.get('/browser/:accountId/info', async (req, res) => {
  try {
    const { accountId } = req.params;
    const result = await browserManager.getPageInfo(accountId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Check login status (real-time check)
app.get('/browser/:accountId/login-status', async (req, res) => {
  try {
    const { accountId } = req.params;
    const result = await browserManager.checkLoginStatus(accountId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get cached login state (from watcher)
app.get('/browser/:accountId/login-state', (req, res) => {
  try {
    const { accountId } = req.params;
    const result = browserManager.getLoginState(accountId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Save session
app.post('/browser/:accountId/save', async (req, res) => {
  try {
    const { accountId } = req.params;
    const result = await browserManager.saveSession(accountId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Close browser
app.post('/browser/:accountId/close', async (req, res) => {
  try {
    const { accountId } = req.params;
    const { saveSession = true } = req.body;
    const result = await browserManager.closeBrowser(accountId, saveSession);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Take screenshot
app.post('/browser/:accountId/screenshot', async (req, res) => {
  try {
    const { accountId } = req.params;
    const result = await browserManager.takeScreenshot(accountId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Execute script
app.post('/browser/:accountId/execute', async (req, res) => {
  try {
    const { accountId } = req.params;
    const { script } = req.body;
    
    if (!script) {
      return res.status(400).json({ success: false, error: 'script is required' });
    }
    
    const result = await browserManager.executeScript(accountId, script);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Close all browsers
app.post('/browser/close-all', async (req, res) => {
  try {
    const results = await browserManager.closeAllBrowsers();
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ Platform Adapter APIs ============

// Get all supported platforms
app.get('/platforms', (req, res) => {
  try {
    const platforms = browserManager.listPlatforms();
    res.json({ success: true, platforms });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get content platforms only (MUST be before :platformId route)
app.get('/platforms/content', (req, res) => {
  try {
    const platforms = browserManager.getContentPlatforms();
    res.json({ success: true, platforms });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get AI platforms only (MUST be before :platformId route)
app.get('/platforms/ai', (req, res) => {
  try {
    const platforms = browserManager.getAIPlatforms();
    res.json({ success: true, platforms });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get platform info (parameterized route - must be AFTER specific routes)
app.get('/platforms/:platformId', (req, res) => {
  try {
    const { platformId } = req.params;
    const info = browserManager.getPlatformInfo(platformId);
    if (!info) {
      return res.status(404).json({ success: false, error: 'Platform not found' });
    }
    res.json({ success: true, platform: info });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Check if platform has saved profile
app.get('/platforms/:platformId/profile', async (req, res) => {
  try {
    const { platformId } = req.params;
    const result = await browserManager.hasProfile(platformId);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete platform profile
app.delete('/platforms/:platformId/profile', async (req, res) => {
  try {
    const { platformId } = req.params;
    const result = await browserManager.deleteProfile(platformId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Check login status for an account
app.get('/browser/:accountId/login-status', async (req, res) => {
  try {
    const { accountId } = req.params;
    const result = await browserManager.checkLoginStatus(accountId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all platform profiles status
app.get('/profiles', async (req, res) => {
  try {
    const platforms = browserManager.listPlatforms();
    const profiles = await Promise.all(
      platforms.map(async (p) => {
        const profileStatus = await browserManager.hasProfile(p.id);
        return {
          ...p,
          ...profileStatus,
        };
      })
    );
    res.json({ success: true, profiles });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ Auth Backup APIs (for cross-device migration) ============

// Get cookies for a platform
app.get('/platforms/:platformId/cookies', async (req, res) => {
  try {
    const { platformId } = req.params;
    const profilePath = `profiles/${platformId}/cookies.json`;
    const fs = await import('fs-extra');
    
    if (await fs.pathExists(profilePath)) {
      const cookies = await fs.readJson(profilePath);
      res.json({ success: true, cookies });
    } else {
      res.json({ success: true, cookies: [] });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get fingerprint for a platform
app.get('/platforms/:platformId/fingerprint', async (req, res) => {
  try {
    const { platformId } = req.params;
    const profilePath = `profiles/${platformId}/fingerprint.json`;
    const fs = await import('fs-extra');
    
    if (await fs.pathExists(profilePath)) {
      const fingerprint = await fs.readJson(profilePath);
      res.json({ success: true, fingerprint });
    } else {
      res.json({ success: true, fingerprint: {} });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Restore cookies and fingerprint for a platform (from database backup)
app.post('/platforms/:platformId/restore', async (req, res) => {
  try {
    const { platformId } = req.params;
    const { cookies, fingerprint } = req.body;
    const fs = await import('fs-extra');
    const path = await import('path');
    
    const profileDir = `profiles/${platformId}`;
    await fs.ensureDir(profileDir);
    
    // Restore cookies
    if (cookies && Array.isArray(cookies)) {
      await fs.writeJson(path.join(profileDir, 'cookies.json'), cookies, { spaces: 2 });
    }
    
    // Restore fingerprint
    if (fingerprint && Object.keys(fingerprint).length > 0) {
      await fs.writeJson(path.join(profileDir, 'fingerprint.json'), fingerprint, { spaces: 2 });
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ Content Publishing APIs ============

// Navigate to publish page
app.post('/browser/:accountId/publish-page', async (req, res) => {
  try {
    const { accountId } = req.params;
    const { contentType = 'article' } = req.body;
    const result = await browserManager.goToPublish(accountId, contentType);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Publish content
app.post('/browser/:accountId/publish', async (req, res) => {
  try {
    const { accountId } = req.params;
    const { title, body, cover, tags, options } = req.body;
    
    if (!title || !body) {
      return res.status(400).json({ success: false, error: 'title and body are required' });
    }
    
    const result = await browserManager.publishContent(accountId, {
      title,
      body,
      cover,
      tags,
      options,
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ AI Chat APIs ============

// Send AI prompt
app.post('/browser/:accountId/ai-chat', async (req, res) => {
  try {
    const { accountId } = req.params;
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ success: false, error: 'prompt is required' });
    }
    
    const result = await browserManager.sendAIPrompt(accountId, prompt);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start new AI conversation
app.post('/browser/:accountId/ai-new', async (req, res) => {
  try {
    const { accountId } = req.params;
    const result = await browserManager.newAIConversation(accountId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[Sidecar] Shutting down...');
  await browserManager.closeAllBrowsers();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n[Sidecar] Shutting down...');
  await browserManager.closeAllBrowsers();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 PubCast Playwright Sidecar running at http://localhost:${PORT}`);
  console.log('');
  console.log('📝 Browser APIs:');
  console.log('   POST /browser/launch');
  console.log('   POST /browser/navigate');
  console.log('   GET  /browser/:id/info');
  console.log('   GET  /browser/:id/login-status');
  console.log('   POST /browser/:id/save');
  console.log('   POST /browser/:id/close');
  console.log('   POST /browser/close-all');
  console.log('');
  console.log('📝 Platform APIs:');
  console.log('   GET  /platforms          (all)');
  console.log('   GET  /platforms/content  (content only)');
  console.log('   GET  /platforms/ai       (AI only)');
  console.log('   GET  /profiles           (with auth status)');
  console.log('');
  console.log('📤 Content Publishing APIs:');
  console.log('   POST /browser/:id/publish-page');
  console.log('   POST /browser/:id/publish');
  console.log('');
  console.log('🤖 AI Chat APIs:');
  console.log('   POST /browser/:id/ai-chat');
  console.log('   POST /browser/:id/ai-new');
});
