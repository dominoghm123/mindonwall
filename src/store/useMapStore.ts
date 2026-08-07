import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UndoAction } from './types';
import { pushUndo, popUndo } from './undoMiddleware';

/** Map 内新增的连线（不写回白墙） */
export interface ExtraEdge {
  id: string;
  from: string;
  to: string;
}

/** Map 视图可持久化快照（随墙数据保存，不写回白墙） */
export interface MapViewSnapshot {
  nodePositions: Record<string, { x: number; y: number }>;
  /** 隐藏的节点（含旧版"隐藏子节点"与 v0.3 删除的节点） */
  hiddenChildren: string[];
  /** v0.3: Map 内编辑的节点文本（不写回白墙） */
  nodeLabels?: Record<string, string>;
  /** v0.3 r2: Map 内新增的连线 */
  extraEdges?: ExtraEdge[];
  /** v0.3 r2: Map 内隐藏的白墙 rope（删除的连线） */
  hiddenRopes?: string[];
  /** v0.3 r4: 连线自定义颜色（key 为 rope/extraEdge id） */
  edgeColors?: Record<string, string>;
}

interface MapState extends Required<Pick<MapViewSnapshot, 'nodePositions' | 'hiddenChildren'>> {
  nodeLabels: Record<string, string>;
  extraEdges: ExtraEdge[];
  hiddenRopes: string[];
  /** v0.3 r4: 连线自定义颜色 */
  edgeColors: Record<string, string>;
  /** Map 独立撤销栈 */
  undoStack: UndoAction[];
  /** Map 独立重做栈 */
  redoStack: UndoAction[];

  /** 加载指定墙的 Map 快照（切换墙时调用，清空撤销栈） */
  loadForWall: (snapshot?: Partial<MapViewSnapshot>) => void;
  /** 导出当前快照（随墙数据持久化） */
  getSnapshot: () => MapViewSnapshot;
  /** 更新节点位置（实时拖拽，入撤销栈） */
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  /** 清除节点手动位置（回到自动布局，入撤销栈） */
  clearNodePosition: (nodeId: string) => void;
  /** 更新节点文本标签（入撤销栈） */
  updateNodeLabel: (nodeId: string, label: string) => void;
  /** 切换节点隐藏状态（v0.3 r2: 删除节点 = 隐藏，入撤销栈） */
  toggleHideChild: (childId: string) => void;
  /** v0.3 r2: 新增 Map 连线（入撤销栈） */
  addExtraEdge: (from: string, to: string) => void;
  /** v0.3 r2: 删除 Map 新增连线（入撤销栈） */
  removeExtraEdge: (edgeId: string) => void;
  /** v0.3 r2: 隐藏/恢复白墙 rope（Map 层删除连线，入撤销栈） */
  toggleHideRope: (ropeId: string) => void;
  /** v0.3 r4: 设置连线颜色（null = 恢复默认，入撤销栈） */
  setEdgeColor: (edgeId: string, color: string | null) => void;
  /** v0.3 r4: 批量锁定当前节点位置（删除节点/连线前防重排，不入撤销栈） */
  lockPositions: (positions: Record<string, { x: number; y: number }>) => void;
  /** Map 撤销 */
  mapUndo: () => void;
  /** Map 重做 */
  mapRedo: () => void;
  /** 重置 Map 状态 */
  resetMap: () => void;
}

/** 隐藏标记编码：before/after.text = '1' 隐藏 / '0' 显示 */
const HIDDEN = '1';
const VISIBLE = '0';

let edgeCounter = 0;

export const useMapStore = create<MapState>()(
  persist(
    (set, get) => ({
      nodePositions: {},
      hiddenChildren: [],
      nodeLabels: {},
      extraEdges: [],
      hiddenRopes: [],
      edgeColors: {},
      undoStack: [],
      redoStack: [],

      loadForWall: (snapshot) => {
        set({
          nodePositions: snapshot?.nodePositions ?? {},
          hiddenChildren: snapshot?.hiddenChildren ?? [],
          nodeLabels: snapshot?.nodeLabels ?? {},
          extraEdges: snapshot?.extraEdges ?? [],
          hiddenRopes: snapshot?.hiddenRopes ?? [],
          edgeColors: snapshot?.edgeColors ?? {},
          undoStack: [],
          redoStack: [],
        });
      },

      getSnapshot: () => {
        const { nodePositions, hiddenChildren, nodeLabels, extraEdges, hiddenRopes, edgeColors } = get();
        return { nodePositions, hiddenChildren, nodeLabels, extraEdges, hiddenRopes, edgeColors };
      },

      updateNodePosition: (nodeId: string, position: { x: number; y: number }) => {
        const { nodePositions, undoStack } = get();
        const before = nodePositions[nodeId] ?? null;

        const action: UndoAction = {
          type: 'move',
          itemId: nodeId,
          before: before ? { x: before.x, y: before.y } : null,
          after: { x: position.x, y: position.y },
          timestamp: Date.now(),
        };

        set({
          nodePositions: { ...nodePositions, [nodeId]: position },
          undoStack: pushUndo(undoStack, action),
          redoStack: [],
        });
      },

      clearNodePosition: (nodeId: string) => {
        const { nodePositions, undoStack } = get();
        if (!nodePositions[nodeId]) return;
        const before = nodePositions[nodeId];

        const action: UndoAction = {
          type: 'move',
          itemId: nodeId,
          before: { x: before.x, y: before.y },
          after: null,
          timestamp: Date.now(),
        };

        const next = { ...nodePositions };
        delete next[nodeId];
        set({
          nodePositions: next,
          undoStack: pushUndo(undoStack, action),
          redoStack: [],
        });
      },

      updateNodeLabel: (nodeId: string, label: string) => {
        const { nodeLabels, undoStack } = get();
        const before = nodeLabels[nodeId] ?? null;
        if (before === label) return;

        // 文本编辑复用 'editRope' 类型 + itemId（与白墙的 rope 编辑互不干扰）
        const action: UndoAction = {
          type: 'editRope',
          itemId: nodeId,
          before: before !== null ? { text: before } : null,
          after: { text: label },
          timestamp: Date.now(),
        };

        set({
          nodeLabels: { ...nodeLabels, [nodeId]: label },
          undoStack: pushUndo(undoStack, action),
          redoStack: [],
        });
      },

      toggleHideChild: (childId: string) => {
        const { hiddenChildren, undoStack } = get();
        const isHidden = hiddenChildren.includes(childId);

        const action: UndoAction = {
          type: 'edit',
          itemId: childId,
          before: { text: isHidden ? HIDDEN : VISIBLE },
          after: { text: isHidden ? VISIBLE : HIDDEN },
          timestamp: Date.now(),
        };

        set({
          hiddenChildren: isHidden
            ? hiddenChildren.filter((id) => id !== childId)
            : [...hiddenChildren, childId],
          undoStack: pushUndo(undoStack, action),
          redoStack: [],
        });
      },

      addExtraEdge: (from: string, to: string) => {
        const { extraEdges, undoStack } = get();
        if (from === to) return;
        // 已有连线（任意方向）则不重复添加
        if (extraEdges.some((e) => (e.from === from && e.to === to) || (e.from === to && e.to === from))) return;
        const id = `medge-${Date.now()}-${++edgeCounter}`;

        const action: UndoAction = {
          type: 'addRope',
          ropeId: id,
          before: null,
          after: { fromItemId: from, toItemId: to },
          timestamp: Date.now(),
        };

        set({
          extraEdges: [...extraEdges, { id, from, to }],
          undoStack: pushUndo(undoStack, action),
          redoStack: [],
        });
      },

      removeExtraEdge: (edgeId: string) => {
        const { extraEdges, undoStack } = get();
        const edge = extraEdges.find((e) => e.id === edgeId);
        if (!edge) return;

        const action: UndoAction = {
          type: 'removeRope',
          ropeId: edgeId,
          before: { fromItemId: edge.from, toItemId: edge.to },
          after: null,
          timestamp: Date.now(),
        };

        set({
          extraEdges: extraEdges.filter((e) => e.id !== edgeId),
          undoStack: pushUndo(undoStack, action),
          redoStack: [],
        });
      },

      toggleHideRope: (ropeId: string) => {
        const { hiddenRopes, undoStack } = get();
        const isHidden = hiddenRopes.includes(ropeId);

        const action: UndoAction = {
          type: 'edit',
          ropeId,
          before: { text: isHidden ? HIDDEN : VISIBLE },
          after: { text: isHidden ? VISIBLE : HIDDEN },
          timestamp: Date.now(),
        };

        set({
          hiddenRopes: isHidden
            ? hiddenRopes.filter((id) => id !== ropeId)
            : [...hiddenRopes, ropeId],
          undoStack: pushUndo(undoStack, action),
          redoStack: [],
        });
      },

      /* ── v0.3 r4: 连线颜色 ── */
      setEdgeColor: (edgeId: string, color: string | null) => {
        const { edgeColors, undoStack } = get();
        const before = edgeColors[edgeId] ?? null;
        if (before === color) return;

        const action: UndoAction = {
          type: 'editEdgeColor',
          ropeId: edgeId,
          before: before !== null ? { text: before } : null,
          after: color !== null ? { text: color } : null,
          timestamp: Date.now(),
        };

        const next = { ...edgeColors };
        if (color === null) delete next[edgeId];
        else next[edgeId] = color;
        set({
          edgeColors: next,
          undoStack: pushUndo(undoStack, action),
          redoStack: [],
        });
      },

      /* ── v0.3 r4: 删除前锁定布局，避免其余节点重排 ── */
      lockPositions: (positions) => {
        set({ nodePositions: { ...get().nodePositions, ...positions } });
      },

      mapUndo: () => {
        const { undoStack, redoStack, nodePositions, hiddenChildren, nodeLabels, extraEdges, hiddenRopes, edgeColors } = get();
        const result = popUndo(undoStack);
        if (!result) return;
        const { action, remaining } = result;

        if (action.type === 'editEdgeColor' && action.ropeId) {
          // v0.3 r4: 撤销连线颜色
          const newColors = { ...edgeColors };
          if (action.before) {
            newColors[action.ropeId] = (action.before as { text?: string }).text ?? '';
          } else {
            delete newColors[action.ropeId];
          }
          set({ edgeColors: newColors });
        } else if (action.type === 'move' && action.itemId) {
          // 恢复节点位置
          const newPositions = { ...nodePositions };
          if (action.before) {
            const beforePos = action.before as { x?: number; y?: number };
            newPositions[action.itemId] = {
              x: beforePos.x ?? 0,
              y: beforePos.y ?? 0,
            };
          } else {
            delete newPositions[action.itemId];
          }
          set({ nodePositions: newPositions });
        } else if (action.type === 'edit' && action.ropeId) {
          // v0.3 r2: 恢复白墙 rope 的隐藏状态
          const wasHidden = (action.before as { text?: string })?.text === HIDDEN;
          set({
            hiddenRopes: wasHidden
              ? [...hiddenRopes.filter((id) => id !== action.ropeId), action.ropeId!]
              : hiddenRopes.filter((id) => id !== action.ropeId),
          });
        } else if (action.type === 'edit' && action.itemId) {
          // 恢复节点隐藏状态
          const wasHidden = (action.before as { text?: string })?.text === HIDDEN;
          set({
            hiddenChildren: wasHidden
              ? [...hiddenChildren.filter((id) => id !== action.itemId), action.itemId]
              : hiddenChildren.filter((id) => id !== action.itemId),
          });
        } else if (action.type === 'editRope' && action.itemId) {
          // 恢复节点文本
          const newLabels = { ...nodeLabels };
          if (action.before) {
            newLabels[action.itemId] = (action.before as { text?: string }).text ?? '';
          } else {
            delete newLabels[action.itemId];
          }
          set({ nodeLabels: newLabels });
        } else if (action.type === 'addRope' && action.ropeId) {
          // v0.3 r2: 撤销新增连线 → 移除
          set({ extraEdges: extraEdges.filter((e) => e.id !== action.ropeId) });
        } else if (action.type === 'removeRope' && action.ropeId) {
          // v0.3 r2: 撤销删除连线 → 恢复
          const before = action.before as { fromItemId?: string; toItemId?: string } | null;
          if (before && !extraEdges.some((e) => e.id === action.ropeId)) {
            set({
              extraEdges: [...extraEdges, { id: action.ropeId, from: before.fromItemId ?? '', to: before.toItemId ?? '' }],
            });
          }
        }

        set({
          undoStack: remaining,
          redoStack: pushUndo(redoStack, action),
        });
      },

      mapRedo: () => {
        const { undoStack, redoStack, nodePositions, hiddenChildren, nodeLabels, extraEdges, hiddenRopes, edgeColors } = get();
        const result = popUndo(redoStack);
        if (!result) return;
        const { action, remaining } = result;

        if (action.type === 'editEdgeColor' && action.ropeId) {
          // v0.3 r4: 重做连线颜色
          const newColors = { ...edgeColors };
          if (action.after) {
            newColors[action.ropeId] = (action.after as { text?: string }).text ?? '';
          } else {
            delete newColors[action.ropeId];
          }
          set({ edgeColors: newColors });
        } else if (action.type === 'move' && action.itemId) {
          const newPositions = { ...nodePositions };
          if (action.after) {
            const afterPos = action.after as { x?: number; y?: number };
            newPositions[action.itemId] = {
              x: afterPos.x ?? 0,
              y: afterPos.y ?? 0,
            };
          } else {
            delete newPositions[action.itemId];
          }
          set({ nodePositions: newPositions });
        } else if (action.type === 'edit' && action.ropeId) {
          // v0.3 r2: 重做白墙 rope 隐藏状态
          const isHidden = (action.after as { text?: string })?.text === HIDDEN;
          set({
            hiddenRopes: isHidden
              ? [...hiddenRopes.filter((id) => id !== action.ropeId), action.ropeId!]
              : hiddenRopes.filter((id) => id !== action.ropeId),
          });
        } else if (action.type === 'edit' && action.itemId) {
          const isHidden = (action.after as { text?: string })?.text === HIDDEN;
          set({
            hiddenChildren: isHidden
              ? [...hiddenChildren.filter((id) => id !== action.itemId), action.itemId]
              : hiddenChildren.filter((id) => id !== action.itemId),
          });
        } else if (action.type === 'editRope' && action.itemId) {
          // 重做节点文本
          const newLabels = { ...nodeLabels };
          if (action.after) {
            newLabels[action.itemId] = (action.after as { text?: string }).text ?? '';
          } else {
            delete newLabels[action.itemId];
          }
          set({ nodeLabels: newLabels });
        } else if (action.type === 'addRope' && action.ropeId) {
          // v0.3 r2: 重做新增连线 → 恢复
          const after = action.after as { fromItemId?: string; toItemId?: string } | null;
          if (after && !extraEdges.some((e) => e.id === action.ropeId)) {
            set({
              extraEdges: [...extraEdges, { id: action.ropeId, from: after.fromItemId ?? '', to: after.toItemId ?? '' }],
            });
          }
        } else if (action.type === 'removeRope' && action.ropeId) {
          // v0.3 r2: 重做删除连线 → 移除
          set({ extraEdges: extraEdges.filter((e) => e.id !== action.ropeId) });
        }

        set({
          undoStack: pushUndo(undoStack, action),
          redoStack: remaining,
        });
      },

      resetMap: () => {
        set({
          nodePositions: {},
          hiddenChildren: [],
          nodeLabels: {},
          extraEdges: [],
          hiddenRopes: [],
          edgeColors: {},
          undoStack: [],
          redoStack: [],
        });
      },
    }),
    {
      name: 'mindonwall-map',
      // 撤销栈不持久化（刷新后从墙快照恢复即可）
      partialize: (state) => ({
        nodePositions: state.nodePositions,
        hiddenChildren: state.hiddenChildren,
        nodeLabels: state.nodeLabels,
        extraEdges: state.extraEdges,
        hiddenRopes: state.hiddenRopes,
        edgeColors: state.edgeColors,
      }),
    },
  ),
);
