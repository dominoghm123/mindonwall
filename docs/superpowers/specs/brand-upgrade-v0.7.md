# Mind on Wall v0.7 品牌升级方案 — 结构化执行 Brief

> **版本**：v0.7 Brand Upgrade  
> **日期**：2026-08-09  
> **状态**：待用户审阅 → 通过后实施  
> **输出精度**：每页/每组件精确到标题、文案、交互、视觉规范

---

## 〇、品牌策略总览（一页）

| 要素 | 内容 |
|------|------|
| **品牌名** | Mind on Wall（保留） |
| **品类** | 数字拼贴墙（Digital Collage Wall）—— 数字手帐 × 灵感管理的交叉品类 |
| **定位** | 以"私人拼贴墙"体验，对立于"效率工作台"（Milanote/Notion），为创意人群提供思维自由生长的沉浸式空间 |
| **对立轴** | 效率工作台 ←→ 私人拼贴墙 |
| **Tagline** | **Where ideas find each other.** |
| **使命** | 让每个想法都有地方安放，让每次关联都自然发生 |
| **愿景** | 成为创意人群首选的沉浸式私人发散性思考空间 |
| **价值观** | 自由优先 / 私人空间 / 发现乐趣 |
| **品牌人格** | 创造者（Creator）+ 探险家（Explorer） |
| **目标用户** | 年轻设计师、写作者、旅行者——有视觉审美和表达欲的创意人群 |
| **信息架构** | My Spaces → [Space Name] → Wall → 物件 |
| **商业化** | 免费 + 高级功能（Freemium） |
| **传播渠道** | 小红书 + 黑客松比赛 |

---

## 一、LandingPage 升级方案

### 1.1 整体布局

**保持**：左右分栏布局（左侧表单 + 右侧品牌视觉）  
**升级点**：右侧视觉从静态 SVG 升级为**动态品牌展示区**

### 1.2 左侧 · 表单区

#### 文案变更

| 位置 | 当前文案 | 新文案 | i18n Key |
|------|---------|--------|----------|
| Logo 下方标题 | "Welcome to Mind on Wall" | **"Mind on Wall"** | `auth.welcomeTitle` |
| 副标题 | `{t('auth.tagline')}` = "Map your thoughts on a visual wall" | **"Where ideas find each other."** | `auth.tagline` |
| 副标题样式 | 16px, #666 | 15px, #6B7280, 斜体（journal font: Caveat/LXGW WenKai） | — |

#### 新增元素

- **GitHub 入口**：在 OAuth 按钮下方添加一行
  - 文案：`Star us on GitHub →`
  - 链接：`https://github.com/dominoghm123/mindonwall`
  - 样式：13px, #4A90D9, hover 下划线
  - i18n Key: `auth.githubStar`

### 1.3 右侧 · 品牌视觉区（重点升级）

#### 1.3.1 视觉层次重构

**当前问题**：静态 SVG 圆点 + 线条，缺乏品牌温度和杂志感

**新方案**：三层视觉叠加

```
Layer 1（底层）：温暖纸张纹理背景
Layer 2（中层）：真实手帐物件拼贴（Photo + Paper + Stamp）
Layer 3（顶层）：Rope 连线动画 + 微交互
```

#### 1.3.2 具体视觉元素

**Layer 1 — 背景**
- 色值：`#F5F0E8`（米色基础纸，来自 VISUAL_SPEC.md）
- 叠加 CSS 噪点纹理（SVG feTurbulence filter，opacity 0.03）
- 目的：营造真实纸张质感，而非纯色块

**Layer 2 — 手帐物件拼贴**

在右侧区域放置 5-7 个"真实感"物件，模拟一面正在生长的墙：

| 物件 | 内容 | 位置 | 样式 |
|------|------|------|------|
| Photo 1 | 旅行照片（寺庙/街景） | 左上 | 200×150px，轻微旋转 -3°，Pin 固定 |
| Photo 2 | 设计草图/原型截图 | 右上 | 180×130px，旋转 2° |
| Paper（便利贴） | 手写文字 "灵感 ✨" | 中左 | 140×140px，黄色 #FFF3B0，旋转 -5° |
| Paper（撕边） | "TODO: 整理旅行照片" | 中右 | 200×120px，白色，旋转 1° |
| Stamp | 护照章/旅行章 | 左下 | 80×80px，红色印章效果 |
| Tape | 透明胶带 | 跨两个物件 | 180×30px，半透明 |

**Layer 3 — Rope 动画**

- 2-3 条 Rope 连接不同物件的 Pin
- **CSS 动画**：`stroke-dashoffset` 从 100% → 0%，模拟绳子"生长"出来
- 动画时长：3s，ease-in-out，无限循环（每次循环间暂停 2s）
- Rope 颜色：`#8B7355`（麻绳色）
- Pin 出现动画：scale(0) → scale(1)，bounce easing，延迟 0.5s

#### 1.3.3 微交互

- **Hover 物件**：该物件轻微上浮（translateY(-4px)）+ shadow 增强
- **Hover 时 Rope 高亮**：关联的 Rope 颜色变为 `#4A90D9`，宽度从 2px → 3px
- **整体**：所有动画用 `transition: 0.3s ease`，保持缓慢、松弛的节奏感

#### 1.3.4 右侧底部文案

在物件拼贴下方，添加一行品牌文案：

```
"Pin it. Rope it. See the connections."
```

- 样式：14px, #6B7280, journal font（Caveat/LXGW WenKai）
- i18n Key: `auth.brandHint`

### 1.4 技术实现要点

| 技术点 | 方案 | 备注 |
|--------|------|------|
| 纸张纹理 | CSS `filter: url(#noise)` + SVG feTurbulence | 复用现有 Wallpaper CSS 逻辑 |
| Rope 动画 | CSS `@keyframes` + `stroke-dashoffset` | 不需要 JS 动画库 |
| 物件布局 | 绝对定位（百分比） | 保持响应式 |
| Hover 交互 | CSS `:hover` + `transition` | 不需要额外状态管理 |
| 图片资源 | 使用 `public/demo-assets/` 现有素材 | 旅行照片 + stamp 素材已有 |

### 1.5 涉及文件

| 文件 | 修改内容 |
|------|---------|
| `src/components/auth/LandingPage.tsx` | 右侧视觉重构 + 左侧文案更新 + GitHub 链接 |
| `src/i18n/en.ts` | 新增/修改 key: `auth.tagline`, `auth.welcomeTitle`, `auth.githubStar`, `auth.brandHint` |
| `src/i18n/langs/*.ts`（9 个文件） | 同步新增 key |
| `src/App.css` 或 LandingPage 内 `<style>` | Rope 动画 keyframes + 物件 hover 样式 |

---

## 二、GitHub README 品牌化方案

### 2.1 完整结构（中英双语，偏产品调性）

```markdown
# Mind on Wall

> Where ideas find each other. 让想法彼此相遇。

![Mind on Wall](screenshot-url)

Mind on Wall is a digital collage wall for creative minds — pin photos,
notes, and stamps on an infinite canvas, connect them with ropes, and
watch your ideas find each other.

Not a workspace. A thinking space.

不是工作台，是思考空间。

## ✨ Why Mind on Wall? 为什么是 Mind on Wall？

Most tools force you to organize first, think later. Notion wants databases.
Milanote wants projects. Sticky notes want... nothing, and that's the problem.

大多数工具让你先整理、再思考。Notion 要数据库，Milanote 要项目，
便签什么都不要——而这就是问题所在。

Mind on Wall gives you a wall. You pin things. You connect them.
Ideas grow organically — messy, personal, and yours.

Mind on Wall 给你一面墙。你贴东西，你连线。想法自然生长——
混乱的、私人的、属于你的。

## 🎯 Use Cases 使用场景

- **Travel Journaling 旅行手帐** — Pin photos, tickets, and notes. Connect places
  with ropes. See your trip as a story, not a list.
  贴照片、票根和笔记。用 Rope 连接地点。把旅行看成故事，而不是清单。

- **Design Thinking 设计思维** — Scatter inspiration, sketches, and references.
  Let connections emerge naturally.
  散落灵感、草图和参考。让关联自然浮现。

- **Research & Mapping 研究与 Mapping** — Collect fragments. Build relationships.
  Switch to Connection Map to see the big picture.
  收集碎片，建立关系。切换到 Connection Map 看见全局。

- **Daily Brain Dump 日常灵感** — No templates. No folders. Just your wall.
  没有模板，没有文件夹。只有你的墙。

##  Core Features 核心功能

| Feature 功能 | Description 说明 |
|---------|-------------|
| **Infinite Wall 无限画布** | Drag, drop, rotate, resize. Your wall, your rules. 拖拽、旋转、缩放。你的墙，你说了算。 |
| **Paper & Stamp 纸片与印章** | Handwritten notes, torn paper, ink stamps — real journal texture. 手写笔记、撕边纸、印章——真实手帐质感。 |
| **Rope Connections Rope 连线** | Connect any two pins. Ropes hang naturally with physics-based curves. 连接任意两个 Pin，Rope 以物理弧度自然下垂。 |
| **Connection Map 关系图** | Auto-generated relationship graph. See what you've built. 自动生成关系图，看见你构建的思维网络。 |
| **Cloud Sync 云同步** | Supabase-powered sync. Your wall follows you. Supabase 驱动的云同步，你的墙跟着你走。 |
| **10 Languages 10 种语言** | EN / 中文 / 日本語 / 한국어 / Español / Français / Deutsch / Português / Русский |
| **Export 导出** | PNG, PDF, shareable links. PNG、PDF、可分享链接。 |

##  Tech Stack 技术栈

- **Frontend 前端**: React 19 + TypeScript + Vite 7
- **State 状态管理**: Zustand
- **Backend 后端**: Supabase (Auth + Cloud Sync)
- **Deploy 部署**: Vercel
- **Design 设计系统**: Custom Design Token System

##  Quick Start 快速开始

```bash
git clone https://github.com/dominoghm123/mindonwall.git
cd mindonwall
npm install
npx vite --port 3000
```

## 📖 Documentation 文档

- [PRD](planning/PRD.md) — 产品需求
- [Visual Spec](researching/VISUAL_SPEC.md) — 视觉规范
- [Handover](planning/HANDOVER.md) — 开发上下文

## 🤝 Contributing 贡献

Mind on Wall is a personal project open to the creative community.
Issues, ideas, and pull requests welcome.

Mind on Wall 是一个面向创意社区的开放项目。欢迎 Issue、想法和 PR。

## 📄 License 许可证

MIT

---

Built with  for creative minds who think in connections.
为用关联思考的创意心智而建。
```

### 2.2 需要准备的素材

| 素材 | 用途 | 状态 |
|------|------|------|
| LandingPage 截图 | README 头图 | 待生成 |
| Wall Editor 截图 | 功能展示 | 待生成 |
| Connection Map 截图 | 功能展示 | 待生成 |
| GIF 动效（可选） | Rope 连线演示 | 待录制 |

### 2.3 涉及文件

| 文件 | 修改内容 |
|------|---------|
| `README.md` | 完全重写 |

---

## 三、Settings / About 页面升级方案

### 3.1 About & Version 区块

**当前状态**：仅有版本号显示  
**升级方案**：扩展为完整的产品介绍区块

#### 文案内容

```
About Mind on Wall

Mind on Wall is a digital collage wall where ideas find each other.

Born from the frustration that no online tool could replicate the 
freedom of pinning things on a real wall — the messiness, the 
spontaneous connections, the joy of discovery.

Not a workspace. A thinking space.

Core Philosophy:
• Free — No templates, no forced structure. Your wall, your rules.
• Private — Your thoughts stay yours. No ads, ever.
• Discovery — Value isn't in efficiency. It's in the surprise of 
  finding connections you didn't plan.

[Star on GitHub →]  [View Source →]

Version 0.7.0
```

#### i18n Keys 新增

| Key | EN | 备注 |
|-----|-----|------|
| `settings.about.title` | "About Mind on Wall" | — |
| `settings.about.tagline` | "Where ideas find each other." | — |
| `settings.about.description` | "Born from the frustration..." | 多行文案 |
| `settings.about.philosophy.title` | "Core Philosophy" | — |
| `settings.about.philosophy.free` | "Free — No templates, no forced structure. Your wall, your rules." | — |
| `settings.about.philosophy.private` | "Private — Your thoughts stay yours. No ads, ever." | — |
| `settings.about.philosophy.discovery` | "Discovery — Value isn't in efficiency. It's in the surprise of finding connections you didn't plan." | — |
| `settings.about.github` | "Star on GitHub →" | — |
| `settings.about.source` | "View Source →" | — |

### 3.2 What's New 更新日志区域（可选）

在 About 下方添加简单的版本更新日志：

```
What's New in v0.7

• Brand upgrade — New tagline, visual identity
• Spaces — Organize walls into themed spaces
• [后续功能...]
```

### 3.3 涉及文件

| 文件 | 修改内容 |
|------|---------|
| `src/components/pages/UserPages.tsx` | About 区块扩展 |
| `src/i18n/en.ts` + 9 个语言文件 | 新增 about 相关 keys |

---

## 四、信息架构升级：Project → Space

### 4.1 命名映射

| 当前 | 新命名 | 说明 |
|------|--------|------|
| Overview（总览页） | **My Spaces** | 顶层容器视图 |
| Project | **Space** | 主题/场景容器 |
| Wall | **Wall**（不变） | 具体拼贴墙 |
| Uncategorized | **Uncategorized**（不变） | 未分类的墙 |

### 4.2 UI 文案变更

| 位置 | 当前文案 | 新文案 | i18n Key |
|------|---------|--------|----------|
| 总览页标题 | "Overview" / "My Walls" | **"My Spaces"** | `overview.title` |
| Project 卡片标签 | "Project" | **"Space"** | `overview.projectLabel` |
| 新建 Project 按钮 | "New Project" | **"New Space"** | `overview.newProject` |
| Project 菜单 Rename | "Rename Project" | **"Rename Space"** | `overview.renameProject` |
| Project 菜单 Delete | "Delete Project" | **"Delete Space"** | `overview.deleteProject` |
| 拖拽提示 | "Drop to merge into project" | **"Drop into space"** | `overview.dropHint` |
| TopBar 返回文字 | 墙名 | 保持墙名不变 | — |

### 4.3 涉及文件

| 文件 | 修改内容 |
|------|---------|
| `src/components/overview/OverviewPage.tsx` | 标题、按钮文案、Project → Space |
| `src/components/chrome/TopBar.tsx` | 如有 Project 相关文案 |
| `src/i18n/en.ts` + 9 个语言文件 | 所有 project → space 的 key 更新 |
| `src/store/useOverviewStore.ts` | 如有 project 相关状态命名 |

---

## 五、交互升级方向（品牌一致性校准）

> 以下交互改进建议基于品牌定位"自由、私人、发现"，目标是把自由感从 4-5 分提升到 8 分+。

### 5.1 物件类型扩展（v0.7+ 规划）

| 物件类型 | 优先级 | 说明 |
|---------|--------|------|
| **MD 文档** | P1 | 支持 Markdown 文本直接上墙，渲染为 Paper 样式 |
| **音频** | P2 | 音频波形可视化 + 播放控件，可 Pin + Rope |
| **视频** | P2 | 视频缩略图 + 播放，可 Pin + Rope |
| **背景抠图** | P1 | 底部浮窗内嵌简易抠图功能，降低 Stamp/Tape 素材制作门槛 |

### 5.2 "随手一放"自然感提升

| 改进点 | 当前问题 | 建议方案 |
|--------|---------|---------|
| **创建物件** | 需要点击工具栏 → 选择类型 → 放置，步骤太多 | 支持**拖拽文件直接上墙**：拖入画布后弹出居中弹窗，让用户选择「放入素材库等待编辑」或「直接 Pin 到墙上」 |
| **物件放置** | 放置位置需要精确点击 | 增加**磁吸网格**（可选开启），物件靠近时自动对齐，但保持轻微随机偏移（不完美对齐） |
| **Rope 创建** | 需要进入 rope 模式，操作繁琐 | **方案 A**：点击一个 Pin 后自动进入连线状态，再点击另一个 Pin 完成连线（无需模式切换）；**方案 B**：按住 Alt/Option 键拖拽 Pin 直接连线（快捷操作，保留原模式按钮） |
| **选中反馈** | 虚线边框太"软件感" | 改为**微妙的阴影 + 轻微 scale(1.01)**，更像"拿起一张纸"的感觉 |

### 5.3 TopBar / Spaces 逻辑重构

**当前问题**：TopBar 的编辑按钮和 Spaces 层级关系不清晰

**建议方案**：

```
TopBar（精简为导航层）：
├── ← 返回 My Spaces
├── 当前 Wall 名称（可编辑）
├── Wall / Map Tab 切换
├── Saved 指示
└── AvatarMenu

BottomToolbar（接收编辑功能）：
├── 物件创建（Paper / Picture / Stamp / Tape）
├── Rope 模式
── 墙纸切换
├── 导出/分享
└── [新增] 背景抠图入口
```

### 5.4 Onboarding 方案

**首次进入流程**：

```
Step 0: 注册/登录 → 进入 My Spaces（空状态）

Step 1: 空状态页面展示一面"示例墙"缩略图
        文案："This is what a wall looks like. 
               Start with a template, or create your own."
        按钮：[Explore Demo Wall]  [Create Empty Wall]

Step 2（选择 Demo Wall 后）：
        进入预填充的示例墙（旅行主题）
        包含：3 张照片 + 2 个 Paper + 1 个 Stamp + 2 条 Rope
        
Step 3: 底部浮现 3 步引导气泡（可关闭）：
         "Drag anything onto the wall"
        ② "Double-click a paper to write"  
        ③ "Drag from one pin to another to connect"
        
        每步引导在用户完成对应操作后自动消失
```

---

## 六、视觉规范更新

### 6.1 Design Token 扩展

在 `src/theme/tokens.ts` 中新增品牌辅助色：

```typescript
// 新增：品牌辅助色（杂志感色彩层次）
color: {
  // ... 现有颜色保持不变 ...
  
  /** Brand warm accent (牛皮纸色) */
  brandWarm: '#D4B896',
  /** Brand rope (麻绳棕) */
  brandRope: '#8B7355',
  /** Brand stamp red (印章红) */
  brandStamp: '#C0392B',
  /** Brand paper cream (纸张米白) */
  brandPaper: '#F5F0E8',
}
```

### 6.2 字体使用规范

| 场景 | 字体 | 说明 |
|------|------|------|
| UI 文字（按钮、标签、表单） | Inter | 保持清晰可读 |
| 品牌文案（Tagline、Slogan） | Caveat / LXGW WenKai | 手写感，传达温度 |
| Paper 内文字 | Caveat / LXGW WenKai | 手写笔记感 |
| 数据/版本号 | JetBrains Mono | 技术感 |

### 6.3 品牌视觉一致性检查表

| 触点 | 必须包含的元素 | 禁止的元素 |
|------|--------------|-----------|
| **LandingPage** | 手写字体 tagline、纸张纹理背景、Rope 动效 | 纯白背景、无纹理的 SVG、工具感按钮 |
| **GitHub README** | "Where ideas find each other." tagline、手帐风格截图 | 项目管理术语（project/task/deadline） |
| **Settings/About** | 品牌故事三段式、GitHub 链接 | 空洞的"we strive for excellence" |
| **产品内 UI** | Design Token 统一色值、ghost button 模式 | 硬编码颜色值、投影过重的卡片 |

---

## 七、执行优先级与时间线

### Phase 1：品牌文案 + 视觉升级（P1，本周）

| 任务 | 涉及文件 | 预估工时 |
|------|---------|---------|
| LandingPage 右侧视觉重构 | `LandingPage.tsx` + CSS | 2-3h |
| LandingPage 文案更新 + GitHub 链接 | `LandingPage.tsx` + i18n | 0.5h |
| README 重写 | `README.md` | 1h |
| Settings About 扩展 | `UserPages.tsx` + i18n | 1h |
| i18n 全语言同步 | 9 个语言文件 | 1h |

### Phase 2：信息架构 Project → Space（P1，本周）

| 任务 | 涉及文件 | 预估工时 |
|------|---------|---------|
| Overview 页文案更新 | `OverviewPage.tsx` + i18n | 1h |
| 全局 project → space 文案替换 | 多文件 + i18n | 1h |

### Phase 3：交互升级（P2/P3，后续迭代）

| 任务 | 优先级 | 说明 |
|------|--------|------|
| 拖拽文件直接上墙 | P2 | 大幅提升"随手一放"感 |
| Rope 创建改为 modifier key | P2 | 减少模式切换 |
| 物件选中反馈优化 | P2 | 从"软件感"到"拿起纸"感 |
| MD 文档物件支持 | P2 | 扩展物件类型 |
| 背景抠图功能 | P2 | 降低素材制作门槛 |
| Onboarding 示例墙 + 引导 | P1 | 首次体验关键 |

---

## 八、风险与假设清单

| 假设/风险 | 影响 | 验证方法 |
|-----------|------|---------|
| **假设**：目标用户认同"私人拼贴墙"而非"效率工具"的定位 | 如果用户实际想要效率工具，品牌方向需调整 | 小红书内容测试 + 用户反馈 |
| **假设**："Where ideas find each other." 在中文语境中有共鸣 | 中文用户可能需要不同的 tagline 表达 | i18n 中文版本测试 |
| **风险**：Space 改名可能导致老用户困惑 | 需要迁移引导或兼容旧文案 | 在 Overview 页添加过渡提示 |
| **风险**：右侧视觉动效可能影响 LandingPage 加载性能 | 需用 CSS 动画而非 JS 库 | Lighthouse 性能测试 |
| **假设**：黑客松比赛能带来早期用户 | 取决于比赛质量和曝光 | 选择有设计师/创意人群参与的黑客松 |

---

## 九、一致性交叉检查

| 配对 | 一致性 | 说明 |
|------|--------|------|
| 定位 ↔ 使命 | ✅ | "私人拼贴墙" → "让想法安放、关联发生" |
| 定位 ↔ 愿景 | ✅ | "创意人群的沉浸式私人空间" |
| 定位 ↔ 价值观 | ✅ | 自由/私人/发现 三个价值观直接支撑定位 |
| 定位 ↔ 人格 | ✅ | 创造者+探险家 = 在私人空间里自由创作和探索 |
| 定位 ↔ Tagline | ✅ | "Where ideas find each other." = 自由生长 + 偶然发现 |
| 定位 ↔ 视觉 | ✅ | 杂志感/纸张纹理/手写字体 = 私人拼贴墙气质 |
| 定位 ↔ 信息架构 | ✅ | Space/Wall 层级 = 私人空间隐喻 |
| 定位 ↔ 交互方向 | ✅ | "随手一放" + 减少步骤 = 自由优先 |
| 使命 ↔ 价值观 | ✅ | "让关联自然发生" = 发现乐趣 |
| 人格 ↔ 故事 | ✅ | 创造者的初心 = "没有产品能给我自由拼贴的体验" |

**所有配对一致性通过 ✅**

---

## 十、审阅清单

提交用户审阅前需确认：

- [ ] LandingPage 右侧视觉截图（含动效示意）
- [ ] LandingPage 左侧文案更新截图
- [ ] README 渲染预览
- [ ] Settings About 区块截图
- [ ] Overview 页 Space 改名截图
- [ ] i18n 全语言编译通过（`npx tsc --noEmit`）
