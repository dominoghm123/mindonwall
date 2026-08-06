# UI Component Design — v0.3

**状态：** 修订版（整合用户 v4 反馈）
**创建日期：** 2026-08-06
**最后更新：** 2026-08-06
**关联文档：** `planning/PRD.md` · `researching/VISUAL_SPEC.md` · `planning/MAGNIFIC_DESIGN_ANALYSIS.md`

---

## 设计原则

1. **零投影** — 所有物件、浮窗均无 box-shadow
2. **纯白实色浮窗** — `#FFFFFF` + 1px `#E8E8E8` 边框，无毛玻璃/透明度
3. **超现实扁平** — 物件直接贴合墙体材质，无深度感
4. **紧凑工具感** — 参考 Magnific/Codex，按钮 28-32px，标签 11px uppercase
5. **层级标签** — 浮窗分区用 11px uppercase #999 标签做视觉分隔

---

## 1. 浮窗系统

### 1.1 顶部栏（40px）

- **触发：** 鼠标移至屏幕最上方 → 从上滑入
- **收拢：** 仅顶部 2px 灰色触发线
- **样式：** 纯白 `#FFF`，1px 底边框 `#E8E8E8`，高 40px，无投影

**布局（左对齐）：**
```
← First Mind                    ● Saved   [Map] [Export] [AI]  100%
```
- 左：返回箭头 `←`（16px）+ 墙名（14px bold，可编辑）— **左对齐**
- 右：绿色圆点 + "Saved"（10px #999）| Map / Export / AI 按钮（28px 高，1px border #D0D0D9，radius 6px）| 缩放比例 "100%"（10px #999）

### 1.2 底部工具栏（Version B — 微图标行）

- **收拢态：** 28px × 100px 圆角药丸，纯白 + 1px border #E5E5E5，radius 14px，4 个微图标（10px #CCC）
- **展开态（hover）：** 28px × 260px，4 个图标按钮（40×40px）+ **下方文字标签**（10px #999）

```
收拢:  [ ·  ·  ·  · ]                    ← 4 micro icons
展开:  [ 🖼️   📄   🔵   〰️ ]            ← 14px icons
         Image  Paper  Stamp  Rope        ← 10px labels below
```

### 1.3 墙纸选择器（浮窗面板）

- **触发：** 从顶部栏或右键菜单打开
- **样式：** 浮窗面板，240px 宽，纯白 + 1px border，radius 10px
- **标题：** "WALLPAPER"（11px uppercase #999）
- **内容：** 3×2 网格，每个 64×44px 真实材质预览缩略图
  - None / White / Beige / Textured / Watercolor / Kraft
  - 当前选中：2px 蓝框 #4A90D9 + ✓

### 1.4 Paper 子菜单（浮窗面板）

- **触发：** 点击底部工具栏 Paper 按钮 → 弹出次级浮窗
- **样式：** 200px 宽，纯白 + 1px border，radius 10px
- **标题：** "PAPER"（11px uppercase #999）
- **4 选项（纵向列表，36px 高/项）：**
  - Note — 白纸 + 横线图标
  - Sticky — 小方块 + 折角图标
  - Torn — 锯齿边缘图标
  - Tape — 半透明条纹图标

### 1.5 Map 面板（浮窗）

- **触发：** 点击顶部栏 Map 按钮
- **样式：** 300px 宽浮窗，纯白 + 1px border，radius 10px
- **标题：** "MAP"（11px uppercase #999）
- **内容：** 墙面卡片列表，每张 270×80px
  - 左半：**真实渲染缩略图**（显示实际照片/文字/印章的缩小版，非抽象色块）
  - 右半：标题（13px bold）+ 描述（11px #999）
  - 点击卡片 → 进入该墙面

### 1.6 AI 面板（浮窗，从右滑入）

- **触发：** 点击顶部栏 AI 按钮
- **样式：** 320px 宽，纯白 + 1px 左边框，无投影
- **顶栏（36px）：** "AI" 标签 + × 关闭
- **模式切换：**
  - `Auto` 模式（默认）：AI 自动检测选中物件并推断任务
    - 浅蓝建议条：✨ "Detected: 2 photos from Chiang Mai" + Auto/Manual pill 切换
  - `Manual` 模式：紧凑药丸标签行 `Name` · `Reflect` · `Title` · `Multi`
- **对话流区域：** 聊天气泡（AI 灰 #F5F5F5 / 用户深 #1A1A1A）
- **底部输入框：** 选中物件以 inline tag 附着在输入框内（参考 Codex）
- **v0.1 备注：** 接口预留，AI 未接入

### 1.7 物件操作面板（替代右键菜单）

- **触发：** 选中物件后，在物件附近浮现
- **样式：** 160px 宽，纯白 + 1px border，radius 8px
- **内容：** 5 个图标按钮一行排列（28×28px）：
  - Move（四向箭头）| Rotate（↻）| Scale（↗↙）| Color（调色板）| Delete（🗑 红色 #C0392B）
- 通过细线连接到物件

### 1.8 右键菜单（补充操作）

- 操作面板处理主要操作，右键菜单提供补充：
  - **Stamp：** Attach to Paper / Detach / Bring to Front / Send to Back / Change Color / Delete
  - **Picture：** Replace Image / Bring to Front / Send to Back / Delete
  - **Paper：** Change Color（Sticky 8色）/ Bring to Front / Send to Back / Delete
  - **Rope：** Edit Note / Delete
- 样式：纯白 + 1px border #E0E0E0，radius 8px，32px/项，**无投影**

---

## 2. 物件设计

### 2.1 Pin（俯视图）

- 16px 圆形，白色填充 #F5F5F5，1px border #E0E0E0
- **高光点：** 左上区域 4px 白色圆点（模拟弧面反光），使图钉可辨认
- **中心金点：** 3px #C9A84C（针尖俯视图）
- 可拖拽，限制在父物件范围内

### 2.2 Rope（加粗可见）

- 棕色曲线 #8B6914，**3px 描边**（原 1.5px）
- 悬链线弧度：`sag = 0.3 * (L - d)`
- 从钉头到钉头的自然下垂

### 2.3 Picture

- 原始图片矩形，无边框，无投影
- Pin 在顶部中心
- 支持缩放、旋转（360° 自由）

### 2.4 Paper（4 变体，统一归 Paper 类）

| 变体 | 尺寸 | 特征 |
|---|---|---|
| Note | 200×120px | 白纸，手写字体，Pin 在顶部 |
| Sticky | 140×140px | 8 预设色，折角，无 Pin（自粘） |
| Torn | 200×120px | 米色 #F5F0E8，SVG clip-path 撕边 |
| Tape | 180×30px | 半透明条纹，opacity 0.7，无 Pin |

- 字体："LXGW WenKai" / "Caveat"，16px
- Note/Torn/Sticky 支持缩放、旋转

### 2.5 Stamp

- 圆形印章，multiply 混合模式
- **无 Pin**（独立或附着均无）
- 可附着到 Paper 上
- 支持缩放、旋转

### 2.6 选中态 & 操作

- **选中框：** 1px 虚线 #4A90D9 + 8 resize handles（6×6px 白底蓝框）
- **操作面板：** 选中后物件上方浮现（见 1.7）
- **框选：** Figma 风格 — 半透明蓝填充 `rgba(74,144,217,0.08)` + 1px 虚线蓝框

---

## 3. 总览页

### 3.1 布局

- 顶部栏：app 名 "Mind on Wall"（左）+ "New Wall" 按钮（右）
- 卡片网格：3 列，16px 间距

### 3.2 墙面卡片（280×200px）

- **上半（70%）：真实渲染预览** — 显示实际照片/文字/印章/绳索的缩小版
  - 不是抽象色块，而是墙面内容的真实缩略
- **下半（30%）：信息区**
  - 标题（13px bold）+ 描述（11px #999）+ 物件数（10px #BBB）
- 1px border #E8E8E8，radius 10px，无投影
- Hover：2px 蓝框 #4A90D9
- 点击卡片 → 进入墙面编辑

### 3.3 新建卡片

- 虚线边框 1px #D0D0D9，radius 10px
- 中心 "+" 图标 + "New Wall" 文字

---

## 4. 交互状态机

```
IDLE → SELECTED → DRAGGING / RESIZING / ROTATING / PIN_DRAGGING / ROPE_CREATING / EDITING_TEXT
```

- 左键单击 → 选中 → 操作面板浮现
- 左键拖拽物件 → 移动
- 左键拖拽 Pin → 更新局部坐标
- 左键拖拽空白 → 框选（Figma 蓝色填充）
- Shift+Click → 多选切换
- 右键 → 补充菜单
- 360° 自由旋转，无角度吸附

---

## 5. 键盘快捷键

| 快捷键 | 功能 |
|---|---|
| Ctrl+Z / Ctrl+Shift+Z | 撤销/重做 |
| Delete / Backspace | 删除选中 |
| Escape | 取消选中/退出模式 |
| Shift+Click | 多选切换 |
| Ctrl+A | 全选 |
| M | 进入 Map |
| Space（按住） | 拖拽画布 |
| +/- | 缩放 |
| 0 | 重置缩放 |

---

## 6. 设计决策记录

| 决策 | 选择 | 原因 |
|---|---|---|
| 底部工具栏 | Version B（微图标行） | 收拢态即可识别功能 |
| AI 面板 | V1（药丸标签 + 对话流） | 紧凑 + Codex 风格 |
| 顶部栏高度 | 40px | 紧凑但不拥挤 |
| 浮窗材质 | 纯白实色 + 1px 边框 | 去毛玻璃，超现实扁平 |
| 墙名位置 | 左对齐 | 更符合阅读习惯 |
| 物件操作 | 浮窗面板（非右键） | 更直觉，减少隐藏操作 |
| 框选样式 | Figma 蓝色填充 | 用户熟悉的标准交互 |
| Rope 粗细 | 3px（原 1.5px） | 提高可见性 |
| Pin 高光 | 左上 4px 白点 | 增加图钉辨识度 |
| 总览卡片 | 真实内容预览 | 非抽象色块，直观展示 |
| AI 模式 | Auto + Manual 双模式 | 降低操作门槛 |
