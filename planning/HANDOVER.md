# Handover — Mind on Wall

**最后更新：** 2026-08-09（v0.7 品牌升级实施中）
**当前阶段：** v0.7 品牌升级 — i18n/LandingPage/Settings 已更新，待提交
**当前 main 分支 HEAD：** `076a713`
**开发模式：** Multi-Agent 协同开发（延续 v0.5/v0.6 模式）

## 项目一句话

Mind on Wall 是一个桌面优先的数字手帐网页：用户把照片、想法与随手记贴到可换墙纸的白墙上，用 Paper、Stamp 与 Rope 慢慢看见碎片间的关系。

**Slogan（v0.7 已更新）：** *Where ideas find each other.*

## 分支与版本状态（重要）

| 分支 | 状态 |
|---|---|
| `main` | ⭐ 最新稳定版，HEAD `076a713`。**已推送远程**，Vercel 自动构建部署完成 |
| 远程 | GitHub：`https://github.com/dominoghm123/mindonwall` |
| Vercel | ✅ 已部署（mindonwall.vercel.app），构建产物 ~1,136 kB |

- 版本号：package.json `0.5.0`（⚠️ 未随 v0.6 更新，v0.7 需 bump 到 `0.7.0`）
- 流程：合入 main + tag → Vercel 自动构建部署

## v0.4 Completed (tag v0.4)

| Commit | 内容 |
|---|---|
| `307231c` | resolve Vercel build errors (@types/node, vite.config URL, defensive orphan check) |
| `869360e` | Move-to Project in card menu + batch move + New Project in TopBar |

### v0.4 核心特性
- **短链分享**：`api/share.ts`（nanoid TTL 30天）+ `api/event.ts`（埋点 TTL 90天）
- **Project 分组管理**：CRUD + 拖拽归组 + 批量移动 + 孤儿墙防御
- **数据迁移**：一次性旧墙迁移入 Uncategorized

## v0.7 品牌升级（进行中）

### 品牌核心决策

| 要素 | 内容 |
|------|------|
| **Tagline** | Where ideas find each other. |
| **定位** | 私人拼贴墙 vs 效率工作台（对立于 Milanote/Notion） |
| **品牌人格** | 创造者 + 探险家 |
| **信息架构** | My Spaces → Space → Wall → 物件 |
| **价值观** | 自由优先 / 私人空间 / 发现乐趣 |
| **目标用户** | 年轻设计师、写作者、旅行者 |
| **商业化** | 免费 + 高级功能（Freemium） |
| **传播** | 小红书 + 黑客松 |

### 已完成的变更

| 文件 | 变更内容 |
|------|----------|
| `README.md` | 中英双语重写，品牌调性（不是技术文档风格） |
| `src/i18n/en.ts` + 9 语言文件 | tagline、auth、Settings About、Project→Space 文案全量更新 |
| `src/components/auth/LandingPage.tsx` | 右侧视觉升级（纸张纹理 + 手帐物件拼贴 + Rope 动画）；左侧文案 + GitHub 链接 |
| `src/components/pages/UserPages.tsx` | Settings About 区块扩展（品牌故事 + 哲学 + GitHub 链接） |

### 待完成

- 交互优化：物件类型扩展（md文档/声音/视频）、TopBar/Spaces 逻辑重构、Rope 连线方案 B（Alt+拖拽）
- Onboarding：示例墙 + 3 步引导气泡
- 版本号 bump 到 0.7.0

### 方案文档

详见 `docs/superpowers/specs/brand-upgrade-v0.7.md`

---

## v0.6 Completed

| Commit | 内容 |
|---|---|
| `076a713` | fix(build): 移除无效的 --force 标志 |
| `0399aca` | fix(build): 强制 Vite 重新构建并清除所有缓存 |
| `b9bafe5` | fix(vercel): 移除非法的 disableBuildCache 属性 |
| `4986c0e` | fix(vercel): 禁用 build cache 以解决部署产物大小异常 |
| `9fb515c` | fix(build): 改用 tsc --noEmit 替代 tsc -b 解决 Vercel 缓存问题 |
| `31eafd3` | fix(build): 清除 TypeScript 增量编译缓存以修复 Vercel 部署 |
| `84eca71` | fix(api): 修复 CORS_HEADERS 类型错误 (TS2345) |
| `20066f1` | fix(v0.6): 修复 TypeScript 编译错误（未使用的导入和参数） |
| `6548b2f` | feat(v0.6): 注册登录、LandingPage 重构、Merge 逻辑修正、Project 菜单 |

### v0.6 核心特性

- **注册登录系统**：
  - Supabase Auth 集成（邮箱/GitHub/Google OAuth）
  - LandingPage 左右分栏布局（左侧表单 + 右侧品牌视觉）
  - signUp auto-login 逻辑（绕过邮箱验证）
  - OAuth `redirectTo: window.location.origin`

- **Merge 逻辑修正**：拖拽 Wall 到 Project 改为移动（非合并内容）

- **Project 卡片三点菜单**：Rename/Delete 入口（功能待补充）

- **Vercel 部署修复**：
  - API 文件 CORS_HEADERS 类型修复（`{}` → `new Headers({})`）
  - 构建脚本改为 `tsc --noEmit && vite build`（绕过增量编译缓存）
  - Vercel Dashboard 环境变量配置（VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY）

## v0.5 Completed (tag v0.5)

| Commit | 内容 |
|---|---|
| `c3d3688` | resolve build errors (duplicate props, missing i18n keys, unused params) |
| `a004847` | Track B - drag/merge/multiselect/shortcuts (B1-B4) |
| `5dd3cb3` | Track C - brand visual upgrade (C1-C6) |
| `0a90893` | account management section (change password, cloud sync, delete account) |
| `ec9fd61` | data isolation by userId, cloud sync API + store actions |
| `6dd64fd` | AuthModal + AuthGuard components, AvatarMenu dual-state |
| `283b304` | Supabase client, Auth Store, auth init in App, i18n auth keys |
| `032d252` | init: bump to 0.5.0, install @supabase/supabase-js |

### v0.5 核心特性

- **账户管理 (Track A)**：
  - Supabase Auth 集成（邮箱/GitHub/Google OAuth）
  - AuthModal 组件（登录/注册/密码重置/登出/删除账户）
  - AvatarMenu 双状态（未登录 = Sign In 按钮，已登录 = 头像菜单含 Settings/Logout/Delete）
  - AuthGuard 保护云同步接口
  - Change Password 页面（Settings 页 Tab 5 子项）

- **云同步 (Cloud Sync)**：
  - `api/sync.ts`（Supabase JWT 验证 + service role key upsert/select）
  - useAuthStore（auth state listener + signUp/signIn/signOut/deleteAccount/changePassword）
  - useOverviewStore 扩展（syncToCloud/loadFromCloud/switchUser，按 userId 隔离 localStorage key）
  - `user_data` 表 + RLS（select/insert/update policy）
  - `.env.local` 配置（VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY）

- **品牌视觉升级 (Track C)**：
  - Design Token System（src/theme/tokens.ts — 颜色/阴影/圆角/间距/字体/过渡常量）
  - Ghost button pattern（透明背景 + hover #F0F0F0 + shadow 替代 border）
  - Subtle shadow 替代 border（卡片 `0 1px 3px`、菜单 `0 4px 12px`、弹窗 `0 8px 24px`）
  - Logo + Favicon（Pin + 纸卷 SVG → logo.svg / favicon.svg / index.html）
  - Journal 物件纹理增强（PaperObject SVG noise overlay + sticky corner curl；Stamp ink filter feDisplacementMap；RopeLayer fiber stroke-dasharray；Pin radial gradient + highlight）

- **交互深化 (Track B)**：
  - B1 Drag & Drop — WallCard 拖到 Project header drop zone（html5 drag API, dataTransfer, onDragStart/Over/Drop/End）
  - B2 Drag-to-Merge — WallCard 互相拖叠自动合并（drag overlay scale(1.02) dashed border, merge confirm dialog, handleMerge 函数）
  - B3 Box Selection — 空区域 pointerdown 框选多卡片（getBoundingClientRect 交叉检测，pointer events 自动激活 manage mode）
  - B4 Quick Actions — Double-click edit, right-click rename, Ctrl+D duplicate, Delete key delete

## v0.3 完成记录（提交链）

| Commit | 内容 |
|---|---|
| `5764968` | Connection Map 初版：自动布局、节点拖拽（独立 undo）、隐藏子节点、按墙持久化、PNG 导出 |
| `f5aaa60` | PDF 导出（jsPDF）、Spread PNG 导出、URL 分享（lz-string 编码） |
| `22b1b6e` | Map 重构为 XMind 风格抽象树；修复导出空白；Share 并入 Export 菜单；tape/墙纸/rope 打磨 |
| `79fbbf6` | Profile / Materials / Settings 三页（头像菜单入口） |
| `e6862b0` | viewMode 刷新默认总览、800px+ 宽高比锁定、总览网格自适应 |
| `de6eb85` | **r2**：Settings profile+上传、Library（内置素材+Manage）、Map 编辑（双击/删除/连线/无白底/隐藏空节点） |
| `d80bf28` | **r3**：Plain 墙纸置首、工具栏 hover 提速、Library 收藏夹 + 内置素材可删、设置背景实时预览修复 |
| `8f81b50` | **r4**：返回按钮统一；收藏夹窗口内编辑（重命名/增减素材 + Confirm）；White 背景默认+迁移；Map 端点单击连线/右键线菜单/删除不重排；**i18n 全站 10 语言**；Settings 新增 Language/About+Version/隐私条款/数据导出+重置/使用说明/Contact |
| `7b63324` | **r5**：Library 过滤/操作栏移至 Collections 下方（层级：Collections → 过滤栏 → 素材） |

## v0.3 核心特性清单

- **Wall Editor**：图片/纸片/印章上传与编辑、rope 连线（点 Pin 或 Map 端点）、attach/detach、右键改色、长按旋转（整角磁吸）、墙纸 7 预设（默认 White）
- **Connection Map**：XMind 风格抽象树，双击编辑节点、端点单击连线、右键线改色/删除、节点/线删除不重排布局、拖拽平移、PNG 导出
- **总览页**：Manage 多选删除、卡片菜单（Rename/Duplicate/Export/Share/Delete）、多墙数据
- **用户页**：Profile（统计+头像上传）、Library（收藏夹：窗口内编辑+Confirm；内置素材可删可恢复；Manage 批量删除）、Settings（8 区块：Profile/Home background/Storage/Language/User Guide/About & Version/Data Management/Contact + 隐私条款弹窗 + 重置确认）
- **i18n**：10 语言（en/zh-CN/zh-TW/ja/ko/es/fr/de/pt/ru），全站无残留硬编码英文（除语言按钮本身的语言名）
- **导出/分享**：Spread PNG、PDF（jsPDF）、URL 分享（lz-string）、全量数据 JSON 备份

## i18n 架构（新增，务必了解后再改文案）

- `src/i18n/en.ts`：**唯一 key 来源**，扁平 key；新增文案必须先在这里加 key，`TKey = keyof typeof en`
- `src/i18n/langs/*.ts`：9 个语言文件各导出 `Record<TKey, string>`，TS 强制 key 完整——en.ts 加 key 后 9 个文件都要补，否则 tsc 报错
- `src/i18n/index.ts`：`getT(lang)` 返回 `TFunc`（支持 `{x}` 变量替换，缺 key 回退 en）
- 组件内：`const t = useT()`；**非组件环境**（store/中间件）：`getT(useOverviewStore.getState().language)`
- 模块级常量数组（FILTERS/PAPER_TABS/BG_OPTIONS 等）label 存 TKey，渲染时 `t(label)`
- useCallback 用到 t 要加进 deps；局部变量勿命名 `t`（遮蔽翻译函数）

## 关键文件地图（v0.3 更新）

```
src/
├── App.tsx                          ← 主集成（viewMode 路由：overview/wall/map + 用户页）
├── i18n/                            ← en.ts + langs/×9 + index.ts + useT.ts
├── store/
│   ├── useWallStore.ts              ← 当前墙 items/ropes/undo
│   ├── useUIStore.ts                ← viewMode/selectedIds/ropeMode/attachMode/toast
│   ├── useOverviewStore.ts          ← 墙列表 + language（i18n 语言状态）
│   ├── useAssetStore.ts             ← 素材库（上传/内置/收藏夹 collections）
│   └── adapters/                    ← localStorage / indexedDB 双适配器
├── components/
│   ├── canvas/InfiniteCanvas.tsx    ← zoom/pan（原生非 passive wheel）
│   ├── chrome/{TopBar,BottomToolbar,ZoomWidget}.tsx
│   ├── map/ConnectionMapPage.tsx    ← 端点连线、右键线菜单、删除不重排
│   ├── overview/OverviewPage.tsx
│   ├── pages/UserPages.tsx          ← Profile/Library/Settings（~1470 行，改 UI 重点看这里）
│   ├── objects/                     ← ObjectWrapper/Paper/Picture/Stamp/Pin/Rope
│   └── shared/                      ← ContextMenu/AssetPickerModal/AvatarMenu/Toast
└── utils/{ropeGeometry,wallpaperCSS}.ts
```

## 部署相关事实

- **纯静态 SPA**：Vite 7，构建 `npm run build`（即 `tsc --noEmit && vite build`，输出 `dist/`）
- **Vercel 部署**：
  - `vercel.json` 配置 SPA 路由（所有路径 fallback 到 `index.html`）
  - 环境变量需在 Vercel Dashboard 配置（`.env.local` 不提交 git）：`VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`
  - 构建产物正常大小 ~1,136 kB；若产物异常缩小（~918 kB），优先检查环境变量是否缺失
  - API Routes（`api/` 目录）由 Vercel 单独进行 TS 类型检查，`CORS_HEADERS` 必须用 `new Headers({})` 而非 `{}`
- **数据全在浏览器 localStorage**：keys `mindonwall-wall` / `-ui` / `-overview` / `-map` / `-assets`；换设备/清缓存即丢数据——Settings 已提供"导出全量 JSON"作为备份手段
- **云同步后端**：`api/sync.ts`（Supabase JWT 验证 + service role key upsert/select）
- **demo 素材在 `public/demo-assets/`**，会随构建打包
- **版本号注入**：`vite.config.ts` `define: { __APP_VERSION__ }` 读 package.json，改版本后 dev server 必须重启
- **OAuth Redirect URLs**：Supabase Dashboard → Authentication → URL Configuration 需添加 `https://mindonwall.vercel.app` 和 `http://localhost:*`

## v0.7 迭代规划

### 优先级 1：品牌升级（全触点）

**目标**：统一品牌表达，覆盖 LandingPage、GitHub README、Settings 产品介绍等所有用户触点。

**⚠️ 审阅流程**：品牌升级方案需先出截图/预览，用户审阅回复通过后才可实施代码修改。

**具体任务**：

#### 1.1 LandingPage 升级
- [ ] **嵌入动效示意**：右侧 SVG 静态图改为 CSS/JS 动效，展示 pin → rope → connection 的动态过程
  - 参考：pin 逐个出现 → rope 线条生长动画 → 节点高亮
  - 技术：CSS `@keyframes` + `stroke-dashoffset` 动画，或 Lottie/FRAMER Motion
- [ ] **GitHub 仓库链接**：添加按钮/链接跳转到 `https://github.com/dominoghm123/mindonwall`
  - 说明项目核心目的、解决的痛点和使用场景（可链接到 README 特定章节）
- [ ] **Slogan 更新**：`"Map Your Thoughts"` → `"Let's connect and organise your random ideas on a visual wall."`
  - 文件：`LandingPage.tsx` 第 284 行 + `i18n/en.ts` 对应 key
- [ ] **右侧视觉层次**：当前 SVG rope 图较平淡，考虑增加：
  - 真实手帐素材缩略图（photo/paper/stamp）作为节点
  - 更丰富的色彩和纹理
  - 微交互（hover 节点时 rope 高亮）

#### 1.2 GitHub README 品牌化
- [ ] 重写 `README.md`，包含：
  - 项目一句话介绍 + Slogan
  - 核心痛点（想法碎片化、难以建立关联）
  - 使用场景（旅行手帐、研究笔记、创意头脑风暴、项目管理）
  - 功能特性列表（Wall Editor / Connection Map / Cloud Sync / i18n）
  - 技术栈（Vite + React + TS + Supabase + Vercel）
  - 截图/GIF 展示（LandingPage、Wall Editor、Connection Map）
  - 本地开发 & 部署指南

#### 1.3 Settings / About 产品介绍
- [ ] Settings 页面的 About & Version 区块增加产品介绍文案
  - 简述项目愿景和核心功能
  - 链接到 GitHub 仓库
  - 可考虑添加"What's New"更新日志区域

**涉及文件**：
- `src/components/auth/LandingPage.tsx`（LandingPage 动效）
- `README.md`（GitHub 品牌化）
- `src/components/pages/UserPages.tsx`（Settings About 区块）
- `src/i18n/en.ts` + 9 个语言文件（slogan / about 文案 key）

### 优先级 2：TopBar 编辑项下移 + 鼠标 Bug 修复

**目标**：将 TopBar 中的编辑相关按钮移到底部工具栏区域，修复鼠标交互 bug。

**⚠️ 审阅流程**：UI 布局变更需先出截图/预览，用户审阅回复通过后才可实施代码修改。

**具体任务**：
- [ ] **TopBar 精简**：将以下编辑项从 TopBar 移到主页面/BottomToolbar：
  - Edit/View Toggle 按钮（`TopBar.tsx` 第 299-340 行）→ 移到底部工具栏或画布内浮窗
  - Undo/Redo 按钮（`TopBar.tsx` 第 355-388 行）→ 考虑移到画布角落或键盘快捷键提示
  - Export 下拉菜单（`TopBar.tsx` 第 391-447 行）→ 可保留或移到 AvatarMenu 下拉
- [ ] **鼠标 Bug 排查**：用户反馈"鼠标所在处有 bug"
  - 可能原因：TopBar 的 `handleMouseLeave` 逻辑（第 121-131 行）在鼠标快速移动时异常触发
  - 可能原因：`onMouseLeave={() => setVisible(false)}`（第 202 行）与 `handleMouseMove` 冲突
  - 建议：用浏览器 DevTools 录制鼠标交互，定位具体触发条件
- [ ] **TopBar 保留项**：返回箭头、墙名、Wall/Map Tab、Saved 指示、AvatarMenu

**涉及文件**：
- `src/components/chrome/TopBar.tsx`（主要修改）
- `src/components/chrome/BottomToolbar.tsx`（接收下移的编辑项）

### 优先级 3：整体 UI 优化

**目标**：提升 Settings、Library 和 Wall 内页的视觉质量和交互体验。

**⚠️ 审阅流程**：UI 优化方案需先出截图/预览，用户审阅回复通过后才可实施代码修改。

**具体任务**：
- [ ] **Settings 页面重构**：
  - 当前 `UserPages.tsx` ~1470 行，Settings 部分代码冗长
  - 考虑拆分为独立组件：`SettingsPage.tsx`（含 Profile/Storage/Language/Data/About 子 Tab）
  - 视觉升级：参考现代 SaaS 设置页（如 Linear、Notion）的分组卡片布局
- [ ] **Library 页面优化**：
  - 素材网格布局优化（当前 64×64 缩略图偏小）
  - 添加拖拽素材直接上墙的功能（当前需先点击再放置）
  - 收藏夹交互优化
- [ ] **Wall 内页交互升级**：
  - Rope 创建交互优化（当前需进入 rope 模式，考虑改为按住 modifier key 直接连线）
  - 物件选中/移动的微动效（scale/shadow transition）
  - 双击物件快速编辑（当前部分支持）
  - 右键菜单功能扩展（改色、复制、锁定等）
- [ ] **Design Token 应用**：`src/theme/tokens.ts` 已定义颜色/阴影/圆角常量，但部分组件仍用硬编码值，需统一替换

**涉及文件**：
- `src/components/pages/UserPages.tsx`（Settings/Library 重构）
- `src/components/chrome/BottomToolbar.tsx`（Library 拖拽上墙）
- `src/components/objects/ObjectWrapper.tsx`（选中/移动动效）
- `src/theme/tokens.ts`（统一 design token）

### 开发工作流（Multi-Agent 协同）

延续 v0.5/v0.6 的 Multi-Agent 协同开发模式：
- **Agent 分工**：按功能模块拆分任务，多个 Agent 并行处理不同模块（如 LandingPage / TopBar / Settings 可同时推进）
- **审阅门禁**：品牌升级和 UI 优化的任何变更，必须先出截图/预览 → 用户审阅回复通过 → 才可实施代码修改
- **提交规范**：每完成一个功能点立即 commit；修订轮整轮一个 commit
- **分支策略**：v0.7 从 main 新开 `feature/v0.7-*` 分支，完成后合入 main + tag

### 待确认事项

- [ ] **URL 路由方案**：当前使用状态路由（URL 不变），是否需要引入 hash 路由（`/#overview`、`/#wall`）以支持：
  - 浏览器前进/后退
  - 分享特定页面状态的链接
  - SEO（虽然 SPA 意义有限）
- [x] ~~**Supabase OAuth Redirect**~~：✅ 已修复，Dashboard 已添加 `https://mindonwall.vercel.app` 到 Redirect URLs
- [ ] **移动端适配**：当前桌面优先，v0.7 暂不做（用户确认延后）
- [ ] **版本号**：package.json 仍为 `0.5.0`，v0.7 启动时需 bump 到 `0.7.0`

## 下一窗口任务（历史，供参考）

### 1. 产品化部署（用户已预告：审阅通过后立即开始）

- 与用户确认：托管平台（推荐 Vercel）、自定义域名、是否需要 base path 配置
- 建议步骤：push v0.3 分支 → 合入 main + tag v0.3 → 平台接入仓库自动部署 → 验证线上功能（localStorage 数据、字体、demo 素材路径）
- 部署后验证清单：总览/编辑器/Map/三个用户页、语言切换、导出、分享链接

### 2. v0.4 迭代规划（基于已部署产品）

可讨论的候选方向（历史待办沉淀）：
- **真实分享后端**：当前分享是 URL 编码全量数据，长墙链接极长；可上服务端短链
- **云同步/账号体系**：localStorage 单机限制是最大产品短板
- Project 层级（多项目分组）
- 移动端适配（当前桌面优先）
- AI 助手（早期 PRD 提及，一直推迟）

## 开发环境与命令

- 启动：`npx vite --port 3000`（**项目路径含 emoji，shell 命令必须完整引号引用**）
- 类型检查：`npx tsc --noEmit`
- 构建：`npm run build`
- localStorage 重置：浏览器 console `localStorage.clear()`
- Git 规范：每完成一个功能点立即 commit；修订轮整轮一个 commit（如 r5）

## 已知坑（保留，均为实测踩出）

- **改 package.json version 后必须重启 dev server**，vite define 只在启动时读取
- 图片 URL 必须带扩展名，Vite 对无扩展名路径返回 index.html
- 附着 Stamp 的 x/y 是绝对坐标（>1 判断），附着子物件用比例坐标，不计入 Fit
- React onWheel 是 passive，须原生 `addEventListener('wheel', h, { passive: false })`（只挂画布容器，勿全局）
- 画布变换层 div 无固有尺寸，内嵌 svg 用 `width:100%` 得 0×0（RopeLayer 用 1px + overflow:visible）
- 数据迁移必须放 `if (initialized) return;` 之前（initialized 已持久化）
- Vite HMR 假报错（Hooks order 等），硬刷新即消失，非真实 bug
- 浮窗层 DOM 约定：`data-toolbar-ui`（工具栏/面板/ZoomWidget）、`data-menu-layer`（右键菜单/弹窗）、`data-map-node`（Map 节点）；新增固定层 UI 需加入 App 的空白点击排除选择器
- `pointerEvents:'none'` 容器收不到 mouseleave，浮窗隐藏用 document 级 mousemove
- **SearchReplace 经验**：Grep 显示会剥离匹配行前导空白，验证文件状态必须用 Read；报 "save failed unknown" 时内容可能已写入，先 Read 验证再决定重试
- 浏览器自动化验证：Chrome 窗口最小化时截图超时，改用 DOM 检查 / evaluate_script
- **Vercel 环境变量缺失导致 tree-shaking**：`.env.local` 不提交 git，Vercel Dashboard 必须手动配置 `VITE_*` 变量。缺失时 Vite 静默删除相关代码，产物体积异常缩小但不报错
- **Vercel API Routes 类型检查**：`api/` 目录不在 `tsconfig.app.json` include 中，本地 `tsc -b` 不检查，但 Vercel 会单独检查。`setHeaders()` 参数必须是 `new Headers({})` 而非普通对象 `{}`
- **`tsc -b` 增量编译与 Vercel build cache 冲突**：Vercel 恢复旧 `.tsbuildinfo` 导致跳过编译。解决方案：改用 `tsc --noEmit`（只做类型检查，不生成缓存文件）
- **`disableBuildCache` 不是合法 vercel.json 字段**：会导致 Vercel 构建报错。清除 build cache 只能通过 Dashboard 手动操作
- **`vite build --force` 无效**：`--force` 只适用于 `vite` dev 模式，build 模式不支持

## UI 规范（新增组件必须遵守）

- 所有 UI 文字默认英文，走 i18n key（见上）
- **Design Token**：颜色/阴影/圆角/间距/字体/过渡常量定义在 `src/theme/tokens.ts`，新组件优先使用 token 而非硬编码
- **Ghost Button 模式**：透明背景 + hover `#F0F0F0` + subtle shadow 替代 border（v0.5 引入）
- **Subtle Shadow 层级**：卡片 `0 1px 3px`、菜单 `0 4px 12px`、弹窗 `0 8px 24px`（v0.5 引入）
- 浮窗：纯白 #FFFFFF + 1px border，无毛玻璃；顶栏 40px；物件零投影
- 返回按钮样式全站统一（r4 已统一，改任何页面返回按钮参考 UserPages 的 Back 组件）
- **i18n 新增 key 流程**：先在 `en.ts` 加 key → `TKey` 自动更新 → 补全 9 个语言文件 → 否则 tsc 报错
