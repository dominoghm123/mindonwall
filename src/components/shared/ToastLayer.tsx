import { useUIStore } from '../../store/useUIStore';

/**
 * Toast 消息渲染层（v0.2）。
 * 底部居中堆叠，纯白 + 1px border，无阴影，自动消失。
 */
export function ToastLayer() {
  const toasts = useUIStore((s) => s.toasts);
  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 96,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        zIndex: 2000,
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            background: '#FFFFFF',
            border: '1px solid #E5E5E5',
            borderRadius: 8,
            padding: '6px 14px',
            fontSize: 12,
            color: t.type === 'error' ? '#C0392B' : t.type === 'success' ? '#2E7D32' : '#555',
            whiteSpace: 'nowrap',
          }}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
