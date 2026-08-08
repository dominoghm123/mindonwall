import { useCallback, useRef, useState } from 'react';
import type { PinOffset } from '../../store/types';

interface PinProps {
  /** Pin 在物件内的偏移（0-1 比例坐标） */
  offset: PinOffset;
  /** 父物件的宽高（px） */
  parentWidth: number;
  parentHeight: number;
  /** 拖拽结束回调 */
  onDragEnd?: (offset: PinOffset) => void;
  /** 当前物件 ID（用于 Rope 创建检测） */
  itemId?: string;
  /** 是否为 Rope 创建目标（发光效果） */
  isRopeTarget?: boolean;
  /** 是否为 Rope 连线起点（高亮） */
  isRopeSource?: boolean;
  /** Rope 创建时 Pin mousedown 回调（旧拖拽模式） */
  onRopeStart?: (itemId: string, e: React.PointerEvent) => void;
  /** 是否处于 Rope 创建模式（禁用拖拽） */
  isRopeCreating?: boolean;
  /** v0.2: Rope 点击连线模式下 Pin 被点击 */
  onRopePinClick?: (itemId: string) => void;
}

const PIN_SIZE = 14;
const DOT_SIZE = 3;

/**
 * Pin 俯视图组件。
 * 14px 直径白圈（#F8F8F8, 1px border #E0E0E0）+ 中心 3px 金色圆点（#C9A84C）。
 * 无阴影，完全扁平。
 * 可拖拽（限制在父物件范围内）。
 */
export function Pin({
  offset,
  parentWidth,
  parentHeight,
  onDragEnd,
  itemId,
  isRopeTarget,
  isRopeSource,
  onRopeStart,
  isRopeCreating,
  onRopePinClick,
}: PinProps) {
  const [hovered, setHovered] = useState(false);
  const dragging = useRef(false);
  const pinRef = useRef<HTMLDivElement>(null);

  // Rope 连线模式下放大命中区域，更容易点中
  const size = isRopeCreating ? 22 : PIN_SIZE;

  const pixelX = offset.x * parentWidth;
  const pixelY = offset.y * parentHeight;

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();

      // Rope 点击连线模式（v0.2）：直接走点击流程，不拖拽
      if (isRopeCreating && itemId && onRopePinClick) {
        onRopePinClick(itemId);
        return;
      }

      // Rope 创建模式（旧）：通知父组件
      if (isRopeCreating && itemId && onRopeStart) {
        onRopeStart(itemId, e);
        return;
      }

      dragging.current = true;
      (e.target as Element).setPointerCapture(e.pointerId);
    },
    [isRopeCreating, itemId, onRopeStart, onRopePinClick],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current || !pinRef.current) return;
      e.stopPropagation();

      const parent = pinRef.current.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();

      const relX = Math.max(0, Math.min(e.clientX - rect.left, parentWidth));
      const relY = Math.max(0, Math.min(e.clientY - rect.top, parentHeight));

      // 直接移动 pin（通过 CSS transform）
      pinRef.current.style.left = `${relX - PIN_SIZE / 2}px`;
      pinRef.current.style.top = `${relY - PIN_SIZE / 2}px`;
    },
    [parentWidth, parentHeight],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
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
    },
    [parentWidth, parentHeight, onDragEnd],
  );

  return (
    <div
      ref={pinRef}
      data-pin-item-id={itemId}
      style={{
        position: 'absolute',
        left: pixelX - size / 2,
        top: pixelY - size / 2,
        width: size,
        height: size,
        borderRadius: '50%',
        // v0.5: 金属质感 — 径向渐变 + 微阴影
        background: 'radial-gradient(circle at 35% 35%, #FFFFFF 0%, #F8F8F8 40%, #E8E8E8 100%)',
        border: isRopeCreating ? '2px solid #4A90D9' : '1px solid #D8D8D8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: isRopeCreating ? 'pointer' : 'grab',
        zIndex: 10,
        pointerEvents: 'auto',
        transform: hovered ? 'scale(1.1)' : 'scale(1)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        boxShadow: isRopeTarget || isRopeSource ? '0 0 8px #4A90D9' : '0 1px 2px rgba(0,0,0,0.1), inset 0 1px 1px rgba(255,255,255,0.8)',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      {/* v0.5: 中心金色圆点 — 金属高光 */}
      <div
        style={{
          width: DOT_SIZE,
          height: DOT_SIZE,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 35%, #E8D48B 0%, #C9A84C 60%, #A8893A 100%)',
          boxShadow: '0 0.5px 1px rgba(0,0,0,0.15)',
        }}
      />
    </div>
  );
}
