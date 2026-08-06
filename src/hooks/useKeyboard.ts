import { useEffect, useState, useCallback, useRef } from 'react';
import type { UIState } from '../store/useUIStore';
import type { WallState } from '../store/useWallStore';

interface UseKeyboardOptions {
  uiStore: UIState;
  wallStore: WallState;
  items: { id: string }[];
  /** 缩放回调 */
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
  /** 取消当前操作（rope creation 等） */
  onCancel?: () => void;
  /** 批量删除选中物件 */
  onDeleteSelected?: () => void;
  /** 全选 */
  onSelectAll?: () => void;
}

/**
 * 键盘快捷键 hook。
 * - Ctrl+Z → 撤销
 * - Ctrl+Shift+Z → 重做
 * - Delete/Backspace → 删除选中物件
 * - Escape → 取消当前操作 / 清除选中
 * - Ctrl+A → 全选
 * - M → 切换 Map/白墙视图
 * - Space（按住）→ 临时平移模式
 * - +/- → 缩放 ±10%
 * - 0 → 重置缩放 100%
 */
export function useKeyboard({
  uiStore,
  wallStore,
  items,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onCancel,
  onDeleteSelected,
  onSelectAll,
}: UseKeyboardOptions) {
  const [spaceHeld, setSpaceHeld] = useState(false);
  const uiRef = useRef(uiStore);
  uiRef.current = uiStore;
  const wallRef = useRef(wallStore);
  wallRef.current = wallStore;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // 忽略输入框中的按键
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const ctrl = e.ctrlKey || e.metaKey;

      // Space → 临时平移
      if (e.code === 'Space' && !ctrl) {
        e.preventDefault();
        setSpaceHeld(true);
        return;
      }

      // Ctrl+Z → 撤销
      if (ctrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        wallRef.current.undo();
        return;
      }

      // Ctrl+Shift+Z → 重做
      if (ctrl && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        wallRef.current.redo();
        return;
      }

      // Delete / Backspace → 删除选中
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        onDeleteSelected?.();
        return;
      }

      // Escape → 取消 / 清除选中
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel?.();
        uiRef.current.clearSelection();
        return;
      }

      // Ctrl+A → 全选
      if (ctrl && e.key === 'a') {
        e.preventDefault();
        onSelectAll?.();
        return;
      }

      // M → 切换视图
      if (e.key === 'm' && !ctrl) {
        e.preventDefault();
        const next = uiRef.current.viewMode === 'wall' ? 'map' : 'wall';
        uiRef.current.setViewMode(next);
        return;
      }

      // + / = → 放大
      if ((e.key === '+' || e.key === '=') && !ctrl) {
        e.preventDefault();
        onZoomIn?.();
        return;
      }

      // - → 缩小
      if (e.key === '-' && !ctrl) {
        e.preventDefault();
        onZoomOut?.();
        return;
      }

      // 0 → 重置缩放
      if (e.key === '0' && !ctrl) {
        e.preventDefault();
        onZoomReset?.();
        return;
      }
    },
    [onZoomIn, onZoomOut, onZoomReset, onCancel, onDeleteSelected, onSelectAll],
  );

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space') {
      setSpaceHeld(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  return { spaceHeld };
}
