import { useState, useCallback } from 'react';
import { useWallStore } from '../../store/useWallStore';
import { useUIStore } from '../../store/useUIStore';
import type { Item } from '../../store/types';

/** 微图标 SVG 组件 */
const IconImage = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <rect x="1" y="1" width="8" height="8" rx="1" stroke="#CCC" strokeWidth="1" />
    <circle cx="3.5" cy="3.5" r="1" fill="#CCC" />
    <path d="M1 7 L4 4 L6 6 L9 3" stroke="#CCC" strokeWidth="0.8" />
  </svg>
);

const IconPaper = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <path d="M2 1 H6 L8 3 V9 H2 Z" stroke="#CCC" strokeWidth="1" />
    <path d="M6 1 V3 H8" stroke="#CCC" strokeWidth="0.8" />
  </svg>
);

const IconStamp = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <circle cx="5" cy="5" r="3.5" stroke="#CCC" strokeWidth="1" />
    <circle cx="5" cy="5" r="1.5" stroke="#CCC" strokeWidth="0.6" />
  </svg>
);

const IconRope = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <path d="M1 8 Q5 2 9 8" stroke="#CCC" strokeWidth="1" fill="none" />
  </svg>
);

/** 大图标 SVG（展开态 40x40 按钮内使用） */
const IconImageLarge = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <rect x="2" y="2" width="16" height="16" rx="2" stroke="#666" strokeWidth="1.2" />
    <circle cx="7" cy="7" r="2" fill="#666" />
    <path d="M2 14 L8 8 L12 12 L18 6" stroke="#666" strokeWidth="1" />
  </svg>
);

const IconPaperLarge = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M4 2 H12 L16 6 V18 H4 Z" stroke="#666" strokeWidth="1.2" />
    <path d="M12 2 V6 H16" stroke="#666" strokeWidth="1" />
    <line x1="7" y1="10" x2="13" y2="10" stroke="#666" strokeWidth="0.8" />
    <line x1="7" y1="13" x2="13" y2="13" stroke="#666" strokeWidth="0.8" />
  </svg>
);

const IconStampLarge = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="10" r="7" stroke="#666" strokeWidth="1.2" />
    <circle cx="10" cy="10" r="3" stroke="#666" strokeWidth="0.8" />
  </svg>
);

const IconRopeLarge = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M2 16 Q10 4 18 16" stroke="#666" strokeWidth="1.2" fill="none" />
    <circle cx="2" cy="16" r="2" fill="#666" />
    <circle cx="18" cy="16" r="2" fill="#666" />
  </svg>
);

let idCounter = 0;
function genId(prefix: string) {
  return `${prefix}-${Date.now()}-${++idCounter}`;
}

/**
 * 底部工具栏，方案 B（微图标行）。
 * 收拢态：28px × 100px，展开态：28px × 260px。
 * 纯白背景，1px border，border-radius 14px，无阴影。
 */
export function BottomToolbar() {
  const [expanded, setExpanded] = useState(false);
  const addItem = useWallStore((s) => s.addItem);
  const setRopeCreating = useUIStore((s) => s.setRopeCreating);

  const handleAddImage = useCallback(() => {
    const id = genId('item-pic');
    const x = 100 + Math.random() * 400;
    const y = 100 + Math.random() * 300;
    const item: Item = {
      id,
      type: 'picture',
      x,
      y,
      width: 200,
      height: 150,
      rotation: (Math.random() - 0.5) * 6,
      assetId: 'north-01-wat-chedi-luang',
      pinOffset: { x: 0.5, y: 0 },
    };
    addItem(item);
  }, [addItem]);

  const handleAddPaper = useCallback(() => {
    const id = genId('item-paper');
    const x = 100 + Math.random() * 400;
    const y = 100 + Math.random() * 300;
    const item: Item = {
      id,
      type: 'paper',
      variant: 'note',
      x,
      y,
      width: 160,
      height: 80,
      rotation: (Math.random() - 0.5) * 6,
      text: '',
      pinOffset: { x: 0.5, y: 0 },
    };
    addItem(item);
  }, [addItem]);

  const handleAddStamp = useCallback(() => {
    const id = genId('item-stamp');
    const x = 100 + Math.random() * 400;
    const y = 100 + Math.random() * 300;
    const item: Item = {
      id,
      type: 'stamp',
      x,
      y,
      width: 60,
      height: 60,
      rotation: (Math.random() - 0.5) * 10,
      stampId: 'stamp-blue-travel',
      pinOffset: { x: 0.5, y: 0.5 },
    };
    addItem(item);
  }, [addItem]);

  const handleRope = useCallback(() => {
    setRopeCreating(true);
  }, [setRopeCreating]);

  const tools = [
    { key: 'image', label: 'Image', icon: <IconImageLarge />, onClick: handleAddImage },
    { key: 'paper', label: 'Paper', icon: <IconPaperLarge />, onClick: handleAddPaper },
    { key: 'stamp', label: 'Stamp', icon: <IconStampLarge />, onClick: handleAddStamp },
    { key: 'rope', label: 'Rope', icon: <IconRopeLarge />, onClick: handleRope },
  ];

  const collapsedIcons = [
    <IconImage key="i" />,
    <IconPaper key="p" />,
    <IconStamp key="s" />,
    <IconRope key="r" />,
  ];

  return (
    <div
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        height: 28,
        width: expanded ? 260 : 100,
        background: '#FFFFFF',
        border: '1px solid #E5E5E5',
        borderRadius: 14,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        transition: 'width 0.2s ease',
        zIndex: 1000,
        gap: expanded ? 4 : 0,
      }}
    >
      {expanded ? (
        tools.map((tool) => (
          <button
            key={tool.key}
            onClick={tool.onClick}
            style={{
              width: 40,
              height: 40,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              borderRadius: 8,
              padding: 0,
            }}
            title={tool.label}
          >
            {tool.icon}
            <span style={{ fontSize: 10, color: '#999', lineHeight: 1 }}>{tool.label}</span>
          </button>
        ))
      ) : (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {collapsedIcons.map((icon, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
              {icon}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
