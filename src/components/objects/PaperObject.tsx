import { useRef, useCallback, useMemo } from 'react';
import type { Item } from '../../store/types';
import { useAssetStore } from '../../store/useAssetStore';
import { AttachedStamps } from './AttachedStamps';

interface PaperObjectProps {
  item: Item;
  onTextChange?: (id: string, text: string) => void;
  /** 画布缩放，用于附着 Stamp 拖拽的坐标换算 */
  zoom?: number;
}

/**
 * Paper 4 变体渲染：note / torn / sticky / tape
 * 附着的 Stamp 由 AttachedStamps 组件渲染（可拖拽，跟随宿主变换）
 */
export function PaperObject({ item, onTextChange, zoom = 1 }: PaperObjectProps) {
  const variant = item.variant ?? 'note';

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
      {/* 附着的 Stamp 子物件（v0.2：共享组件） */}
      <AttachedStamps host={item} zoom={zoom} />
    </div>
  );
}

/* ─── 普通纸 note（文字随 Paper 同比缩放，支持颜色/图片纸面） ─── */
function NotePaper({ item, onTextChange }: { item: Item; onTextChange?: (id: string, text: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const assets = useAssetStore((s) => s.assets);
  // 缩放比例（相对默认宽 180）
  const ratio = Math.max(0.5, item.width / 180);
  const bg = item.color ?? '#FFFFFF';
  // 上传素材作为纸面背景
  const bgAsset = item.assetId ? assets.find((a) => a.id === item.assetId) : undefined;

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
        background: bg,
        backgroundImage: bgAsset?.dataUrl ? `url(${bgAsset.dataUrl})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        // v0.2：细边框 + 内阴影让白纸在白色墙面上可辨认（文字一定在纸上），
        // 内阴影随纸面同比缩放，边框保持 1px 不放大
        border: '1px solid #E3DED2',
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.03), inset 0 2px 12px rgba(0,0,0,0.05)',
        padding: 16 * ratio,
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
          fontSize: Math.max(9, 16 * ratio),
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

/* ─── 撕边纸 torn（文字同比缩放，支持颜色） ─── */
function TornPaper({ item, onTextChange }: { item: Item; onTextChange?: (id: string, text: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const ratio = Math.max(0.5, item.width / 180);
  const bg = item.color ?? '#F5F0E8';

  const handleBlur = useCallback(() => {
    if (ref.current) {
      onTextChange?.(item.id, ref.current.innerText);
    }
  }, [item.id, onTextChange]);

  // 生成撕边 clip-path（确定性伪随机，避免重渲染抖动）
  const clipId = `torn-clip-${item.id}`;
  const pathD = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < item.id.length; i++) {
      hash = (hash << 5) - hash + item.id.charCodeAt(i);
      hash |= 0;
    }
    const rng = () => {
      hash = (hash * 16807 + 0) % 2147483647;
      return (hash - 1) / 2147483646;
    };
    const genEdge = (baseY: number) => {
      const segments = Math.ceil(item.width / 8);
      const points: { x: number; y: number }[] = [];
      for (let i = 0; i <= segments; i++) {
        const x = (i / segments) * item.width;
        const amp = 3 + rng() * 2;
        const y = baseY + (i % 2 === 0 ? -amp : amp);
        points.push({ x, y });
      }
      return points;
    };
    const topPoints = genEdge(0);
    const bottomPoints = genEdge(item.height);
    return [
      `M ${topPoints[0].x} ${topPoints[0].y}`,
      ...topPoints.slice(1).map((p) => `L ${p.x} ${p.y}`),
      `L ${bottomPoints[bottomPoints.length - 1].x} ${bottomPoints[bottomPoints.length - 1].y}`,
      ...bottomPoints.slice(0, -1).reverse().map((p) => `L ${p.x} ${p.y}`),
      'Z',
    ].join(' ');
  }, [item.id, item.width, item.height]);

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
          background: bg,
          clipPath: `url(#${clipId})`,
          padding: 16 * ratio,
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
            fontSize: Math.max(9, 16 * ratio),
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

/* ─── 便利贴 sticky（跟随物件尺寸，文字同比缩放） ─── */
function StickyNote({ item, onTextChange }: { item: Item; onTextChange?: (id: string, text: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const bgColor = item.color ?? '#FFF3B0';
  const ratio = Math.max(0.5, item.width / 130);

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
        background: bgColor,
        padding: 12 * ratio,
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
          fontSize: Math.max(9, 14 * ratio),
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
