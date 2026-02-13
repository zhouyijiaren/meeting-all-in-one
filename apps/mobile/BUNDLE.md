# Web 打包与 entry 体积说明

## 这个 1.1MB 的 entry 文件在哪？

**它不是源码里的某个文件**，而是 **构建时生成** 的：

1. **本地构建**：在项目里执行  
   `npx expo export --platform web`  
   产物在 **`apps/mobile/dist/`**，入口 JS 路径类似：  
   `apps/mobile/dist/_expo/static/js/web/entry-[hash].js`

2. **Docker 部署**：Dockerfile 里把前端的 `dist` 拷到后端的 `public`，所以线上你访问的：  
   `https://你的域名/_expo/static/js/web/entry-xxx.js`  
   对应容器内路径是 **`/app/public/_expo/static/js/web/entry-xxx.js`**（即 `server/public/` 下的同名文件）。

每次重新执行 `expo export --platform web`，hash 会变，文件名里的 `entry-6cb1e1e18d4a8578c4b8071c533d30a6.js` 也会变。

---

## 为什么会有 1100KB？

这是 **整站首屏主 bundle（entry）**，会包含：

| 来源 | 说明 |
|------|------|
| **React + React DOM** | 基础运行时 |
| **react-native + react-native-web** | 体积最大的一块：在 Web 上实现 RN 的 View/Text/StyleSheet 等一整套，代码量很大 |
| **Expo 全家桶** | expo-router、expo-status-bar、expo-constants、expo-linking 等 |
| **导航与安全区** | react-native-screens、react-native-safe-area-context |
| **首屏用到的业务代码** | 根布局 `_layout.js`、首页 `index.js`、短链页 `r/[shortCode].js` 以及它们直接依赖的 utils、api（仅 fetch，不含 Socket/WebRTC） |

也就是说：**要跑 Expo + React Native for Web 的首页，就至少要加载这些依赖**，所以 1.1MB 在同类技术栈里是常见范围，但确实偏大。

---

## 有没有必要这么大？

- **从功能上**：要支持「同一套代码跑 Web + 移动端」和 Expo Router，目前这些依赖很难再砍掉，所以 **首屏 entry 体积很难压到很小**。
- **从体验上**：我们已经做了 **会议页懒加载**（`RoomContent` + WebRTC/Socket 进单独 chunk），所以：
  - 进首页、创建会议、短链跳转：只下 **entry 这一大块**（约 1.1MB）。
  - 只有 **点进会议房间** 时才会再拉会议相关的 JS（含 socket.io、react-native-webrtc 等）。

所以：**不是“一个页面就需要 1.1MB”**，而是“**整个框架 + 首页**”打在一起约 1.1MB；会议相关的大头在另一个 chunk。

---

## 想自己看“谁占体积”怎么办？

可以用 Metro 的统计或基于 source map 的分析（需先能生成 source map）。例如：

```bash
cd apps/mobile
npx expo export --platform web
# 若支持，可再跑一次带 stats 的构建并在浏览器里看包内模块分布
```

Expo/Metro 官方文档里会有「Analyzing bundle size」或「Metro bundle visualizer」的说明，按当前 Expo 版本查一下即可。  
看到具体模块后，再考虑：能否把某块从首屏依赖里挪到懒加载、或换成更轻的实现。

---

## 同一个 JS 能并发下载吗？

**不能。** 同一个 URL 对应**一个 HTTP 请求、一个响应流**，浏览器不会把「这一个文件」拆成多段、用多个连接去下。  
所以：**要并发，就必须有「多个 JS 文件」（多个 URL）**，让浏览器对多个 URL 发多个请求，这些请求可以并行（或同一连接上 HTTP/2 多路复用）。

做法就是 **代码分割（code splitting）**：把一个大 entry 拆成多个 chunk（多个 URL），首屏需要的几个 chunk 一起请求，实现**并行下载**，总时间往往比「一个 1.1MB 单文件」更短。  
当前项目里会议页已经拆成独立 chunk（懒加载）。**已为 Web 开启 Expo 的 async routes**，会生成多个 chunk 文件（`entry`、`_layout`、`index`、`[id]`、`[shortCode]`、`RoomContent` 等）。

**为何首屏仍只看到一个 entry 请求？**  
因为 `index.html` 默认只引用一个 `<script src="entry-xxx.js">`，其它 chunk 要等 entry 执行后再按需加载，所以看起来「没有拆成多个 JS」。

**已做：构建后注入 preload**  
在 `apps/mobile/scripts/inject-preload.js` 中，对除 entry 外的所有 chunk 注入 `<link rel="preload" href="..." as="script">`。这样浏览器在解析 HTML 时就会和 entry **并行请求**这些 chunk，首屏实现多 JS 并发下载。  
构建命令使用 `npm run export:web`（内部会先 `expo export --platform web --clear`，再执行注入）。Docker 构建也已改为 `npm run export:web`。

**为何 entry 还是很大（约 900KB）？**  
Entry 里是整份框架（React、React Native、react-native-web、Expo、路由运行时），Expo/Metro 目前不会把这份「vendor」拆成单独文件。拆 vendor 需要自定义 Metro 或换用 Webpack 等，改动较大。当前通过 **preload 让多 chunk 并行下载**，首屏总时间会优于「只下一个大 entry」。

---

## 业内常用优化方案（通用做法）

| 方案 | 说明 | 本项目 |
|------|------|--------|
| **传输压缩** | 服务端对 JS/CSS 做 gzip 或 Brotli，体积常可降 65%～75% | ✅ 已启用：生产环境用 `compression` 中间件 |
| **并发加载** | 首屏只加载必要 chunk，其余按需拉取；多 chunk 可并行请求（HTTP/2 多路复用） | ✅ 会议页已拆成懒加载 chunk，与 entry 并行空间有限但首屏更快 |
| **预取（Prefetch）** | 用户可能去的页面提前在后台拉 chunk（如悬停“进入会议”时预取会议页） | ✅ 见下：首页按钮悬停/聚焦时预取会议页 chunk |
| **Preload / Preconnect** | HTML 里对关键资源 `preload`、对 API 域名 `preconnect`，减少首包等待 | ✅ 已对 API 域名做 preconnect（`_layout.js`） |
| **CDN + 边缘缓存** | 静态资源放 CDN，降低 TTFB、提升带宽，多地域并行 | 部署时把 `public/` 或 `_expo/static` 放到 CDN 即可 |
| **长期缓存** | 带 hash 的文件设 `Cache-Control: max-age=1y`，二次访问直接用本地缓存 | ✅ 生产环境静态已设 `maxAge: '1y'` |
| **Service Worker** | 离线/二次访问时从 SW 缓存取资源，可做“安装即用” | 可选，需单独配置 PWA |

当前已做：**压缩 + 懒加载 + 预取会议页 + preconnect + 长期缓存**。若再要压首包体积，需从技术栈入手（如 Web 用纯 React 替代 react-native-web）或上 CDN。

---

## 小结

- **文件位置**：构建产物在 `dist/_expo/static/js/web/entry-xxx.js`，部署后在 `server/public/` 下同一路径。
- **为什么大**：React + RN + react-native-web + Expo + 首屏页面打成一个 entry，约 1.1MB 是常见情况。
- **是否必要**：框架和首页需要这些代码；会议室已拆成懒加载，进一步减首包需要改架构或换技术栈（例如 Web 端用纯 React 而非 RN-Web）。
