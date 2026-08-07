# Handover — Mind on Wall v0.2 → v0.3

**最后更新：** 2026-08-07（v0.2 五轮修订全部完成，下一窗口进入 v0.3）
**当前阶段：** ✅ v0.2 完成（首版 A1/A2/A3/B + 五轮用户反馈修订，全部浏览器验证通过，待合入 main）

## 项目一句话

Mind on Wall 是一个桌面优先的数字手帐网页：用户把照片、想法与随手记贴到可换墙纸的白墙上，用 Paper、Stamp 与 Rope 慢慢看见碎片间的关系。

## 分支与版本状态（重要）

| 分支 | 状态 |
|---|---|
| `main` | ✅ v0.1 最终版，commit `5ae57bf`，已推送远程，**不可改动** |
| `feature/v0.2-interactions-chrome` | ✅ v0.2 完成（HEAD `3da603f`），已推送远程 |

## v0.2 完成记录（2026-08-07）

### 首版

| Commit | 内容 |
|---|---|
| `ac9fdb3` | A1: drag÷zoom 零延迟、resize 缩小修复、附着 Stamp 拖拽、长按旋转、Pin 规则 |
| `a62a2eb` | A2: 48px 工具栏 + Image/Paper/Stamp 三面板 + 图片上传 + rope 点击连线 |
| `e66375e` | A3: TopBar Share+头像、右下角缩放/Fit/Map 浮窗、ToastLayer |
| `a715ed1` | B: Manage 多选删除、三点菜单（Rename/Duplicate/Export JSON/Share/Delete）、多墙数据切换、默认墙名 Wall 01 |

### 修订轮 1（用户审阅反馈：颜色/缩放/旋转/浮窗/物件/墙纸/rope + 主页）

| Commit | 内容 |
|---|---|
| `25e514d` | docs: v0.2 修订记录 |
| `b9cfd21` | feat(wall): rope 连线修复、旋转整角磁吸（0/90/180/270/360）、浮窗默认隐藏 hover 浮出、上传入素材库、SVG 透明 stamp、右键改色（预设+调色盘）、墙纸默认白色、文字同比缩放 |
| `05c9584` | feat(overview): ⋮ 菜单移至卡片右下角 + 头像入口下拉（Profile/Materials/Settings，目前 toast 占位） |

### 修订轮 2（A1-A9 + B1 反馈）

| Commit | 内容 |
|---|---|
| `34a5e06` | fix(wall): rope 线渲染（svg 0×0 根因）、纸面可见化（边框+内阴影）、底部浮窗自动收回、stamp 附着扩展到 picture + Detach、单向拉伸（角手柄两轴独立）、TopBar 右上角 Undo/Redo、缩放 ±1% + 度数可编辑（20-300）、Fit 囊括全部物件、返回箭头精致化 |
| `ef2650f` | fix(overview): 三点菜单去圈线边框 |

### 修订轮 3（交互细节 4 项）

| Commit | 内容 |
|---|---|
| `49a2891` | fix(wall): 次级浮窗点外部关闭、点空白清除选中（尺寸框消失）、拖拽中 rope 实时跟随（onDragMove 写 store 不入 undo）、文本编辑态 Delete 只删字符（isContentEditable 守卫） |

### 修订轮 4（rope 颜色/缩放/平移/stamp detach + 默认内容）

| Commit | 内容 |
|---|---|
| `b169020` | fix(wall): rope 颜色菜单、以视图中心缩放、空白处平移、stamp detach 修复 |
| `f5fcc47` | feat(wall): Wall 01 默认叙事内容 |

### 修订轮 5（attach/detach 反馈链 + wheel passive 修复）

用户报告"attach/detach 没实现"。真实事件 QA 证明逻辑本身无故障，根因是**零反馈**（进附着模式/成功/detach 全无提示）+ 约 235 条 passive listener console error。

| Commit | 内容 |
|---|---|
| `3da603f` | fix(wall): attach/detach 全链路 toast 反馈（引导/成功/失败/取消）、ESC 与点空白取消附着、InfiniteCanvas 改原生非 passive wheel 监听（console error 235 → 0） |

⚠️ **用户约定（v0.3 第一优先级判断）**：若用户实际体验后仍认为 attach/detach 不可用，则彻底移除 attach 功能——删除 attachMode/startAttachMode/cancelAttachMode/attachStamp/detachStamp、AttachedStamps 组件、ContextMenu 的 Attach/Detach 菜单项、handleClickForAttach，并把现存 parentId 非空的 stamp 迁移为独立物件（比例坐标转绝对坐标）。

QA：每轮均 tsc 无错 + Browser agent 逐项验证全 PASS，console 无 error。

**v0.3 待办**：Project 层级、真实分享后端、PDF 导出、Connection Map；AvatarMenu 三项（Profile/Materials/Settings）接真实功能；次要优化：resize 超 800px 宽高比保持、窄视口总览网格自适应、viewMode 默认总览、清理 QA 残留数据（QA 曾把 item-stamp-01 attach 到 item-paper-note-02，可 Undo 或 `localStorage.clear()`）。

- v0.2 所有改动在 `feature/v0.2-interactions-chrome` 上进行，**不动 main**
- 回滚方式：`git checkout main` 即回到 v0.1
- 回滚远程分支：`git push origin feature/v0.2-interactions-chrome --force-with-lease`（重置到 `4ce028b`）

## 时间线

- **8/7 晚上前**：完成 v0.2（本文档范围）
- **8/8**：v0.3 最终打磨（Project 层级、PDF 导出、真实分享、细节优化），8/9 前提交作品

## v0.2 范围（已与用户确认）

### A. Wall Editor（内页）

#### A1. 物件交互（P0 → P1 → P2 顺序）

**P0（阻塞性 bug）：**
1. **无法缩小物件**：`useResize.ts` 缩放逻辑本身支持缩小（MIN_SIZE=40），需排查手柄事件是否被拖拽拦截。重点检查 `ObjectWrapper.tsx` 中 resize handle 的 `onPointerDown` 是否正确 stopPropagation，以及 `handlePointerMove` 分发逻辑（rotate/resize/drag 三选一）。
2. **Stamp 无法移动编辑**：有 `parentId` 的 Stamp 在 `App.tsx` 中被跳过（`if (item.type === 'stamp' && item.parentId) return null`），由 `PaperObject.tsx` 内部渲染（`pointerEvents: 'none'`）。需要让附着 Stamp 可拖拽（在 PaperObject 内为其加 pointer 事件，拖拽后更新 store 中 stamp 的 x/y 绝对坐标）。
3. **零延迟拖拽**：`useDrag.ts` 用屏幕像素 delta，未除以 zoom。画布有 `scale(zoom)` 变换，拖拽时物件移动量 = 鼠标移动量 / zoom。需要给 useDrag 传入 zoom 参数（InfiniteCanvas 的 zoom 经 App.tsx 的 `canvasView.zoom` 可得）。

**P1（核心交互）：**
4. **旋转手势**：用户要求"长按旋转标识再转圈拖动才能旋转"。当前 `useRotate.ts` 是 pointerdown 立即开始旋转。改为：pointerdown 后等待 ~500ms（长按）才激活旋转，期间移动超过阈值则取消（当作普通点击）。激活后拖拽旋转。
5. **Rope 连线模式**（见 A2）。

**P2（体验优化）：**
6. **文字跟随 paper**：Paper 的文字已在 PaperObject 内部渲染，本身跟随。用户提到"可右键选择 detach"——v0.2 只需确保右键菜单（`ContextMenu.tsx`）不出现 detach 误导项，或实现基础 detach（v0.3 细化）。**低优先级，可后置**。
7. **Pin 只出现在 picture 和 paper 上**：当前 `ObjectWrapper.tsx` 第 203 行 `showPin = item.type !== 'stamp'`，需改为排除 tape：`showPin = item.type === 'picture' || (item.type === 'paper' && item.variant !== 'tape')`。
8. **Stamp 透明背景**：`StampObject.tsx` 已用 `mixBlendMode: 'multiply'`，确认无额外白色背景容器即可。

#### A2. 底部工具栏（BottomToolbar.tsx 重写）

- **问题**：当前收拢态 28px 高，图标被裁切。
- **新设计**：
  - 高度 48px，收拢宽度容纳 4 个 40×40 图标按钮（Image/Paper/Stamp/Rope）
  - 图标保持不变（现有 SVG 可复用），纯白底 + 1px border #E5E5E5，圆角 14px，无阴影
  - **次级浮窗**：点击图标向上弹出对应面板（同时只能开一个，再点同一图标关闭）：
    - **Image**：文件上传（`input type="file" accept="image/*"`），base64 存入 localStorage（key `mindonwall-assets`），缩略图列表，点击缩略图添加 Picture 到画布中心
    - **Paper**：4 个 tab（note/torn/sticky/tape），每个 tab 下 2-3 个样式变体（颜色/材质差异，参考 `researching/torn_paper_sample/` 等素材），点击添加到画布
    - **Stamp**：5 个预设印章缩略图（`/demo-assets/stamps/*.png`），点击添加到画布
  - **Rope 图标**：点击进入连线模式（图标颜色加深表示选中）→ 点击第一个 Pin → 点击第二个 Pin → 自动创建 Rope → 退出模式。Esc 或点击空白取消。
- **Rope 连线实现**：`useUIStore` 加 `ropeMode: boolean`；`useRopeCreation.ts` 加点击模式（现有为拖拽模式）。在 ropeMode 下 Pin 点击不再触发拖拽，而是记录第一个 pin → 第二次点击完成连线（参考现有 `handlePinMouseDown` 逻辑改造）。

#### A3. 顶部栏重布局（TopBar.tsx，参考 Magnific p1）

- **右侧改为**：Share 按钮（outlined）+ 用户头像（28px 圆形，字母 U）
- **移除**：Map / Export / AI 按钮和缩放百分比从顶栏移除
- **右下角新浮窗**（页面级，可放 App.tsx 或独立组件）：缩放百分比显示 + Map 图标按钮 + Fit 按钮（严格参考 Magnific 右下角布局）
- 顶栏保留：← 返回 + 可编辑墙名 + Saved 指示

### B. 总览页（OverviewPage.tsx + useOverviewStore.ts）

1. **顶栏**：加 "Manage" 按钮。管理模式下：卡片出现 checkbox，可多选 → 批量删除（二次确认弹窗）
2. **默认墙名**：第一个墙默认 "Wall 01"（`initialData.ts` 的 `DEFAULT_WALL_NAME` 改为 'Wall 01'）
3. **卡片三点菜单（⋮）**：每张卡片右下角，点击弹出菜单：Rename / Duplicate / Export JSON / Share（toast "Link copied" 模拟）/ Delete（确认）
4. **Store 新增 actions**：`duplicateWall`（深拷贝 items/ropes 并重新生成 id）、`exportWallJSON`（Blob 下载）、批量删除 `removeWalls(ids[])`
5. **Project 层级**：❌ 明确推迟到 v0.3，v0.2 不做

### 明确不做（v0.3）

- Project 层级
- 真实分享后端（v0.2 只做 UI mock）
- PDF 导出（v0.2 做 JSON + PNG）
- Connection Map / AI 助手（v0.3 最终版再做）

## 技术栈与规范

- React 19 + TypeScript + Vite 7 + Zustand 5（persist middleware）+ html-to-image
- **所有 UI 文字必须英文**
- 浮窗视觉：纯白实色 #FFFFFF + 1px border（无阴影无毛玻璃）
- 顶栏高度 40px
- 零投影设计（物件无 box-shadow）
- 多选：Ctrl/Cmd + 点击，框选，Delete 删除

## 关键文件地图

```
src/
├── App.tsx                          ← 主集成（stamp parentId 跳过、ropeMode 点击分发、点空白清选中）
├── store/
│   ├── types.ts                     ← Item/Rope/WallSummary 类型
│   ├── useWallStore.ts              ← 当前墙 items/ropes/undo，attachStamp 支持 paper+picture
│   ├── useUIStore.ts                ← viewMode/selectedIds/ropeMode/toolbarPanel/attachMode
│   ├── useOverviewStore.ts          ← 墙列表，initIfNeeded 含幂等墙纸迁移（beige→white）
│   ├── undoMiddleware.ts            ← pushUndo/make*Action（ObjectWrapper 直接用）
│   └── initialData.ts               ← DEFAULT_WALLPAPER='white'，DEFAULT_WALL_NAME='Wall 01'
├── hooks/
│   ├── useDrag.ts                   ← zoom 换算 + onDragMove 实时回调（rope 跟随）
│   ├── useResize.ts                 ← 角手柄两轴独立、边手柄单向拉伸
│   ├── useRotate.ts                 ← 长按激活 + 整角磁吸（SNAP_ENTER 6°/RELEASE 14°）
│   ├── useKeyboard.ts               ← 快捷键（isContentEditable 守卫）
│   └── useRopeCreation.ts           ← 点击连线模式
├── components/
│   ├── canvas/InfiniteCanvas.tsx    ← zoom/pan + zoomStep/setZoomTo/fitContent API
│   ├── chrome/TopBar.tsx            ← 返回箭头 + 墙名 + Undo/Redo + Share + AvatarMenu
│   ├── chrome/BottomToolbar.tsx     ← hover 浮出 + 4 面板 + 上传入素材库 + 点外部关面板
│   ├── chrome/ZoomWidget.tsx        ← 右下角缩放浮窗（±1%、可编辑度数、Fit、Map 占位）
│   ├── overview/OverviewPage.tsx    ← Manage + ⋮菜单（右下角无边框）+ AvatarMenu
│   ├── objects/ObjectWrapper.tsx    ← 事件分发（drag/resize/rotate）+ 附着模式
│   ├── objects/AttachedStamps.tsx   ← 附着 Stamp 共享渲染（paper/picture 宿主）
│   ├── objects/RopeLayer.tsx        ← rope SVG（注意 1px+overflow:visible）
│   ├── objects/PaperObject.tsx      ← 4 变体 + 文字同比缩放
│   ├── shared/ContextMenu.tsx       ← 右键菜单（改色 ColorRow、Attach/Detach）
│   └── shared/AvatarMenu.tsx        ← 头像下拉（Profile/Materials/Settings 占位）
└── utils/wallpaperCSS.ts            ← 墙纸样式
```

## 开发环境

- 启动：`npx vite --port 3000`（路径含 emoji，cd 时需完整引用）
- 类型检查：`npx tsc --noEmit`
- 用户上传图片数据在 localStorage key `mindonwall-wall` / `mindonwall-ui` / `mindonwall-overview`；调试时可 `localStorage.clear()` 重置
- Git 规范：每完成一个功能点立即 commit；分支 `feature/v0.2-interactions-chrome`

## 建议执行顺序（单人串行）

1. **A1-P0 三件套**：useDrag 加 zoom → useResize 排查 → PaperObject 附着 Stamp 拖拽（最影响体验）
2. **A1-P1/P2**：useRotate 长按 → ObjectWrapper showPin 规则
3. **A2**：BottomToolbar 重写 + useUIStore ropeMode + useRopeCreation 点击模式 + App.tsx 集成
4. **A3**：TopBar 重布局 + 右下角缩放/Map 浮窗
5. **B**：OverviewPage 管理模式 + 三点菜单 + store actions + initialData 墙名
6. **联调**：浏览器全流程验证 → tsc → commit → push

## 已知坑

- 图片 URL 必须带扩展名（`.jpg` / `.png`），Vite 对无扩展名路径返回 index.html
- stampId 带 `stamp-` 前缀，STAMP_MAP key 不带，StampObject 已做 normalize
- 附着 Stamp 的 x/y 是绝对坐标，PaperObject 渲染时已兼容（x > 1 判断）；附着子物件用比例坐标，不计入 Fit/初始包围盒
- **附着坐标未钳制**：attach 时 stamp 若在宿主边界外，比例坐标可为负值（渲染在宿主外面），属当前设计行为，若 v0.3 保留 attach 可考虑钳制
- **React onWheel 是 passive**：React 17+ 把 wheel 以 passive 挂在 root，合成事件里 preventDefault 无效且刷大量 console error；需用原生 `addEventListener('wheel', handler, { passive: false })`（InfiniteCanvas 已改，注意只挂画布容器，勿全局挂以免破坏 Overview 滚动）
- 含 emoji 的项目路径在 shell 命令中必须完整引用
- **画布变换层 div 无固有尺寸**（子元素全 absolute），内嵌 svg 用 `width:100%` 会得到 0×0，RopeLayer 已用固定 1px + `overflow:visible` 解决
- **数据迁移必须放 `if (initialized) return;` 之前**：initialized 已持久化为 true，放在后面的一次性迁移永不执行（墙纸迁移已改为幂等前置检查）
- **Vite HMR 假报错**：跨多文件编辑期间控制台可能出 "change in the order of Hooks" 等错误，干净加载（硬刷新）即消失，非真实 bug
- **浮窗层标记约定**：`data-toolbar-ui`（底部工具栏/面板/ZoomWidget）、`data-menu-layer`（右键菜单/AssetPicker）、`data-item-id`（物件）、`data-pin-item-id`（Pin）；新增固定层 UI 时注意加入 App 的空白点击排除选择器
- `pointerEvents:'none'` 的容器收不到 mouseleave，浮窗隐藏逻辑要用 document 级 mousemove 检测
- QA 测试会往 localStorage 写入测试数据（rope/改色），验收后提醒用户 Undo 或清缓存
