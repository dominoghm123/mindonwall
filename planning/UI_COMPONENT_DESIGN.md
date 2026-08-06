# UI Component Design — v0.2

**状态：** 确认版（基于用户选择：1B + 2V1 + 40px）  
**创建日期：** 2026-08-06  
**最后更新：** 2026-08-06  
**关联文档：** `planning/PRD.md` · `researching/VISUAL_SPEC.md` · `researching/VIBE_MOODBOARD.md` · `planning/MAGNIFIC_DESIGN_ANALYSIS.md`

---

## 1. React 组件树与文件结构

```
src/
├── main.tsx                          # 入口
├── App.tsx                           # 路由：总览页 / 墙面编辑器
── index.css                         # 全局 CSS 变量 + reset
│
├── store/
│   ├── useWallStore.ts               # Zustand: 当前墙面数据（items/ropes/wallpaper/undo）
│   ├── useOverviewStore.ts           # Zustand: 墙面列表（总览页）
│   ├── useAssetStore.ts              # Zustand: 素材托盘（全局共享）
│   ├── useMapStore.ts                # Zustand: Map 编辑状态（独立撤销栈）
│   ├── useUIStore.ts                 # Zustand: UI 状态（选中/浮窗展开/Toast）
│   └── adapters/
│       ├── storageAdapter.ts         # 抽象接口
│       ├── localStorageAdapter.ts    # localStorage 实现
│       ── indexedDBAdapter.ts       # IndexedDB 实现（图片二进制）
│
├── pages/
│   ├── OverviewPage.tsx              # 总览页
│   └── WallEditor.tsx                # 墙面编辑器（画布 + 浮窗）
│
├── components/
│   ├── canvas/
│   │   ├── InfiniteCanvas.tsx        # 无限画布容器（缩放/平移/背景拖拽）
│   │   ├── ZoomIndicator.tsx         # 缩放比例指示器 + 重置按钮
│   │   └── SelectionBox.tsx          # 矩形框选 overlay
│   │
│   ├── objects/
│   │   ├── ObjectWrapper.tsx         # 通用物件容器（拖拽/缩放/旋转/选中态/Pin）
│   │   ├── PictureObject.tsx         # Picture 渲染
│   │   ├── PaperObject.tsx           # Paper 渲染（4 变体）
│   │   ├── StampObject.tsx           # Stamp 渲染
│   │   ├── Pin.tsx                   # Pin 组件（拖拽 Rope 起点）
│   │   └── RopeLayer.tsx             # SVG 层：Rope 曲线 + 拖拽尾巴线
│   │
│   ├── floating/
│   │   ├── TopBar.tsx                # 顶部浮窗（40px，纯白实色）
│   │   ├── BottomToolbar.tsx         # 底部工具栏（Version B: Micro Icon Row）
│   │   └── AIAssistant.tsx           # 右侧 AI 助手浮窗（V1: Pill Tag Row）
│   │
│   ├── map/
│   │   ├── ConnectionMap.tsx         # Map 视图容器
│   │   ├── MapNode.tsx               # Map 节点卡片
│   │   └── MapEdge.tsx               # Map 连线（SVG）
│   │
│   ├── overview/
│   │   ├── WallCard.tsx              # 总览页墙面卡片
│   │   └── ManageMode.tsx            # 管理墙多选模式
│   │
│   └── shared/
│       ├── ContextMenu.tsx           # 右键上下文菜单
│       ├── Toast.tsx                 # Toast 通知
│       ├── ColorPicker.tsx           # 便利贴颜色选择器
│       └── ConfirmDialog.tsx         # 二次确认弹窗
│
├── hooks/
│   ├── useDrag.ts                    # 拖拽 hook（物件 + Pin）
│   ├── useResize.ts                  # 缩放 hook（四角等比 + 边缘拉伸）
│   ├── useRotate.ts                  # 旋转 hook（360° 自由旋转）
│   ├── useRopeCreation.ts            # Rope 创建流程 hook
│   ├── useMultiSelect.ts             # 多选 hook（Shift + 框选）
│   ├── useUndo.ts                    # 撤销/重做 hook
│   └── useKeyboard.ts                # 键盘快捷键 hook
│
── utils/
    ├── ropeGeometry.ts               # Rope 贝塞尔曲线计算
    ├── mapLayout.ts                  # Map 网格/环形布局算法
    ├── exportPNG.ts                  # PNG 导出
    └── wallpaperCSS.ts              # 墙纸 CSS 生成
```

---

## 2. 浮窗统一样式规范

**核心原则：** 纯白实色 + 1px 边框，无毛玻璃、无阴影、无透明度

```css
/* 所有浮窗统一样式 */
.floating-panel {
  background: #FFFFFF;          /* 纯白实色 */
  border: 1px solid #E8E8E8;    /* 极浅边框 */
  border-radius: 10px;          /* 适中圆角 */
  /* NO box-shadow */
  /* NO backdrop-filter */
  /* NO opacity */
}

/* 分区标签（参考 Magnific） */
.section-label {
  font-size: 10px;
  font-weight: 500;
  color: #999999;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 药丸标签（用于选择器） */
.pill-tag {
  height: 26px;
  padding: 0 12px;
  border-radius: 9999px;
  font-size: 12px;
  border: 1px solid #E0E0E0;
  background: transparent;
  color: #666666;
}
.pill-tag.active {
  background: #1A1A1A;
  color: #FFFFFF;
  border-color: #1A1A1A;
}
```

---

## 3. 顶部浮窗（TopBar）

**高度：** 40px（从 48px 压缩）  
**背景：** 纯白 #FFFFFF + 1px 底部边框 #E8E8E8  
**交互：** 默认隐藏，鼠标触顶后从上滑入

```
┌─────────────────────────────────────────────────────────────┐
│ ← First Mind ✏️          ● Saved   Map  Export  AI  100%     │
└─────────────────────────────────────────────────────────────┘
  40px 高 · 纯白 · 1px 底部边框
  左区（200px）：返回箭头 + 墙名（可点击编辑）
  中区（自适应）：保存状态指示
  右区（200px）：Map / Export / AI 按钮 + 缩放比例
```

**元素细节：**
- 返回箭头：20px，#333
- 墙名：14px bold #1A1A1A + 编辑图标（12px，#999）
- 保存状态：绿点（6px）+ "Saved"（10px，#999）
- 按钮（Map/Export/AI）：28px 高，1px 边框 #D0D0D0，6px 圆角，12px 文字
- 缩放比例：10px 文字 #999（非按钮，仅显示）
- 元素间距：8px（紧凑）

---

## 4. 底部工具栏（BottomToolbar）— Version B: Micro Icon Row

**选择理由：** 始终显示图标，信息密度适中，展开后加文字标签更清晰

### 4.1 布局与动画

```
默认态（collapsed）:
┌─────────────────────────────────────┐
│  [🖼] [📄] [📌] []                │  ← 4 个微图标（10px，#CCC）
└─────────────────────────────────────┘
  宽 100px · 高 28px · border-radius 14px
  居中底部，距底边 24px
  纯白 #FFF · 1px 边框 #E5E5E5

Hover 展开态（expanded）:
┌────────────────────────────────────────────┐
│  [🖼 Image] [📄 Paper] [📌 Stamp] [🪢 Rope] │  ← 图标 16px + 文字 9px
└────────────────────────────────────────────┘
  宽 220px · 高 28px · border-radius 14px
  图标 16px（#666）+ 文字标签 9px（#999）
  按钮间距 8px
```

**展开动画：** `transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)`（弹性缓动）  
**背景：** 纯白 #FFFFFF + 1px 边框 #E5E5E5  
**Hover 态：** 按钮背景 #F5F5F5

### 4.2 工具按钮

| 图标 | 功能 | 行为 |
|---|---|---|
| 🖼 Image | 添加图片 | 点击后进入"从素材托盘拖入"提示模式；或打开文件选择器 |
| 📄 Paper | 添加 Paper | 点击弹出 4 变体选择（普通纸/撕边纸/便利贴/胶带），点击后在画布中心创建 |
|  Stamp | 添加 Stamp | 点击弹出 5 色 Stamp 选择，点击后在画布中心创建 |
| 🪢 Rope | 创建 Rope | 点击后进入 Rope 创建模式（提示"点击一个 Pin 开始"） |

**注意：** 删除功能不在工具栏内，通过右键菜单或 Delete 键实现。

---

## 5. AI 助手浮窗（AIAssistant）— V1: Pill Tag Row + Chat Flow

**选择理由：** 药丸标签行更紧凑，对话流占主区域更符合 AI 交互习惯（参考 Codex）

### 5.1 布局

```
默认：隐藏（仅顶部栏 "AI" 按钮可见）
点击展开 → 右侧固定面板：

┌──────────────────────────────┐
│ AI                          │  ← 40px 顶栏
├──────────────────────────────┤
│ Name · Reflect · Title · Multi│  ← 药丸标签行，26px 高
├──────────────────────────────┤
│                              │
│  [AI 对话流区域]              │  ← 占主要空间
│  "I notice your temple..."   │
│                              │
├──────────────────────────────
│ 📷 Temple  📝 Note     [×]   │  ← 选中物件 tag（Codex 风格）
│ ──────────────────────────┐ │
│ │ Type a message...        │ │  ← 输入框
│ ──────────────────────────┘ │
└──────────────────────────────┘
  宽 320px · 最大高 60vh · 右侧距边 16px · 顶部距顶 64px
  纯白 #FFF · 1px 左边框 #E8E8E8
```

### 5.2 交互细节

- **任务切换：** 点击药丸标签 → 高亮（背景 #1A1A1A，文字白）→ 更新对话上下文
- **对话流：** 
  - AI 消息：左对齐，浅灰气泡 #F5F5F5，圆角，13px 文字
  - 用户消息：右对齐，深色气泡 #1A1A1A，白色文字
  - 占位符："Ask about your wall..."（13px，#AAA）
- **选中物件：** 以 inline tag 形式显示在输入框上方（Codex 风格）
  - Tag 样式：22px 高，10px 文字，背景 #F0F0F0，带 × 可移除
- **输入框：** 36px 高，1px 边框 #E0E0E0，border-radius 8px
- **加载态：** 对话区显示 3 点跳动动画 + "Thinking..."
- **失败态：** "AI temporarily unavailable. Non-AI features still work."
- **v0.1 限制：** 界面预留，AI 不接入，显示 "v0.1: AI interface reserved"

---

## 6. 物件交互状态机

### 6.1 全局画布状态

```
IDLE ──click 背景──→ IDLE（取消选中）
  │
  ├──click 物件──→ SELECTED
  ├──拖拽背景──→ PANNING ──mouseup──→ IDLE
  ├──滚轮──→ ZOOMING（实时）
  ├──Shift+click 物件──→ MULTI_SELECT
  └──拖拽空白区域（按住）──→ BOX_SELECTING ──mouseup──→ MULTI_SELECT / IDLE
```

### 6.2 物件状态（单个物件）

```
IDLE ──click──→ SELECTED
  │
  ├──拖拽本体──→ DRAGGING ─mouseup──→ SELECTED
  ├──拖拽角手柄──→ RESIZING_UNIFORM ─mouseup──→ SELECTED
  ├──拖拽边手柄──→ RESIZING_STRETCH ──mouseup──→ SELECTED
  ├──拖拽旋转手柄──→ ROTATING ──mouseup──→ SELECTED
  ├──拖拽 Pin──→ PIN_DRAGGING ──mouseup──→ SELECTED
  ├──Pin 拖出──→ ROPE_CREATING ──mouseup 在另一 Pin──→ IDLE（Rope 创建完成）
  │                                              ──mouseup 空白──→ SELECTED（取消）
  ├──双击 Paper──→ EDITING_TEXT ──blur/Enter──→ SELECTED
  ├──双击 Rope──→ EDITING_NOTE ──blur/Enter──→ IDLE
  ├──Delete 键──→ （删除，回到 IDLE）
  └──click 背景──→ IDLE
```

**关键变更：** 旋转支持 360° 自由旋转，无 15° 吸附增量。

### 6.3 多选状态

```
MULTI_SELECT
  ├──拖拽任一选中物件──→ DRAGGING_MULTI ──mouseup──→ MULTI_SELECT
  ├──Shift+click 已选物件──→ 取消该物件选中
  ├──Shift+click 未选物件──→ 加入选中
  ├──Delete 键──→ 批量删除 → IDLE
  └──click 背景──→ IDLE
```

### 6.4 Rope 创建流程

```
SELECTED（有 Pin 的物件）
  ──mousedown Pin──→ ROPE_CREATING
    ├──mousemove──→ 尾巴线跟随鼠标（SVG 虚线）
    ├──mouseenter 另一 Pin──→ 目标 Pin 发光（#4A90D9 glow）
    ├──mouseup 在有效 Pin──→ 创建 Rope → IDLE
    └──mouseup 空白/ESC──→ 取消 → SELECTED
```

---

## 7. 物件组件内部布局

### 7.1 ObjectWrapper（通用容器）

每个物件被 `ObjectWrapper` 包裹，负责：
- 绝对定位（x, y, rotation, z-index）
- 选中态虚线边框（1px dashed #4A90D9）
- 8 个缩放手柄（四角 6×6px 方形 + 四边 10×4px 矩形）
- 旋转手柄（角手柄 + 修饰键实现 360° 自由旋转）
- Pin 渲染（默认上边缘中点）

**选中态层级：**
```
ObjectWrapper
── 内容层（Picture/Paper/Stamp 实际渲染）
├── Pin 层（z-index: 内容层 + 1）
── 选中边框层（z-index: 内容层 + 2）
├── 缩放手柄层（z-index: 内容层 + 3）
└── 旋转手柄层（z-index: 内容层 + 4）
```

### 7.2 PictureObject

```
┌────────────────────────────┐
│                            │
│         <img>              │  ← object-fit: cover
│                            │
└────────────────────────────┘
  无边框，无投影
  默认 240px 宽，高度自适应（维持宽高比）
  最小 80×80，最大 600×600
```

### 7.3 PaperObject（4 变体）

**普通纸（note）：**
```
┌────────────────────────────
│  The quiet of temples      │  ← contenteditable
│  makes me stay             │     font: "LXGW WenKai"/"Caveat" 16px
│                            │     color: #1A1A1A
│                            │     padding: 16px
────────────────────────────┘
  背景 #FFFFFF · 无边框 · 无投影
  默认 200×120px
```

**撕边纸（torn）：**
```
  ╭──────────────────────────╮
  │  Rainbow after rain      │  ← 同普通纸，但上下边缘
  │  at Siam Square          │     用 SVG clip-path 模拟撕边
  ──────────────────────────╯     （不规则锯齿，振幅 3-5px）
  背景 #F5F0E8（微暖白）
```

**便利贴（sticky）：**
```
┌──────────────────┐
│                  │  ← 140×140px 正方形
│  Must try:       │     背景色可切换（8 预设色）
│  Khao Soi        │     无卷角效果（完全扁平）
│                  │
└──────────────────┘
```

**胶带（tape）：**
```
┌────────────────────────────────────┐
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │  ← 180×30px
│  半透明条纹纹理（CSS repeating-     │     无文字，纯装饰
│  linear-gradient 模拟胶带质感）      │     opacity: 0.7
└────────────────────────────────────┘
```

### 7.4 StampObject

```
  ┌──────────┐
  │  ╭────╮  │  ← 80×80px 默认
  │  │印章│  │     mix-blend-mode: multiply
  │  ╰────╯  │     旋转角度随机（-15° 到 +15°，创建时随机）
  └──────────     无 Pin
```

**附着在 Paper 上时：**
- Stamp 的 `position: absolute` 相对于 Paper 容器
- 位置用局部坐标（百分比）存储
- z-index 高于 Paper 文字层
- 缩放 Paper 时 Stamp 跟随缩放（相对尺寸不变）

---

## 8. 右键上下文菜单

### 8.1 触发

在任意物件上右键 → 显示上下文菜单（鼠标位置）

### 8.2 菜单项

**Stamp 右键菜单：**
```
┌──────────────────────┐
│ Attach to Paper       │  ← 仅当 Stamp 独立时显示
│ Detach                │  ← 仅当 Stamp 已附着时显示
│ ──────────────────── │
│ Bring to Front        │
│ Send to Back          │
│ ──────────────────── │
│ Change Color          │  ← 显示 5 色选项（蓝/灰/红/绿/黄）
│ ──────────────────── │
│ Delete                │  ← 红色文字 #C0392B
──────────────────────┘
```

**Picture 右键菜单：**
```
┌──────────────────────┐
│ Replace Image         │  ← 打开素材库弹窗
│ ──────────────────── │
│ Bring to Front        │
│ Send to Back          │
│ ──────────────────── │
│ Delete                │
└──────────────────────┘
```

**Paper 右键菜单：**
```
┌──────────────────────┐
│ Change Color          │  ← 仅 sticky 变体时显示（8 色）
│ ──────────────────── │
│ Bring to Front        │
│ Send to Back          │
│ ──────────────────── │
│ Delete                │
└──────────────────────┘
```

**Rope 右键菜单：**
```
──────────────────────┐
│ Edit Note             │
│ ──────────────────── │
│ Delete                │
└──────────────────────┘
```

### 8.3 视觉

- 背景 `#FFFFFF`（纯白实色）
- `border: 1px solid #E0E0E0` · `border-radius: 8px`
- **无投影**
- 菜单项高 32px，hover 背景 `#F5F5F5`
- 分割线 `1px solid #EEE`
- 点击菜单外区域 → 关闭

---

## 9. Toast 通知系统

### 9.1 位置与样式

- 位置：顶部栏下方居中（距顶 60px）
- 样式：`background: #333` · `color: #FFF` · `border-radius: 8px` · `padding: 10px 20px` · `font-size: 13px`
- 动画：从顶部滑入（0.3s ease-out），3s 后自动消失（0.3s fade-out）

### 9.2 Toast 类型

| 场景 | 文案 | 类型 |
|---|---|---|
| 物件达上限 | "Object limit reached (50/50)" | warning（橙色左边框） |
| 图片上传成功 | "Image added to tray" | success（绿色左边框） |
| 图片过大 | "Image exceeds 10MB limit" | error（红色左边框） |
| 图片配额满 | "User image limit reached (12/12)" | warning |
| 存储不可用 | "Local storage unavailable. Content won't auto-save." | error |
| IndexedDB 满 | "Storage full. Please export and clean up." | error |
| AI 不可用 | "AI temporarily unavailable" | info（蓝色左边框） |
| 导出成功 | "PNG exported" | success |
| 导出失败 | "Export failed. Please retry." | error |
| 撤销 | "Undone" | info |
| 重做 | "Redone" | info |

---

## 10. Connection Map 节点设计

### 10.1 Map 节点卡片（MapNode）

```
┌──────────────────────┐
│  ┌────────────────┐  │
│  │                │  │  ← 缩略图（64×48px，object-fit: cover）
│  │    Thumbnail   │  │
│  └────────────────┘  │
│  Travel Notes         │  ← 标题（12px，#1A1A1A，单行截断）
│  Project              │  ← 类型标签（10px，#999）
└──────────────────────┘
  宽 120px · 背景 #FFF · border-radius: 8px
  border: 1px solid #E8E8E8
  选中态：border 2px solid #4A90D9 + 轻微蓝色光晕
  拖拽中：box-shadow: 0 4px 16px rgba(74,144,217,0.3)
```

### 10.2 Map 连线（MapEdge）

- SVG 二次贝塞尔曲线（同 Rope 视觉风格但更细）
- 线宽 1.5px · 颜色 `#B0A090`（比 Rope 浅）
- 选中态：2px · `#4A90D9`
- 关联说明标签：沿曲线中点放置，背景白，padding 2px 6px，font-size 11px

### 10.3 布局算法

**输入：** 节点列表（含缩略图、标题、类型）+ 连线列表（含说明）  
**输出：** 每个节点的 (x, y) 坐标

**网格布局：**
- 计算节点总数 N
- 列数 = ceil(sqrt(N * 1.6))（宽屏偏宽）
- 行间距 160px，列间距 180px
- 节点不重叠检测：若两节点距离 < 140px，微调位置

**环形布局（备选）：**
- 中心点 = 画布中心
- 半径 = max(200, N * 30)
- 均匀分布角度 = 360° / N
- 中心区域留给交叉连线

### 10.4 Map 编辑规则

- 节点可拖拽重排（位置存入 `mapViewState`，不写回白墙）
- 右键节点 → "隐藏子元素"（隐藏该节点关联的 Stamp 等子物件）
- 独立撤销栈：Ctrl+Z 仅撤销 Map 编辑操作
- 切回白墙视图时，Map 编辑状态保留（下次进入 Map 时恢复）

---

## 11. 缩放/平移控件

### 11.1 缩放指示器

**位置：** 整合进顶部浮窗最右侧（10px 文字 #999）  
**交互：** 
- 点击 "100%" → 弹出小面板（+/- 按钮 + 重置）
- 滚轮缩放：20%-300%，以鼠标位置为中心
- 双击 "100%" → 重置为 100%

### 11.2 平移

- 鼠标左键拖拽空白背景 → 平移画布
- 平移时鼠标变为 `grab` → `grabbing`
- 触控板双指平移原生支持

### 11.3 初始视图

- 空墙：固定 100%，画布中心
- 有内容：自适应缩放使全部物件可见（计算包围盒，取 min(画布宽/包围盒宽, 画布高/包围盒高) * 0.9，限制在 20%-300%）

---

## 12. 键盘快捷键清单

| 快捷键 | 功能 | 作用域 |
|---|---|---|
| `Ctrl+Z` | 撤销 | 白墙 / Map（各自独立栈） |
| `Ctrl+Shift+Z` | 重做 | 白墙 / Map |
| `Delete` / `Backspace` | 删除选中物件 | 白墙（多选时批量删除） |
| `Escape` | 取消当前操作 / 取消选中 | 全局 |
| `Shift + Click` | 多选物件 | 白墙 |
| `Ctrl+A` | 全选 | 白墙 |
| `Ctrl+S` | 手动保存（触发持久化） | 全局 |
| `Ctrl+E` | 导出 PNG | 全局 |
| `1` / `2` / `3` | 切换墙纸（快捷） | 白墙 |
| `M` | 切换 Map / 白墙视图 | 白墙 |
| `Space`（按住） | 临时切换为平移模式 | 白墙 |
| `+` / `-` | 缩放 ±10% | 白墙 |
| `0` | 重置缩放至 100% | 白墙 |

---

## 13. 设计决策记录

| 决策 | 结论 | 日期 |
|---|---|---|
| 底部工具栏版本 | Version B（Micro Icon Row） | 2026-08-06 |
| AI 面板版本 | V1（Pill Tag Row + Chat Flow） | 2026-08-06 |
| 顶部浮窗高度 | 40px（从 48px 压缩） | 2026-08-06 |
| 浮窗背景 | 纯白实色 + 1px 边框，无毛玻璃 | 2026-08-06 |
| 项目命名 | Mind on Wall（从 Pin & Paper Journal 改名） | 2026-08-06 |
| Pin 风格 | 俯视图，白圈 + 金色中心点 | 2026-08-06 |
| Rope 弧度 | 悬链线物理模拟（sag = k × (L - d)） | 2026-08-06 |
| 旋转角度 | 360° 自由旋转，无吸附 | 2026-08-06 |
| 总览页缩略 | v0.1 用墙纸色块 + 物件数量，后续加实时渲染 | 2026-08-06 |

---

## 14. 待办事项

- [ ] 实现 TopBar 组件（40px，纯白实色）
- [ ] 实现 BottomToolbar 组件（Version B）
- [ ] 实现 AIAssistant 组件（V1）
- [ ] 更新所有浮窗样式为纯白实色 + 1px 边框
- [ ] 实现 Pin 俯视图（白圈 + 金色中心点）
- [ ] 实现 Rope 悬链线物理弧度
- [ ] 实现 360° 自由旋转
- [ ] 实现右键上下文菜单
- [ ] 实现素材库弹窗（Replace Image）
