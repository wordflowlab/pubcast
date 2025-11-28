/**
 * AI Platform Adapters
 * Adapters for AI chat platforms like ChatGPT, Claude, Gemini, etc.
 */

import { BasePlatformAdapter, PlatformType } from './base.js';

/**
 * ChatGPT Adapter
 */
export class ChatGPTAdapter extends BasePlatformAdapter {
  constructor() {
    super({
      id: 'chatgpt',
      name: 'ChatGPT',
      type: PlatformType.AI_CHAT,
      loginUrl: 'https://chat.openai.com/',
      homeUrl: 'https://chat.openai.com/',
      color: 'bg-green-500',
    });
  }

  getAuthCookieNames() {
    return ['__Secure-next-auth.session-token'];
  }

  async checkLoginStatus(page) {
    try {
      const isLoggedIn = await page.evaluate(() => {
        // Check for chat input or user menu
        const chatInput = document.querySelector('textarea[data-id="root"], #prompt-textarea');
        const loginBtn = document.querySelector('[data-testid="login-button"], .btn-login');
        return !!chatInput && !loginBtn;
      });
      
      if (isLoggedIn) {
        const userInfo = await this.extractUserInfo(page);
        return { isLoggedIn: true, ...userInfo };
      }
      return { isLoggedIn: false };
    } catch {
      return { isLoggedIn: false };
    }
  }

  async extractUserInfo(page) {
    try {
      return await page.evaluate(() => {
        const avatar = document.querySelector('[data-testid="profile-button"] img')?.src;
        return { avatar };
      });
    } catch {
      return {};
    }
  }

  async sendPrompt(page, prompt) {
    // Find and click the textarea
    const textarea = await page.waitForSelector('textarea[data-id="root"], #prompt-textarea', { timeout: 10000 });
    await textarea.click();
    
    // Type the prompt
    await textarea.fill(prompt);
    
    // Find and click send button
    const sendButton = await page.waitForSelector('[data-testid="send-button"], button[aria-label="Send"]', { timeout: 5000 });
    await sendButton.click();
  }

  async waitForResponse(page, timeout = 120000) {
    try {
      // Wait for the stop button to disappear (response complete)
      await page.waitForFunction(() => {
        const stopBtn = document.querySelector('[data-testid="stop-button"], button[aria-label="Stop"]');
        return !stopBtn;
      }, { timeout });
      
      // Additional wait for rendering
      await page.waitForTimeout(1000);
      return true;
    } catch {
      return false;
    }
  }

  async getResponse(page) {
    return await page.evaluate(() => {
      // Get the last assistant message
      const messages = document.querySelectorAll('[data-message-author-role="assistant"]');
      const lastMessage = messages[messages.length - 1];
      return lastMessage?.textContent?.trim() || '';
    });
  }

  async newConversation(page) {
    try {
      // Click new chat button
      const newChatBtn = await page.waitForSelector('[data-testid="new-chat-button"], a[href="/"]', { timeout: 5000 });
      await newChatBtn.click();
      await page.waitForLoadState('networkidle');
    } catch {
      await page.goto(this.homeUrl, { waitUntil: 'networkidle' });
    }
  }
}

/**
 * Claude Adapter
 */
export class ClaudeAdapter extends BasePlatformAdapter {
  constructor() {
    super({
      id: 'claude',
      name: 'Claude',
      type: PlatformType.AI_CHAT,
      loginUrl: 'https://claude.ai/',
      homeUrl: 'https://claude.ai/new',
      color: 'bg-orange-500',
    });
  }

  getAuthCookieNames() {
    return ['sessionKey', '__cf_bm'];
  }

  async checkLoginStatus(page) {
    try {
      const isLoggedIn = await page.evaluate(() => {
        const chatInput = document.querySelector('[contenteditable="true"], textarea');
        const loginBtn = document.querySelector('.login, [class*="login"]');
        return !!chatInput && !loginBtn;
      });
      
      if (isLoggedIn) {
        return { isLoggedIn: true };
      }
      return { isLoggedIn: false };
    } catch {
      return { isLoggedIn: false };
    }
  }

  async sendPrompt(page, prompt) {
    // Find the input area
    const input = await page.waitForSelector('[contenteditable="true"], textarea[placeholder*="Message"]', { timeout: 10000 });
    await input.click();
    
    // Type the prompt
    await input.fill(prompt);
    
    // Press Enter to send
    await page.keyboard.press('Enter');
  }

  async waitForResponse(page, timeout = 120000) {
    try {
      // Wait for streaming to complete
      await page.waitForFunction(() => {
        // Check if there's a "stop" button visible
        const stopBtn = document.querySelector('[aria-label="Stop"], button:has-text("Stop")');
        return !stopBtn;
      }, { timeout });
      
      await page.waitForTimeout(1000);
      return true;
    } catch {
      return false;
    }
  }

  async getResponse(page) {
    return await page.evaluate(() => {
      // Get the last assistant message
      const messages = document.querySelectorAll('[data-is-streaming="false"]');
      const lastMessage = messages[messages.length - 1];
      return lastMessage?.textContent?.trim() || '';
    });
  }

  async newConversation(page) {
    await page.goto('https://claude.ai/new', { waitUntil: 'networkidle' });
  }
}

/**
 * Gemini Adapter
 */
export class GeminiAdapter extends BasePlatformAdapter {
  constructor() {
    super({
      id: 'gemini',
      name: 'Gemini',
      type: PlatformType.AI_CHAT,
      loginUrl: 'https://gemini.google.com/',
      homeUrl: 'https://gemini.google.com/app',
      color: 'bg-blue-500',
    });
  }

  getAuthCookieNames() {
    return ['SID', 'HSID', 'SSID'];
  }

  async checkLoginStatus(page) {
    try {
      const isLoggedIn = await page.evaluate(() => {
        const chatInput = document.querySelector('rich-textarea, [contenteditable="true"]');
        return !!chatInput;
      });
      return { isLoggedIn };
    } catch {
      return { isLoggedIn: false };
    }
  }

  async sendPrompt(page, prompt) {
    const input = await page.waitForSelector('rich-textarea, [contenteditable="true"]', { timeout: 10000 });
    await input.click();
    await input.fill(prompt);
    
    // Click send button
    const sendBtn = await page.waitForSelector('[aria-label="Send message"], button[mat-icon-button]', { timeout: 5000 });
    await sendBtn.click();
  }

  async waitForResponse(page, timeout = 120000) {
    try {
      // Wait for response to complete
      await page.waitForFunction(() => {
        const loading = document.querySelector('[class*="loading"], [class*="generating"]');
        return !loading;
      }, { timeout });
      
      await page.waitForTimeout(1000);
      return true;
    } catch {
      return false;
    }
  }

  async getResponse(page) {
    return await page.evaluate(() => {
      const responses = document.querySelectorAll('.model-response-text, [class*="response"]');
      const lastResponse = responses[responses.length - 1];
      return lastResponse?.textContent?.trim() || '';
    });
  }
}

/**
 * Kimi (Moonshot) Adapter
 */
export class KimiAdapter extends BasePlatformAdapter {
  constructor() {
    super({
      id: 'kimi',
      name: 'Kimi',
      type: PlatformType.AI_CHAT,
      loginUrl: 'https://kimi.moonshot.cn/',
      homeUrl: 'https://kimi.moonshot.cn/',
      color: 'bg-purple-500',
    });
  }

  getAuthCookieNames() {
    return ['access_token', 'refresh_token'];
  }

  async checkLoginStatus(page) {
    try {
      const isLoggedIn = await page.evaluate(() => {
        const chatInput = document.querySelector('textarea, [contenteditable="true"]');
        const loginBtn = document.querySelector('.login-btn, [class*="login"]');
        return !!chatInput && !loginBtn;
      });
      return { isLoggedIn };
    } catch {
      return { isLoggedIn: false };
    }
  }

  async sendPrompt(page, prompt) {
    const input = await page.waitForSelector('textarea', { timeout: 10000 });
    await input.click();
    await input.fill(prompt);
    await page.keyboard.press('Enter');
  }

  async waitForResponse(page, timeout = 120000) {
    try {
      await page.waitForFunction(() => {
        const loading = document.querySelector('[class*="loading"], [class*="typing"]');
        return !loading;
      }, { timeout });
      
      await page.waitForTimeout(1000);
      return true;
    } catch {
      return false;
    }
  }

  async getResponse(page) {
    return await page.evaluate(() => {
      const messages = document.querySelectorAll('[class*="message-content"], [class*="assistant"]');
      const lastMessage = messages[messages.length - 1];
      return lastMessage?.textContent?.trim() || '';
    });
  }
}

/**
 * 通义千问 Adapter
 */
export class QwenAdapter extends BasePlatformAdapter {
  constructor() {
    super({
      id: 'qwen',
      name: '通义千问',
      type: PlatformType.AI_CHAT,
      loginUrl: 'https://tongyi.aliyun.com/qianwen/',
      homeUrl: 'https://tongyi.aliyun.com/qianwen/',
      color: 'bg-blue-600',
    });
  }

  getAuthCookieNames() {
    return ['cna', 'login_aliyunid_ticket'];
  }

  async checkLoginStatus(page) {
    try {
      const isLoggedIn = await page.evaluate(() => {
        const chatInput = document.querySelector('textarea, [contenteditable="true"]');
        const loginBtn = document.querySelector('[class*="login"]');
        return !!chatInput && !loginBtn;
      });
      return { isLoggedIn };
    } catch {
      return { isLoggedIn: false };
    }
  }

  async sendPrompt(page, prompt) {
    const input = await page.waitForSelector('textarea', { timeout: 10000 });
    await input.click();
    await input.fill(prompt);
    
    // Find send button
    const sendBtn = await page.waitForSelector('[class*="send"], button[type="submit"]', { timeout: 5000 });
    await sendBtn.click();
  }

  async waitForResponse(page, timeout = 120000) {
    try {
      await page.waitForFunction(() => {
        const loading = document.querySelector('[class*="loading"], [class*="generating"]');
        return !loading;
      }, { timeout });
      
      await page.waitForTimeout(1000);
      return true;
    } catch {
      return false;
    }
  }

  async getResponse(page) {
    return await page.evaluate(() => {
      const messages = document.querySelectorAll('[class*="message"], [class*="answer"]');
      const lastMessage = messages[messages.length - 1];
      return lastMessage?.textContent?.trim() || '';
    });
  }
}

/**
 * 文心一言 Adapter
 */
export class WenxinAdapter extends BasePlatformAdapter {
  constructor() {
    super({
      id: 'wenxin',
      name: '文心一言',
      type: PlatformType.AI_CHAT,
      loginUrl: 'https://yiyan.baidu.com/',
      homeUrl: 'https://yiyan.baidu.com/',
      color: 'bg-blue-500',
    });
  }

  getAuthCookieNames() {
    return ['BDUSS', 'BAIDUID'];
  }

  async checkLoginStatus(page) {
    try {
      const isLoggedIn = await page.evaluate(() => {
        const chatInput = document.querySelector('textarea, [contenteditable="true"]');
        const loginBtn = document.querySelector('[class*="login"]');
        return !!chatInput && !loginBtn;
      });
      return { isLoggedIn };
    } catch {
      return { isLoggedIn: false };
    }
  }

  async sendPrompt(page, prompt) {
    const input = await page.waitForSelector('textarea', { timeout: 10000 });
    await input.click();
    await input.fill(prompt);
    
    const sendBtn = await page.waitForSelector('[class*="send"], button[type="submit"]', { timeout: 5000 });
    await sendBtn.click();
  }

  async waitForResponse(page, timeout = 120000) {
    try {
      await page.waitForFunction(() => {
        const loading = document.querySelector('[class*="loading"], [class*="generating"]');
        return !loading;
      }, { timeout });
      
      await page.waitForTimeout(1000);
      return true;
    } catch {
      return false;
    }
  }

  async getResponse(page) {
    return await page.evaluate(() => {
      const messages = document.querySelectorAll('[class*="message"], [class*="answer"]');
      const lastMessage = messages[messages.length - 1];
      return lastMessage?.textContent?.trim() || '';
    });
  }
}

/**
 * 豆包 (Doubao) Adapter
 */
export class DoubaoAdapter extends BasePlatformAdapter {
  constructor() {
    super({
      id: 'doubao',
      name: '豆包',
      type: PlatformType.AI_CHAT,
      loginUrl: 'https://www.doubao.com/',
      homeUrl: 'https://www.doubao.com/chat/',
      color: 'bg-blue-500',
    });
  }

  getAuthCookieNames() {
    return ['sessionid', 'ttwid'];
  }

  async checkLoginStatus(page) {
    try {
      const isLoggedIn = await page.evaluate(() => {
        const chatInput = document.querySelector('textarea, [contenteditable="true"]');
        const loginBtn = document.querySelector('[class*="login"], [class*="signin"]');
        return !!chatInput && !loginBtn;
      });
      return { isLoggedIn };
    } catch {
      return { isLoggedIn: false };
    }
  }

  async sendPrompt(page, prompt) {
    const input = await page.waitForSelector('textarea', { timeout: 10000 });
    await input.click();
    await input.fill(prompt);
    await page.keyboard.press('Enter');
  }

  async waitForResponse(page, timeout = 120000) {
    try {
      await page.waitForFunction(() => {
        const loading = document.querySelector('[class*="loading"], [class*="generating"]');
        return !loading;
      }, { timeout });
      await page.waitForTimeout(1000);
      return true;
    } catch {
      return false;
    }
  }

  async getResponse(page) {
    return await page.evaluate(() => {
      const messages = document.querySelectorAll('[class*="message"], [class*="assistant"]');
      const lastMessage = messages[messages.length - 1];
      return lastMessage?.textContent?.trim() || '';
    });
  }
}

/**
 * 元宝 (Yuanbao) Adapter - Tencent
 */
export class YuanbaoAdapter extends BasePlatformAdapter {
  constructor() {
    super({
      id: 'yuanbao',
      name: '元宝',
      type: PlatformType.AI_CHAT,
      loginUrl: 'https://yuanbao.tencent.com/',
      homeUrl: 'https://yuanbao.tencent.com/chat',
      color: 'bg-yellow-500',
    });
  }

  getAuthCookieNames() {
    return ['uin', 'skey', 'p_uin'];
  }

  async checkLoginStatus(page) {
    try {
      const isLoggedIn = await page.evaluate(() => {
        const chatInput = document.querySelector('textarea, [contenteditable="true"]');
        const loginBtn = document.querySelector('[class*="login"], [class*="signin"]');
        return !!chatInput && !loginBtn;
      });
      return { isLoggedIn };
    } catch {
      return { isLoggedIn: false };
    }
  }

  async sendPrompt(page, prompt) {
    const input = await page.waitForSelector('textarea', { timeout: 10000 });
    await input.click();
    await input.fill(prompt);
    await page.keyboard.press('Enter');
  }

  async waitForResponse(page, timeout = 120000) {
    try {
      await page.waitForFunction(() => {
        const loading = document.querySelector('[class*="loading"], [class*="generating"]');
        return !loading;
      }, { timeout });
      await page.waitForTimeout(1000);
      return true;
    } catch {
      return false;
    }
  }

  async getResponse(page) {
    return await page.evaluate(() => {
      const messages = document.querySelectorAll('[class*="message"], [class*="assistant"]');
      const lastMessage = messages[messages.length - 1];
      return lastMessage?.textContent?.trim() || '';
    });
  }
}

/**
 * 智谱清言 (Zhipu/ChatGLM) Adapter
 */
export class ZhipuAdapter extends BasePlatformAdapter {
  constructor() {
    super({
      id: 'zhipu',
      name: '智谱清言',
      type: PlatformType.AI_CHAT,
      loginUrl: 'https://chatglm.cn/',
      homeUrl: 'https://chatglm.cn/main/alltoolsdetail',
      color: 'bg-blue-500',
    });
  }

  getAuthCookieNames() {
    return ['chatglm_token', 'chatglm_refresh_token'];
  }

  async checkLoginStatus(page) {
    try {
      const isLoggedIn = await page.evaluate(() => {
        const chatInput = document.querySelector('textarea, [contenteditable="true"]');
        const loginBtn = document.querySelector('[class*="login"], [class*="signin"]');
        return !!chatInput && !loginBtn;
      });
      return { isLoggedIn };
    } catch {
      return { isLoggedIn: false };
    }
  }

  async sendPrompt(page, prompt) {
    const input = await page.waitForSelector('textarea', { timeout: 10000 });
    await input.click();
    await input.fill(prompt);
    await page.keyboard.press('Enter');
  }

  async waitForResponse(page, timeout = 120000) {
    try {
      await page.waitForFunction(() => {
        const loading = document.querySelector('[class*="loading"], [class*="generating"]');
        return !loading;
      }, { timeout });
      await page.waitForTimeout(1000);
      return true;
    } catch {
      return false;
    }
  }

  async getResponse(page) {
    return await page.evaluate(() => {
      const messages = document.querySelectorAll('[class*="message"], [class*="assistant"]');
      const lastMessage = messages[messages.length - 1];
      return lastMessage?.textContent?.trim() || '';
    });
  }
}

/**
 * DeepSeek Adapter
 */
export class DeepSeekAdapter extends BasePlatformAdapter {
  constructor() {
    super({
      id: 'deepseek',
      name: 'DeepSeek',
      type: PlatformType.AI_CHAT,
      loginUrl: 'https://chat.deepseek.com/',
      homeUrl: 'https://chat.deepseek.com/',
      color: 'bg-indigo-600',
    });
  }

  getAuthCookieNames() {
    return ['ds_session'];
  }

  async checkLoginStatus(page) {
    try {
      const url = page.url();
      // If on sign_in page, not logged in
      if (url.includes('/sign_in')) {
        return { isLoggedIn: false };
      }
      
      const isLoggedIn = await page.evaluate(() => {
        // Check for chat input with "发送消息" placeholder (only visible when logged in)
        const chatInput = document.querySelector('textarea[placeholder*="发送消息"], textarea[placeholder*="message"]');
        // Check for user avatar/name in sidebar (only visible when logged in)
        const userInfo = document.querySelector('[class*="user"], [class*="avatar"], [class*="profile"]');
        // Check for chat history links
        const chatLinks = document.querySelectorAll('a[href*="/chat/"]');
        
        return !!chatInput || !!userInfo || chatLinks.length > 0;
      });
      return { isLoggedIn };
    } catch {
      return { isLoggedIn: false };
    }
  }

  async sendPrompt(page, prompt) {
    const input = await page.waitForSelector('textarea', { timeout: 10000 });
    await input.click();
    await input.fill(prompt);
    await page.keyboard.press('Enter');
  }

  async waitForResponse(page, timeout = 120000) {
    try {
      await page.waitForFunction(() => {
        const loading = document.querySelector('[class*="loading"], [class*="generating"]');
        return !loading;
      }, { timeout });
      
      await page.waitForTimeout(1000);
      return true;
    } catch {
      return false;
    }
  }

  async getResponse(page) {
    return await page.evaluate(() => {
      const messages = document.querySelectorAll('[class*="message"], [class*="assistant"]');
      const lastMessage = messages[messages.length - 1];
      return lastMessage?.textContent?.trim() || '';
    });
  }
}
