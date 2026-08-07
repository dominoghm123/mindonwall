import { useEffect, useRef, useState } from 'react';
import { useUIStore } from '../../store/useUIStore';
import { useOverviewStore } from '../../store/useOverviewStore';

/**
 * 头像入口（v0.2）。
 * 28px 圆形头像，点击弹出下拉菜单：Profile / Materials / Settings。
 * 用于内页 TopBar 与总览页顶栏最右侧。
 */
export function AvatarMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const openPage = useUIStore((s) => s.openPage);
  const userName = useOverviewStore((s) => s.userName);

  // 点击外部 / Esc 关闭
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  const items = [
    { key: 'profile', label: 'Profile', desc: 'Your home page' },
    { key: 'materials', label: 'Materials', desc: 'Your material library' },
    { key: 'settings', label: 'Settings', desc: 'Home background & more' },
  ];

  const handleAction = (key: string) => {
    setOpen(false);
    // v0.3 P3：打开全屏用户页面
    openPage(key as 'profile' | 'materials' | 'settings');
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* 头像（28px 圆形，昵称首字母） */}
      <div
        title={userName}
        onClick={() => setOpen((o) => !o)}
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: '#F0F0F0',
          border: open ? '1px solid #4A90D9' : '1px solid #E0E0E0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 700,
          color: '#666',
          cursor: 'pointer',
          boxSizing: 'border-box',
        }}
      >
        {(userName.trim()[0] ?? 'U').toUpperCase()}
      </div>

      {/* 下拉菜单 */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 34,
            right: 0,
            minWidth: 200,
            background: '#FFFFFF',
            border: '1px solid #E0E0E0',
            borderRadius: 8,
            padding: '4px 0',
            zIndex: 9999,
            userSelect: 'none',
          }}
        >
          {items.map((it) => (
            <div
              key={it.key}
              onClick={() => handleAction(it.key)}
              style={{
                padding: '8px 14px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = '#F5F5F5';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = 'transparent';
              }}
            >
              <span style={{ fontSize: 13, color: '#333' }}>{it.label}</span>
              <span style={{ fontSize: 10, color: '#999' }}>{it.desc}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
