import { useCallback, useRef } from 'react';
import type { PinOffset } from '../../store/types';

interface PinProps {
  /** Pin 在物件内的偏移（0-1 比例坐标） */
  offset: PinOffset;
  /** 父物件的宽高（px） */
  parentWidth: number;
  parentHeight: number;
  /** 拖拽结束回调 */
  onDragEnd?: (offset: PinOffset) => void;
}

/**
 * 16×16 SVG 图钉组件。
 * 白色圆形钉头 + 金色短针柄，正视角，无投影。
 * 可拖拽（限制在父物件范围内）。
 */
export function Pin({ offset, parentWidth, parentHeight, onDragEnd }: PinProps) {
  const dragging = useRef(false);
  const pinRef = useRef<SVGSVGElement>(null);

  const pixelX = offset.x * parentWidth;
  const pixelY = offset.y * parentHeight;

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    dragging.current = true;
    (e.target as Element).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current || !pinRef.current) return;
    e.stopPropagation();

    const parent = pinRef.current.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();

    const relX = Math.max(0, Math.min(e.clientX - rect.left, parentWidth));
    const relY = Math.max(0, Math.min(e.clientY - rect.top, parentHeight));

    // 直接移动 pin（通过 CSS transform）
    pinRef.current.style.left = `${relX - 8}px`;
    pinRef.current.style.top = `${relY - 8}px`;
  }, [parentWidth, parentHeight]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragging.current || !pinRef.current) return;
    dragging.current = false;
    (e.target as Element).releasePointerCapture(e.pointerId);

    const parent = pinRef.current.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();

    const relX = Math.max(0, Math.min(e.clientX - rect.left, parentWidth));
    const relY = Math.max(0, Math.min(e.clientY - rect.top, parentHeight));

    const newOffset: PinOffset = {
      x: relX / parentWidth,
      y: relY / parentHeight,
    };
    onDragEnd?.(newOffset);
  }, [parentWidth, parentHeight, onDragEnd]);

  return (
    <svg
      ref={pinRef}
      width={16}
      height={16}
      viewBox="0 0 16 16"
      style={{
        position: 'absolute',
        left: pixelX - 8,
        top: pixelY - 8,
        cursor: 'grab',
        zIndex: 10,
        pointerEvents: 'auto',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <defs>
        <radialGradient id="pinHead" cx="40%" cy="35%" r="50%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E8E8E8" />
        </radialGradient>
      </defs>
      {/* 金色针柄 */}
      <rect x="7" y="10" width="2" height="4" rx="0.5" fill="#C9A84C" />
      {/* 白色圆形钉头 */}
      <circle cx="8" cy="6" r="5" fill="url(#pinHead)" stroke="#D0D0D0" strokeWidth="0.5" />
    </svg>
  );
}
