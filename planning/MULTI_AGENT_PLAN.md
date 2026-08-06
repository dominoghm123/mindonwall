# Multi-Agent 协作方案 — Mind on Wall v0.1

**目标：** 8 月 9 日前完成可验收 MVP  
**环境：** Qoder + Quest 模式  
**最后更新：** 2026-08-06

---

## 1. 角色划分

### 主 Agent（PM / 包工头）

**职责：**
- 管理全局状态文件 `implementing/STATUS.md`
- 向用户汇报进度、请求 Review、处理阻塞
- 分配 Slice 给子 Agent，确认每个 Slice 的 Spec 切片
- 合并子 Agent 的工作成果，解决冲突
- 负责最终联调和验收测试

**不做什么：** 不直接写业务代码（除非是紧急修复或简单胶水代码）

**加载的上下文：**
- `planning/HANDOVER.md`（全局摘要）
- `planning/PRD.md`（需求真源）
- `implementing/STATUS.md`（进度看板）

### 子 Agent 矩阵

| 角色 | 代号 | 负责的 Slice | 加载的 Spec 切片 |
|---|---|---|---|
| 数据层 Agent | `data` | Slice 0, 5 | PRD §6 数据模型 + 撤销机制 + Storage Adapter |
| 画布 Agent | `canvas` | Slice 1, 2, 3 | PRD §3 物件语法 + §6 画布交互 + VISUAL_SPEC §2/§5/§6 |
| UI 架构 Agent | `chrome` | Slice 4 | PRD §7 UI 架构 + VISUAL_SPEC §4/§11 |
| Map + AI Agent | `smart` | Slice 6, 7 | PRD §3 Map 规则 + §5 AI 行为 + VISUAL_SPEC §8 |
| 导出 + 总览 Agent | `finish` | Slice 8, 9 | PRD §6 导出规则 + §7 总览页 + VISUAL_SPEC §11 |

---

## 2. Slice 定义与依赖

```
Day 1 (8/6 下午 + 8/7)                    Day 2 (8/8)              Day 3 (8/9)
┌─────────────────────────────────┐    ┌──────────────┐    ┌──────────────────┐
│ Slice 0: 数据层基础 [data]      │    │ Slice 6: Map │    │ Slice 8: PNG导出 │
│  Zustand store + Storage Adapter│    │ [smart]      │    │ Slice 9: 总览页  │
│  数据模型 + IndexedDB + 撤销栈  │    │              │    │ [finish]         │
├─────────────────────────────────┤    ├──────────────┤    │ Slice 10: 联调   │
│ Slice 1: 画布渲染 [canvas]      │───▶│ Slice 7: AI  │    │ 测试 + Bug 修复  │
│  物件组件 + Pin + 拖拽/缩放/旋转│    │ [smart]      │    │ [main Agent]     │
├─────────────────────────────────┤    └──────────────┘    └──────────────────┘
│ Slice 2: 交互层 [canvas]        │───▶
│  Rope创建 + 多选 + 删除 + 键盘  │
├─────────────────────────────────┤
│ Slice 3: Stamp双状态 [canvas]   │
│  附着/独立 + 右键菜单 + 级联删除 │
├─────────────────────────────────┤
│ Slice 4: UI浮窗 [chrome]        │───▶ (依赖 Slice 1 的组件接口)
│  底部工具栏+左侧托盘+顶部浮窗   │
├─────────────────────────────────┤
│ Slice 5: 多墙面+素材托盘 [data] │
│  总览页数据 + 墙面CRUD + 托盘   │
└─────────────────────────────────┘
```

**并行规则：**
- Slice 0 + Slice 1 可并行启动（数据层 + 画布渲染同步推进）
- Slice 4 依赖 Slice 1 的组件接口定义（需先约定 Props 契约）
- Slice 6 依赖 Slice 0 的 store 结构 + Slice 2 的 Rope 数据
- Slice 7 依赖 Slice 0 的 store + 外部 API 路由
- Slice 8/9 依赖所有前序 Slice 基本完成

---

## 3. 每个 Slice 的详细交付物

### Slice 0：数据层基础（data Agent）
**时间：** Day 1 上午  
**Spec 切片：** PRD §6 数据模型 + 撤销机制 + Storage Adapter  
**交付物：**
- `src/store/wallStore.ts` — Zustand store（Wall/Item/Rope/Pin/Asset）
- `src/storage/StorageAdapter.ts` — 抽象接口（localStorage 实现）
- `src/storage/indexedDB.ts` — 图片二进制存储
- `src/store/undoMiddleware.ts` — 撤销/重做中间件（20 步快照）
- 单元测试：Pin 推导、Rope 有效性、级联删除、持久化恢复

### Slice 1：画布渲染（canvas Agent）
**时间：** Day 1 上午（与 Slice 0 并行）  
**Spec 切片：** PRD §3 物件语法 + VISUAL_SPEC §2/§5/§6  
**交付物：**
- `src/components/Canvas.tsx` — 无限画布容器（缩放/平移）
- `src/components/items/PictureItem.tsx` — 图片物件
- `src/components/items/PaperItem.tsx` — Paper 4 变体（普通/撕边/便利贴/胶带）
- `src/components/items/StampItem.tsx` — Stamp 物件
- `src/components/Pin.tsx` — Pin 组件（可拖动）
- `src/components/Rope.tsx` — Rope SVG 曲线
- 缩放平移逻辑（滚轮缩放 + 左键拖背景）

### Slice 2：交互层（canvas Agent）
**时间：** Day 1 下午  
**Spec 切片：** PRD §3 Rope 规则 + §3 多选规则  
**交付物：**
- Rope 创建交互（Pin 拖出尾巴线）
- 多选交互（Shift 点击 + 矩形框选）
- 键盘事件（Delete 删除、Ctrl+Z 撤销、Ctrl+A 全选）
- Rope note 编辑（双击进入编辑模式）

### Slice 3：Stamp 双状态（canvas Agent）
**时间：** Day 1 下午  
**Spec 切片：** PRD §3 Stamp 双状态规则  
**交付物：**
- Stamp 独立放置逻辑
- Stamp 附着为 Paper 子物件（右键菜单入口）
- 附着后跟随 Paper 变换
- 级联删除
- Stamp 无 Pin 限制

### Slice 4：UI 浮窗架构（chrome Agent）
**时间：** Day 2 上午  
**Spec 切片：** PRD §7 UI 架构 + VISUAL_SPEC §4  
**交付物：**
- `src/components/chrome/Toolbar.tsx` — 底部工具栏（hover 展开）
- `src/components/chrome/AssetTray.tsx` — 左侧素材托盘
- `src/components/chrome/HeaderBar.tsx` — 顶部浮窗
- `src/components/chrome/WallpaperPicker.tsx` — 墙纸选择器（6 种）
- 浮窗动画（缩进→展开）
- 选中物件时的上下文工具栏

### Slice 5：多墙面 + 素材托盘（data Agent）
**时间：** Day 2 上午  
**Spec 切片：** PRD §6 多墙面数据  
**交付物：**
- 墙面列表 CRUD（localStorage）
- 初始墙 "First Mind" 创建逻辑（加载样例）
- 素材托盘全局数据管理
- 上传验证（10MB 限制、12 张限制、格式校验）

### Slice 6：Connection Map（smart Agent）
**时间：** Day 2 下午  
**Spec 切片：** PRD §2 Map 规则 + VISUAL_SPEC §8  
**交付物：**
- `src/components/MapView.tsx` — Map 视图（网格/环形排布）
- Map 独立撤销栈
- 节点拖动重排
- 子元素隐藏
- Map 编辑不写回白墙
- 附着的 Stamp 才显示在 Map 中

### Slice 7：AI 助手浮窗（smart Agent）
**时间：** Day 3 上午  
**Spec 切片：** PRD §5 AI 行为  
**交付物：**
- `src/components/ai/AIAssistant.tsx` — AI 浮窗 UI
- 4 种任务触发逻辑
- "点选 Rope"模式
- 采纳/取消机制
- 便利贴生成（Paper 变体 + 自动 Rope 连接）
- Vercel `/api/story` 路由

### Slice 8：PNG 导出（finish Agent）
**时间：** Day 3 上午  
**Spec 切片：** PRD §6 导出规则  
**交付物：**
- 白墙导出（物件包围盒 + 尺寸上限）
- Map 导出（全图）
- 包含墙纸/Pin/Rope

### Slice 9：总览页（finish Agent）
**时间：** Day 3 下午  
**Spec 切片：** PRD §7 总览页 + VISUAL_SPEC §11  
**交付物：**
- `src/pages/Overview.tsx` — 总览页
- 墙面卡片网格
- 新建墙面
- 管理墙（多选删除 + 二次确认）
- 路由（总览页 ↔ 墙面编辑页）

### Slice 10：联调 + 测试（main Agent）
**时间：** Day 3 下午  
**交付物：**
- 端到端流程验证（样例加载→摆放→连线→Map→AI→导出）
- Bug 修复
- 部署到 Vercel
- 演示走查

---

## 4. 并行机制与上下文管理

### 并行原则

```
用户 ←→ 主 Agent（Review 方案、决策、汇报）
              │
              ├──→ data Agent（Slice 0/5）──→ 写 STATUS.md
              ├──→ canvas Agent（Slice 1/2/3）──→ 写 STATUS.md
              ├──→ chrome Agent（Slice 4）──→ 写 STATUS.md
              ├──→ smart Agent（Slice 6/7）──→ 写 STATUS.md
              └──→ finish Agent（Slice 8/9）──→ 写 STATUS.md
```

- 用户与主 Agent Review 方案时，子 Agent **不停工**
- 子 Agent 完成一个 Slice 后，将结果写入 `implementing/STATUS.md`
- 主 Agent 汇总后向用户汇报

### 上下文切片（每个子 Agent 只加载）

每个子 Agent 启动时只读取：
1. `planning/HANDOVER.md`（全局摘要，~100 行）
2. 自己负责的 **Spec 切片**（从 PRD 和 VISUAL_SPEC 中提取，~50 行）
3. `implementing/STATUS.md`（当前进度）
4. 前序 Slice 产出的**接口定义文件**（TypeScript 类型）

**不加载：** 完整的 PRD（太长）、其他 Slice 的实现代码、researching/ 下的非相关文件。

### 接口契约（跨 Slice 依赖）

在 Slice 0 完成后，data Agent 需导出以下接口供其他 Agent 使用：

```typescript
// src/store/types.ts — 所有 Agent 共享的类型定义
interface Wall { id: string; name: string; wallpaper: WallpaperType; items: Item[]; ropes: Rope[]; }
interface Item { id: string; type: 'picture'|'paper'|'stamp'; x: number; y: number; width: number; height: number; rotation: number; variant?: PaperVariant; parentId?: string; assetId?: string; text?: string; color?: string; stampId?: string; pinOffset?: { x: number; y: number }; }
interface Rope { id: string; fromItemId: string; toItemId: string; note?: string; }
// ... 完整定义见 Slice 0 交付物
```

---

## 5. 进度汇报格式

每个子 Agent 完成 Slice 后，在 `implementing/STATUS.md` 追加：

```markdown
## [Slice N] 完成 — YYYY-MM-DD HH:MM

**Agent:** canvas / data / chrome / smart / finish
**交付文件：**
- `src/xxx.ts` — 简要说明
- `src/xxx.ts` — 简要说明

**验证结果：**
- ✅ 单元测试通过 / ❌ 失败原因
- ✅ 手动验证通过 / ❌ 问题描述

**阻塞项（如有）：**
- 阻塞原因 + 建议解法

**下一步建议：**
- 可启动 Slice X / 需要用户决策：xxx
```

主 Agent 汇总后向用户汇报格式：

```
📊 进度更新 — Day N / 3

✅ 已完成：Slice 0（数据层）、Slice 1（画布渲染）
🔄 进行中：Slice 2（交互层）、Slice 4（UI 浮窗）
⏳ 待启动：Slice 6（Map）— 等待 Slice 2 完成

阻塞项：无
需要你的决策：xxx
```

---

## 6. Qoder 与 Quest 适配

### Qoder 模式

- 主 Agent = 当前 Qoder 会话
- 子 Agent = Qoder 的子 Agent（`Agent` tool）
- 子 Agent 完成后返回结果，主 Agent 更新 STATUS.md

### Quest 模式

- 主 Agent = Quest 主会话
- 子 Agent = 通过文件协议协调（STATUS.md 作为同步点）
- 每个子 Agent 读取 HANDOVER.md + Spec 切片，独立工作

### 通用规则

- 所有代码写入 `src/` 目录
- 所有状态写入 `implementing/STATUS.md`
- 接口类型定义在 `src/store/types.ts`（跨 Slice 共享）
- 每个 Slice 完成后必须通过 TypeScript 编译检查

---

## 7. Day 1 启动序列（明天早上）

```
1. 主 Agent 读取 HANDOVER.md + PRD.md → 确认环境就绪
2. 主 Agent 创建两个并行子 Agent：
   a. data Agent → Slice 0（数据层）
   b. canvas Agent → Slice 1（画布渲染）
3. 用户 Review Slice 0/1 的接口定义（types.ts）
4. 主 Agent 启动 canvas Agent → Slice 2（交互层）
5. 主 Agent 启动 canvas Agent → Slice 3（Stamp）
6. Day 1 结束前：Slice 0-3 完成，STATUS.md 更新
```

---

## 8. 应急预案

| 风险 | 应对 |
|---|---|
| Day 2 进度落后 | 砍 Map 编辑能力（只做只读排布） |
| AI API 不通 | 跳过 Slice 7，AI 功能标记为 "coming soon" |
| 导出质量差 | 降级为视口截图（而非包围盒） |
| 撤销栈崩溃 | 降级为会话内撤销（不持久化） |
| localStorage 满 | 提示用户清理 + 限制图片压缩到 800px |
