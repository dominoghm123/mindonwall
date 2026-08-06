import { useRef, useCallback, useMemo } from 'react';
import type { Item } from '../../store/types';
import { useWallStore } from '../../store/useWallStore';
import { StampObject } from './StampObject';

interface PaperObjectProps {
  item: Item;
  onTextChange?: (id: string, text: string) => void;
}

/**
 * Paper 4 变体渲染：note / torn / sticky / tape
 */
export function PaperObject({ item, onTextChange }: PaperObjectProps) {
  const variant = item.variant ?? 'note';
  const items = useWallStore((s) => s.items);
  // 查询附着在当前 Paper 上的 Stamp
  const attachedStamps = items.filter(
    (i) => i.type === 'stamp' && i.parentId === item.id
  );

  const renderContent = () => {
    switch (variant) {
      case 'torn':
        return <TornPaper item={item} onTextChange={onTextChange} />;
      case 'sticky':
        return <StickyNote item={item} onTextChange={onTextChange} />;
      case 'tape':
        return <TapeStrip item={item} />;
      case 'note':
      default:
        return <NotePaper item={item} onTextChange={onTextChange} />;
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {renderContent()}
      {/* 渲染附着的 Stamp 子物件（位置跟随 Paper 变换） */}
      {attachedStamps.map((stamp) => {
        // 兼容绝对像素坐标（x > 1）和比例坐标（0-1）
        const leftPct = stamp.x > 1 ? ((stamp.x - item.x) / item.width) * 100 : stamp.x * 100;
        const topPct = stamp.y > 1 ? ((stamp.y - item.y) / item.height) * 100 : stamp.y * 100;
        return (
          <div
            key={stamp.id}
            style={{
              position: 'absolute',
              left: `${leftPct}%`,
              top: `${topPct}%`,
              width: stamp.width,
              height: stamp.height,
              pointerEvents: 'none',
              zIndex: 5,
            }}
          >
            <StampObject item={stamp} />
          </div>
        );
      })}
    </div>
  );
}

/* ─── 普通纸 note ─── */
function NotePaper({ item, onTextChange }: { item: Item; onTextChange?: (id: string, text: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  const handleBlur = useCallback(() => {
    if (ref.current) {
      onTextChange?.(item.id, ref.current.innerText);
    }
  }, [item.id, onTextChange]);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#FFFFFF',
        padding: 16,
        boxSizing: 'border-box',
        overflow: 'auto',
      }}
    >
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onBlur={handleBlur}
        style={{
          width: '100%',
          height: '100%',
          outline: 'none',
          fontFamily: '"LXGW WenKai", "Caveat", cursive, sans-serif',
          fontSize: 16,
          lineHeight: 1.6,
          color: '#333',
          wordBreak: 'break-word',
        }}
      >
        {item.text ?? ''}
      </div>
    </div>
  );
}

/* ─── 撕边纸 torn ─── */
function TornPaper({ item, onTextChange }: { item: Item; onTextChange?: (id: string, text: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  const handleBlur = useCallback(() => {
    if (ref.current) {
      onTextChange?.(item.id, ref.current.innerText);
    }
  }, [item.id, onTextChange]);

  // 生成撕边 clip-path（上下边缘不规则锯齿）
  const clipId = `torn-clip-${item.id}`;
  const topPoints = generateTornEdge(item.width, 0, 3, 5);
  const bottomPoints = generateTornEdge(item.width, item.height, 3, 5);
  // 构建 SVG path: M topStart L topPoints... L bottomEnd L bottomPoints(reversed) Z
  const pathD = [
    `M ${topPoints[0].x} ${topPoints[0].y}`,
    ...topPoints.slice(1).map((p) => `L ${p.x} ${p.y}`),
    `L ${bottomPoints[bottomPoints.length - 1].x} ${bottomPoints[bottomPoints.length - 1].y}`,
    ...bottomPoints.slice(0, -1).reverse().map((p) => `L ${p.x} ${p.y}`),
    'Z',
  ].join(' ');

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
            <path d={pathD} />
          </clipPath>
        </defs>
      </svg>
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#F5F0E8',
          clipPath: `url(#${clipId})`,
          padding: 16,
          boxSizing: 'border-box',
          overflow: 'auto',
        }}
      >
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onBlur={handleBlur}
          style={{
            width: '100%',
            height: '100%',
            outline: 'none',
            fontFamily: '"LXGW WenKai", "Caveat", cursive, sans-serif',
            fontSize: 16,
            lineHeight: 1.6,
            color: '#333',
            wordBreak: 'break-word',
          }}
        >
          {item.text ?? ''}
        </div>
      </div>
    </div>
  );
}

/** 生成撕边锯齿路径的点序列 */
function generateTornEdge(width: number, baseY: number, minAmp: number, maxAmp: number): { x: number; y: number }[] {
  const segments = Math.ceil(width / 8);
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i <= segments; i++) {
    const x = (i / segments) * width;
    const amp = minAmp + Math.random() * (maxAmp - minAmp);
    const y = baseY + (i % 2 === 0 ? -amp : amp);
    points.push({ x, y });
  }
  return points;
}

/* ─── 便利贴 sticky ─── */
function StickyNote({ item, onTextChange }: { item: Item; onTextChange?: (id: string, text: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const bgColor = item.color ?? '#FFF3B0';

  const handleBlur = useCallback(() => {
    if (ref.current) {
      onTextChange?.(item.id, ref.current.innerText);
    }
  }, [item.id, onTextChange]);

  return (
    <div
      style={{
        width: 140,
        height: 140,
        background: bgColor,
        padding: 12,
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onBlur={handleBlur}
        style={{
          width: '100%',
          height: '100%',
          outline: 'none',
          fontFamily: '"LXGW WenKai", "Caveat", cursive, sans-serif',
          fontSize: 14,
          lineHeight: 1.5,
          color: '#333',
          wordBreak: 'break-word',
        }}
      >
        {item.text ?? ''}
      </div>
    </div>
  );
}

/* ─── Tape (washi/masking tape) ─── */
/**
 * Tape 变体：半透明胶带条，自然撕边，可叠加在其他物件上。
 * 参考 researching/tape_sample/ 中的质感：
 * - 半透明（opacity 0.55-0.7）
 * - 自然不规则撕边（非直线切割）
 * - 轻微褶皱/纹理
 * - 支持多色：米白/浅蓝/浅黄/浅绿等
 */
function TapeStrip({ item }: { item: Item }) {
  const color = item.color ?? 'rgba(232,224,200,0.6)';

  // 基于 id 生成确定性伪随机撕边形状
  const tearShape = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < item.id.length; i++) {
      hash = (hash << 5) - hash + item.id.charCodeAt(i);
      hash |= 0;
    }
    const rng = () => {
      hash = (hash * 16807 + 0) % 2147483647;
      return (hash - 1) / 2147483646;
    };
    // 生成 4 个角的撕边偏移
    return {
      tl: rng() * 6 - 3,
      tr: rng() * 6 - 3,
      bl: rng() * 6 - 3,
      br: rng() * 6 - 3,
      // 轻微斜角
      skew: (rng() - 0.5) * 4,
    };
  }, [item.id]);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'visible',
      }}
    >
      {/* SVG 撕边胶带形状 */}
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <defs>
          {/* 胶带纹理：轻微噪点 */}
          <filter id={`tape-noise-${item.id}`}>
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" result="noise" />
            <feColorMatrix type="saturate" values="0" in="noise" result="grayNoise" />
            <feBlend in="SourceGraphic" in2="grayNoise" mode="multiply" />
          </filter>
        </defs>
        {/* 胶带主体：不规则四边形模拟撕边 */}
        <polygon
          points={`
            ${2 + tearShape.tl},${8 + tearShape.skew}
            ${98 + tearShape.tr},${6 - tearShape.skew}
            ${97 - tearShape.br},${94 + tearShape.skew}
            ${3 - tearShape.bl},${92 - tearShape.skew}
          `}
          fill={color}
          filter={`url(#tape-noise-${item.id})`}
          opacity="0.85"
        />
      </svg>
    </div>
  );
}
