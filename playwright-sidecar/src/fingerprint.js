/**
 * Browser Fingerprint Generator
 * Generates realistic and unique fingerprints for each browser profile
 */

// Common screen resolutions
const SCREEN_RESOLUTIONS = [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 1536, height: 864 },
  { width: 1440, height: 900 },
  { width: 1280, height: 720 },
  { width: 2560, height: 1440 },
];

// Common user agents (Chrome on macOS/Windows)
const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

// Common timezones
const TIMEZONES = [
  'Asia/Shanghai',
  'Asia/Hong_Kong',
  'Asia/Tokyo',
  'Asia/Singapore',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
];

// Common locales
const LOCALES = [
  'zh-CN',
  'zh-TW',
  'en-US',
  'en-GB',
  'ja-JP',
];

// WebGL vendors and renderers
const WEBGL_CONFIGS = [
  { vendor: 'Google Inc. (Apple)', renderer: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M1, Unspecified Version)' },
  { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 630, OpenGL 4.1)' },
  { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 6700 XT Direct3D11 vs_5_0 ps_5_0, D3D11)' },
];

// Common fonts
const FONTS = [
  'Arial', 'Arial Black', 'Comic Sans MS', 'Courier New', 'Georgia',
  'Impact', 'Times New Roman', 'Trebuchet MS', 'Verdana', 'Helvetica',
  'Microsoft YaHei', 'SimSun', 'SimHei', 'PingFang SC', 'Hiragino Sans GB',
];

/**
 * Generate a random element from array
 */
function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate a random integer in range
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate a unique canvas noise seed
 */
function generateCanvasNoise() {
  return {
    noise: randomInt(1, 10) / 100,
    seed: Math.random().toString(36).substring(2, 15),
  };
}

/**
 * Generate a complete browser fingerprint
 */
export function generateFingerprint(options = {}) {
  const screen = options.screen || randomChoice(SCREEN_RESOLUTIONS);
  const userAgent = options.userAgent || randomChoice(USER_AGENTS);
  const timezone = options.timezone || randomChoice(TIMEZONES);
  const locale = options.locale || randomChoice(LOCALES);
  const webgl = options.webgl || randomChoice(WEBGL_CONFIGS);

  // Derive platform from user agent
  const isMac = userAgent.includes('Macintosh');
  const platform = isMac ? 'MacIntel' : 'Win32';

  // Generate hardware concurrency based on platform
  const hardwareConcurrency = isMac ? randomChoice([8, 10, 12]) : randomChoice([4, 8, 12, 16]);

  // Generate device memory
  const deviceMemory = randomChoice([4, 8, 16, 32]);

  // Generate random fonts subset
  const availableFonts = FONTS.slice(0, randomInt(10, FONTS.length));

  return {
    // Screen
    screen: {
      width: screen.width,
      height: screen.height,
      availWidth: screen.width,
      availHeight: screen.height - randomInt(30, 50), // Account for taskbar
      colorDepth: 24,
      pixelDepth: 24,
      devicePixelRatio: randomChoice([1, 1.25, 1.5, 2]),
    },

    // Navigator
    navigator: {
      userAgent,
      platform,
      language: locale,
      languages: [locale, locale.split('-')[0]],
      hardwareConcurrency,
      deviceMemory,
      maxTouchPoints: isMac ? 0 : randomChoice([0, 5, 10]),
      vendor: 'Google Inc.',
      doNotTrack: null,
    },

    // Timezone
    timezone: {
      id: timezone,
      offset: getTimezoneOffset(timezone),
    },

    // WebGL
    webgl: {
      vendor: webgl.vendor,
      renderer: webgl.renderer,
    },

    // Canvas
    canvas: generateCanvasNoise(),

    // Audio
    audio: {
      noise: randomInt(1, 5) / 1000,
    },

    // Fonts
    fonts: availableFonts,

    // Generated at
    generatedAt: Date.now(),
  };
}

/**
 * Get timezone offset in minutes
 */
function getTimezoneOffset(timezone) {
  const offsets = {
    'Asia/Shanghai': -480,
    'Asia/Hong_Kong': -480,
    'Asia/Tokyo': -540,
    'Asia/Singapore': -480,
    'America/New_York': 300,
    'America/Los_Angeles': 480,
    'Europe/London': 0,
  };
  return offsets[timezone] || 0;
}

/**
 * Apply fingerprint to Playwright context options
 */
export function applyFingerprintToContext(fingerprint) {
  return {
    userAgent: fingerprint.navigator.userAgent,
    viewport: {
      width: fingerprint.screen.width,
      height: fingerprint.screen.height,
    },
    deviceScaleFactor: fingerprint.screen.devicePixelRatio,
    locale: fingerprint.navigator.language,
    timezoneId: fingerprint.timezone.id,
    permissions: ['geolocation'],
    geolocation: getGeolocationFromTimezone(fingerprint.timezone.id),
  };
}

/**
 * Get approximate geolocation from timezone
 */
function getGeolocationFromTimezone(timezone) {
  const locations = {
    'Asia/Shanghai': { latitude: 31.2304, longitude: 121.4737 },
    'Asia/Hong_Kong': { latitude: 22.3193, longitude: 114.1694 },
    'Asia/Tokyo': { latitude: 35.6762, longitude: 139.6503 },
    'Asia/Singapore': { latitude: 1.3521, longitude: 103.8198 },
    'America/New_York': { latitude: 40.7128, longitude: -74.0060 },
    'America/Los_Angeles': { latitude: 34.0522, longitude: -118.2437 },
    'Europe/London': { latitude: 51.5074, longitude: -0.1278 },
  };
  return locations[timezone] || { latitude: 0, longitude: 0 };
}

/**
 * Generate stealth scripts to inject
 */
export function generateStealthScripts(fingerprint) {
  return `
    // Override navigator properties
    Object.defineProperty(navigator, 'platform', { get: () => '${fingerprint.navigator.platform}' });
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => ${fingerprint.navigator.hardwareConcurrency} });
    Object.defineProperty(navigator, 'deviceMemory', { get: () => ${fingerprint.navigator.deviceMemory} });
    Object.defineProperty(navigator, 'maxTouchPoints', { get: () => ${fingerprint.navigator.maxTouchPoints} });
    
    // Override screen properties
    Object.defineProperty(screen, 'width', { get: () => ${fingerprint.screen.width} });
    Object.defineProperty(screen, 'height', { get: () => ${fingerprint.screen.height} });
    Object.defineProperty(screen, 'availWidth', { get: () => ${fingerprint.screen.availWidth} });
    Object.defineProperty(screen, 'availHeight', { get: () => ${fingerprint.screen.availHeight} });
    Object.defineProperty(screen, 'colorDepth', { get: () => ${fingerprint.screen.colorDepth} });
    Object.defineProperty(screen, 'pixelDepth', { get: () => ${fingerprint.screen.pixelDepth} });
    
    // Override WebGL
    const getParameterProxyHandler = {
      apply: function(target, thisArg, args) {
        const param = args[0];
        const gl = thisArg;
        if (param === 37445) return '${fingerprint.webgl.vendor}';
        if (param === 37446) return '${fingerprint.webgl.renderer}';
        return Reflect.apply(target, thisArg, args);
      }
    };
    
    const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = new Proxy(originalGetParameter, getParameterProxyHandler);
    
    if (typeof WebGL2RenderingContext !== 'undefined') {
      const originalGetParameter2 = WebGL2RenderingContext.prototype.getParameter;
      WebGL2RenderingContext.prototype.getParameter = new Proxy(originalGetParameter2, getParameterProxyHandler);
    }
    
    // Add canvas noise
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function(type) {
      const context = this.getContext('2d');
      if (context) {
        const imageData = context.getImageData(0, 0, this.width, this.height);
        for (let i = 0; i < imageData.data.length; i += 4) {
          imageData.data[i] += (Math.random() - 0.5) * ${fingerprint.canvas.noise * 10};
        }
        context.putImageData(imageData, 0, 0);
      }
      return originalToDataURL.apply(this, arguments);
    };
    
    console.log('[Stealth] Fingerprint applied');
  `;
}
