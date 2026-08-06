import type { Item, Rope } from '../../store/types';
import { calculateRopePath } from '../../utils/ropeGeometry';

interface RopeLayerProps {
  ropes: Rope[];
  items: Item[];
  selectedRopeId?: string;
  /** 拖拽中的尾巴线起点坐标 */
  dragTail?: { x: number; y: number; endX: number; endY: number } | null;
  onRopeClick?: (id: string) => void;
}

/**
 * SVG Rope 层。
 * 全屏 overlay，pointer-events: none（Rope 本身 pointer-events: auto）。
 */
export function RopeLayer({ ropes, items, selectedRopeId, dragTail, onRopeClick }: RopeLayerProps) {
  const itemMap = new Map(items.map((i) => [i.id, i]));

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        overflow: 'visible',
      }}
    >
      {ropes.map((rope) => {
        const from = itemMap.get(rope.fromItemId);
        const to = itemMap.get(rope.toItemId);
        if (!from || !to) return null;

        // Pin 位置：使用 pinOffset 或默认中心顶部
        const fromPin = from.pinOffset ?? { x: 0.5, y: 0 };
        const toPin = to.pinOffset ?? { x: 0.5, y: 0 };

        const x1 = from.x + fromPin.x * from.width;
        const y1 = from.y + fromPin.y * from.height;
        const x2 = to.x + toPin.x * to.width;
        const y2 = to.y + toPin.y * to.height;

        const naturalLength = rope.naturalLength ?? Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2) * 1.2;
        const path = calculateRopePath(x1, y1, x2, y2, naturalLength);
        const isSelected = rope.id === selectedRopeId;

        return (
          <path
            key={rope.id}
            d={path}
            fill="none"
            stroke={isSelected ? '#5D4E37' : '#8B7355'}
            strokeWidth={isSelected ? 3 : 2}
            strokeLinecap="round"
            style={{ pointerEvents: 'auto', cursor: 'pointer' }}
            onClick={() => onRopeClick?.(rope.id)}
          />
        );
      })}

      {/* 拖拽中的尾巴线 */}
      {dragTail && (
        <line
          x1={dragTail.x}
          y1={dragTail.y}
          x2={dragTail.endX}
          y2={dragTail.endY}
          stroke="#8B7355"
          strokeWidth={2}
          strokeDasharray="6 4"
          opacity={0.5}
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}
