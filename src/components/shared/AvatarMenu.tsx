import { useEffect, useRef, useState } from 'react';
import { useUIStore } from '../../store/useUIStore';
import { useOverviewStore } from '../../store/useOverviewStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useT } from '../../i18n/useT';

/**
 * 头像入口（v0.2）。
 * 28px 圆形头像，点击弹出下拉菜单：Profile / Materials / Settings。
 * 用于内页 TopBar 与总览页顶栏最右侧。
 */
export function AvatarMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const openPage = useUIStore((s) => s.openPage);
  const setShowAuthModal = useUIStore((s) => s.setShowAuthModal);
  const userName = useOverviewStore((s) => s.userName);
  const avatarDataUrl = useOverviewStore((s) => s.avatarDataUrl);
  const user = useAuthStore((s) => s.user);
  const isAuthEnabled = useAuthStore((s) => s.isAuthEnabled);
  const signOut = useAuthStore((s) => s.signOut);
  const t = useT();

  const isLoggedIn = !!user;

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

  // v0.5: Build items based on auth state
  const items = [
    { key: 'materials', label: t('av.library'), desc: t('av.libraryDesc') },
    { key: 'settings', label: t('av.settings'), desc: t('av.settingsDesc') },
    ...(isLoggedIn ? [{ key: 'signOut', label: t('auth.signOut'), desc: '' }] : []),
  ];

  const handleAction = async (key: string) => {
    setOpen(false);
    if (key === 'signOut') {
      await signOut();
      return;
    }
    // v0.3 r2：打开全屏用户页面
    openPage(key as 'materials' | 'settings');
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {isAuthEnabled && !isLoggedIn ? (
        /* v0.5: 未登录 → Sign In 按钮 */
        <button
          onClick={() => setShowAuthModal(true)}
          style={{
            height: 28,
            padding: '0 12px',
            background: '#1A1A1A',
            color: '#FFF',
            border: 'none',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {t('auth.signIn')}
        </button>
      ) : (
        /* 已登录/未配置auth → 圆形头像 */
        <div
          title={isLoggedIn ? (user.email ?? userName) : userName}
          onClick={() => setOpen((o) => !o)}
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: avatarDataUrl ? `center/cover no-repeat url("${avatarDataUrl}")` : '#F0F0F0',
            border: open ? '1px solid #4A90D9' : '1px solid #E0E0E0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 700,
            color: '#666',
            cursor: 'pointer',
            boxSizing: 'border-box',
            overflow: 'hidden',
          }}
        >
          {avatarDataUrl ? null : (userName.trim()[0] ?? 'U').toUpperCase()}
        </div>
      )}

      {/* 下拉菜单 */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 34,
            right: 0,
            minWidth: 200,
            background: '#FFFFFF',
            border: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)',
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
