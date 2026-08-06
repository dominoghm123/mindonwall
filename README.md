# Pin & Paper Journal

一个桌面优先的数字手帐网页：用户把记录、图片与灵感贴到可换墙纸的白墙上，用 Paper、Stamp 与 Rope 慢慢看见碎片间的关系。

## 当前阶段

**✅ Planning 完成，PRD 已冻结。** Implementation 准备启动。

## Qoder 阅读顺序

1. [`planning/HANDOVER.md`](planning/HANDOVER.md) — **新会话入口**（2 分钟内了解全局）
2. [`planning/PRD.md`](planning/PRD.md) — 需求真源（v0.1 冻结版）
3. [`researching/VISUAL_SPEC.md`](researching/VISUAL_SPEC.md) — 视觉实现 Spec（颜色/尺寸/布局）
4. [`planning/MULTI_AGENT_PLAN.md`](planning/MULTI_AGENT_PLAN.md) — Multi-Agent 协作方案
5. [`implementing/STATUS.md`](implementing/STATUS.md) — 当前进度与 Slice 跟踪

遇到冲突时，以 `planning/PRD.md` 为准。

## 文档职责

| 路径 | 只记录什么 | 何时读取 |
| --- | --- | --- |
| `researching/` | 体验意图、视觉语言、功能边界、视觉 Spec | 设计 UI 或改变交互前 |
| `planning/` | PRD（需求真源）、HANDOVER、Multi-Agent 方案 | 需求、范围或生产顺序不确定时 |
| `implementing/` | 实际进度、命令、测试结果、阻塞项 | 每次工作会话开始与结束 |
| `public/demo-assets/` | 样例图片、Stamp 素材、manifest.json | 初始化项目时加载样例 |

## 维护规则

- 新的确认决策先更新 `planning/PRD.md`，再同步影响到的精简文件；不要让同一需求在多处独立演化。
- 每完成一个工作切片，更新 `implementing/STATUS.md` 的状态、验证证据和下一步。
- 外部部署、API Key 创建或公开发布需要单独确认，不由本文件授权。
