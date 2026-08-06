import { useRef, useCallback, useState } from 'react';

export type ResizeDir = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

/** 最小/最大尺寸限制 */
export const MIN_SIZE = 40;
export const MAX_SIZE = 800;

interface UseResizeOptions {
  width: number;
  height: number;
  x: number;
  y: number;
  /** 缩放结束回调 */
  onResizeEnd?: (
    newSize: { width: number; height: number },
    startSize: { width: number; height: number },
  ) => void;
}

/**
 * 物件缩放 hook。
 * - 四角手柄：等比缩放（默认）
 * - 四边手柄：单独拉伸宽或高
 * - 拖拽手柄时提供实时尺寸反馈
 */
export function useResize({ width, height, x, y, onResizeEnd }: UseResizeOptions) {
  const [size, setSize] = useState({ width, height, x, y });
  const resizeRef = useRef<{
    dir: ResizeDir;
    startX: number;
    startY: number;
    w: number;
    h: number;
    ix: number;
    iy: number;
  } | null>(null);
  const onResizeEndRef = useRef(onResizeEnd);
  onResizeEndRef.current = onResizeEnd;

  // 同步外部 prop
  const prev = useRef({ width, height, x, y });
  if (prev.current.width !== width || prev.current.height !== height || prev.current.x !== x || prev.current.y !== y) {
    prev.current = { width, height, x, y };
    if (!resizeRef.current) setSize({ width, height, x, y });
  }

  const handleResizeStart = useCallback(
    (dir: ResizeDir) => (e: React.PointerEvent) => {
      e.stopPropagation();
      resizeRef.current = {
        dir,
        startX: e.clientX,
        startY: e.clientY,
        w: size.width,
        h: size.height,
        ix: size.x,
        iy: size.y,
      };
      (e.target as Element).setPointerCapture(e.pointerId);
    },
    [size.width, size.height, size.x, size.y],
  );

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const r = resizeRef.current;
    if (!r) return;

    const dx = e.clientX - r.startX;
    const dy = e.clientY - r.startY;
    const isCorner = r.dir.length === 2;

    let newW = r.w;
    let newH = r.h;
    let newX = r.ix;
    let newY = r.iy;

    if (isCorner) {
      // 等比缩放：取较大轴的缩放比例
      let scaleX = 0;
      let scaleY = 0;
      if (r.dir.includes('e')) scaleX = dx / r.w;
      else if (r.dir.includes('w')) scaleX = -dx / r.w;
      if (r.dir.includes('s')) scaleY = dy / r.h;
      else if (r.dir.includes('n')) scaleY = -dy / r.h;

      const scale = Math.max(scaleX, scaleY);
      newW = Math.max(MIN_SIZE, Math.min(MAX_SIZE, r.w * (1 + scale)));
      newH = Math.max(MIN_SIZE, Math.min(MAX_SIZE, r.h * (1 + scale)));

      // 锚定对角
      if (r.dir.includes('w')) newX = r.ix + (r.w - newW);
      if (r.dir.includes('n')) newY = r.iy + (r.h - newH);
    } else {
      // 边手柄：单独拉伸
      if (r.dir === 'e') newW = Math.max(MIN_SIZE, Math.min(MAX_SIZE, r.w + dx));
      else if (r.dir === 'w') {
        newW = Math.max(MIN_SIZE, Math.min(MAX_SIZE, r.w - dx));
        newX = r.ix + dx;
      } else if (r.dir === 's') newH = Math.max(MIN_SIZE, Math.min(MAX_SIZE, r.h + dy));
      else if (r.dir === 'n') {
        newH = Math.max(MIN_SIZE, Math.min(MAX_SIZE, r.h - dy));
        newY = r.iy + dy;
      }
    }

    setSize({ width: newW, height: newH, x: newX, y: newY });
  }, []);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const r = resizeRef.current;
      resizeRef.current = null;
      (e.target as Element).releasePointerCapture(e.pointerId);
      if (r) {
        onResizeEndRef.current?.(
          { width: size.width, height: size.height },
          { width: r.w, height: r.h },
        );
      }
    },
    [size.width, size.height],
  );

  return {
    resizeWidth: size.width,
    resizeHeight: size.height,
    resizeX: size.x,
    resizeY: size.y,
    handleResizeStart,
    handlePointerMove,
    handlePointerUp,
    isResizing: resizeRef.current !== null,
  };
}
