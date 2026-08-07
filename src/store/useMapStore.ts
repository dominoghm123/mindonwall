import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UndoAction } from './types';
import { pushUndo, popUndo } from './undoMiddleware';

/** Map 视图可持久化快照（随墙数据保存，不写回白墙） */
export interface MapViewSnapshot {
  nodePositions: Record<string, { x: number; y: number }>;
  hiddenChildren: string[];
  /** v0.3: Map 内编辑的节点文本（不写回白墙） */
  nodeLabels?: Record<string, string>;
}

interface MapState extends Required<Pick<MapViewSnapshot, 'nodePositions' | 'hiddenChildren'>> {
  nodeLabels: Record<string, string>;
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
  /** v0.3: 清除节点手动位置（回到自动布局，入撤销栈） */
  clearNodePosition: (nodeId: string) => void;
  /** v0.3: 更新节点文本标签（入撤销栈） */
  updateNodeLabel: (nodeId: string, label: string) => void;
  /** 切换子节点隐藏状态（入撤销栈） */
  toggleHideChild: (childId: string) => void;
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

export const useMapStore = create<MapState>()(
  persist(
    (set, get) => ({
      nodePositions: {},
      hiddenChildren: [],
      nodeLabels: {},
      undoStack: [],
      redoStack: [],

      loadForWall: (snapshot) => {
        set({
          nodePositions: snapshot?.nodePositions ?? {},
          hiddenChildren: snapshot?.hiddenChildren ?? [],
          nodeLabels: snapshot?.nodeLabels ?? {},
          undoStack: [],
          redoStack: [],
        });
      },

      getSnapshot: () => {
        const { nodePositions, hiddenChildren, nodeLabels } = get();
        return { nodePositions, hiddenChildren, nodeLabels };
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

        // v0.3: 文本编辑复用 'editRope' 类型 + itemId（与白墙的 rope 编辑互不干扰）
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

      mapUndo: () => {
        const { undoStack, redoStack, nodePositions, hiddenChildren, nodeLabels } = get();
        const result = popUndo(undoStack);
        if (!result) return;
        const { action, remaining } = result;

        if (action.type === 'move' && action.itemId) {
          // 恢复节点位置
          const newPositions = { ...nodePositions };
          if (action.before) {
            const beforePos = action.before as { x?: number; y?: number };
            newPositions[action.itemId] = {
              x: beforePos.x ?? 0,
              y: beforePos.y ?? 0,
            };
          } else {
            // before 为 null 说明是首次定位，撤销时删除
            delete newPositions[action.itemId];
          }
          set({ nodePositions: newPositions });
        } else if (action.type === 'edit' && action.itemId) {
          // 恢复隐藏状态
          const wasHidden = (action.before as { text?: string })?.text === HIDDEN;
          set({
            hiddenChildren: wasHidden
              ? [...hiddenChildren.filter((id) => id !== action.itemId), action.itemId]
              : hiddenChildren.filter((id) => id !== action.itemId),
          });
        } else if (action.type === 'editRope' && action.itemId) {
          // v0.3: 恢复节点文本
          const newLabels = { ...nodeLabels };
          if (action.before) {
            newLabels[action.itemId] = (action.before as { text?: string }).text ?? '';
          } else {
            delete newLabels[action.itemId];
          }
          set({ nodeLabels: newLabels });
        }

        set({
          undoStack: remaining,
          redoStack: pushUndo(redoStack, action),
        });
      },

      mapRedo: () => {
        const { undoStack, redoStack, nodePositions, hiddenChildren, nodeLabels } = get();
        const result = popUndo(redoStack);
        if (!result) return;
        const { action, remaining } = result;

        if (action.type === 'move' && action.itemId) {
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
        } else if (action.type === 'edit' && action.itemId) {
          const isHidden = (action.after as { text?: string })?.text === HIDDEN;
          set({
            hiddenChildren: isHidden
              ? [...hiddenChildren.filter((id) => id !== action.itemId), action.itemId]
              : hiddenChildren.filter((id) => id !== action.itemId),
          });
        } else if (action.type === 'editRope' && action.itemId) {
          // v0.3: 重做节点文本
          const newLabels = { ...nodeLabels };
          if (action.after) {
            newLabels[action.itemId] = (action.after as { text?: string }).text ?? '';
          } else {
            delete newLabels[action.itemId];
          }
          set({ nodeLabels: newLabels });
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
      }),
    },
  ),
);
