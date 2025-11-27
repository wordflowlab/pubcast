/**
 * PubCast Mock Content Server
 * 
 * Simulates the remote CMS API for development and testing.
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Mock data store
const contents = [
  {
    id: 'content-001',
    title: '如何使用 PubCast 发布内容到多平台',
    body: `# 简介

PubCast 是一款多平台内容发布工具，支持将内容一键发布到微信公众号、小红书等平台。

## 主要功能

1. **账号管理** - 支持多平台账号授权
2. **内容分发** - 一对多批量发布
3. **定时发布** - 支持预设发布时间
4. **发布统计** - 实时查看发布状态

## 使用方法

首先添加您的平台账号，然后选择要发布的内容，最后点击发布按钮即可。`,
    cover_image_url: 'https://picsum.photos/800/600?random=1',
    tags: ['教程', 'PubCast', '多平台发布'],
    category: '教程',
    author: 'PubCast Team',
    source_url: 'https://example.com/article/001',
    status: 'ready',
    updated_at: Date.now() - 3600000,
    created_at: Date.now() - 86400000,
  },
  {
    id: 'content-002',
    title: '2024年自媒体运营趋势分析',
    body: `## 引言

随着短视频和直播的兴起，自媒体运营正在经历深刻变革。

### 关键趋势

- **短视频为王**：抖音、快手继续主导流量
- **私域运营**：从公域到私域的转变
- **AI 内容**：AI 辅助创作成为主流

### 运营建议

坚持内容质量，打造个人品牌，注重用户互动。`,
    cover_image_url: 'https://picsum.photos/800/600?random=2',
    tags: ['运营', '趋势', '自媒体'],
    category: '分析',
    author: '分析师',
    source_url: 'https://example.com/article/002',
    status: 'draft',
    updated_at: Date.now() - 7200000,
    created_at: Date.now() - 172800000,
  },
  {
    id: 'content-003',
    title: '小红书运营实战指南',
    body: `## 小红书运营要点

小红书是年轻用户的种草社区，运营需要注意以下几点：

1. **封面很重要** - 第一眼决定点击率
2. **文案要真实** - 用户喜欢真实分享
3. **标签要精准** - 帮助内容被发现
4. **互动要及时** - 回复评论增加权重`,
    cover_image_url: 'https://picsum.photos/800/600?random=3',
    tags: ['小红书', '运营', '实战'],
    category: '实战',
    author: '运营达人',
    source_url: null,
    status: 'ready',
    updated_at: Date.now() - 1800000,
    created_at: Date.now() - 259200000,
  },
];

// Published status tracking
const publishedStatus = {};

// GET /api/v1/contents - List contents
app.get('/api/v1/contents', (req, res) => {
  const { page = 1, per_page = 20, status, updated_since } = req.query;
  
  let filtered = [...contents];
  
  if (status) {
    filtered = filtered.filter(c => c.status === status);
  }
  
  if (updated_since) {
    const since = parseInt(updated_since);
    filtered = filtered.filter(c => c.updated_at > since);
  }
  
  const start = (page - 1) * per_page;
  const end = start + parseInt(per_page);
  const paginated = filtered.slice(start, end);
  
  res.json({
    contents: paginated,
    total: filtered.length,
    page: parseInt(page),
    per_page: parseInt(per_page),
    has_more: end < filtered.length,
  });
});

// GET /api/v1/contents/:id - Get single content
app.get('/api/v1/contents/:id', (req, res) => {
  const content = contents.find(c => c.id === req.params.id);
  
  if (!content) {
    return res.status(404).json({ error: 'Content not found' });
  }
  
  res.json(content);
});

// POST /api/v1/contents/:id/published - Report publish status
app.post('/api/v1/contents/:id/published', (req, res) => {
  const { platform, published_url, published_at } = req.body;
  
  const content = contents.find(c => c.id === req.params.id);
  if (!content) {
    return res.status(404).json({ error: 'Content not found' });
  }
  
  if (!publishedStatus[req.params.id]) {
    publishedStatus[req.params.id] = [];
  }
  
  publishedStatus[req.params.id].push({
    platform,
    published_url,
    published_at: published_at || Date.now(),
  });
  
  console.log(`Content ${req.params.id} published to ${platform}: ${published_url}`);
  
  res.json({ success: true });
});

// GET /api/v1/contents/:id/published - Get publish status
app.get('/api/v1/contents/:id/published', (req, res) => {
  const status = publishedStatus[req.params.id] || [];
  res.json({ platforms: status });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.listen(PORT, () => {
  console.log(`🚀 PubCast Mock Server running at http://localhost:${PORT}`);
  console.log(`📝 API endpoints:`);
  console.log(`   GET  /api/v1/contents`);
  console.log(`   GET  /api/v1/contents/:id`);
  console.log(`   POST /api/v1/contents/:id/published`);
  console.log(`   GET  /health`);
});
