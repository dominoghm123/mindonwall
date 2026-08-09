import { useRef, useCallback, useState } from 'react';
import type { Item } from '../../store/types';

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

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12 * ratio,
        boxSizing: 'border-box',
        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
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
        <path d="M9 18V5l12-2v13" stroke="#FFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="6" cy="18" r="3" stroke="#FFF" strokeWidth="2"/>
        <circle cx="18" cy="16" r="3" stroke="#FFF" strokeWidth="2"/>
      </svg>

      {/* 标题 */}
      <div style={{ color: '#FFF', fontSize: 11 * ratio, fontWeight: 600, textAlign: 'center', marginBottom: 8 * ratio }}>
        {item.text ?? 'Audio Note'}
      </div>

      {/* 播放按钮 */}
      <button
        onClick={(e) => { e.stopPropagation(); togglePlay(); }}
        style={{
          width: 32 * ratio,
          height: 32 * ratio,
          borderRadius: '50%',
          background: playing ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.2)',
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
          <svg width={14 * ratio} height={14 * ratio} viewBox="0 0 24 24" fill="#FFF">
            <rect x="6" y="4" width="4" height="16" rx="1"/>
            <rect x="14" y="4" width="4" height="16" rx="1"/>
          </svg>
        ) : (
          <svg width={14 * ratio} height={14 * ratio} viewBox="0 0 24 24" fill="#FFF">
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
          background: 'rgba(255,255,255,0.15)',
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${Math.min(progress, 1) * 100}%`,
            height: '100%',
            background: 'rgba(255,255,255,0.7)',
            transition: 'width 0.1s linear',
          }} />
        </div>
      )}
    </div>
  );
}

/* ─── 视频物件 ─── */
export function VideoObject({ item }: { item: Item }) {
  const ratio = Math.max(0.5, item.width / 200);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#1A1A1A',
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* 视频缩略图背景（如果有 assetId） */}
      {item.assetId && (
        <div style={{ position: 'absolute', inset: 0, background: '#333', opacity: 0.5 }} />
      )}
      
      {/* 播放按钮 */}
      <div style={{ 
        width: 48 * ratio, 
        height: 48 * ratio, 
        borderRadius: '50%', 
        background: 'rgba(255,255,255,0.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        zIndex: 1,
      }}>
        <svg width={20 * ratio} height={20 * ratio} viewBox="0 0 24 24" fill="#333">
          <path d="M8 5v14l11-7z"/>
        </svg>
      </div>
      
      {/* 标题 */}
      {item.text && (
        <div style={{ 
          position: 'absolute',
          bottom: 8 * ratio,
          left: 8 * ratio,
          right: 8 * ratio,
          color: '#FFF',
          fontSize: 11 * ratio,
          fontWeight: 500,
          zIndex: 1,
          textShadow: '0 1px 2px rgba(0,0,0,0.8)',
        }}>
          {item.text}
        </div>
      )}
    </div>
  );
}
