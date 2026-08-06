import {
  useState, useRef, useCallback, useEffect,
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

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 3.0;

/**
 * 无限画布容器。
 * - 缩放：鼠标滚轮，20%-300%，以鼠标位置为中心
 * - 平移：鼠标左键拖拽背景
 * - 初始视图：空墙 100%，有内容时自适应
 */
export function InfiniteCanvas({ wallpaper, items, children, onViewChange }: InfiniteCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

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

  /* ── 缩放（鼠标滚轮） ── */
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const delta = -e.deltaY * 0.001;
    setZoom((prevZoom) => {
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prevZoom * (1 + delta)));
      const ratio = newZoom / prevZoom;

      setPan((prevPan) => ({
        x: mouseX - ratio * (mouseX - prevPan.x),
        y: mouseY - ratio * (mouseY - prevPan.y),
      }));

      return newZoom;
    });
  }, []);

  /* ── 平移（拖拽背景） ── */
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // 仅在点击背景（canvas 容器本身）时开始平移
    if (e.target !== containerRef.current) return;
    if (e.button !== 0) return;

    panning.current = true;
    panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    (e.target as Element).setPointerCapture(e.pointerId);
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
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* 墙纸层 */}
      <div
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
}

/** 暴露给子组件的 zoom/pan 上下文 */
export interface CanvasView {
  zoom: number;
  panX: number;
  panY: number;
}
