import { useState, useCallback, useRef } from 'react';
import type { Item } from '../../store/types';

interface SelectionBoxProps {
  /** 当前画布上的所有物件 */
  items: Item[];
  /** 当前缩放比例 */
  zoom: number;
  /** 当前平移量 */
  panX: number;
  panY: number;
  /** 框选结束回调，返回被选中的 item ids */
  onSelect: (ids: string[]) => void;
  children: React.ReactNode;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * 矩形框选 overlay。
 * 鼠标拖拽空白区域时显示蓝色半透明矩形，松手时计算相交物件。
 */
export function SelectionBox({
  items,
  zoom,
  panX,
  panY,
  onSelect,
  children,
}: SelectionBoxProps) {
  const [rect, setRect] = useState<Rect | null>(null);
  const dragging = useRef(false);
  const startScreen = useRef({ x: 0, y: 0 });

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // 只在点击目标为当前 overlay 容器时启动框选
      if (e.target !== e.currentTarget) return;
      dragging.current = true;
      startScreen.current = { x: e.clientX, y: e.clientY };
      setRect({ x: e.clientX, y: e.clientY, w: 0, h: 0 });
      (e.target as Element).setPointerCapture(e.pointerId);
    },
    [],
  );

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const sx = startScreen.current.x;
    const sy = startScreen.current.y;
    setRect({
      x: Math.min(sx, e.clientX),
      y: Math.min(sy, e.clientY),
      w: Math.abs(e.clientX - sx),
      h: Math.abs(e.clientY - sy),
    });
  }, []);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      dragging.current = false;
      (e.target as Element).releasePointerCapture(e.pointerId);

      if (!rect || (rect.w < 5 && rect.h < 5)) {
        setRect(null);
        return;
      }

      // 将屏幕矩形转换为画布坐标
      const canvasLeft = (rect.x - panX) / zoom;
      const canvasTop = (rect.y - panY) / zoom;
      const canvasRight = (rect.x + rect.w - panX) / zoom;
      const canvasBottom = (rect.y + rect.h - panY) / zoom;

      const selectedIds = items
        .filter((item) => {
          const il = item.x;
          const it = item.y;
          const ir = item.x + item.width;
          const ib = item.y + item.height;
          // 判断相交
          return (
            il < canvasRight &&
            ir > canvasLeft &&
            it < canvasBottom &&
            ib > canvasTop
          );
        })
        .map((item) => item.id);

      onSelect(selectedIds);
      setRect(null);
    },
    [rect, items, zoom, panX, panY, onSelect],
  );

  return (
    <div
      style={{ position: 'absolute', inset: 0, zIndex: 50 }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {children}

      {/* 框选矩形 — fill rgba(74,144,217,0.1), stroke 1px #4A90D9 */}
      {rect && rect.w > 2 && rect.h > 2 && (
        <div
          style={{
            position: 'fixed',
            left: rect.x,
            top: rect.y,
            width: rect.w,
            height: rect.h,
            background: 'rgba(74,144,217,0.1)',
            border: '1px solid #4A90D9',
            pointerEvents: 'none',
            zIndex: 9999,
          }}
        />
      )}
    </div>
  );
}
