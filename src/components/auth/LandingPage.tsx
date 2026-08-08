import { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useT } from '../../i18n/useT';
import logoSvg from '../../assets/logo.svg';

/**
 * LandingPage (v0.6).
 * Split-screen layout: left side for auth form, right side for brand visuals.
 * Reference: Sana AI landing page design (p3).
 */
export function LandingPage() {
  const t = useT();
  
  // Auth form state (inline, not modal)
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);
  const signInWithOAuth = useAuthStore((s) => s.signInWithOAuth);
  
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
    }
    // On success, user will be redirected by App.tsx automatically
  };
  
  const handleOAuth = async (provider: 'google' | 'github') => {
    setLoading(true);
    const { error: err } = await signInWithOAuth(provider);
    setLoading(false);
    if (err) setError(err);
  };
  
  const isSignUp = mode === 'signUp';

  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        background: '#FFFFFF',
        display: 'flex',
        overflow: 'hidden',
      }}
    >
      {/* Left side: Auth form */}
      <div
        style={{
          flex: 1,
          maxWidth: 480,
          padding: '60px 48px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          boxSizing: 'border-box',
        }}
      >
        {/* Logo + Tagline */}
        <div style={{ marginBottom: 48 }}>
          <img
            src={logoSvg}
            alt="Mind on Wall"
            style={{ width: 48, height: 48, marginBottom: 20 }}
          />
          <h1
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: '#1A1A1A',
              margin: 0,
              letterSpacing: '-0.5px',
              lineHeight: 1.2,
            }}
          >
            Welcome to Mind on Wall
          </h1>
          <p
            style={{
              fontSize: 16,
              color: '#666',
              marginTop: 12,
              marginBottom: 0,
              lineHeight: 1.5,
            }}
          >
            {t('auth.tagline') || 'Map your thoughts on a visual wall'}
          </p>
        </div>

        {/* Mode toggle */}
        <div style={{ fontSize: 14, color: '#666', marginBottom: 24 }}>
          {isSignUp ? t('auth.hasAccount') : t('auth.noAccount')}{' '}
          <span
            onClick={() => { setMode(isSignUp ? 'signIn' : 'signUp'); setError(null); }}
            style={{ color: '#4A90D9', cursor: 'pointer', fontWeight: 600 }}
          >
            {isSignUp ? t('auth.signIn') : t('auth.signUp')}
          </span>
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
        <label style={{ ...labelStyle, marginTop: 16 }}>{t('auth.password')}</label>
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
            <label style={{ ...labelStyle, marginTop: 16 }}>{t('auth.confirmPassword')}</label>
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
          <div style={{ fontSize: 12, color: '#C0392B', marginTop: 12 }}>
            {error}
          </div>
        )}

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%',
            marginTop: 24,
            padding: '12px 0',
            background: '#1A1A1A',
            color: '#FFF',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: loading ? 'wait' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? '…' : isSignUp ? t('auth.signUp') : t('auth.signIn')}
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0' }}>
          <div style={{ flex: 1, height: 1, background: '#E5E5E5' }} />
          <span style={{ fontSize: 12, color: '#999' }}>{t('auth.orContinueWith')}</span>
          <div style={{ flex: 1, height: 1, background: '#E5E5E5' }} />
        </div>

        {/* OAuth buttons */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => handleOAuth('google')} style={oauthBtnStyle}>
            <GoogleIcon /> Google
          </button>
          <button onClick={() => handleOAuth('github')} style={oauthBtnStyle}>
            <GitHubIcon /> GitHub
          </button>
        </div>
      </div>

      {/* Right side: Brand visuals */}
      <div
        style={{
          flex: 1,
          background: '#F5F5F3',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Rope connection illustration (SVG) */}
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 800 600"
          preserveAspectRatio="xMidYMid slice"
          style={{ position: 'absolute', inset: 0 }}
        >
          {/* Background subtle grid */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E0E0E0" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" opacity="0.3"/>
          
          {/* Rope connections - emphasizing the "map your thoughts" concept */}
          <g stroke="#C0392B" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.6">
            {/* Central hub */}
            <circle cx="400" cy="300" r="8" fill="#1A1A1A"/>
            
            {/* Ropes radiating out */}
            <path d="M 400 300 Q 350 250 300 200"/>
            <path d="M 400 300 Q 450 250 500 200"/>
            <path d="M 400 300 Q 350 350 300 400"/>
            <path d="M 400 300 Q 450 350 500 400"/>
            <path d="M 400 300 Q 400 250 400 150"/>
            <path d="M 400 300 Q 400 350 400 450"/>
            
            {/* End nodes */}
            <circle cx="300" cy="200" r="6" fill="#4A90D9"/>
            <circle cx="500" cy="200" r="6" fill="#4A90D9"/>
            <circle cx="300" cy="400" r="6" fill="#4A90D9"/>
            <circle cx="500" cy="400" r="6" fill="#4A90D9"/>
            <circle cx="400" cy="150" r="6" fill="#4A90D9"/>
            <circle cx="400" cy="450" r="6" fill="#4A90D9"/>
            
            {/* Secondary connections */}
            <path d="M 300 200 Q 250 180 200 150" stroke="#C0392B" strokeWidth="2" opacity="0.4"/>
            <path d="M 500 200 Q 550 180 600 150" stroke="#C0392B" strokeWidth="2" opacity="0.4"/>
            <path d="M 300 400 Q 250 420 200 450" stroke="#C0392B" strokeWidth="2" opacity="0.4"/>
            <path d="M 500 400 Q 550 420 600 450" stroke="#C0392B" strokeWidth="2" opacity="0.4"/>
            
            <circle cx="200" cy="150" r="5" fill="#4A90D9" opacity="0.7"/>
            <circle cx="600" cy="150" r="5" fill="#4A90D9" opacity="0.7"/>
            <circle cx="200" cy="450" r="5" fill="#4A90D9" opacity="0.7"/>
            <circle cx="600" cy="450" r="5" fill="#4A90D9" opacity="0.7"/>
          </g>
        </svg>
        
        {/* Overlay text */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            textAlign: 'center',
            color: '#1A1A1A',
          }}
        >
          <h2
            style={{
              fontSize: 48,
              fontWeight: 700,
              margin: 0,
              letterSpacing: '-1px',
              lineHeight: 1.2,
            }}
          >
            Map Your Thoughts
          </h2>
          <p
            style={{
              fontSize: 18,
              color: '#666',
              marginTop: 16,
              marginBottom: 0,
            }}
          >
            Connect ideas with ropes
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Shared styles ── */
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 500,
  color: '#555',
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  fontSize: 14,
  padding: '10px 12px',
  border: '1px solid #D0D0D0',
  borderRadius: 8,
  outline: 'none',
  transition: 'border-color 0.15s ease',
};

const oauthBtnStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  padding: '10px 0',
  background: '#FFFFFF',
  border: '1px solid #D0D0D0',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 500,
  color: '#333',
  cursor: 'pointer',
  transition: 'background 0.15s ease',
};

/* ── Inline SVG icons ── */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16">
      <path d="M15.68 8.18c0-.57-.05-1.11-.15-1.64H8v3.1h4.31a3.68 3.68 0 01-1.6 2.42v2.01h2.59c1.51-1.39 2.38-3.44 2.38-5.89z" fill="#4285F4"/>
      <path d="M8 16c2.16 0 3.97-.72 5.3-1.94l-2.59-2.01c-.72.48-1.63.77-2.71.77-2.08 0-3.84-1.4-4.47-3.29H.85v2.07A8 8 0 008 16z" fill="#34A853"/>
      <path d="M3.53 9.53a4.8 4.8 0 010-3.06V4.4H.85a8 8 0 000 7.2l2.68-2.07z" fill="#FBBC05"/>
      <path d="M8 3.18c1.17 0 2.23.4 3.06 1.19l2.3-2.3C11.97.77 10.16 0 8 0A8 8 0 00.85 4.4l2.68 2.07C4.16 4.58 5.92 3.18 8 3.18z" fill="#EA4335"/>
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="#333">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/>
    </svg>
  );
}
