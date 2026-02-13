/**
 * 从 .expo/atlas.jsonl 解析 web 包信息（当前 Atlas 对 web 只输出少量 segment）。
 * 完整模块级占比建议用：npx expo-atlas .expo/atlas.jsonl 在浏览器中查看。
 * 使用：在 apps/mobile 目录下执行 node scripts/bundle-report.js
 * 需先运行：EXPO_UNSTABLE_ATLAS=true npx expo export --platform web
 */
const fs = require('fs');
const path = require('path');

const atlasPath = path.join(__dirname, '..', '.expo', 'atlas.jsonl');
if (!fs.existsSync(atlasPath)) {
  console.error('未找到 .expo/atlas.jsonl，请先执行：');
  console.error('  EXPO_UNSTABLE_ATLAS=true npx expo export --platform web');
  process.exit(1);
}

const lines = fs.readFileSync(atlasPath, 'utf8').trim().split('\n');
let segments = null;
for (const line of lines) {
  if (!line.startsWith('[')) continue;
  try {
    const arr = JSON.parse(line);
    if (arr[0] === 'web' && Array.isArray(arr[5])) {
      segments = arr[5];
      break;
    }
  } catch (_) {}
}

if (!segments || !segments.length) {
  console.error('未在 atlas.jsonl 中找到 web bundle 数据');
  process.exit(1);
}

function fmt(bytes) {
  if (bytes >= 1024 * 1024) return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return bytes + ' B';
}

console.log('========== Atlas 中的 Web bundle segments（当前仅部分数据）==========\n');
let total = 0;
for (const s of segments) {
  const size = s.size ?? 0;
  total += size;
  const rel = (s.relativePath || s.absolutePath || '').replace(/^.*\/node_modules\//, 'node_modules/');
  console.log(fmt(size).padEnd(10), rel);
}
console.log('\n合计:', fmt(total));
console.log('\n说明：完整 entry 约 900KB，上述仅为 Atlas 导出的少量 segment。');
console.log('详细「哪些包打进 entry」见 BUNDLE_CONTENTS.md，或运行：npx expo-atlas .expo/atlas.jsonl');
