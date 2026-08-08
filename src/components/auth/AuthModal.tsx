import { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useT } from '../../i18n/useT';

type Mode = 'signIn' | 'signUp';

/**
 * Auth modal (v0.5).
 * Email + password login/register with OAuth buttons.
 * Follows existing visual convention: white bg + 1px border + 8px radius.
 */
export function AuthModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);
  const signInWithOAuth = useAuthStore((s) => s.signInWithOAuth);
  const t = useT();

  const handleSubmit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Email and password are required');
      return;
    }
    if (mode === 'signUp' && password !== confirmPw) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    const { error: err } =
      mode === 'signIn'
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password);
    setLoading(false);
    if (err) {
      setError(err);
    } else {
      onClose();
    }
  };

  const handleOAuth = async (provider: 'google' | 'github') => {
    setLoading(true);
    const { error: err } = await signInWithOAuth(provider);
    setLoading(false);
    if (err) setError(err);
    // OAuth redirects, no onClose needed
  };

  const isSignUp = mode === 'signUp';

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
    >
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E0E0E0',
          borderRadius: 10,
          padding: '28px 24px',
          width: 340,
          boxSizing: 'border-box',
        }}
      >
        {/* Title */}
        <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A', marginBottom: 20 }}>
          {isSignUp ? t('auth.signUp') : t('auth.signIn')}
        </div>

        {/* Email */}
        <label style={labelStyle}>{t('auth.email')}</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
          style={inputStyle}
          placeholder="you@example.com"
          autoFocus
        />

        {/* Password */}
        <label style={{ ...labelStyle, marginTop: 12 }}>{t('auth.password')}</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
          style={inputStyle}
        />

        {/* Confirm password (sign up only) */}
        {isSignUp && (
          <>
            <label style={{ ...labelStyle, marginTop: 12 }}>{t('auth.confirmPassword')}</label>
            <input
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
              style={inputStyle}
            />
          </>
        )}

        {/* Error */}
        {error && (
          <div style={{ fontSize: 12, color: '#C0392B', marginTop: 10 }}>
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%',
            marginTop: 18,
            padding: '9px 0',
            background: '#1A1A1A',
            color: '#FFF',
            border: 'none',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            cursor: loading ? 'wait' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? '…' : isSignUp ? t('auth.signUp') : t('auth.signIn')}
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0' }}>
          <div style={{ flex: 1, height: 1, background: '#E5E5E5' }} />
          <span style={{ fontSize: 11, color: '#999' }}>{t('auth.orContinueWith')}</span>
          <div style={{ flex: 1, height: 1, background: '#E5E5E5' }} />
        </div>

        {/* OAuth buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => handleOAuth('google')} style={oauthBtnStyle}>
            <GoogleIcon /> Google
          </button>
          <button onClick={() => handleOAuth('github')} style={oauthBtnStyle}>
            <GitHubIcon /> GitHub
          </button>
        </div>

        {/* Toggle mode */}
        <div style={{ marginTop: 20, fontSize: 12, color: '#666', textAlign: 'center' }}>
          {isSignUp ? t('auth.hasAccount') : t('auth.noAccount')}{' '}
          <span
            onClick={() => { setMode(isSignUp ? 'signIn' : 'signUp'); setError(null); }}
            style={{ color: '#4A90D9', cursor: 'pointer', fontWeight: 600 }}
          >
            {isSignUp ? t('auth.signIn') : t('auth.signUp')}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Shared styles ── */
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 500,
  color: '#555',
  marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  fontSize: 13,
  padding: '8px 10px',
  border: '1px solid #D0D0D0',
  borderRadius: 6,
  outline: 'none',
};

const oauthBtnStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  padding: '8px 0',
  background: '#FFFFFF',
  border: '1px solid #D0D0D0',
  borderRadius: 6,
  fontSize: 12,
  fontWeight: 500,
  color: '#333',
  cursor: 'pointer',
};

/* ── Inline SVG icons ── */
function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path d="M15.68 8.18c0-.57-.05-1.11-.15-1.64H8v3.1h4.31a3.68 3.68 0 01-1.6 2.42v2.01h2.59c1.51-1.39 2.38-3.44 2.38-5.89z" fill="#4285F4"/>
      <path d="M8 16c2.16 0 3.97-.72 5.3-1.94l-2.59-2.01c-.72.48-1.63.77-2.71.77-2.08 0-3.84-1.4-4.47-3.29H.85v2.07A8 8 0 008 16z" fill="#34A853"/>
      <path d="M3.53 9.53a4.8 4.8 0 010-3.06V4.4H.85a8 8 0 000 7.2l2.68-2.07z" fill="#FBBC05"/>
      <path d="M8 3.18c1.17 0 2.23.4 3.06 1.19l2.3-2.3C11.97.77 10.16 0 8 0A8 8 0 00.85 4.4l2.68 2.07C4.16 4.58 5.92 3.18 8 3.18z" fill="#EA4335"/>
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="#333">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/>
    </svg>
  );
}
