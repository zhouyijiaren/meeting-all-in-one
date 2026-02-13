/**
 * 构建后脚本：在 index.html 中为除 entry 外的所有 JS chunk 注入 <link rel="preload">，
 * 使浏览器在解析 HTML 时就和 entry 并行请求这些 chunk，首屏实现多 JS 并发下载。
 * 使用：在 apps/mobile 目录下执行 node scripts/inject-preload.js
 */
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const htmlPath = path.join(distDir, 'index.html');
const jsDir = path.join(distDir, '_expo', 'static', 'js', 'web');

if (!fs.existsSync(htmlPath) || !fs.existsSync(jsDir)) {
  console.warn('inject-preload: dist or js web dir not found, skip');
  process.exit(0);
}

const html = fs.readFileSync(htmlPath, 'utf8');
// 已通过 <script src="..."> 加载的 entry，不再 preload
const entryMatch = html.match(/src="(\/_expo\/static\/js\/web\/([^"]+\.js))"/);
const entryFile = entryMatch ? entryMatch[2] : null;

const files = fs.readdirSync(jsDir).filter((f) => f.endsWith('.js'));
const toPreload = entryFile ? files.filter((f) => f !== entryFile) : files;
if (toPreload.length === 0) {
  process.exit(0);
}

const base = '/_expo/static/js/web/';
const preloadTags = toPreload
  .map((f) => `<link rel="preload" href="${base}${f}" as="script" />`)
  .join('\n    ');

// 在 </head> 前插入
const newHtml = html.replace('</head>', `    ${preloadTags}\n  </head>`);
fs.writeFileSync(htmlPath, newHtml);
console.log('inject-preload: added', toPreload.length, 'preload links');
