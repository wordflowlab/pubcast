/**
 * Platform-specific Adapters
 * Each platform has its own login detection, user info extraction, and publish strategy
 */

import { BasePlatformAdapter, PlatformType, ContentType } from './base.js';

// Helper: wait with human-like delay
async function humanDelay(min = 500, max = 1500) {
  const delay = Math.random() * (max - min) + min;
  await new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * 网易号 Adapter
 */
export class NeteaseAdapter extends BasePlatformAdapter {
  constructor() {
    super({
      id: 'netease',
      name: '网易号',
      type: PlatformType.CONTENT,
      loginUrl: 'https://mp.163.com/',
      homeUrl: 'https://mp.163.com/dashboard',
      publishUrl: 'https://mp.163.com/editor/article',
      color: 'bg-red-600',
      supportedContentTypes: [ContentType.ARTICLE],
    });
  }

  getAuthCookieNames() {
    return ['P_INFO', 'S_INFO', 'NTES_SESS'];
  }

  async checkLoginStatus(page) {
    try {
      // Check for login indicator elements
      const isLoggedIn = await page.evaluate(() => {
        // Look for user avatar or username element
        const avatar = document.querySelector('.user-avatar, .user-info, .avatar');
        const loginBtn = document.querySelector('.login-btn, .btn-login, [class*="login"]');
        return !!avatar && !loginBtn;
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
        const nickname = document.querySelector('.user-name, .nickname, .user-info span')?.textContent?.trim();
        const avatar = document.querySelector('.user-avatar img, .avatar img')?.src;
        return { nickname, avatar };
      });
    } catch {
      return {};
    }
  }
}

/**
 * 搜狐号 Adapter
 */
export class SohuAdapter extends BasePlatformAdapter {
  constructor() {
    super({
      id: 'sohu',
      name: '搜狐号',
      type: PlatformType.CONTENT,
      loginUrl: 'https://mp.sohu.com/',
      homeUrl: 'https://mp.sohu.com/main',
      publishUrl: 'https://mp.sohu.com/mpfe/v3/main/new/article/text',
      color: 'bg-yellow-500',
      supportedContentTypes: [ContentType.ARTICLE],
    });
  }

  getAuthCookieNames() {
    return ['SUV', 'IPLOC', 'sohutag'];
  }

  async checkLoginStatus(page) {
    try {
      const isLoggedIn = await page.evaluate(() => {
        const userInfo = document.querySelector('.user-info, .avatar, .user-name');
        const loginBtn = document.querySelector('.login, .btn-login');
        return !!userInfo && !loginBtn;
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
        const nickname = document.querySelector('.user-name, .nickname')?.textContent?.trim();
        const avatar = document.querySelector('.avatar img, .user-avatar img')?.src;
        return { nickname, avatar };
      });
    } catch {
      return {};
    }
  }
}

/**
 * 百家号 Adapter
 */
export class BaijiahaoAdapter extends BasePlatformAdapter {
  constructor() {
    super({
      id: 'baijia',
      name: '百家号',
      type: PlatformType.CONTENT,
      loginUrl: 'https://baijiahao.baidu.com/',
      homeUrl: 'https://baijiahao.baidu.com/builder/rc/home',
      publishUrl: 'https://baijiahao.baidu.com/builder/rc/edit',
      color: 'bg-blue-600',
      supportedContentTypes: [ContentType.ARTICLE, ContentType.VIDEO],
    });
  }

  getAuthCookieNames() {
    return ['BDUSS', 'BAIDUID', 'STOKEN'];
  }

  async checkLoginStatus(page) {
    try {
      const isLoggedIn = await page.evaluate(() => {
        // Baidu uses BDUSS cookie for login
        const hasUserElement = document.querySelector('.user-portrait, .avatar, .user-name, .bjh-user');
        const hasLoginBtn = document.querySelector('.login-btn, .btn-login, [class*="un-login"]');
        return !!hasUserElement && !hasLoginBtn;
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
        const nickname = document.querySelector('.user-name, .bjh-user-name, .nickname')?.textContent?.trim();
        const avatar = document.querySelector('.user-portrait img, .avatar img')?.src;
        return { nickname, avatar };
      });
    } catch {
      return {};
    }
  }
}

/**
 * 头条号 Adapter
 * Supports article publishing with title, body, cover, and tags
 */
export class ToutiaoAdapter extends BasePlatformAdapter {
  constructor() {
    super({
      id: 'toutiao',
      name: '头条号',
      type: PlatformType.CONTENT,
      loginUrl: 'https://mp.toutiao.com/',
      homeUrl: 'https://mp.toutiao.com/profile_v4/index',
      publishUrl: 'https://mp.toutiao.com/profile_v4/graphic/publish',
      color: 'bg-red-500',
      supportedContentTypes: [ContentType.ARTICLE, ContentType.VIDEO, ContentType.SHORT_VIDEO],
    });
  }

  getAuthCookieNames() {
    return ['sso_uid_tt', 'sessionid', 'ttwid'];
  }

  async checkLoginStatus(page) {
    try {
      const isLoggedIn = await page.evaluate(() => {
        const userArea = document.querySelector('.user-avatar, .avatar, [class*="avatar"]');
        const loginBtn = document.querySelector('.login-btn, [class*="login-btn"]');
        return !!userArea && !loginBtn;
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
        const nickname = document.querySelector('.user-name, .name, [class*="name"]')?.textContent?.trim();
        const avatar = document.querySelector('.user-avatar img, .avatar img')?.src;
        return { nickname, avatar };
      });
    } catch {
      return {};
    }
  }

  // ============ Publishing ============

  async goToPublish(page, contentType = ContentType.ARTICLE) {
    const urls = {
      [ContentType.ARTICLE]: 'https://mp.toutiao.com/profile_v4/graphic/publish',
      [ContentType.VIDEO]: 'https://mp.toutiao.com/profile_v4/upload/video',
      [ContentType.SHORT_VIDEO]: 'https://mp.toutiao.com/profile_v4/xigua/upload',
    };
    await page.goto(urls[contentType] || this.publishUrl, { waitUntil: 'networkidle', timeout: 60000 });
  }

  async fillTitle(page, title) {
    // Wait for title input
    const titleInput = await page.waitForSelector('textarea[placeholder*="标题"], input[placeholder*="标题"], .title-input textarea', { timeout: 10000 });
    await titleInput.click();
    await humanDelay(200, 500);
    await titleInput.fill(title);
    await humanDelay(300, 600);
  }

  async fillBody(page, body) {
    // Toutiao uses a rich text editor (ProseMirror or similar)
    const editor = await page.waitForSelector('.ProseMirror, .editor-content, [contenteditable="true"]', { timeout: 10000 });
    await editor.click();
    await humanDelay(200, 500);
    
    // Clear existing content and paste new
    await page.keyboard.press('Control+A');
    await humanDelay(100, 200);
    
    // Type or paste content
    await editor.evaluate((el, content) => {
      el.innerHTML = content;
    }, body);
    
    await humanDelay(500, 1000);
  }

  async uploadCover(page, imagePath) {
    try {
      // Find cover upload button
      const coverUpload = await page.waitForSelector('.cover-upload input[type="file"], [class*="cover"] input[type="file"]', { timeout: 5000 });
      await coverUpload.setInputFiles(imagePath);
      await humanDelay(2000, 3000);
    } catch (e) {
      console.log('Cover upload not found or failed:', e.message);
    }
  }

  async setTags(page, tags) {
    try {
      // Click tag input
      const tagInput = await page.waitForSelector('.tag-input input, [class*="tag"] input', { timeout: 5000 });
      
      for (const tag of tags.slice(0, 5)) { // Usually max 5 tags
        await tagInput.click();
        await humanDelay(200, 400);
        await tagInput.fill(tag);
        await humanDelay(300, 500);
        await page.keyboard.press('Enter');
        await humanDelay(200, 400);
      }
    } catch (e) {
      console.log('Tag setting failed:', e.message);
    }
  }

  async submitArticle(page) {
    try {
      // Find and click publish button
      const publishBtn = await page.waitForSelector('button:has-text("发布"), .publish-btn, [class*="publish"]', { timeout: 5000 });
      await humanDelay(500, 1000);
      await publishBtn.click();
      
      // Wait for success indicator
      await page.waitForSelector('.success, [class*="success"]', { timeout: 30000 });
      
      // Try to get the published URL
      const url = await page.evaluate(() => {
        const link = document.querySelector('.article-link a, [class*="article-url"]');
        return link?.href || window.location.href;
      });
      
      return { success: true, url };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async publish(page, content) {
    try {
      // Navigate to publish page
      await this.goToPublish(page, content.type || ContentType.ARTICLE);
      await humanDelay(1000, 2000);

      // Fill title
      if (content.title) {
        await this.fillTitle(page, content.title);
      }

      // Fill body
      if (content.body) {
        await this.fillBody(page, content.body);
      }

      // Upload cover
      if (content.cover) {
        await this.uploadCover(page, content.cover);
      }

      // Set tags
      if (content.tags && content.tags.length > 0) {
        await this.setTags(page, content.tags);
      }

      // Submit
      return await this.submitArticle(page);
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

/**
 * 企鹅号 Adapter
 */
export class PenguinAdapter extends BasePlatformAdapter {
  constructor() {
    super({
      id: 'penguin',
      name: '企鹅号',
      type: PlatformType.CONTENT,
      loginUrl: 'https://om.qq.com/',
      homeUrl: 'https://om.qq.com/userAuth/index',
      publishUrl: 'https://om.qq.com/article/write',
      color: 'bg-blue-500',
      supportedContentTypes: [ContentType.ARTICLE, ContentType.VIDEO],
    });
  }

  getAuthCookieNames() {
    return ['uin', 'skey', 'p_uin', 'p_skey'];
  }

  async checkLoginStatus(page) {
    try {
      const isLoggedIn = await page.evaluate(() => {
        const userArea = document.querySelector('.user-avatar, .header-avatar, [class*="avatar"]');
        const loginBtn = document.querySelector('.login, [class*="login"]');
        return !!userArea && !loginBtn;
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
        const nickname = document.querySelector('.user-name, .nick-name')?.textContent?.trim();
        const avatar = document.querySelector('.user-avatar img, .header-avatar img')?.src;
        return { nickname, avatar };
      });
    } catch {
      return {};
    }
  }
}

/**
 * 知乎 Adapter
 */
export class ZhihuAdapter extends BasePlatformAdapter {
  constructor() {
    super({
      id: 'zhihu',
      name: '知乎',
      type: PlatformType.CONTENT,
      loginUrl: 'https://www.zhihu.com/signin',
      homeUrl: 'https://www.zhihu.com/',
      publishUrl: 'https://www.zhihu.com/creator',
      color: 'bg-blue-400',
      supportedContentTypes: [ContentType.ARTICLE],
    });
  }

  getAuthCookieNames() {
    return ['z_c0', 'KLBRSID'];
  }

  async checkLoginStatus(page) {
    try {
      const isLoggedIn = await page.evaluate(() => {
        const avatar = document.querySelector('.Avatar, [class*="Avatar"], .UserLink-avatar');
        const loginBtn = document.querySelector('.SignContainer, [class*="SignIn"]');
        return !!avatar && !loginBtn;
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
        const nickname = document.querySelector('.ProfileHeader-name, .UserLink-link')?.textContent?.trim();
        const avatar = document.querySelector('.Avatar img, .UserLink-avatar img')?.src;
        return { nickname, avatar };
      });
    } catch {
      return {};
    }
  }
}

/**
 * 微信公众号 Adapter
 */
export class WechatAdapter extends BasePlatformAdapter {
  constructor() {
    super({
      id: 'wechat',
      name: '微信公众号',
      type: PlatformType.CONTENT,
      loginUrl: 'https://mp.weixin.qq.com/',
      homeUrl: 'https://mp.weixin.qq.com/cgi-bin/home',
      publishUrl: 'https://mp.weixin.qq.com/cgi-bin/appmsg',
      color: 'bg-green-600',
      supportedContentTypes: [ContentType.ARTICLE],
    });
  }

  getAuthCookieNames() {
    return ['slave_user', 'slave_sid', 'bizuin'];
  }

  async checkLoginStatus(page) {
    try {
      // WeChat MP requires QR code login
      const isLoggedIn = await page.evaluate(() => {
        const qrCode = document.querySelector('.login__type__container__scan, [class*="qrcode"]');
        const dashboard = document.querySelector('.weui-desktop-account, .menu_box, [class*="menu"]');
        return !qrCode && !!dashboard;
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
        const nickname = document.querySelector('.weui-desktop-account__nickname, .nickname')?.textContent?.trim();
        const avatar = document.querySelector('.weui-desktop-account__thumb img, .avatar img')?.src;
        return { nickname, avatar };
      });
    } catch {
      return {};
    }
  }
}

/**
 * 小红书 Adapter
 */
export class XiaohongshuAdapter extends BasePlatformAdapter {
  constructor() {
    super({
      id: 'xiaohongshu',
      name: '小红书',
      type: PlatformType.SOCIAL,
      loginUrl: 'https://creator.xiaohongshu.com/',
      homeUrl: 'https://creator.xiaohongshu.com/creator/home',
      publishUrl: 'https://creator.xiaohongshu.com/publish/publish',
      color: 'bg-red-500',
      supportedContentTypes: [ContentType.IMAGE, ContentType.VIDEO],
    });
  }

  getAuthCookieNames() {
    return ['customer-sso-sid', 'access-token-creator'];
  }

  async checkLoginStatus(page) {
    try {
      const isLoggedIn = await page.evaluate(() => {
        const avatar = document.querySelector('.avatar, .user-avatar, [class*="avatar"]');
        const loginBtn = document.querySelector('.login, [class*="login"]');
        return !!avatar && !loginBtn;
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
        const nickname = document.querySelector('.user-name, .nickname')?.textContent?.trim();
        const avatar = document.querySelector('.avatar img, .user-avatar img')?.src;
        return { nickname, avatar };
      });
    } catch {
      return {};
    }
  }
}

/**
 * 抖音 Adapter
 */
export class DouyinAdapter extends BasePlatformAdapter {
  constructor() {
    super({
      id: 'douyin',
      name: '抖音',
      type: PlatformType.SOCIAL,
      loginUrl: 'https://creator.douyin.com/',
      homeUrl: 'https://creator.douyin.com/creator-micro/home',
      publishUrl: 'https://creator.douyin.com/creator-micro/content/upload',
      color: 'bg-black',
      supportedContentTypes: [ContentType.VIDEO, ContentType.SHORT_VIDEO, ContentType.IMAGE],
    });
  }

  getAuthCookieNames() {
    return ['sessionid', 'sessionid_ss', 'sid_guard'];
  }

  async checkLoginStatus(page) {
    try {
      const isLoggedIn = await page.evaluate(() => {
        const avatar = document.querySelector('.avatar, [class*="avatar"], .semi-avatar');
        const loginBtn = document.querySelector('[class*="login"], .login-btn');
        return !!avatar && !loginBtn;
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
        const nickname = document.querySelector('.user-name, .nickname, [class*="name"]')?.textContent?.trim();
        const avatar = document.querySelector('.avatar img, .semi-avatar img')?.src;
        return { nickname, avatar };
      });
    } catch {
      return {};
    }
  }
}

/**
 * B站 Adapter
 */
export class BilibiliAdapter extends BasePlatformAdapter {
  constructor() {
    super({
      id: 'bilibili',
      name: 'B站',
      type: PlatformType.CONTENT,
      loginUrl: 'https://member.bilibili.com/',
      homeUrl: 'https://member.bilibili.com/platform/home',
      publishUrl: 'https://member.bilibili.com/platform/upload/text/edit',
      color: 'bg-pink-400',
      supportedContentTypes: [ContentType.ARTICLE, ContentType.VIDEO],
    });
  }

  getAuthCookieNames() {
    return ['SESSDATA', 'bili_jct', 'DedeUserID'];
  }

  async checkLoginStatus(page) {
    try {
      const isLoggedIn = await page.evaluate(() => {
        const avatar = document.querySelector('.bili-avatar, .face, [class*="avatar"]');
        const loginBtn = document.querySelector('.login-btn, [class*="login"]');
        return !!avatar && !loginBtn;
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
        const nickname = document.querySelector('.name, .nickname, [class*="name"]')?.textContent?.trim();
        const avatar = document.querySelector('.bili-avatar img, .face img')?.src;
        return { nickname, avatar };
      });
    } catch {
      return {};
    }
  }
}

/**
 * CSDN Adapter
 */
export class CSDNAdapter extends BasePlatformAdapter {
  constructor() {
    super({
      id: 'csdn',
      name: 'CSDN',
      type: PlatformType.CONTENT,
      loginUrl: 'https://mp.csdn.net/',
      homeUrl: 'https://mp.csdn.net/mp_blog/manage/article',
      publishUrl: 'https://editor.csdn.net/md/',
      color: 'bg-red-600',
      supportedContentTypes: [ContentType.ARTICLE],
    });
  }

  getAuthCookieNames() {
    return ['UserName', 'UserToken', 'uuid_tt_dd'];
  }

  async checkLoginStatus(page) {
    try {
      const isLoggedIn = await page.evaluate(() => {
        const avatar = document.querySelector('.avatar, .user-avatar, [class*="avatar"]');
        const loginBtn = document.querySelector('.login-btn, [class*="login"]');
        return !!avatar && !loginBtn;
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
        const nickname = document.querySelector('.user-name, .nickname')?.textContent?.trim();
        const avatar = document.querySelector('.avatar img, .user-avatar img')?.src;
        return { nickname, avatar };
      });
    } catch {
      return {};
    }
  }
}

/**
 * 简书 Adapter
 */
export class JianshuAdapter extends BasePlatformAdapter {
  constructor() {
    super({
      id: 'jianshu',
      name: '简书',
      type: PlatformType.CONTENT,
      loginUrl: 'https://www.jianshu.com/sign_in',
      homeUrl: 'https://www.jianshu.com/writer',
      publishUrl: 'https://www.jianshu.com/writer',
      color: 'bg-red-400',
      supportedContentTypes: [ContentType.ARTICLE],
    });
  }

  getAuthCookieNames() {
    return ['remember_user_token', 'sensorsdata2015jssdkcross'];
  }

  async checkLoginStatus(page) {
    try {
      const isLoggedIn = await page.evaluate(() => {
        const avatar = document.querySelector('.avatar, .user-avatar, [class*="avatar"]');
        const loginBtn = document.querySelector('.sign-in, [class*="sign-in"]');
        return !!avatar && !loginBtn;
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
        const nickname = document.querySelector('.name, .nickname')?.textContent?.trim();
        const avatar = document.querySelector('.avatar img')?.src;
        return { nickname, avatar };
      });
    } catch {
      return {};
    }
  }
}
