import { useEffect, useRef, useState } from 'react';
import type { InfiniteCanvasHandle } from '../canvas/InfiniteCanvas';
import { useUIStore } from '../../store/useUIStore';

interface ZoomWidgetProps {
  zoom: number;
  canvasRef: React.RefObject<InfiniteCanvasHandle | null>;
}

/**
 * 右下角页面级浮窗（v0.2 修订）。
 * 位置不变，静止时默认隐藏，hover 右下角时由右向左浮出。
 * 缩放百分比（点击重置 100%）+ Fit 按钮 + Map 图标按钮。
 * 纯白实色 + 1px border，无阴影。
 */
export function ZoomWidget({ zoom, canvasRef }: ZoomWidgetProps) {
  const showToast = useUIStore((s) => s.showToast);
  const [visible, setVisible] = useState(false);

  /* ── 度数可编辑（v0.2 修订） ── */
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const percent = Math.round(zoom * 100);

  const commitEdit = () => {
    const n = parseInt(editValue, 10);
    if (!isNaN(n)) canvasRef.current?.setZoomTo(Math.max(20, Math.min(300, n)));
    setEditing(false);
  };

  const startEdit = () => {
    setEditValue(String(percent));
    setEditing(true);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  };

  // 鼠标接近右下角时显示
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (e.clientX >= window.innerWidth - 90 && e.clientY >= window.innerHeight - 80) {
        setVisible(true);
      }
    };
    document.addEventListener('mousemove', onMove);
    return () => document.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <div
      data-toolbar-ui
      onMouseLeave={(e) => {
        // 离开浮窗且不在右下角触发区时隐藏
        const inCorner =
          e.clientX >= window.innerWidth - 90 && e.clientY >= window.innerHeight - 80;
        if (!inCorner) setVisible(false);
      }}
      style={{
        position: 'fixed',
        right: 16,
        bottom: 24,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        background: '#FFFFFF',
        border: '1px solid #E5E5E5',
        borderRadius: 10,
        padding: '0 4px',
        height: 36,
        zIndex: 1000,
        userSelect: 'none',
        transform: visible ? 'translateX(0)' : 'translateX(150%)',
        transition: 'transform 0.25s ease',
      }}
    >
      {/* Zoom out（v0.2 修订：每次 1%） */}
      <WidgetButton title="Zoom out 1%" onClick={() => canvasRef.current?.zoomStep(-1)}>
        −
      </WidgetButton>

      {/* 百分比：单击编辑度数，双击重置 100% */}
      {editing ? (
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value.replace(/[^0-9]/g, ''))}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitEdit();
            if (e.key === 'Escape') setEditing(false);
          }}
          style={{
            width: 40,
            fontSize: 12,
            color: '#333',
            border: '1px solid #D0D0D0',
            borderRadius: 4,
            padding: '1px 4px',
            outline: 'none',
            textAlign: 'center',
          }}
        />
      ) : (
        <div
          onClick={startEdit}
          onDoubleClick={() => canvasRef.current?.resetZoom()}
          title="Click to edit, double-click to reset to 100%"
          style={{
            minWidth: 44,
            textAlign: 'center',
            fontSize: 12,
            color: '#666',
            cursor: 'pointer',
          }}
        >
          {percent}%
        </div>
      )}

      {/* Zoom in（v0.2 修订：每次 1%） */}
      <WidgetButton title="Zoom in 1%" onClick={() => canvasRef.current?.zoomStep(1)}>
        +
      </WidgetButton>

      <div style={{ width: 1, height: 18, background: '#EEE', margin: '0 4px' }} />

      {/* Fit */}
      <button
        onClick={() => canvasRef.current?.fitContent()}
        title="Fit content"
        style={{
          height: 26,
          padding: '0 8px',
          fontSize: 12,
          color: '#666',
          background: 'none',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
        }}
      >
        Fit
      </button>

      {/* Map（v0.3 功能，先占位） */}
      <WidgetButton
        title="Connection Map (coming in v0.3)"
        onClick={() => showToast('Connection Map coming in v0.3', 'info')}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="4" cy="4" r="2" stroke="#666" strokeWidth="1" />
          <circle cx="12" cy="12" r="2" stroke="#666" strokeWidth="1" />
          <circle cx="12" cy="4" r="1.5" stroke="#666" strokeWidth="1" />
          <path d="M5.5 5.5 L10.5 10.5 M6 4 L10.5 4" stroke="#666" strokeWidth="0.8" />
        </svg>
      </WidgetButton>
    </div>
  );
}

function WidgetButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 26,
        height: 26,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'none',
        border: 'none',
        borderRadius: 6,
        cursor: 'pointer',
        fontSize: 14,
        color: '#666',
        padding: 0,
      }}
    >
      {children}
    </button>
  );
}
