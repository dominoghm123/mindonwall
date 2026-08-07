import {
  useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle,
  type ReactNode,
} from 'react';
import type { Item } from '../../store/types';
import { getWallpaperStyle } from '../../utils/wallpaperCSS';
import type { WallpaperType } from '../../store/types';

interface InfiniteCanvasProps {
  wallpaper: WallpaperType;
  items: Item[];
  children: ReactNode;
  /** 外部获取 zoom/pan 状态 */
  onViewChange?: (view: { zoom: number; panX: number; panY: number }) => void;
}

/** 暴露给外部的缩放控制 API（v0.2） */
export interface InfiniteCanvasHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  /** 按绝对百分比步长缩放（如 +1/-1 = ±1%） */
  zoomStep: (deltaPct: number) => void;
  /** 直接设置缩放百分比（如 100 = 100%） */
  setZoomTo: (pct: number) => void;
  resetZoom: () => void;
  fitContent: () => void;
}

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 3.0;

/**
 * 无限画布容器。
 * - 缩放：鼠标滚轮，20%-300%，以鼠标位置为中心
 * - 平移：鼠标左键拖拽背景
 * - 初始视图：空墙 100%，有内容时自适应
 */
export const InfiniteCanvas = forwardRef<InfiniteCanvasHandle, InfiniteCanvasProps>(
  function InfiniteCanvas({ wallpaper, items, children, onViewChange }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // v0.2 修订：用 ref 同步最新 zoom/pan，避免在 setState updater 内嵌套调 setState
  // （StrictMode 下 updater 双调用会导致 pan 被应用两次，缩放后中心偏移）
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  useEffect(() => {
    zoomRef.current = zoom;
    panRef.current = pan;
  }, [zoom, pan]);

  /** 以屏幕点 (px, py) 为不动点缩放：compute 由当前 zoom 算出新 zoom */
  const zoomAtPoint = useCallback((px: number, py: number, compute: (prev: number) => number) => {
    const prevZoom = zoomRef.current;
    const prevPan = panRef.current;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, compute(prevZoom)));
    if (newZoom === prevZoom) return;
    const ratio = newZoom / prevZoom;
    setZoom(newZoom);
    setPan({
      x: px - ratio * (px - prevPan.x),
      y: py - ratio * (py - prevPan.y),
    });
  }, []);

  // 通知外部视图变化
  useEffect(() => {
    onViewChange?.({ zoom, panX: pan.x, panY: pan.y });
  }, [zoom, pan, onViewChange]);

  // 有内容时自适应视图（仅初始）
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current || items.length === 0 || !containerRef.current) return;
    initialized.current = true;

    const container = containerRef.current;
    const cw = container.clientWidth;
    const ch = container.clientHeight;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const item of items) {
      // 附着的子物件用比例坐标，不计入包围盒（v0.2）
      if (item.parentId) continue;
      minX = Math.min(minX, item.x);
      minY = Math.min(minY, item.y);
      maxX = Math.max(maxX, item.x + item.width);
      maxY = Math.max(maxY, item.y + item.height);
    }

    const contentW = maxX - minX;
    const contentH = maxY - minY;
    const padding = 60;

    const scaleX = (cw - padding * 2) / contentW;
    const scaleY = (ch - padding * 2) / contentH;
    const newZoom = Math.min(scaleX, scaleY, 1);
    const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    setZoom(clampedZoom);
    setPan({
      x: cw / 2 - centerX * clampedZoom,
      y: ch / 2 - centerY * clampedZoom,
    });
  }, [items]);

  /* ── 缩放（鼠标滚轮，以鼠标位置为不动点） ──
     v0.2 修订：用原生非 passive 监听器（React onWheel 在 root 是 passive，
     preventDefault 无效会刷大量 console error） */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const delta = -e.deltaY * 0.001;
      zoomAtPoint(mouseX, mouseY, (prev) => prev * (1 + delta));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAtPoint]);

  /* ── 平移（拖拽背景：容器本体或墙纸层，v0.2 修订） ── */
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // 背景 = canvas 容器本身或墙纸层（空白点击实际命中的是墙纸层 div）
    const target = e.target as HTMLElement;
    const isBackground =
      target === containerRef.current || target.hasAttribute('data-canvas-bg');
    if (!isBackground) return;
    if (e.button !== 0) return;

    panning.current = true;
    panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    target.setPointerCapture(e.pointerId);
  }, [pan]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!panning.current) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    setPan({
      x: panStart.current.panX + dx,
      y: panStart.current.panY + dy,
    });
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    panning.current = false;
    (e.target as Element).releasePointerCapture(e.pointerId);
  }, []);

  const wallpaperStyle = getWallpaperStyle(wallpaper);

  /* ── 外部缩放控制（v0.2 修订：以调整前的视图中心为不动点） ── */
  const viewCenter = useCallback(() => {
    const container = containerRef.current;
    return {
      x: container ? container.clientWidth / 2 : 0,
      y: container ? container.clientHeight / 2 : 0,
    };
  }, []);

  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      const c = viewCenter();
      zoomAtPoint(c.x, c.y, (prev) => prev * 1.2);
    },
    zoomOut: () => {
      const c = viewCenter();
      zoomAtPoint(c.x, c.y, (prev) => prev / 1.2);
    },
    zoomStep: (deltaPct: number) => {
      const c = viewCenter();
      zoomAtPoint(c.x, c.y, (prev) => prev + deltaPct / 100);
    },
    setZoomTo: (pct: number) => {
      const c = viewCenter();
      zoomAtPoint(c.x, c.y, () => pct / 100);
    },
    resetZoom: () => {
      const c = viewCenter();
      zoomAtPoint(c.x, c.y, () => 1);
    },
    fitContent: () => {
      const container = containerRef.current;
      if (!container || items.length === 0) return;
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const item of items) {
        // 附着的子物件用比例坐标，不计入包围盒（v0.2）
        if (item.parentId) continue;
        minX = Math.min(minX, item.x);
        minY = Math.min(minY, item.y);
        maxX = Math.max(maxX, item.x + item.width);
        maxY = Math.max(maxY, item.y + item.height);
      }
      if (!isFinite(minX)) return;
      const padding = 60;
      const newZoom = Math.max(
        MIN_ZOOM,
        Math.min(MAX_ZOOM, Math.min((cw - padding * 2) / (maxX - minX), (ch - padding * 2) / (maxY - minY), 1)),
      );
      setZoom(newZoom);
      setPan({
        x: cw / 2 - ((minX + maxX) / 2) * newZoom,
        y: ch / 2 - ((minY + maxY) / 2) * newZoom,
      });
    },
  }), [viewCenter, zoomAtPoint, items]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        cursor: panning.current ? 'grabbing' : 'default',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* 墙纸层（data-canvas-bg：空白拖拽平移的命中标记） */}
      <div
        data-canvas-bg
        style={{
          position: 'absolute',
          inset: 0,
          ...wallpaperStyle,
        }}
      />

      {/* 变换层（缩放 + 平移） */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          transformOrigin: '0 0',
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          willChange: 'transform',
        }}
      >
        {children}
      </div>
    </div>
  );
});

/** 暴露给子组件的 zoom/pan 上下文 */
export interface CanvasView {
  zoom: number;
  panX: number;
  panY: number;
}
