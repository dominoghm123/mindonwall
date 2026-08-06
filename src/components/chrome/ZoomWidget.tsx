import type { InfiniteCanvasHandle } from '../canvas/InfiniteCanvas';
import { useUIStore } from '../../store/useUIStore';

interface ZoomWidgetProps {
  zoom: number;
  canvasRef: React.RefObject<InfiniteCanvasHandle | null>;
}

/**
 * 右下角页面级浮窗（v0.2，参考 Magnific 布局）。
 * 缩放百分比（点击重置 100%）+ Fit 按钮 + Map 图标按钮。
 * 纯白实色 + 1px border，无阴影。
 */
export function ZoomWidget({ zoom, canvasRef }: ZoomWidgetProps) {
  const showToast = useUIStore((s) => s.showToast);

  return (
    <div
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
      }}
    >
      {/* Zoom out */}
      <WidgetButton title="Zoom out" onClick={() => canvasRef.current?.zoomOut()}>
        −
      </WidgetButton>

      {/* 百分比（点击重置 100%） */}
      <div
        onClick={() => canvasRef.current?.resetZoom()}
        title="Reset to 100%"
        style={{
          minWidth: 44,
          textAlign: 'center',
          fontSize: 12,
          color: '#666',
          cursor: 'pointer',
        }}
      >
        {Math.round(zoom * 100)}%
      </div>

      {/* Zoom in */}
      <WidgetButton title="Zoom in" onClick={() => canvasRef.current?.zoomIn()}>
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
