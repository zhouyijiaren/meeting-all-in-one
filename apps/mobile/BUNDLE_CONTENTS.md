# 各 Bundle 里都打了什么、哪些可能不合理

## Web 构建方式（二选一）

| 方式 | 命令 | 产物目录 | 说明 |
|------|------|----------|------|
| **Vite（推荐）** | `npm run build:web:vite` | `dist-web/` | 多 chunk：react、react-native-web、业务、RoomContent 分离，首屏并行下载 |
| Expo Metro | `npm run export:web` | `dist/` | 单一大 entry + 若干小 chunk，与 Native 同源 |

**Docker 默认已改为使用 Vite 构建**（见仓库根 `Dockerfile`）。本地开发 Web 仍可用 `npx expo start --web`（Metro）；要预览 Vite 产物可 `npm run build:web:vite` 后用任意静态服务器打开 `dist-web/`。

## 构建产物一览（Vite 为例）

| 文件 | 体积(约) | 内容说明 |
|------|----------|----------|
| **index-vite-xxx.js** | **~34 KB** | 业务入口 + 路由（首屏） |
| **react-xxx.js** | **~143 KB** | React + ReactDOM（vendor） |
| **rnw-core-xxx.js** | **~189 KB** | react-native-web 主入口与共享 |
| **rnw-stylesheet-xxx.js** | **~20 KB** | StyleSheet |
| **rnw-touchable-xxx.js** | **~18 KB** | TouchableOpacity / Pressable |
| **rnw-scroll-xxx.js** | **~11 KB** | ScrollView |
| **rnw-components-xxx.js** | **~13 KB** | Image / TextInput / ActivityIndicator 等 |
| **rnw-primitives-xxx.js** | **~6 KB** | View / Text / createElement / Platform |
| RoomContent-xxx.js | ~65 KB | 会议页（懒加载，含 WebRTC、Socket） |

（Expo 构建时则为：entry ~922 KB + _layout/index/[id]/[shortCode]/RoomContent 等小 chunk。）

---

## entry 里都有什么（为何这么大）

entry 的入口是 `expo-router/entry`，会**一次性**拉进整条依赖链，主要包括：

### 1. 框架与运行时（体积大头）

| 来源 | 说明 | 是否合理 |
|------|------|----------|
| **react** + **react-dom** | 基础运行时 | ✅ 必须 |
| **react-native** | 核心 API（Platform、StyleSheet、View、Text 等） | ✅ 必须（Expo 基于 RN） |
| **react-native-web** | 在 Web 上实现 RN 的整套组件与样式，代码量很大 | ⚠️ 首屏必须，但整包偏重 |
| **expo** 系 | expo-constants、expo-linking、expo-status-bar、expo-router 等 | ✅ 路由与能力需要 |
| **@react-navigation/** | react-navigation、native、elements、stack 等整条导航栈 | ⚠️ 首屏只用 Stack，但整条栈都进了 entry |
| **react-native-screens** | 原生/Web 的 Screen 容器 | ✅ 导航需要 |
| **react-native-safe-area-context** | SafeAreaProvider 等 | ✅ 布局需要 |
| **metro-runtime** | 动态加载 chunk 的运行时 | ✅ 必须 |

### 2. 首屏业务代码（合理）

- `app/_layout.js`、`app/index.js`、`app/r/[shortCode].js` 的**壳**（路由定义）
- `src/utils/config.js`、`src/utils/helpers.js`、`src/services/api.js`（首页用到的）
- `src/utils/prefetchRoom.js`（预取会议页）

### 3. 可能不合理或可优化的点

| 现象 | 说明 |
|------|------|
| **@react-navigation 整条栈** | 首屏只用到 Stack，但 Tab、Drawer、Elements 等也打进 entry，因为导航库通常整包引用。 |
| **expo-router 全量** | 路由、错误页、开发用 Toast、多种资源（error/file/forward 等图片）都在 entry。 |
| **react-native-web 全量** | 把 RN 组件在 Web 上实现一遍，体积大；若 Web 端能接受「只做 Web」可考虑不用 RN-Web。 |
| **@supabase/supabase-js** | 在 `package.json` 里，但**当前业务没有 import**，理论上不会进 entry；若将来不用 Supabase 可移除依赖。 |

### 4. 没有进 entry 的（在别的 chunk）

- **react-native-webrtc**、**socket.io-client**：在 **RoomContent** chunk，只有进会议才加载 ✅  
- **会议页 UI**（VideoGrid、ControlBar、ChatPanel、useWebRTC、useChat）：在 **RoomContent** chunk ✅  

---

## 如何自己看「谁占多少」

1. **可视化**（推荐）  
   导出时带上 Atlas，再打开本地可视化：
   ```bash
   EXPO_UNSTABLE_ATLAS=true npx expo export --platform web
   npx expo-atlas .expo/atlas.jsonl
   ```
   浏览器里可以看到模块图和各模块占比（当前 Atlas 对 web 的 jsonl 里模块明细可能不全，但可看依赖关系）。

2. **看依赖树**  
   ```bash
   npx npm ls --all
   ```
   结合上面表格，可以对照哪些包会从 `expo-router/entry` 被拉进 entry。

3. **搜产物**  
   在 `dist/_expo/static/js/web/entry-xxx.js` 里搜索 `node_modules/`，能看到 entry 里实际引到的包路径（如 `@react-navigation/elements`、`expo-router` 等）。

---

## 有没有其他工具可以把 JS 进一步拆成更小的包？

当前 **Expo SDK 52 的 Web 只支持 Metro**，官方已弃用 Webpack（SDK 50+），所以不能通过「换 Webpack + SplitChunksPlugin」在 Expo 里直接拆 vendor。下面是可以考虑的几种方向。

### 1. 继续用 Metro 的「能用的手段」（当前已在用）

- **Async routes**：已开，路由级拆 chunk（_layout、index、RoomContent 等）。
- **动态 import**：会议页已用 `React.lazy` + 动态 import，大块在 RoomContent。
- **Preload**：构建后脚本给其它 chunk 打 preload，首屏多请求并行。

Metro 本身**没有**类似 Webpack 的 `SplitChunksPlugin`，不会自动把 React/RN 拆成单独 vendor.js。

### 2. react-native-bundle-splitter（偏原生，对 Web 帮助有限）

- **作用**：通过 Metro 的 `preloadedModules` / `inlineRequires`，把「首屏必须」和「可延后」的模块分开，减小首包。
- **限制**：文档和配置围绕 **iOS/Android**（如 `packager/modules.ios.js`），Expo 的 **web export 走的是另一套**，不会用这套 preloaded 列表，所以对 **Web 产出的 entry 体积影响很小**，甚至可能没效果。若只做 Native 可以试。

### 3. 自定义 Metro serializer（理论可行，成本高）

- **思路**：自己写或改 Metro 的 serializer，在输出时多产出一个或多个「vendor」chunk（例如把 `node_modules` 里部分包打到 vendor.js，entry 只留业务）。
- **问题**：要深度碰 Metro 的打包流程和运行时加载逻辑，维护成本高，升级 Expo/Metro 容易挂；社区也没有现成的「Web 用 Metro 拆 vendor」的通用方案。

### 4. Web 单独用 Vite / Webpack / Rspack 构建（拆包能力强）

- **做法**：**Web 端不用 Expo 的 `expo export --platform web`**，而是单独起一套构建：
  - 用 **Vite**（`splitVendorChunkPlugin`）或 **Webpack**（`SplitChunksPlugin`）打 Web；
  - 和现有 `app/`、`src/` 共用源码，但 **Web 入口** 自己写（例如只引 React + 轻量路由，不引 react-native-web），或做条件引用。
- **效果**：可以按需拆成 vendor.js、runtime.js、各路由 chunk，首屏只下小份 JS。
- **代价**：要维护两套构建（Metro 给 Native/Expo，Vite/Webpack 给 Web），路由、环境变量、静态资源可能要双份配置或脚本对齐；若 Web 仍要用 react-native-web，体积仍会偏大，只是能拆成多文件并行下。

### 5. 换栈：Web 用纯 React，不用 RN-Web（体积最优）

- **做法**：Web 端不再用「Expo + react-native-web」，而是**单独一个 Web 项目**（如 Vite + React），只复用 API、业务逻辑和部分组件；或同一仓库里 Web 入口用 React DOM，Native 继续用 Expo。
- **效果**：首屏可以很小（只拉 React + 轻量路由 + 首页），没有 RN-Web/Expo 整包。
- **代价**：同一 UI 要维护两套（或做一层抽象），工作量最大。

### 6. 等 Metro / Expo 官方支持 Web 端拆 vendor

- 目前 Metro 和 Expo 的文档里都没有「Web 下自动拆 vendor chunk」的配置；若以后有，再切过去成本最低。

---

**小结**：在**不换构建、不拆 Web 技术栈**的前提下，没有即插即用的工具能把当前 entry 再自动拆成「多个小包」；已做的 async routes + 动态 import + preload 已经是 Metro/Expo 下比较现实的做法。若一定要更小、更多 chunk，只能走「Web 单独用 Vite/Webpack 构建」或「Web 改用纯 React」这类架构级方案。

---

## 小结

- **entry 大**：主要是 **react-native-web + React Navigation 整栈 + Expo 全家桶**，这是「Expo + RN for Web」的常态；首屏要渲染就得要这些。
- **不合理之处**：导航/Expo 全量进 entry、RN-Web 整包；要压体积需要改架构（例如 Web 用纯 React + 轻量路由，或做 vendor 拆包）。
- **已拆出去的**：会议页（WebRTC、Socket、会议室 UI）已在 RoomContent chunk，按需加载；其余小 chunk 为各路由壳，体积很小。
