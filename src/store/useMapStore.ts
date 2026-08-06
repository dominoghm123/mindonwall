import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UndoAction } from './types';
import { pushUndo, popUndo } from './undoMiddleware';

interface MapState {
  /** 节点位置映射 */
  nodePositions: Record<string, { x: number; y: number }>;
  /** 隐藏的子节点 ID 列表 */
  hiddenChildren: string[];
  /** Map 独立撤销栈 */
  undoStack: UndoAction[];
  /** Map 独立重做栈 */
  redoStack: UndoAction[];

  /** 更新节点位置 */
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  /** 切换子节点隐藏状态 */
  toggleHideChild: (childId: string) => void;
  /** Map 撤销 */
  mapUndo: () => void;
  /** Map 重做 */
  mapRedo: () => void;
  /** 重置 Map 状态 */
  resetMap: () => void;
}

export const useMapStore = create<MapState>()(
  persist(
    (set, get) => ({
      nodePositions: {},
      hiddenChildren: [],
      undoStack: [],
      redoStack: [],

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
        const { hiddenChildren } = get();
        const isHidden = hiddenChildren.includes(childId);
        set({
          hiddenChildren: isHidden
            ? hiddenChildren.filter((id) => id !== childId)
            : [...hiddenChildren, childId],
        });
      },

      mapUndo: () => {
        const { undoStack, redoStack, nodePositions } = get();
        const result = popUndo(undoStack);
        if (!result) return;
        const { action, remaining } = result;

        // 恢复节点位置
        let newPositions = { ...nodePositions };
        if (action.itemId) {
          if (action.before) {
            const beforePos = action.before as { x?: number; y?: number };
            newPositions[action.itemId] = {
              x: beforePos.x ?? 0,
              y: beforePos.y ?? 0,
            };
          } else {
            // before 为 null 说明是新增，撤销时删除
            delete newPositions[action.itemId];
          }
        }

        set({
          nodePositions: newPositions,
          undoStack: remaining,
          redoStack: pushUndo(redoStack, action),
        });
      },

      mapRedo: () => {
        const { undoStack, redoStack, nodePositions } = get();
        const result = popUndo(redoStack);
        if (!result) return;
        const { action, remaining } = result;

        let newPositions = { ...nodePositions };
        if (action.itemId) {
          if (action.after) {
            const afterPos = action.after as { x?: number; y?: number };
            newPositions[action.itemId] = {
              x: afterPos.x ?? 0,
              y: afterPos.y ?? 0,
            };
          } else {
            delete newPositions[action.itemId];
          }
        }

        set({
          nodePositions: newPositions,
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
    },
  ),
);
