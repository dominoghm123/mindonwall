import { useCallback } from 'react';
import type { Item } from '../store/types';
import type { UIState } from '../store/useUIStore';
import type { WallState } from '../store/useWallStore';

interface UseMultiSelectOptions {
  items: Item[];
  uiStore: UIState;
  wallStore: WallState;
}

/**
 * 多选 hook。
 * - Ctrl/Cmd+click to toggle selection
 * - Ctrl+A → 全选当前墙面所有物件
 * - 矩形框选（通过 SelectionBox 组件）
 * - Delete/Backspace → 批量删除选中物件
 */
export function useMultiSelect({ items, uiStore, wallStore }: UseMultiSelectOptions) {
  /** Shift+click 切换单个物件选中 */
  const handleSelect = useCallback(
    (id: string, multi: boolean) => {
      const { selectedIds, selectItem, deselectItem } = uiStore;
      if (multi) {
        if (selectedIds.includes(id)) {
          deselectItem(id);
        } else {
          selectItem(id);
        }
      } else {
        selectItem(id);
      }
    },
    [uiStore],
  );

  /** 全选所有物件 */
  const handleSelectAll = useCallback(() => {
    const allIds = items.map((i) => i.id);
    uiStore.selectMultiple(allIds);
  }, [items, uiStore]);

  /** 框选结束回调 */
  const handleBoxSelect = useCallback(
    (ids: string[]) => {
      uiStore.selectMultiple(ids);
    },
    [uiStore],
  );

  /** 批量删除选中物件 */
  const handleDeleteSelected = useCallback(() => {
    const { selectedIds } = uiStore;
    for (const id of selectedIds) {
      wallStore.removeItem(id);
    }
    uiStore.clearSelection();
  }, [uiStore, wallStore]);

  return {
    handleSelect,
    handleSelectAll,
    handleBoxSelect,
    handleDeleteSelected,
  };
}
