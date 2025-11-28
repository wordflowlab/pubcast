/**
 * Base Platform Adapter
 * Defines the interface for platform-specific operations
 * 
 * Supports:
 * - Authentication (login/logout detection)
 * - Content Publishing (articles, images, videos)
 * - AI Chat (for AI platforms like ChatGPT, Claude, etc.)
 */

// Platform types
export const PlatformType = {
  CONTENT: 'content',    // Content publishing platforms (WeChat, Toutiao, etc.)
  AI_CHAT: 'ai_chat',    // AI chat platforms (ChatGPT, Claude, etc.)
  SOCIAL: 'social',      // Social media (Weibo, Xiaohongshu, etc.)
};

// Content types
export const ContentType = {
  ARTICLE: 'article',
  IMAGE: 'image',
  VIDEO: 'video',
  SHORT_VIDEO: 'short_video',
};

/**
 * Base Platform Adapter
 */
export class BasePlatformAdapter {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.type = config.type || PlatformType.CONTENT;
    this.loginUrl = config.loginUrl;
    this.homeUrl = config.homeUrl;
    this.publishUrl = config.publishUrl;
    this.color = config.color;
    this.supportedContentTypes = config.supportedContentTypes || [ContentType.ARTICLE];
  }

  // ============ Authentication ============

  /**
   * Check if user is logged in
   * @param {Page} page - Playwright page
   * @returns {Promise<{isLoggedIn: boolean, username?: string, avatar?: string}>}
   */
  async checkLoginStatus(page) {
    throw new Error('Not implemented');
  }

  /**
   * Get cookies that indicate login status
   * @returns {string[]} List of cookie names to check
   */
  getAuthCookieNames() {
    return [];
  }

  /**
   * Extract user info from page
   * @param {Page} page - Playwright page
   * @returns {Promise<{username?: string, avatar?: string, nickname?: string}>}
   */
  async extractUserInfo(page) {
    return {};
  }

  /**
   * Navigate to login page
   * @param {Page} page - Playwright page
   */
  async goToLogin(page) {
    await page.goto(this.loginUrl, { waitUntil: 'networkidle', timeout: 60000 });
  }

  /**
   * Navigate to home/dashboard page
   * @param {Page} page - Playwright page
   */
  async goToHome(page) {
    await page.goto(this.homeUrl, { waitUntil: 'networkidle', timeout: 60000 });
  }

  // ============ Content Publishing ============

  /**
   * Navigate to publish page
   * @param {Page} page - Playwright page
   * @param {string} contentType - Type of content to publish
   */
  async goToPublish(page, contentType = ContentType.ARTICLE) {
    if (this.publishUrl) {
      await page.goto(this.publishUrl, { waitUntil: 'networkidle', timeout: 60000 });
    }
  }

  /**
   * Publish content to platform
   * @param {Page} page - Playwright page
   * @param {Object} content - Content to publish
   * @param {string} content.title - Article title
   * @param {string} content.body - Article body (HTML or Markdown)
   * @param {string} content.cover - Cover image URL or path
   * @param {string[]} content.tags - Tags/categories
   * @param {Object} content.options - Platform-specific options
   * @returns {Promise<{success: boolean, url?: string, error?: string}>}
   */
  async publish(page, content) {
    throw new Error('Publish not implemented for this platform');
  }

  /**
   * Fill in article title
   * @param {Page} page - Playwright page
   * @param {string} title - Article title
   */
  async fillTitle(page, title) {
    throw new Error('Not implemented');
  }

  /**
   * Fill in article body
   * @param {Page} page - Playwright page
   * @param {string} body - Article body content
   */
  async fillBody(page, body) {
    throw new Error('Not implemented');
  }

  /**
   * Upload cover image
   * @param {Page} page - Playwright page
   * @param {string} imagePath - Path to cover image
   */
  async uploadCover(page, imagePath) {
    throw new Error('Not implemented');
  }

  /**
   * Set tags/categories
   * @param {Page} page - Playwright page
   * @param {string[]} tags - Tags to set
   */
  async setTags(page, tags) {
    // Default: do nothing (some platforms don't support tags)
  }

  /**
   * Submit the article
   * @param {Page} page - Playwright page
   * @returns {Promise<{success: boolean, url?: string}>}
   */
  async submitArticle(page) {
    throw new Error('Not implemented');
  }

  // ============ AI Chat (for AI platforms) ============

  /**
   * Check if this is an AI chat platform
   */
  isAIChatPlatform() {
    return this.type === PlatformType.AI_CHAT;
  }

  /**
   * Send a message/prompt to AI
   * @param {Page} page - Playwright page
   * @param {string} prompt - The prompt to send
   * @returns {Promise<void>}
   */
  async sendPrompt(page, prompt) {
    throw new Error('AI chat not implemented for this platform');
  }

  /**
   * Wait for AI response to complete
   * @param {Page} page - Playwright page
   * @param {number} timeout - Maximum wait time in ms
   * @returns {Promise<boolean>} - Whether response completed
   */
  async waitForResponse(page, timeout = 120000) {
    throw new Error('AI chat not implemented for this platform');
  }

  /**
   * Get the AI response text
   * @param {Page} page - Playwright page
   * @returns {Promise<string>} - The response text
   */
  async getResponse(page) {
    throw new Error('AI chat not implemented for this platform');
  }

  /**
   * Execute a complete AI chat interaction
   * @param {Page} page - Playwright page
   * @param {string} prompt - The prompt to send
   * @returns {Promise<{success: boolean, response?: string, error?: string}>}
   */
  async chat(page, prompt) {
    try {
      await this.sendPrompt(page, prompt);
      const completed = await this.waitForResponse(page);
      if (!completed) {
        return { success: false, error: 'Response timeout' };
      }
      const response = await this.getResponse(page);
      return { success: true, response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Start a new conversation
   * @param {Page} page - Playwright page
   */
  async newConversation(page) {
    // Default: refresh the page
    await page.reload({ waitUntil: 'networkidle' });
  }
}
