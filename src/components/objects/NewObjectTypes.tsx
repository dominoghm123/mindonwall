import { useRef, useCallback, useState } from 'react';
import type { Item } from '../../store/types';
import { useAssetStore } from '../../store/useAssetStore';

/**
 * 新增物件类型渲染组件（v0.7 Phase 2）
 * - MdObject: Markdown 文档预览
 * - AudioObject: 音频播放器
 * - VideoObject: 视频播放器
 */

/* ─── Markdown 文档物件 ─── */
export function MdObject({ item }: { item: Item }) {
  const ref = useRef<HTMLDivElement>(null);
  const ratio = Math.max(0.5, item.width / 200);

  const handleBlur = useCallback(() => {
    if (ref.current) {
      // TODO: 调用 onTextChange 保存内容
    }
  }, []);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#FFFFFF',
        border: '1px solid #E3DED2',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        borderRadius: 4,
        padding: 16 * ratio,
        boxSizing: 'border-box',
        overflow: 'auto',
      }}
    >
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onBlur={handleBlur}
        style={{
          width: '100%',
          height: '100%',
          outline: 'none',
          fontFamily: '"LXGW WenKai", "Caveat", cursive, sans-serif',
          fontSize: Math.max(9, 14 * ratio),
          lineHeight: 1.6,
          color: '#333',
          wordBreak: 'break-word',
        }}
      >
        {item.text ?? '# Markdown Document\n\nStart writing here...'}
      </div>
    </div>
  );
}

/* ─── 颜色工具：audio 卡片按 item.color 派生渐变与前景色（v0.8 debug） ─── */
function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** 把 hex 颜色向目标色混合 amount 比例（0-1） */
function mixHex(hex: string, target: string, amount: number): string {
  const a = hexToRgb(hex);
  const b = hexToRgb(target);
  if (!a || !b) return hex;
  return (
    '#' +
    a
      .map((v, i) => Math.round(v + (b[i] - v) * amount))
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
  );
}

/** 感知亮度判断（用于前景色自适应） */
function isLightColor(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  return 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2] > 160;
}

/* ─── 音频物件（v0.7：真实播放） ─── */
export function AudioObject({ item }: { item: Item }) {
  const ratio = Math.max(0.5, item.width / 160);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const src = item.assetId ? `/demo-assets/${item.assetId}.wav` : undefined;

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().catch(() => {});
      setPlaying(true);
    }
  }, [playing]);

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    setProgress(audio.currentTime / audio.duration);
  }, []);

  const handleEnded = useCallback(() => {
    setPlaying(false);
    setProgress(0);
  }, []);

  /* v0.8：右键改色生效 —— 有 item.color 时派生渐变 + 前景色自适应 */
  const colored = !!item.color && /^#[0-9a-fA-F]{6}$/.test(item.color);
  const base = colored ? (item.color as string) : null;
  const light = !!base && isLightColor(base);
  const bg = base
    ? `linear-gradient(135deg, ${mixHex(base, '#FFFFFF', 0.22)} 0%, ${base} 100%)`
    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
  const fg = light ? '#3D3D3D' : '#FFFFFF';
  const btnIdle = light ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.2)';
  const btnActive = light ? 'rgba(0,0,0,0.16)' : 'rgba(255,255,255,0.35)';
  const trackBg = light ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)';
  const fillBg = light ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.7)';
  const shadow = base ? `0 4px 12px ${base}4D` : '0 4px 12px rgba(102, 126, 234, 0.3)';

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: bg,
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12 * ratio,
        boxSizing: 'border-box',
        boxShadow: shadow,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Hidden audio element */}
      {src && (
        <audio
          ref={audioRef}
          src={src}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          preload="metadata"
        />
      )}

      {/* 音频图标 */}
      <svg width={28 * ratio} height={28 * ratio} viewBox="0 0 24 24" fill="none" style={{ marginBottom: 6 * ratio }}>
        <path d="M9 18V5l12-2v13" stroke={fg} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="6" cy="18" r="3" stroke={fg} strokeWidth="2"/>
        <circle cx="18" cy="16" r="3" stroke={fg} strokeWidth="2"/>
      </svg>

      {/* 标题 */}
      <div style={{ color: fg, fontSize: 11 * ratio, fontWeight: 600, textAlign: 'center', marginBottom: 8 * ratio }}>
        {item.text ?? 'Audio Note'}
      </div>

      {/* 播放按钮 */}
      <button
        onClick={(e) => { e.stopPropagation(); togglePlay(); }}
        style={{
          width: 32 * ratio,
          height: 32 * ratio,
          borderRadius: '50%',
          background: playing ? btnActive : btnIdle,
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          transition: 'background 0.2s',
        }}
      >
        {playing ? (
          <svg width={14 * ratio} height={14 * ratio} viewBox="0 0 24 24" fill={fg}>
            <rect x="6" y="4" width="4" height="16" rx="1"/>
            <rect x="14" y="4" width="4" height="16" rx="1"/>
          </svg>
        ) : (
          <svg width={14 * ratio} height={14 * ratio} viewBox="0 0 24 24" fill={fg}>
            <path d="M8 5v14l11-7z"/>
          </svg>
        )}
      </button>

      {/* 进度条 */}
      {src && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          maxWidth: '100%',
          height: 3 * ratio,
          background: trackBg,
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${Math.min(progress, 1) * 100}%`,
            height: '100%',
            background: fillBg,
            transition: 'width 0.1s linear',
          }} />
        </div>
      )}
    </div>
  );
}

/* ─── 视频物件（v0.8：真实播放 + item.color 改色） ─── */
export function VideoObject({ item }: { item: Item }) {
  const ratio = Math.max(0.5, item.width / 200);
  const assets = useAssetStore((s) => s.assets);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  /* 用户上传素材优先（dataUrl），其次 demo 素材路径（同 PictureObject） */
  const userAsset = item.assetId ? assets.find((a) => a.id === item.assetId) : undefined;
  const src = userAsset?.dataUrl ?? (item.assetId ? `/demo-assets/${item.assetId}.mp4` : undefined);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video || !src) return;
    if (playing) {
      video.pause();
    } else {
      video.play().catch(() => {});
    }
  }, [playing, src]);

  /* v0.8：右键改色生效 —— 有 item.color 时派生渐变 + 前景色自适应（同 AudioObject） */
  const colored = !!item.color && /^#[0-9a-fA-F]{6}$/.test(item.color);
  const base = colored ? (item.color as string) : null;
  const light = !!base && isLightColor(base);
  const bg = base
    ? `linear-gradient(135deg, ${mixHex(base, '#FFFFFF', 0.22)} 0%, ${base} 100%)`
    : '#1A1A1A';
  const shadow = base ? `0 4px 12px ${base}4D` : '0 4px 16px rgba(0,0,0,0.3)';
  const overlayBtn = light ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.9)';
  const overlayIcon = light ? '#FFFFFF' : '#333333';
  const titleColor = light ? '#3D3D3D' : '#FFFFFF';
  const titleShadow = light ? 'none' : '0 1px 2px rgba(0,0,0,0.8)';

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: bg,
        borderRadius: 8,
        boxShadow: shadow,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {src ? (
        <>
          <video
            ref={videoRef}
            src={src}
            preload="metadata"
            playsInline
            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              cursor: 'pointer',
            }}
          />
          {/* 暂停时叠加播放按钮 */}
          {!playing && (
            <div
              onClick={(e) => { e.stopPropagation(); togglePlay(); }}
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0,0,0,0.15)',
                cursor: 'pointer',
              }}
            >
              <div style={{
                width: 48 * ratio,
                height: 48 * ratio,
                borderRadius: '50%',
                background: overlayBtn,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}>
                <svg width={20 * ratio} height={20 * ratio} viewBox="0 0 24 24" fill={overlayIcon}>
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </div>
            </div>
          )}
        </>
      ) : (
        /* 无素材占位（沿用原样式，颜色跟随 item.color） */
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            width: 48 * ratio,
            height: 48 * ratio,
            borderRadius: '50%',
            background: overlayBtn,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}>
            <svg width={20 * ratio} height={20 * ratio} viewBox="0 0 24 24" fill={overlayIcon}>
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </div>
      )}

      {/* 标题 */}
      {item.text && (
        <div style={{
          position: 'absolute',
          bottom: 8 * ratio,
          left: 8 * ratio,
          right: 8 * ratio,
          color: titleColor,
          fontSize: 11 * ratio,
          fontWeight: 500,
          zIndex: 1,
          textShadow: titleShadow,
          pointerEvents: 'none',
        }}>
          {item.text}
        </div>
      )}
    </div>
  );
}
