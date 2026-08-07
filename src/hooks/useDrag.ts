import { useRef, useCallback, useState } from 'react';

interface UseDragOptions {
  x: number;
  y: number;
  /** 画布缩放（屏幕像素 delta 需除以 zoom 才是画布坐标位移） */
  zoom?: number;
  /** 拖拽过程中实时位置回调（v0.2：用于 rope 跟随，不入 undo） */
  onDragMove?: (pos: { x: number; y: number }) => void;
  /** 拖拽结束时回调，返回新位置和起始位置（用于 undo） */
  onDragEnd?: (newPos: { x: number; y: number }, startPos: { x: number; y: number }) => void;
}

/**
 * 物件拖拽 hook。
 * - 拖拽过程中通过返回值提供实时位置（本地状态，不触发 undo）
 * - 拖拽结束时通过 onDragEnd 回调，由父组件记录 undo
 * - 屏幕像素 delta 除以 zoom 转换为画布坐标，实现任意缩放下零延迟跟随
 */
export function useDrag({ x, y, zoom = 1, onDragMove, onDragEnd }: UseDragOptions) {
  const [pos, setPos] = useState({ x, y });
  const dragRef = useRef<{
    startX: number;
    startY: number;
    itemX: number;
    itemY: number;
    zoom: number;
    moved: boolean;
  } | null>(null);
  const onDragEndRef = useRef(onDragEnd);
  onDragEndRef.current = onDragEnd;
  const onDragMoveRef = useRef(onDragMove);
  onDragMoveRef.current = onDragMove;

  // zoom 通过 ref 保持最新，供 pointerdown 时快照
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  // 同步外部 prop 变化
  const prevXY = useRef({ x, y });
  if (prevXY.current.x !== x || prevXY.current.y !== y) {
    prevXY.current = { x, y };
    if (!dragRef.current) {
      setPos({ x, y });
    }
  }

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        itemX: pos.x,
        itemY: pos.y,
        zoom: zoomRef.current || 1,
        moved: false,
      };
      (e.target as Element).setPointerCapture(e.pointerId);
    },
    [pos.x, pos.y],
  );

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    // 屏幕像素 delta 除以 zoom 得到画布坐标位移
    const dx = (e.clientX - d.startX) / d.zoom;
    const dy = (e.clientY - d.startY) / d.zoom;
    if (Math.abs(dx) > 2 / d.zoom || Math.abs(dy) > 2 / d.zoom) d.moved = true;
    const next = { x: d.itemX + dx, y: d.itemY + dy };
    setPos(next);
    // v0.2：实时同步位置，让连接该物件的 rope 跟随移动
    if (d.moved) onDragMoveRef.current?.(next);
  }, []);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current;
      dragRef.current = null;
      (e.target as Element).releasePointerCapture(e.pointerId);
      if (d?.moved) {
        onDragEndRef.current?.({ x: pos.x, y: pos.y }, { x: d.itemX, y: d.itemY });
      }
    },
    [pos.x, pos.y],
  );

  return {
    /** 当前拖拽位置（拖拽中为实时位置，否则为 store 位置） */
    dragX: pos.x,
    dragY: pos.y,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    /** 是否正在拖拽 */
    isDragging: dragRef.current !== null,
  };
}
