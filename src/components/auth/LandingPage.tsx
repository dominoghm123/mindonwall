import { useState, useEffect } from 'react';
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

  // Three-stage animation: pin → rope → connections
  const [animStage, setAnimStage] = useState<0 | 1 | 2 | 3>(0);
  useEffect(() => {
    const t1 = setTimeout(() => setAnimStage(1), 200);   // objects appear → "Pin it."
    const t2 = setTimeout(() => setAnimStage(2), 2000);  // ropes start drawing → "Rope it."
    const t3 = setTimeout(() => setAnimStage(3), 6200);  // ropes done, connection map → "See the connections."
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <>
      <style>{landingObjStyle}</style>
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
            {t('auth.welcomeTitle')}
          </h1>
          <p
            style={{
              fontSize: 15,
              color: '#6B7280',
              marginTop: 12,
              marginBottom: 0,
              lineHeight: 1.5,
              fontStyle: 'italic',
            }}
          >
            {t('auth.tagline')}
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

        {/* GitHub star link */}
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <a
            href="https://github.com/dominoghm123/mindonwall"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 13,
              color: '#4A90D9',
              textDecoration: 'none',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => { (e.target as HTMLElement).style.textDecoration = 'underline'; }}
            onMouseLeave={(e) => { (e.target as HTMLElement).style.textDecoration = 'none'; }}
          >
            {t('auth.githubStar')}
          </a>
        </div>
      </div>

      {/* Right side: Brand visuals — collage wall */}
      <div
        style={{
          flex: 1,
          minWidth: 640,
          flexShrink: 0,
          background: '#F5F0E8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Paper texture */}
        <svg style={{ position: 'absolute', width: 0, height: 0 }}>
          <defs>
            <filter id="paperNoise">
              <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
              <feColorMatrix type="saturate" values="0" />
            </filter>
          </defs>
        </svg>
        <div style={{ position: 'absolute', inset: 0, filter: 'url(#paperNoise)', opacity: 0.03 }} />

        {/* Connection map glow overlay (stage 3) */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse at center, rgba(139,115,85,0.08) 0%, transparent 70%)',
            opacity: animStage >= 3 ? 1 : 0,
            transition: 'opacity 1.5s ease',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        {/* Collage canvas wrapper */}
        <div style={{ position: 'relative', width: 620, height: 440, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'relative', width: 1000, height: 680, transform: 'scale(0.58)', transformOrigin: 'center center', flexShrink: 0 }}>

          {/* ── PHOTOS (top center, prominent) ── */}
          {/* Photo 1 — Wat Chedi Luang */}
          <div className="landing-obj" style={{ position: 'absolute', left: 130, top: 40, transform: 'rotate(-3deg)', animationDelay: '0.1s' }}>
            <div style={{ width: 220, height: 155, borderRadius: 2, boxShadow: '0 6px 20px rgba(0,0,0,0.22)', overflow: 'hidden', background: '#EEE' }}>
              <img src="/demo-assets/north-01-wat-chedi-luang.jpg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
            <div style={{ position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)', width: 16, height: 16, borderRadius: '50%', background: '#FFF', border: '2.5px solid #BBB', boxShadow: '0 2px 6px rgba(0,0,0,0.35)', zIndex: 2 }} />
          </div>

          {/* Photo 2 — Khao Soi */}
          <div className="landing-obj" style={{ position: 'absolute', left: 390, top: 30, transform: 'rotate(2deg)', animationDelay: '0.2s' }}>
            <div style={{ width: 215, height: 150, borderRadius: 2, boxShadow: '0 6px 20px rgba(0,0,0,0.22)', overflow: 'hidden', background: '#EEE' }}>
              <img src="/demo-assets/north-02-khao-soi.jpg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
            <div style={{ position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)', width: 16, height: 16, borderRadius: '50%', background: '#FFF', border: '2.5px solid #BBB', boxShadow: '0 2px 6px rgba(0,0,0,0.35)', zIndex: 2 }} />
          </div>

          {/* Photo 3 — White Temple */}
          <div className="landing-obj" style={{ position: 'absolute', left: 660, top: 38, transform: 'rotate(-1.5deg)', animationDelay: '0.3s' }}>
            <div style={{ width: 218, height: 152, borderRadius: 2, boxShadow: '0 6px 20px rgba(0,0,0,0.22)', overflow: 'hidden', background: '#EEE' }}>
              <img src="/demo-assets/north-03-white-temple.jpg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
            <div style={{ position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)', width: 16, height: 16, borderRadius: '50%', background: '#FFF', border: '2.5px solid #BBB', boxShadow: '0 2px 6px rgba(0,0,0,0.35)', zIndex: 2 }} />
          </div>

          {/* ─ NOTES (scattered, natural) ── */}
          {/* Note 1 — left area */}
          <div className="landing-obj" style={{ position: 'absolute', left: 30, top: 270, transform: 'rotate(-3deg)', animationDelay: '0.45s' }}>
            <div style={{ width: 210, minHeight: 110, background: '#FFF', borderRadius: 2, boxShadow: '0 3px 12px rgba(0,0,0,0.12)', padding: '18px 20px', boxSizing: 'border-box' }}>
              <div style={{ fontSize: 15, color: '#333', fontFamily: 'Georgia, serif', lineHeight: 1.6, fontStyle: 'italic' }}>The quiet of Wat Chedi Luang makes me not want to leave</div>
            </div>
            <div style={{ position: 'absolute', top: -7, left: '50%', transform: 'translateX(-50%)', width: 14, height: 14, borderRadius: '50%', background: '#FFF', border: '2px solid #CCC', boxShadow: '0 2px 4px rgba(0,0,0,0.3)', zIndex: 2 }} />
          </div>

          {/* Note 2 — center-right */}
          <div className="landing-obj" style={{ position: 'absolute', left: 470, top: 255, transform: 'rotate(1.5deg)', animationDelay: '0.55s' }}>
            <div style={{ width: 200, minHeight: 105, background: '#FFF', borderRadius: 2, boxShadow: '0 3px 12px rgba(0,0,0,0.12)', padding: '18px 20px', boxSizing: 'border-box' }}>
              <div style={{ fontSize: 15, color: '#333', fontFamily: 'Georgia, serif', lineHeight: 1.6, fontStyle: 'italic' }}>Khao Soi — the soul curry noodles of Northern Thailand</div>
            </div>
            <div style={{ position: 'absolute', top: -7, left: '50%', transform: 'translateX(-50%)', width: 14, height: 14, borderRadius: '50%', background: '#FFF', border: '2px solid #CCC', boxShadow: '0 2px 4px rgba(0,0,0,0.3)', zIndex: 2 }} />
          </div>

          {/* ── STICKIES (scattered) ── */}
          {/* Sticky Yellow — right side */}
          <div className="landing-obj" style={{ position: 'absolute', left: 760, top: 220, transform: 'rotate(5deg)', animationDelay: '0.65s' }}>
            <div style={{ width: 160, height: 160, background: '#FFF9C4', borderRadius: 2, boxShadow: '0 3px 12px rgba(0,0,0,0.12)', padding: '20px', boxSizing: 'border-box' }}>
              <div style={{ fontSize: 16, color: '#5D4E37', fontFamily: 'Georgia, serif', fontStyle: 'italic', lineHeight: 1.5 }}>Must go back to Chiang Mai!</div>
            </div>
            <div style={{ position: 'absolute', top: -7, left: '50%', transform: 'translateX(-50%)', width: 14, height: 14, borderRadius: '50%', background: '#FFF', border: '2px solid #CCC', boxShadow: '0 2px 4px rgba(0,0,0,0.3)', zIndex: 2 }} />
          </div>

          {/* Sticky Green — center */}
          <div className="landing-obj" style={{ position: 'absolute', left: 270, top: 310, transform: 'rotate(-4deg)', animationDelay: '0.7s' }}>
            <div style={{ width: 155, height: 155, background: '#C8E6C9', borderRadius: 2, boxShadow: '0 3px 12px rgba(0,0,0,0.12)', padding: '20px', boxSizing: 'border-box' }}>
              <div style={{ fontSize: 15, color: '#3E5F3E', fontFamily: 'Georgia, serif', fontStyle: 'italic', lineHeight: 1.5 }}>First step in Thai: sawatdee</div>
            </div>
            <div style={{ position: 'absolute', top: -7, left: '50%', transform: 'translateX(-50%)', width: 14, height: 14, borderRadius: '50%', background: '#FFF', border: '2px solid #CCC', boxShadow: '0 2px 4px rgba(0,0,0,0.3)', zIndex: 2 }} />
          </div>

          {/* ── STAMPS (scattered, more visible) ── */}
          {/* Stamp 1 — left-center */}
          <div className="landing-obj" style={{ position: 'absolute', left: 180, top: 400, transform: 'rotate(-10deg)', animationDelay: '0.8s' }}>
            <img src="/demo-assets/stamps/stamp-red-passport.png" alt="" style={{ width: 110, height: 110, display: 'block' }} />
          </div>

          {/* Stamp 2 — right-center */}
          <div className="landing-obj" style={{ position: 'absolute', left: 620, top: 410, transform: 'rotate(8deg)', animationDelay: '0.85s' }}>
            <img src="/demo-assets/stamps/stamp-blue-travel.png" alt="" style={{ width: 105, height: 105, display: 'block' }} />
          </div>

          {/* ── TORN PAPERS (bottom, scattered) ── */}
          {/* Torn Paper 1 — far left */}
          <div className="landing-obj" style={{ position: 'absolute', left: 10, top: 470, transform: 'rotate(-5deg)', animationDelay: '0.9s' }}>
            <div style={{ width: 200, minHeight: 105, background: '#FAFAFA', borderRadius: 2, boxShadow: '0 3px 12px rgba(0,0,0,0.12)', padding: '18px 20px', boxSizing: 'border-box' }}>
              <div style={{ fontSize: 15, color: '#333', fontFamily: 'Georgia, serif', lineHeight: 1.5, fontStyle: 'italic' }}>Rainbow after rain at Siam Square</div>
            </div>
            <div style={{ position: 'absolute', top: -7, left: '50%', transform: 'translateX(-50%)', width: 14, height: 14, borderRadius: '50%', background: '#FFF', border: '2px solid #CCC', boxShadow: '0 2px 4px rgba(0,0,0,0.3)', zIndex: 2 }} />
          </div>

          {/* Torn Paper 2 — center */}
          <div className="landing-obj" style={{ position: 'absolute', left: 310, top: 490, transform: 'rotate(3.5deg)', animationDelay: '0.95s' }}>
            <div style={{ width: 195, minHeight: 100, background: '#FAFAFA', borderRadius: 2, boxShadow: '0 3px 12px rgba(0,0,0,0.12)', padding: '18px 20px', boxSizing: 'border-box' }}>
              <div style={{ fontSize: 15, color: '#333', fontFamily: 'Georgia, serif', lineHeight: 1.5, fontStyle: 'italic' }}>Can not stop buying samples at 7-11</div>
            </div>
            <div style={{ position: 'absolute', top: -7, left: '50%', transform: 'translateX(-50%)', width: 14, height: 14, borderRadius: '50%', background: '#FFF', border: '2px solid #CCC', boxShadow: '0 2px 4px rgba(0,0,0,0.3)', zIndex: 2 }} />
          </div>

          {/* Torn Paper 3 — right */}
          <div className="landing-obj" style={{ position: 'absolute', left: 580, top: 480, transform: 'rotate(-3deg)', animationDelay: '1.0s' }}>
            <div style={{ width: 198, minHeight: 105, background: '#FAFAFA', borderRadius: 2, boxShadow: '0 3px 12px rgba(0,0,0,0.12)', padding: '18px 20px', boxSizing: 'border-box' }}>
              <div style={{ fontSize: 15, color: '#333', fontFamily: 'Georgia, serif', lineHeight: 1.5, fontStyle: 'italic' }}>Thai people take fragrance to the extreme</div>
            </div>
            <div style={{ position: 'absolute', top: -7, left: '50%', transform: 'translateX(-50%)', width: 14, height: 14, borderRadius: '50%', background: '#FFF', border: '2px solid #CCC', boxShadow: '0 2px 4px rgba(0,0,0,0.3)', zIndex: 2 }} />
          </div>

          {/* ─ TITLE NOTE (bottom center) ── */}
          <div className="landing-obj" style={{ position: 'absolute', left: 370, top: 555, transform: 'rotate(1deg)', animationDelay: '1.05s' }}>
            <div style={{ width: 230, minHeight: 100, background: '#FFF', borderRadius: 2, boxShadow: '0 3px 12px rgba(0,0,0,0.12)', padding: '18px 20px', boxSizing: 'border-box' }}>
              <div style={{ fontSize: 16, color: '#333', fontFamily: 'Georgia, serif', lineHeight: 1.5, fontWeight: 600 }}>Thailand Trip — Chiang Mai & Bangkok</div>
            </div>
            <div style={{ position: 'absolute', top: -7, left: '50%', transform: 'translateX(-50%)', width: 14, height: 14, borderRadius: '50%', background: '#FFF', border: '2px solid #CCC', boxShadow: '0 2px 4px rgba(0,0,0,0.3)', zIndex: 2 }} />
          </div>

          {/* ── ROPE CONNECTIONS (Pin-to-Pin, viewBox matches canvas 1000×680) ── */}
          <svg
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}
            viewBox="0 0 1000 680"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Rope 1: Photo1(240,40) → Note1(135,320) */}
            <path d="M 240 40 Q 180 170 135 320" stroke="#8B7355" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeDasharray="340" strokeDashoffset="340" opacity="0.55">
              <animate attributeName="stroke-dashoffset" from="340" to="0" dur="1.5s" fill="freeze" begin="2.0s" />
            </path>
            {/* Rope 2: Photo2(498,30) → Note2(570,302) */}
            <path d="M 498 30 Q 530 160 570 302" stroke="#8B7355" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeDasharray="330" strokeDashoffset="330" opacity="0.55">
              <animate attributeName="stroke-dashoffset" from="330" to="0" dur="1.5s" fill="freeze" begin="2.3s" />
            </path>
            {/* Rope 3: Photo3(769,38) → StickyYellow(840,372) */}
            <path d="M 769 38 Q 810 190 840 372" stroke="#8B7355" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeDasharray="380" strokeDashoffset="380" opacity="0.55">
              <animate attributeName="stroke-dashoffset" from="380" to="0" dur="1.6s" fill="freeze" begin="2.6s" />
            </path>
            {/* Rope 4: Note1(135,320) → TornPaper1(110,517) */}
            <path d="M 135 320 Q 115 410 110 517" stroke="#8B7355" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeDasharray="260" strokeDashoffset="260" opacity="0.45">
              <animate attributeName="stroke-dashoffset" from="260" to="0" dur="1.3s" fill="freeze" begin="2.9s" />
            </path>
            {/* Rope 5: Note2(570,302) → StickyGreen(348,382) */}
            <path d="M 570 302 Q 470 330 348 382" stroke="#8B7355" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeDasharray="280" strokeDashoffset="280" opacity="0.45">
              <animate attributeName="stroke-dashoffset" from="280" to="0" dur="1.4s" fill="freeze" begin="3.2s" />
            </path>
            {/* Rope 6: StickyGreen(348,458) → TornPaper2(408,533) */}
            <path d="M 348 458 Q 370 495 408 533" stroke="#8B7355" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeDasharray="120" strokeDashoffset="120" opacity="0.45">
              <animate attributeName="stroke-dashoffset" from="120" to="0" dur="0.9s" fill="freeze" begin="3.5s" />
            </path>

            {/* Rope 7: TitleNote(485,648) → Photo2(498,30) — long cross connection */}
            <path d="M 485 648 Q 520 380 498 30" stroke="#8B7355" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeDasharray="680" strokeDashoffset="680" opacity="0.35">
              <animate attributeName="stroke-dashoffset" from="680" to="0" dur="2.0s" fill="freeze" begin="3.8s" />
            </path>
          </svg>

          {/* ── CONNECTION MAP NODE OVERLAY (stage 3) ── */}
          <svg
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2, opacity: animStage >= 3 ? 1 : 0, transition: 'opacity 2s ease' }}
            viewBox="0 0 1000 680"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Grid pattern */}
            <defs>
              <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(139,115,85,0.04)" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="1000" height="680" fill="url(#grid)" />

            {/* Glow at each pin position */}
            {[
              [240, 40], [498, 30], [769, 38],
              [135, 320], [570, 302],
              [840, 372], [348, 382],
              [110, 517], [408, 533], [679, 527],
              [485, 648],
            ].map(([cx, cy], i) => (
              <g key={`node-${i}`}>
                <circle cx={cx} cy={cy} r="20" fill="rgba(139,115,85,0.06)">
                  <animate attributeName="r" values="16;24;16" dur="3s" repeatCount="indefinite" begin={`${i * 0.2}s`} />
                  <animate attributeName="opacity" values="0.4;0.8;0.4" dur="3s" repeatCount="indefinite" begin={`${i * 0.2}s`} />
                </circle>
                <circle cx={cx} cy={cy} r="5" fill="rgba(139,115,85,0.25)" />
              </g>
            ))}
          </svg>
        </div>
        </div>

        {/* Three-stage tagline — dramatic, cinematic */}
        <div style={{ position: 'absolute', bottom: 36, left: 0, right: 0, textAlign: 'center', zIndex: 10 }}>
          <p style={{ fontSize: 30, color: '#5D4E37', margin: 0, fontFamily: 'Georgia, serif', fontStyle: 'italic', letterSpacing: '2px', fontWeight: 600, opacity: animStage >= 1 ? 1 : 0, transform: animStage >= 1 ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.95)', transition: 'opacity 0.8s ease, transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
            Pin it.
          </p>
          <p style={{ fontSize: 30, color: '#5D4E37', margin: '6px 0 0', fontFamily: 'Georgia, serif', fontStyle: 'italic', letterSpacing: '2px', fontWeight: 600, opacity: animStage >= 2 ? 1 : 0, transform: animStage >= 2 ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.95)', transition: 'opacity 0.8s ease, transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
            Rope it.
          </p>
          <p style={{ fontSize: 30, color: '#5D4E37', margin: '6px 0 0', fontFamily: 'Georgia, serif', fontStyle: 'italic', letterSpacing: '2px', fontWeight: 600, opacity: animStage >= 3 ? 1 : 0, transform: animStage >= 3 ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.95)', transition: 'opacity 1.2s ease, transform 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
            See the connections.
          </p>
        </div>
      </div>
    </div>
    </>
  );
}

/* ── Landing page entrance animations ── */
const landingObjStyle = `
  .landing-obj {
    animation: objFadeIn 0.6s ease-out both;
  }
  @keyframes objFadeIn {
    from { opacity: 0; transform: translateY(12px) scale(0.96); }
    to   { opacity: 1; }
  }
`;

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
