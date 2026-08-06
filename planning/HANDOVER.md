# Handover — Mind on Wall v0.2

**最后更新：** 2026-08-06 深夜
**当前阶段：** v0.1 已完成并合入 main；v0.2 开发中（范围已确认，编码待推进）

## 项目一句话

Mind on Wall 是一个桌面优先的数字手帐网页：用户把照片、想法与随手记贴到可换墙纸的白墙上，用 Paper、Stamp 与 Rope 慢慢看见碎片间的关系。

## 分支与版本状态（重要）

| 分支 | 状态 |
|---|---|
| `main` | ✅ v0.1 最终版，commit `5ae57bf`，已推送远程，**不可改动** |
| `feature/v0.2-interactions-chrome` | 🔄 **当前工作分支**，从 main 切出，仅含 STATUS.md 更新（commit `4ce028b`），已推送远程 |

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
├── App.tsx                          ← 主集成（注意 stamp parentId 跳过逻辑）
├── store/
│   ├── types.ts                     ← Item/Rope/WallSummary 类型
│   ├── useWallStore.ts              ← 当前墙 items/ropes/undo
│   ├── useUIStore.ts                ← viewMode/selectedIds/ropeCreating（需加 ropeMode）
│   ├── useOverviewStore.ts          ← 墙列表（需加 duplicate/export/batch delete）
│   └── initialData.ts               ← DEFAULT_WALL_NAME 需改 'Wall 01'
├── hooks/
│   ├── useDrag.ts                   ← 需加 zoom 参数
│   ├── useResize.ts                 ← 排查缩小 bug
│   ├── useRotate.ts                 ← 改长按激活
│   └── useRopeCreation.ts           ← 加点击连线模式
├── components/
│   ├── canvas/InfiniteCanvas.tsx    ← zoom/pan 变换层
│   ├── chrome/TopBar.tsx            ← 重布局
│   ├── chrome/BottomToolbar.tsx     ← 重写（48px + 次级面板）
│   ├── overview/OverviewPage.tsx    ← 管理功能 + 三点菜单
│   ├── objects/ObjectWrapper.tsx    ← showPin 规则 + 事件分发
│   ├── objects/Pin.tsx              ← data-pin-item-id 属性
│   ├── objects/PaperObject.tsx      ← 附着 Stamp 渲染（需可拖拽）
│   ├── objects/StampObject.tsx      ← STAMP_MAP（注意 stamp- 前缀处理）
│   ├── objects/PictureObject.tsx    ← URL 需 .jpg 后缀
│   └── shared/ContextMenu.tsx       ← 右键菜单
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
- 附着 Stamp 的 x/y 是绝对坐标，PaperObject 渲染时已兼容（x > 1 判断）
- 含 emoji 的项目路径在 shell 命令中必须完整引用
