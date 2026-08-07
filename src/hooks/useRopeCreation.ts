import { useCallback, useEffect, useRef, useState } from 'react';
import type { Item } from '../store/types';
import { getPinWorldPosition } from '../store/undoMiddleware';

interface UseRopeCreationOptions {
  items: Item[];
  /** 创建 Rope 回调（由父组件调用 store.addRope） */
  onRopeCreate: (fromItemId: string, toItemId: string, naturalLength: number) => void;
  /** 画布视图（用于尾巴线屏幕→画布坐标换算） */
  zoom?: number;
  panX?: number;
  panY?: number;
}

/**
 * Rope 点击连线模式 hook（v0.2）。
 * - 工具栏激活 ropeMode 后：点击第一个 Pin → 尾巴线跟随鼠标
 * - 点击第二个 Pin → 自动创建 Rope → 退出模式
 * - ESC / 点击空白 → 取消
 */
export function useRopeCreation({ items, onRopeCreate, zoom = 1, panX = 0, panY = 0 }: UseRopeCreationOptions) {
  const [dragTail, setDragTail] = useState<{
    x: number; y: number; endX: number; endY: number;
  } | null>(null);
  const [ropeTargetId, setRopeTargetId] = useState<string | null>(null);
  const [ropeSourceId, setRopeSourceId] = useState<string | null>(null);

  const itemsRef = useRef(items);
  itemsRef.current = items;
  const viewRef = useRef({ zoom, panX, panY });
  viewRef.current = { zoom, panX, panY };
  const sourceRef = useRef<string | null>(null);
  const onRopeCreateRef = useRef(onRopeCreate);
  onRopeCreateRef.current = onRopeCreate;

  /** 查找鼠标下的 Pin 元素，返回其 itemId */
  const findPinAtPoint = useCallback((clientX: number, clientY: number): string | null => {
    const el = document.elementFromPoint(clientX, clientY);
    if (!el) return null;
    const pinEl = el.closest('[data-pin-item-id]');
    if (!pinEl) return null;
    return pinEl.getAttribute('data-pin-item-id');
  }, []);

  /* 尾巴线跟随鼠标（仅选出第一个 Pin 后；鼠标坐标转为画布坐标） */
  useEffect(() => {
    if (!ropeSourceId) return;
    const handleMove = (e: MouseEvent) => {
      const sourceItem = itemsRef.current.find((i) => i.id === sourceRef.current);
      if (!sourceItem) return;
      const srcPin = getPinWorldPosition(sourceItem);
      const v = viewRef.current;
      const cx = (e.clientX - v.panX) / v.zoom;
      const cy = (e.clientY - v.panY) / v.zoom;
      setDragTail({ x: srcPin.x, y: srcPin.y, endX: cx, endY: cy });
      const targetId = findPinAtPoint(e.clientX, e.clientY);
      setRopeTargetId(targetId && targetId !== sourceRef.current ? targetId : null);
    };
    document.addEventListener('mousemove', handleMove);
    return () => document.removeEventListener('mousemove', handleMove);
  }, [ropeSourceId, findPinAtPoint]);

  /** Pin 点击处理器（ropeMode 下由 Pin 组件调用） */
  const handlePinClick = useCallback(
    (itemId: string) => {
      if (!sourceRef.current) {
        // 第一次点击：记录起点
        sourceRef.current = itemId;
        setRopeSourceId(itemId);
        return;
      }
      if (sourceRef.current === itemId) return; // 不能连自身
      // 第二次点击：创建 Rope
      const fromItem = itemsRef.current.find((i) => i.id === sourceRef.current);
      const toItem = itemsRef.current.find((i) => i.id === itemId);
      if (fromItem && toItem) {
        const fromPin = getPinWorldPosition(fromItem);
        const toPin = getPinWorldPosition(toItem);
        const dist = Math.sqrt(
          (toPin.x - fromPin.x) ** 2 + (toPin.y - fromPin.y) ** 2,
        );
        onRopeCreateRef.current(sourceRef.current, itemId, dist * 1.35);
      }
      sourceRef.current = null;
      setRopeSourceId(null);
      setDragTail(null);
      setRopeTargetId(null);
    },
    [],
  );

  /** 取消 Rope 创建（ESC / 空白点击 / 退出模式） */
  const cancelRopeCreation = useCallback(() => {
    sourceRef.current = null;
    setRopeSourceId(null);
    setDragTail(null);
    setRopeTargetId(null);
  }, []);

  return {
    /** 尾巴线坐标（RopeLayer 渲染，endX/endY 为屏幕坐标） */
    dragTail,
    /** 当前鼠标悬停的目标 Pin ID */
    ropeTargetId,
    /** 已选中的第一个 Pin 所属 Item ID */
    ropeSourceId,
    /** Pin 点击处理器 */
    handlePinClick,
    /** 取消创建 */
    cancelRopeCreation,
  };
}
