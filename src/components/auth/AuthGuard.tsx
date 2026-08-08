import { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useT } from '../../i18n/useT';
import { AuthModal } from './AuthModal';

/**
 * AuthGuard (v0.5).
 * Wraps children that require authentication.
 * When user is not logged in, shows a gentle prompt overlay.
 * When auth is not configured (no Supabase env), renders children directly.
 */
export function AuthGuard({
  children,
  fallback,
}: {
  children: React.ReactNode;
  /** Optional custom fallback UI when unauthenticated */
  fallback?: React.ReactNode;
}) {
  const user = useAuthStore((s) => s.user);
  const isAuthEnabled = useAuthStore((s) => s.isAuthEnabled);
  const [showModal, setShowModal] = useState(false);
  const t = useT();

  // Auth not configured → pass through (guest mode)
  if (!isAuthEnabled) return <>{children}</>;

  // Logged in → render normally
  if (user) return <>{children}</>;

  // Not logged in → show prompt
  if (fallback) return <>{fallback}</>;

  return (
    <>
      <div
        onClick={() => setShowModal(true)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 14px',
          background: '#FFFFFF',
          border: '1px solid #D0D0D0',
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 500,
          color: '#555',
          cursor: 'pointer',
        }}
      >
        <LockIcon />
        {t('auth.authRequired')}
      </div>
      {showModal && <AuthModal onClose={() => setShowModal(false)} />}
    </>
  );
}

/**
 * useAuthGuard hook — returns whether user is authenticated
 * and a function to trigger the auth modal.
 */
export function useAuthGuard() {
  const user = useAuthStore((s) => s.user);
  const isAuthEnabled = useAuthStore((s) => s.isAuthEnabled);
  const [showModal, setShowModal] = useState(false);

  const requireAuth = (): boolean => {
    if (!isAuthEnabled) return true; // no auth = allow all
    if (user) return true;
    setShowModal(true);
    return false;
  };

  return {
    isAuthenticated: !isAuthEnabled || !!user,
    requireAuth,
    modal: showModal ? <AuthModal onClose={() => setShowModal(false)} /> : null,
  };
}

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="2" y="6" width="10" height="7" rx="1.5" stroke="#888" strokeWidth="1.2" />
      <path d="M4.5 6V4a2.5 2.5 0 015 0v2" stroke="#888" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
