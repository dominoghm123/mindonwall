import type { Item, Rope } from '../../store/types';
import { calculateRopePath } from '../../utils/ropeGeometry';

interface RopeLayerProps {
  ropes: Rope[];
  items: Item[];
  selectedRopeId?: string;
  /** 拖拽中的尾巴线起点坐标 */
  dragTail?: { x: number; y: number; endX: number; endY: number } | null;
  onRopeClick?: (id: string) => void;
  onRopeContextMenu?: (id: string, x: number, y: number) => void;
}

/**
 * SVG Rope 层。
 * 全屏 overlay，pointer-events: none（Rope 本身 pointer-events: auto）。
 */
export function RopeLayer({
  ropes,
  items,
  selectedRopeId,
  dragTail,
  onRopeClick,
  onRopeContextMenu,
}: RopeLayerProps) {
  const itemMap = new Map(items.map((i) => [i.id, i]));

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        // 注意：变换层 div 无固有尺寸（子元素全 absolute），
        // 若用 width/height:100% 会得到 0×0 导致绳子不渲染，故用固定 1px + overflow visible
        width: 1,
        height: 1,
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

        const naturalLength =
          rope.naturalLength ??
          Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2) * 1.35;
        const path = calculateRopePath(x1, y1, x2, y2, naturalLength);
        const isSelected = rope.id === selectedRopeId;

        return (
          <g key={rope.id}>
            {/* v0.5: 绳线手绘质感 — 主线 + 纤维纹理叠层 */}
            <path
              d={path}
              fill="none"
              stroke={rope.color ?? (isSelected ? '#6B5518' : '#8B6914')}
              strokeWidth={isSelected ? 4 : 3}
              strokeLinecap="round"
              style={{ pointerEvents: 'auto', cursor: 'pointer' }}
              onClick={() => onRopeClick?.(rope.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRopeContextMenu?.(rope.id, e.clientX, e.clientY);
              }}
            />
            {/* v0.5: 纤维纹理层 — stroke-dasharray 模拟麻绳纤维 */}
            <path
              d={path}
              fill="none"
              stroke={rope.color ?? '#A88030'}
              strokeWidth={1}
              strokeDasharray="3 5"
              strokeLinecap="round"
              opacity={0.25}
              style={{ pointerEvents: 'none' }}
            />
          </g>
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
          opacity={0.6}
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}
