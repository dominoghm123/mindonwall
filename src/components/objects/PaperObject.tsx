import { useRef, useCallback } from 'react';
import type { Item } from '../../store/types';

interface PaperObjectProps {
  item: Item;
  onTextChange?: (id: string, text: string) => void;
}

/**
 * Paper 4 变体渲染：note / torn / sticky / tape
 */
export function PaperObject({ item, onTextChange }: PaperObjectProps) {
  const variant = item.variant ?? 'note';

  switch (variant) {
    case 'torn':
      return <TornPaper item={item} onTextChange={onTextChange} />;
    case 'sticky':
      return <StickyNote item={item} onTextChange={onTextChange} />;
    case 'tape':
      return <TapeStrip />;
    case 'note':
    default:
      return <NotePaper item={item} onTextChange={onTextChange} />;
  }
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
  const topEdge = generateTornEdge(item.width, 0, 3, 5);
  const bottomEdge = generateTornEdge(item.width, item.height, 3, 5);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
            <path d={`M 0 ${topEdge} L ${item.width} ${topEdge} L ${item.width} ${bottomEdge} L 0 ${bottomEdge} Z`} />
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

/** 生成撕边锯齿路径的 y 坐标序列（空格分隔的坐标对） */
function generateTornEdge(width: number, baseY: number, minAmp: number, maxAmp: number): string {
  const segments = Math.ceil(width / 8);
  const points: string[] = [];
  for (let i = 0; i <= segments; i++) {
    const x = (i / segments) * width;
    const amp = minAmp + Math.random() * (maxAmp - minAmp);
    const y = baseY + (i % 2 === 0 ? -amp : amp);
    points.push(`${x} ${y}`);
  }
  return points.join(' L ');
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
        overflow: 'hidden',
      }}
    >
      {/* 右上角微卷效果 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 24,
          height: 24,
          background: `linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.06) 50%)`,
          pointerEvents: 'none',
        }}
      />
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

/* ─── 胶带 tape ─── */
function TapeStrip() {
  return (
    <div
      style={{
        width: 180,
        height: 30,
        opacity: 0.7,
        backgroundImage:
          'repeating-linear-gradient(90deg, rgba(200,180,140,0.4) 0px, rgba(200,180,140,0.4) 4px, transparent 4px, transparent 8px)',
        backgroundColor: 'rgba(220,210,180,0.5)',
        borderRadius: 1,
      }}
    />
  );
}
