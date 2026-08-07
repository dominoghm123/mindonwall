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
  /** 画布缩放（屏幕像素 delta 需除以 zoom） */
  zoom?: number;
  /** 缩放结束回调 */
  onResizeEnd?: (
    newSize: { width: number; height: number },
    startSize: { width: number; height: number },
  ) => void;
}

/**
 * 物件缩放 hook。
 * - 四角手柄：两轴独立缩放（v0.2 修订：单向拉伸不联动另一轴）
 * - 四边手柄：单独拉伸宽或高
 * - 拖拽手柄时提供实时尺寸反馈
 */
export function useResize({ width, height, x, y, zoom = 1, onResizeEnd }: UseResizeOptions) {
  const [size, setSize] = useState({ width, height, x, y });
  const resizeRef = useRef<{
    dir: ResizeDir;
    startX: number;
    startY: number;
    w: number;
    h: number;
    ix: number;
    iy: number;
    zoom: number;
  } | null>(null);
  const onResizeEndRef = useRef(onResizeEnd);
  onResizeEndRef.current = onResizeEnd;

  // zoom 通过 ref 保持最新
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

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
        zoom: zoomRef.current || 1,
      };
      (e.target as Element).setPointerCapture(e.pointerId);
    },
    [size.width, size.height, size.x, size.y],
  );

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const r = resizeRef.current;
    if (!r) return;

    // 屏幕像素 delta 除以 zoom 得到画布坐标 delta
    const dx = (e.clientX - r.startX) / r.zoom;
    const dy = (e.clientY - r.startY) / r.zoom;
    const isCorner = r.dir.length === 2;

    let newW = r.w;
    let newH = r.h;
    let newX = r.ix;
    let newY = r.iy;

    if (isCorner) {
      // 角手柄：两轴独立缩放（不联动）
      let rawW = r.w;
      let rawH = r.h;
      if (r.dir.includes('e')) rawW = r.w + dx;
      else if (r.dir.includes('w')) rawW = r.w - dx;
      if (r.dir.includes('s')) rawH = r.h + dy;
      else if (r.dir.includes('n')) rawH = r.h - dy;

      if (rawW > MAX_SIZE || rawH > MAX_SIZE) {
        // v0.3: 超过 800px 时锁定宽高比，避免大物件拉伸变形
        const scale = MAX_SIZE / Math.max(rawW, rawH);
        newW = Math.max(MIN_SIZE, rawW * scale);
        newH = Math.max(MIN_SIZE, rawH * scale);
      } else {
        newW = Math.max(MIN_SIZE, rawW);
        newH = Math.max(MIN_SIZE, rawH);
      }
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
