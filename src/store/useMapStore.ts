import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UndoAction } from './types';
import { pushUndo, popUndo } from './undoMiddleware';

/** Map 视图可持久化快照（随墙数据保存，不写回白墙） */
export interface MapViewSnapshot {
  nodePositions: Record<string, { x: number; y: number }>;
  hiddenChildren: string[];
}

interface MapState extends MapViewSnapshot {
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
      undoStack: [],
      redoStack: [],

      loadForWall: (snapshot) => {
        set({
          nodePositions: snapshot?.nodePositions ?? {},
          hiddenChildren: snapshot?.hiddenChildren ?? [],
          undoStack: [],
          redoStack: [],
        });
      },

      getSnapshot: () => {
        const { nodePositions, hiddenChildren } = get();
        return { nodePositions, hiddenChildren };
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
        const { undoStack, redoStack, nodePositions, hiddenChildren } = get();
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
        }

        set({
          undoStack: remaining,
          redoStack: pushUndo(redoStack, action),
        });
      },

      mapRedo: () => {
        const { undoStack, redoStack, nodePositions, hiddenChildren } = get();
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
      }),
    },
  ),
);
