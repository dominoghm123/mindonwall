# Handover — Pin & Paper Journal v0.1

**最后更新：** 2026-08-06  
**当前阶段：** Planning 完成（PRD 已冻结 + UI 组件设计细化完成），准备进入 Implementation

## 项目一句话

Pin & Paper Journal 是一个桌面优先的数字手帐网页：用户把记录、图片与灵感贴到可换墙纸的白墙上，用 Paper、Stamp 与 Rope 慢慢看见碎片间的关系。

## MVP 范围（8 月 9 日前交付）

- 多墙面管理（总览页 + 初始墙 "First Mind" 带旅行样例）
- 无限画布 + 4 类物件（Picture / Paper / Stamp / Rope）+ Pin + 拖拽/缩放/旋转/删除
- Paper 4 种变体：普通纸、撕边纸、便利贴、胶带
- Stamp 双状态（独立 / 附着 Paper 子物件）
- Connection Map（顶部 Tab，网格排布，可编辑投影，独立撤销）
- AI 助手浮窗（关系命名/回顾问题/故事标题/推演，百炼 Qwen）
- PNG 导出（物件包围盒 / Map 全图）
- Storage Adapter 抽象层（当前 localStorage + IndexedDB，预留云同步）

## 已确认的关键设计决策

| 决策 | 结论 | 文档位置 |
|---|---|---|
| Map 布局 | 网格/环形，节点不重叠 | PRD §6 |
| Rope 创建 | Pin 拖出尾巴线，松手完成/取消 | PRD §3 |
| Pin 可移动 | 纸面范围内拖动，局部坐标持久化 | PRD §3 |
| Stamp 双状态 | 独立/附着父子关系，级联删除 | PRD §3 |
| Paper 变体 | 4 种（普通纸/撕边纸/便利贴/胶带） | PRD §2 |
| 撤销 | Ctrl+Z，有限深度 20 步，持久化 | PRD §6 |
| 多墙面 | 总览页入口，初始墙 First Mind | PRD §6 |
| 素材托盘 | 全局共享，左侧浮窗 | PRD §7 |
| AI 采纳机制 | 采纳后写入数据，未采纳丢弃 | PRD §5 |
| 导出 | 物件包围盒，含 Pin，上限限制 | PRD §6 |
| 缩放平移 | 滚轮缩放 20-300%，左键拖背景 | PRD §6 |
| 云同步 | MVP 不做，Storage Adapter 预留 | PRD §10 |
| 移动端 | 不优化 | PRD §2 |
| 物件上限 | 50（Picture+Paper+Stamp，Rope 不算） | PRD §3 |

## 技术栈

- **前端**：React + TypeScript + Vite
- **状态管理**：Zustand
- **存储**：Storage Adapter（localStorage + IndexedDB）
- **画布**：DOM（物件）+ SVG（Rope/Map 连线）
- **导出**：html-to-image 或等效方案
- **AI**：阿里云百炼 Qwen via Vercel Serverless `/api/story`
- **部署**：Vercel

## 目录结构

```
mindonwall/
├── planning/
│   ├── PRD.md              ← 需求真源（已冻结 v0.1）
│   ├── HANDOVER.md         ← 本文件
│   ├── README.md           ← 阶段说明与版本规则
│   ├── MULTI_AGENT_PLAN.md ← Multi-Agent 协作方案
│   └── UI_COMPONENT_DESIGN.md ← UI 组件详细设计（组件树/状态机/浮窗/快捷键）
├── researching/
│   ├── FEATURE_MAP.md      ← 功能边界
│   ├── VIBE_MOODBOARD.md   ← 视觉不可违背约束
│   ├── VISUAL_SPEC.md      ← 视觉实现 Spec（颜色/尺寸/布局）
│   └── stamp_sample/       ← Stamp 参考素材（5 个 PNG 已生成在 public/）
├── implementing/
│   └── STATUS.md           ← 进度/验证/阻塞记录
├── public/
│   └── demo-assets/
│       ├── manifest.json   ← 样例素材清单（6 图 + Paper 文字 + Stamp）
│       ├── stamps/         ← 5 个 Passport Stamp PNG
│       └── *.jpg           ← 6 张旅行样例图
├── src/                    ← （待创建）应用源码
└── docs/superpowers/specs/ ← Qoder 规格文档
```

## 当前进度

| 工作项 | 状态 |
|---|---|
| 需求调研 + Grill-Me 确认 | ✅ 完成 |
| PRD v0.1 冻结 | ✅ 完成 |
| 视觉 Spec 包 | ✅ 完成 |
| UI 组件设计细化 | ✅ 完成 |
| 样例图片 6 张 | ✅ 已复制到 public/demo-assets/ |
| Stamp 素材 5 个 | ✅ 已生成到 public/demo-assets/stamps/（白底，需 `mix-blend-mode: multiply`） |
| manifest.json | ✅ 完成 |
| 项目初始化（npm create vite） | ⏳ 待开始 |
| 数据层（Zustand + Storage Adapter） | ⏳ 待开始 |
| 画布渲染（物件 + Pin + Rope） | ⏳ 待开始 |
| UI 浮窗架构 | ⏳ 待开始 |
| Connection Map | ⏳ 待开始 |
| AI 助手浮窗 | ⏳ 待开始 |
| PNG 导出 | ⏳ 待开始 |
| 总览页 | ⏳ 待开始 |
| 部署到 Vercel | ⏳ 待开始 |

## 在新窗口中继续推进的建议起始步骤

1. **读取本文件** → 读取 `planning/PRD.md` → 读取 `researching/VISUAL_SPEC.md`
2. **初始化项目**：`npm create vite@latest` → React + TypeScript → 安装 zustand、html-to-image
3. **按 slice 切片推进**（参见下方 Multi-Agent 协作方案），每完成一个 slice 更新 `implementing/STATUS.md`
4. **优先实现核心画布**（Slice 0–2），再叠加 Map / AI / 导出
5. **Deadline 8 月 9 日**：预留最后半天做整体联调和 Bug 修复

## 已知风险

- **曼谷第 3 张样例图**分辨率仅 477×358（低于 800px 要求），manifest.json 已标注。如有更高清曼谷照片可替换。
- **Stamp 素材**为白底 PNG，需用 CSS `mix-blend-mode: multiply` 模拟透明效果，或在后续处理中去除白底。
- **撤销历史持久化**的 localStorage 容量有限（~5MB），需要合理控制深度和快照大小。
- **AI 百炼 API** 需要配置 Vercel 环境变量，首次部署前需确认 API Key 可用。
