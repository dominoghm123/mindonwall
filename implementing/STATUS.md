# Implementation Status

**Overall:** v0.1 MVP complete; v0.2 in progress
**Active version:** v0.2 — Interactions & Chrome Refinement
**Last updated:** 2026-08-06

## v0.1 Completed

| Item | Date | Commit | Notes |
|---|---|---|---|
| Slice 0-3: Data + Canvas + Interaction + Stamp | 2026-08-06 | be9c5b3 | Stores, objects, hooks, multi-select |
| UI Chrome: App/TopBar/BottomToolbar/Overview | 2026-08-06 | c27ba2b | Full integration, wall editor + overview |
| Bug fixes: image URLs, stamp coords, dup render | 2026-08-06 | 5ae57bf | 3 critical bugs fixed |

## v0.2 Scope (Deadline: 2026-08-07 EOD)

### A. Wall Editor
- **A1. Object Interactions P0**: Fix resize (can't shrink), Stamp move/edit, zero-lag drag follow
- **A1. Object Interactions P1**: Rotation gesture (long-press handle → drag to rotate)
- **A1. Object Interactions P2**: Text follow parent paper (detach option), Pin only on picture/paper, Stamp transparent bg
- **A2. Bottom Toolbar**: Increase height (icons clipped), 3 secondary panels (image upload, paper type picker, stamp picker), one-at-a-time
- **A2. Rope Mode**: Click rope icon → highlight → click pin1 → click pin2 → auto-connect
- **A3. TopBar Re-layout**: Reference Magnific — Share button + user avatar on right; Map/Zoom as icons bottom-right

### B. Overview Page
- **B1. Batch Management**: Multi-select walls → delete/rename/copy/JSON-export; share button (UI only, mock)
- **B2. Wall Card 3-dot Menu**: Copy wall, delete wall, share wall
- **B3. Project Layer**: ❌ Deferred to v0.3

### Out of v0.2 Scope
- Project layer (v0.3)
- Real share backend (v0.3, UI mock in v0.2)
- PDF export (v0.3, JSON+PNG in v0.2)

## Slice Tracker

| Slice | Status | Evidence / notes |
|---|---|---|
| 0: 数据层基础 | ✅ 完成 | `feature/slice0-data-layer` |
| 1: 画布渲染 | ✅ 完成 | `feature/slice1-canvas-render` |
| 2: 交互层 | ✅ 完成 | drag/resize/rotate/multi-select/keyboard/rope |
| 3: Stamp双状态 | ✅ 完成 | attach/detach + context menu |
| 4: UI浮窗 v0.1 | ✅ 完成 | TopBar + BottomToolbar (basic) |
| 5: 多墙面+托盘 | ✅ 完成 | OverviewPage + wall CRUD (basic) |
| **v0.2-A1**: 物件交互完善 |  进行中 | resize fix + stamp edit + drag + rotate |
| **v0.2-A2**: 底部工具栏深化 |  待启动 | height fix + 3 secondary panels + rope mode |
| **v0.2-A3**: 顶部栏重布局 | ⏳ 待启动 | Magnific-style layout |
| **v0.2-B**: 总览页管理功能 | ⏳ 待启动 | batch ops + 3-dot menu + export |

## Known Blockers
- 曼谷第3张样例图分辨率仅 477×358
- Stamp 素材为白底 PNG，需 CSS `mix-blend-mode: multiply`
- AI 百炼 API Key 需确认已配置到 Vercel 环境变量
