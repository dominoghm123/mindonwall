import { useRef, useCallback, useState } from 'react';
import type { Item } from '../store/types';
import { getPinWorldPosition } from '../store/undoMiddleware';

interface UseRopeCreationOptions {
  items: Item[];
  /** 创建 Rope 回调（由父组件调用 store.addRope） */
  onRopeCreate: (fromItemId: string, toItemId: string, naturalLength: number) => void;
}

/**
 * Rope 创建流程 hook。
 * - mousedown Pin → 进入 ROPE_CREATING 模式
 * - mousemove → SVG 尾巴线跟随鼠标
 * - mouseenter 另一 Pin → 目标 Pin 发光
 * - mouseup 在有效 Pin → 创建 Rope
 * - mouseup 空白/ESC → 取消
 */
export function useRopeCreation({ items, onRopeCreate }: UseRopeCreationOptions) {
  const [dragTail, setDragTail] = useState<{
    x: number; y: number; endX: number; endY: number;
  } | null>(null);
  const [ropeTargetId, setRopeTargetId] = useState<string | null>(null);

  const creatingRef = useRef(false);
  const sourceRef = useRef<string | null>(null);
  const onRopeCreateRef = useRef(onRopeCreate);
  onRopeCreateRef.current = onRopeCreate;

  /** 查找鼠标下的 Pin 元素，返回其 itemId */
  const findPinAtPoint = useCallback((clientX: number, clientY: number): string | null => {
    const el = document.elementFromPoint(clientX, clientY);
    if (!el) return null;
    const pinEl = el.closest('[data-pin-item-id]');
    if (!pinEl) return null;
    const id = pinEl.getAttribute('data-pin-item-id');
    // 不能连到自身
    if (id && id !== sourceRef.current) return id;
    return null;
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!creatingRef.current || !sourceRef.current) return;
      const items_ = items; // capture current items
      const sourceItem = items_.find((i) => i.id === sourceRef.current);
      if (!sourceItem) return;

      const srcPin = getPinWorldPosition(sourceItem);
      setDragTail({ x: srcPin.x, y: srcPin.y, endX: e.clientX, endY: e.clientY });

      const targetId = findPinAtPoint(e.clientX, e.clientY);
      setRopeTargetId(targetId);
    },
    [items, findPinAtPoint],
  );

  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      if (!creatingRef.current || !sourceRef.current) return;
      creatingRef.current = false;

      const targetId = findPinAtPoint(e.clientX, e.clientY);
      if (targetId) {
        // 计算 naturalLength
        const items_ = items;
        const fromItem = items_.find((i) => i.id === sourceRef.current);
        const toItem = items_.find((i) => i.id === targetId);
        if (fromItem && toItem) {
          const fromPin = getPinWorldPosition(fromItem);
          const toPin = getPinWorldPosition(toItem);
          const dist = Math.sqrt(
            (toPin.x - fromPin.x) ** 2 + (toPin.y - fromPin.y) ** 2,
          );
          onRopeCreateRef.current(sourceRef.current, targetId, dist * 1.2);
        }
      }

      sourceRef.current = null;
      setDragTail(null);
      setRopeTargetId(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    },
    [items, findPinAtPoint, handleMouseMove],
  );

  /** Pin 组件调用此函数启动 Rope 创建 */
  const handlePinMouseDown = useCallback(
    (itemId: string, _e: React.PointerEvent) => {
      creatingRef.current = true;
      sourceRef.current = itemId;
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [handleMouseMove, handleMouseUp],
  );

  /** 取消 Rope 创建（ESC 等） */
  const cancelRopeCreation = useCallback(() => {
    creatingRef.current = false;
    sourceRef.current = null;
    setDragTail(null);
    setRopeTargetId(null);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove, handleMouseUp]);

  return {
    /** 拖拽中的尾巴线坐标 */
    dragTail,
    /** 当前鼠标悬停的目标 Pin ID */
    ropeTargetId,
    /** 是否正在创建 Rope */
    isCreating: creatingRef.current,
    /** Pin mousedown 处理器 */
    handlePinMouseDown,
    /** 取消创建 */
    cancelRopeCreation,
  };
}
