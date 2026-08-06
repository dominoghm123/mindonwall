import { useCallback, useRef, type ReactNode } from 'react';
import type { Item, PinOffset } from '../../store/types';
import { useUIStore } from '../../store/useUIStore';
import { useWallStore } from '../../store/useWallStore';
import { Pin } from './Pin';

interface ObjectWrapperProps {
  item: Item;
  selected: boolean;
  zIndex: number;
  children: ReactNode;
  onSelect?: (id: string, multi: boolean) => void;
  onMove?: (id: string, x: number, y: number) => void;
  onResize?: (id: string, w: number, h: number) => void;
  onRotate?: (id: string, rotation: number) => void;
  onPinDragEnd?: (id: string, offset: PinOffset) => void;
}

type ResizeDir = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

const HANDLE_CURSORS: Record<ResizeDir, string> = {
  nw: 'nwse-resize', n: 'ns-resize', ne: 'nesw-resize', e: 'ew-resize',
  se: 'nwse-resize', s: 'ns-resize', sw: 'nesw-resize', w: 'ew-resize',
};

/**
 * 通用物件容器。
 * 提供绝对定位、选中态、缩放/旋转手柄、Pin。
 */
export function ObjectWrapper({
  item, selected, zIndex, children,
  onSelect, onMove, onResize, onRotate, onPinDragEnd,
}: ObjectWrapperProps) {
  const dragRef = useRef<{ startX: number; startY: number; itemX: number; itemY: number } | null>(null);
  const resizeRef = useRef<{ dir: ResizeDir; startX: number; startY: number; w: number; h: number; ix: number; iy: number } | null>(null);
  const rotateRef = useRef<{ startAngle: number; itemRotation: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const openContextMenu = useUIStore((s) => s.openContextMenu);
  const attachMode = useUIStore((s) => s.attachMode);
  const cancelAttachMode = useUIStore((s) => s.cancelAttachMode);
  const attachStamp = useWallStore((s) => s.attachStamp);

  /* ── 右键菜单 ── */
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openContextMenu(item.id, e.clientX, e.clientY);
  }, [item.id, openContextMenu]);

  /* ── 附着模式：点击 Paper 完成附着 ── */
  const handleClickForAttach = useCallback(() => {
    if (attachMode && item.type === 'paper') {
      attachStamp(attachMode, item.id);
      cancelAttachMode();
    }
  }, [attachMode, item.id, item.type, attachStamp, cancelAttachMode]);

  /* ── 物件拖拽移动 ── */
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    onSelect?.(item.id, e.shiftKey);
    dragRef.current = { startX: e.clientX, startY: e.clientY, itemX: item.x, itemY: item.y };
    (e.target as Element).setPointerCapture(e.pointerId);
  }, [item.id, item.x, item.y, onSelect]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    // 移动
    if (dragRef.current) {
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      onMove?.(item.id, dragRef.current.itemX + dx, dragRef.current.itemY + dy);
    }
    // 缩放
    if (resizeRef.current) {
      const r = resizeRef.current;
      const dx = e.clientX - r.startX;
      const dy = e.clientY - r.startY;
      let newW = r.w;
      let newH = r.h;
      let newX = r.ix;
      let newY = r.iy;

      if (r.dir.includes('e')) newW = Math.max(20, r.w + dx);
      if (r.dir.includes('w')) { newW = Math.max(20, r.w - dx); newX = r.ix + dx; }
      if (r.dir.includes('s')) newH = Math.max(20, r.h + dy);
      if (r.dir.includes('n')) { newH = Math.max(20, r.h - dy); newY = r.iy + dy; }

      onResize?.(item.id, newW, newH);
      onMove?.(item.id, newX, newY);
    }
    // 旋转
    if (rotateRef.current && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const angle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI) + 90;
      const delta = angle - rotateRef.current.startAngle;
      onRotate?.(item.id, rotateRef.current.itemRotation + delta);
    }
  }, [item.id, onMove, onResize, onRotate]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    dragRef.current = null;
    resizeRef.current = null;
    rotateRef.current = null;
    (e.target as Element).releasePointerCapture(e.pointerId);
  }, []);

  /* ── 缩放手柄 pointer down ── */
  const handleResizeStart = useCallback((dir: ResizeDir) => (e: React.PointerEvent) => {
    e.stopPropagation();
    resizeRef.current = { dir, startX: e.clientX, startY: e.clientY, w: item.width, h: item.height, ix: item.x, iy: item.y };
    (e.target as Element).setPointerCapture(e.pointerId);
  }, [item.width, item.height, item.x, item.y]);

  /* ── 旋转手柄 pointer down ── */
  const handleRotateStart = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const startAngle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI) + 90;
    rotateRef.current = { startAngle, itemRotation: item.rotation };
    (e.target as Element).setPointerCapture(e.pointerId);
  }, [item.rotation]);

  const showPin = item.type !== 'stamp';
  const pinOffset = item.pinOffset ?? { x: 0.5, y: 0 };

  return (
    <div
      ref={wrapperRef}
      style={{
        position: 'absolute',
        left: item.x,
        top: item.y,
        width: item.width,
        height: item.height,
        transform: `rotate(${item.rotation}deg)`,
        zIndex,
        cursor: attachMode && item.type === 'paper' ? 'crosshair' : 'move',
        outline: attachMode && item.type === 'paper' ? '2px dashed #4A90D9' : undefined,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onContextMenu={handleContextMenu}
      onClick={handleClickForAttach}
    >
      {/* 物件内容 */}
      <div style={{ width: '100%', height: '100%', overflow: 'visible' }}>
        {children}
      </div>

      {/* 选中态边框 */}
      {selected && (
        <div
          style={{
            position: 'absolute',
            inset: -1,
            border: '1px dashed #4A90D9',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* 缩放手柄 */}
      {selected && (
        <>
          {(['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as ResizeDir[]).map((dir) => {
            const isCorner = dir.length === 2;
            const size = isCorner ? 8 : 12;
            const style = getHandleStyle(dir, item.width, item.height, size);
            return (
              <div
                key={dir}
                style={{
                  position: 'absolute',
                  ...style,
                  width: isCorner ? 8 : (dir === 'n' || dir === 's' ? 12 : 6),
                  height: isCorner ? 8 : (dir === 'e' || dir === 'w' ? 12 : 6),
                  background: '#FFFFFF',
                  border: '1px solid #4A90D9',
                  borderRadius: isCorner ? '50%' : 2,
                  cursor: HANDLE_CURSORS[dir],
                  zIndex: 20,
                }}
                onPointerDown={handleResizeStart(dir)}
              />
            );
          })}

          {/* 旋转手柄 */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: -28,
              transform: 'translateX(-50%)',
              width: 20,
              height: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'grab',
              fontSize: 14,
              color: '#4A90D9',
              userSelect: 'none',
              zIndex: 20,
            }}
            onPointerDown={handleRotateStart}
          >
            ⊙
          </div>
          {/* 旋转手柄连线 */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: -10,
              width: 1,
              height: 10,
              background: '#4A90D9',
              transform: 'translateX(-50%)',
              pointerEvents: 'none',
            }}
          />
        </>
      )}

      {/* Pin */}
      {showPin && (
        <Pin
          offset={pinOffset}
          parentWidth={item.width}
          parentHeight={item.height}
          onDragEnd={(offset) => onPinDragEnd?.(item.id, offset)}
        />
      )}
    </div>
  );
}

/** 根据方向计算手柄位置样式 */
function getHandleStyle(dir: ResizeDir, w: number, h: number, size: number): React.CSSProperties {
  const half = size / 2;
  switch (dir) {
    case 'nw': return { left: -half, top: -half };
    case 'n':  return { left: w / 2 - half, top: -half };
    case 'ne': return { left: w - half, top: -half };
    case 'e':  return { left: w - half, top: h / 2 - half };
    case 'se': return { left: w - half, top: h - half };
    case 's':  return { left: w / 2 - half, top: h - half };
    case 'sw': return { left: -half, top: h - half };
    case 'w':  return { left: -half, top: h / 2 - half };
  }
}
