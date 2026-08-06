import { useCallback } from 'react';

interface ZoomIndicatorProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 3.0;
const STEP = 0.1;

/**
 * 缩放指示器。
 * 右下角显示当前缩放比例，+/- 按钮调整 10%，双击数字重置 100%。
 */
export function ZoomIndicator({ zoom, onZoomChange }: ZoomIndicatorProps) {
  const percent = Math.round(zoom * 100);

  const handleMinus = useCallback(() => {
    onZoomChange(Math.max(MIN_ZOOM, zoom - STEP));
  }, [zoom, onZoomChange]);

  const handlePlus = useCallback(() => {
    onZoomChange(Math.min(MAX_ZOOM, zoom + STEP));
  }, [zoom, onZoomChange]);

  const handleDoubleClick = useCallback(() => {
    onZoomChange(1);
  }, [onZoomChange]);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 16,
        right: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 10px',
        background: 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderRadius: 16,
        border: '1px solid rgba(0,0,0,0.08)',
        fontSize: 12,
        color: '#555',
        userSelect: 'none',
        zIndex: 100,
      }}
    >
      <button
        onClick={handleMinus}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: 14,
          color: '#555',
          padding: '0 4px',
          lineHeight: 1,
        }}
        aria-label="缩小"
      >
        −
      </button>
      <span
        onDoubleClick={handleDoubleClick}
        style={{ cursor: 'default', minWidth: 36, textAlign: 'center' }}
        title="双击重置为 100%"
      >
        {percent}%
      </span>
      <button
        onClick={handlePlus}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: 14,
          color: '#555',
          padding: '0 4px',
          lineHeight: 1,
        }}
        aria-label="放大"
      >
        +
      </button>
    </div>
  );
}
