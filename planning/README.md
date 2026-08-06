# Planning

## 当前状态

**✅ v0.1 PRD 已冻结。** 所有需求已通过 Grill-Me 会话确认，Researching 和 Planning 阶段完成。

### 核心文档

- [`PRD.md`](PRD.md) — **需求真源**（v0.1 冻结版）
- [`HANDOVER.md`](HANDOVER.md) — 上下文衔接文档（新会话入口）
- [`MULTI_AGENT_PLAN.md`](MULTI_AGENT_PLAN.md) — Multi-Agent 协作方案（角色/Slice/并行/汇报）

### 辅助文档

- [`../researching/VISUAL_SPEC.md`](../researching/VISUAL_SPEC.md) — 视觉实现 Spec
- [`../researching/VIBE_MOODBOARD.md`](../researching/VIBE_MOODBOARD.md) — 视觉不可违背约束
- [`../researching/FEATURE_MAP.md`](../researching/FEATURE_MAP.md) — 功能边界

## 下一步

进入 Implementation 阶段，按 `MULTI_AGENT_PLAN.md` 的 Slice 0–10 推进。

## 版本规则

- `PRD.md` 是冻结版需求真源；遇到冲突以它为准。
- 计划完成后不反向改写 PRD；若需求变化，先更新 PRD 并记录版本原因。
- `implementing/` 只记录真实完成的代码、验证和阻塞，不把"计划中"写成已完成。
- 每完成一个 Slice，更新 `implementing/STATUS.md`。
