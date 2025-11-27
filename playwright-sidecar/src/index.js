/**
 * PubCast Playwright Sidecar
 * HTTP API server for browser automation with anti-detection
 */

import express from 'express';
import * as browserManager from './browser-manager.js';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3002;

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
    const { accountId, proxy, headless } = req.body;
    
    if (!accountId) {
      return res.status(400).json({ success: false, error: 'accountId is required' });
    }
    
    const result = await browserManager.launchBrowser({
      accountId,
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
  console.log('📝 API endpoints:');
  console.log('   GET  /health');
  console.log('   GET  /sessions');
  console.log('   POST /browser/launch');
  console.log('   POST /browser/navigate');
  console.log('   GET  /browser/:accountId/info');
  console.log('   POST /browser/:accountId/save');
  console.log('   POST /browser/:accountId/close');
  console.log('   POST /browser/:accountId/screenshot');
  console.log('   POST /browser/:accountId/execute');
  console.log('   POST /browser/close-all');
});
