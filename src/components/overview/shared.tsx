import { useEffect, useRef, useState } from 'react';
import { useOverviewStore } from '../../store/useOverviewStore';
import { getWallpaperStyle } from '../../utils/wallpaperCSS';
import type { WallSummary } from '../../store/types';
import { useT } from '../../i18n/useT';
import { track } from '../../utils/analytics';

/**
 * v0.8: Spaces 两级交互共享组件。
 * L1（OverviewPage）与 L2（SpaceDetailPage）共用的卡片、菜单与弹窗。
 */

/** Space 标签色预设（写入已存在的 Space.color 字段） */
export const SPACE_COLORS = ['#2E7D32', '#4A90D9', '#EAB308', '#A855F7', '#EF4444', '#6B7280'];

/** Uncategorized 固定 ID（store 约定） */
export const UNCATEGORIZED_ID = 'space-uncategorized';

/* ─── 色点行（预设色点 + 可选自定义调色盘） ─── */
export function ColorDots({
  colors,
  current,
  size = 20,
  onSelect,
  withPicker = false,
}: {
  colors: string[];
  current?: string;
  size?: number;
  onSelect: (color: string) => void;
  withPicker?: boolean;
}) {
  const t = useT();
  const pickerValue = /^#[0-9a-fA-F]{6}$/.test(current ?? '') ? current : '#FFFFFF';
  return (
    <div style={{ display: 'flex', gap: size > 16 ? 6 : 5, alignItems: 'center', flexWrap: 'wrap' }}>
      {colors.map((c) => (
        <div
          key={c}
          title={c}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(c);
          }}
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            background: c,
            border: current === c ? '2px solid #4A90D9' : '1px solid #DDD',
            cursor: 'pointer',
            boxSizing: 'border-box',
          }}
        />
      ))}
      {withPicker && (
        <label
          title={t('ctx.customColor')}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            border: '1px dashed #BBB',
            cursor: 'pointer',
            position: 'relative',
            background: 'conic-gradient(#EF4444, #EAB308, #22C55E, #3B82F6, #A855F7, #EF4444)',
          }}
        >
          <input
            type="color"
            value={pickerValue}
            onChange={(e) => onSelect(e.target.value)}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: 'pointer',
            }}
          />
        </label>
      )}
    </div>
  );
}

/* ─── 墙卡片（v0.8: 移除拖拽属性，点击/右键交互保留） ─── */
export function WallCard({
  wall,
  manageMode,
  checked,
  onClick,
  onMenuOpen,
}: {
  wall: WallSummary;
  manageMode: boolean;
  checked: boolean;
  onClick: () => void;
  onMenuOpen: (x: number, y: number) => void;
}) {
  const t = useT();
  const wallpaperStyle = getWallpaperStyle(wall.wallpaper);

  return (
    <div
      data-wall-card={wall.id}
      onClick={onClick}
      onContextMenu={(e) => {
        e.preventDefault();
        onMenuOpen(e.clientX, e.clientY);
      }}
      style={{
        width: '100%',
        height: 200,
        background: '#FFFFFF',
        border: checked ? '2px solid #4A90D9' : 'none',
        borderRadius: 8,
        boxShadow: checked ? 'none' : '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        overflow: 'hidden',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      }}
    >
      {/* 管理模式 checkbox */}
      {manageMode && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            width: 18,
            height: 18,
            borderRadius: 4,
            border: checked ? '1px solid #4A90D9' : '1px solid #CCC',
            background: checked ? '#4A90D9' : '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontSize: 12,
            zIndex: 2,
          }}
        >
          {checked ? '✓' : ''}
        </div>
      )}
      {/* 上部 70% = 墙纸色块预览 */}
      <div style={{ height: '70%', ...wallpaperStyle }} />
      {/* 下部 30% = 白色信息区 */}
      <div
        style={{
          height: '30%',
          background: '#FFFFFF',
          padding: '8px 12px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: '#333' }}>{wall.name}</span>
        <span style={{ fontSize: 10, color: '#BBB', marginTop: 2 }}>
          {wall.itemCount === 1
            ? t('ov.itemOne', { n: wall.itemCount })
            : t('ov.itemMany', { n: wall.itemCount })}
        </span>
      </div>
      {/* 三点菜单按钮（卡片右下角，硬要求，v0.2 确认） */}
      {!manageMode && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMenuOpen(e.clientX, e.clientY);
          }}
          title={t('ov.more')}
          style={{
            position: 'absolute',
            right: 8,
            bottom: 8,
            width: 26,
            height: 26,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: 14,
            color: '#666',
            borderRadius: 13,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ⋮
        </button>
      )}
    </div>
  );
}

/* ─── 墙卡片三点菜单（与原 CardMenu 一致） ─── */
export function CardMenu({
  x,
  y,
  wallId,
  onClose,
  onAction,
  onRename,
}: {
  x: number;
  y: number;
  wallId: string;
  onClose: () => void;
  onAction: (action: string) => void;
  onRename: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const t = useT();
  const spaces = useOverviewStore((s) => s.spaces);
  const moveWallToSpace = useOverviewStore((s) => s.moveWallToSpace);
  const [showMoveTo, setShowMoveTo] = useState(false);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handle);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handle);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  const items = [
    { key: 'rename', label: t('common.rename') },
    { key: 'duplicate', label: t('ov.duplicate') },
    { key: 'moveTo', label: t('space.moveTo'), hasSub: true },
    { key: 'export', label: t('ov.exportJson') },
    { key: 'share', label: t('common.share') },
    { key: 'delete', label: t('common.delete'), danger: true },
  ];

  // 当前墙所属的 Space
  const currentSpace = spaces.find((p) => p.wallIds.includes(wallId));
  const otherSpaces = spaces.filter((p) => p.id !== currentSpace?.id);

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        left: Math.min(x, window.innerWidth - 200),
        top: Math.max(y - 160, 8),
        background: '#FFFFFF',
        border: 'none',
        borderRadius: 8,
        boxShadow: '0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)',
        padding: '4px 0',
        minWidth: 160,
        zIndex: 9999,
        userSelect: 'none',
      }}
    >
      {items.map((it) => {
        if (it.key === 'moveTo' && otherSpaces.length === 0) return null;
        return (
          <div
            key={it.key}
            onClick={() => (it.key === 'rename' ? onRename() : it.key !== 'moveTo' ? onAction(it.key) : undefined)}
            style={{
              height: 32,
              display: 'flex',
              alignItems: 'center',
              padding: '0 14px',
              fontSize: 13,
              color: it.danger ? '#C0392B' : '#333',
              cursor: 'pointer',
              position: 'relative',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.background = '#F5F5F5';
              if (it.hasSub) setShowMoveTo(true);
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.background = 'transparent';
              if (it.hasSub) setShowMoveTo(false);
            }}
          >
            {it.label}
            {it.hasSub && <span style={{ marginLeft: 'auto', fontSize: 10, color: '#999' }}>▸</span>}
            {it.hasSub && showMoveTo && (
              <div
                style={{
                  position: 'absolute',
                  left: '100%',
                  top: 0,
                  background: '#FFFFFF',
                  border: 'none',
                  borderRadius: 8,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)',
                  padding: '4px 0',
                  minWidth: 140,
                  zIndex: 10000,
                }}
              >
                {otherSpaces.map((p) => (
                  <div
                    key={p.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      moveWallToSpace(wallId, p.id);
                      track('wall_moved_to_space', { spaceId: p.id });
                      onClose();
                    }}
                    style={{
                      height: 32,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '0 14px',
                      fontSize: 13,
                      color: '#333',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#F5F5F5'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                  >
                    {p.color && <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color }} />}
                    {p.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Space 菜单（⋮ / 右键共用；v0.8 新增 Change Color 色点行；Uncategorized 无 Delete） ─── */
export function SpaceMenu({
  x,
  y,
  spaceId,
  isUncategorized = false,
  onClose,
  onRename,
  onDelete,
}: {
  x: number;
  y: number;
  spaceId: string;
  /** v0.8 微调：Uncategorized 可重命名/改色，但不可删除 */
  isUncategorized?: boolean;
  onClose: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const t = useT();
  const space = useOverviewStore((s) => s.spaces).find((p) => p.id === spaceId);
  const setSpaceColor = useOverviewStore((s) => s.setSpaceColor);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handle);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handle);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  if (!space) return null;

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        left: Math.min(x, window.innerWidth - 200),
        top: Math.max(y - 160, 8),
        background: '#FFFFFF',
        border: 'none',
        borderRadius: 8,
        boxShadow: '0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)',
        padding: '4px 0',
        minWidth: 160,
        zIndex: 9999,
        userSelect: 'none',
      }}
    >
      <div
        onClick={onRename}
        style={{
          height: 32, display: 'flex', alignItems: 'center', padding: '0 14px',
          fontSize: 13, color: '#333', cursor: 'pointer',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#F5F5F5'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
      >
        {t('space.rename')}
      </div>
      <Divider />
      <div style={{ padding: '4px 14px', fontSize: 13, color: '#333' }}>{t('ctx.changeColor')}</div>
      <div style={{ padding: '6px 14px' }}>
        <ColorDots
          colors={SPACE_COLORS}
          current={space.color}
          size={20}
          withPicker
          onSelect={(color) => {
            setSpaceColor(space.id, color);
            track('space_color_changed', { spaceId: space.id });
            onClose();
          }}
        />
      </div>
      {/* Uncategorized：不提供删除（承载所有未归类墙） */}
      {!isUncategorized && (
        <>
          <Divider />
          <div
            onClick={onDelete}
            style={{
              height: 32, display: 'flex', alignItems: 'center', padding: '0 14px',
              fontSize: 13, color: '#C0392B', cursor: 'pointer',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#F5F5F5'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
          >
            {t('common.delete')}
          </div>
        </>
      )}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: '#EEE', margin: '4px 0' }} />;
}

/* ─── 确认弹窗 ─── */
export function ConfirmDialog({
  message,
  onCancel,
  onConfirm,
  confirmLabel,
  confirmVariant,
}: {
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  confirmVariant?: 'danger' | 'primary';
}) {
  const t = useT();
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
    >
      <div
        style={{
          background: '#FFFFFF',
          border: 'none',
          borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)',
          padding: 16,
          width: 320,
        }}
      >
        <div style={{ fontSize: 13, color: '#333', marginBottom: 14 }}>{message}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onCancel} style={dialogBtnStyle(false)}>
            {t('common.cancel')}
          </button>
          <button onClick={onConfirm} style={dialogBtnStyle(true, confirmVariant)}>
            {confirmLabel ?? t('common.delete')}
          </button>
        </div>
      </div>
    </div>
  );
}

export function dialogBtnStyle(primary: boolean, variant: 'danger' | 'primary' = 'danger'): React.CSSProperties {
  return {
    height: 28,
    padding: '0 12px',
    fontSize: 12,
    fontWeight: 600,
    color: primary ? '#FFFFFF' : '#666',
    background: primary ? (variant === 'primary' ? '#1A1A1A' : '#C0392B') : '#FFFFFF',
    border: primary ? 'none' : '1px solid #D0D0D0',
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'background 0.12s ease',
  };
}

/* ─── 重命名墙弹窗 ─── */
export function RenameCardOverlay({ wallId, onClose }: { wallId: string; onClose: () => void }) {
  const walls = useOverviewStore((s) => s.walls);
  const renameWall = useOverviewStore((s) => s.renameWall);
  const t = useT();
  const wall = walls.find((w) => w.id === wallId);
  const [value, setValue] = useState(wall?.name ?? '');

  if (!wall) return null;

  const commit = () => {
    const v = value.trim();
    if (v && v !== wall.name) renameWall(wall.id, v);
    onClose();
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) commit();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
    >
      <div
        style={{
          background: '#FFFFFF',
          border: 'none',
          borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)',
          padding: 16,
          width: 300,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 10 }}>
          {t('ov.renameWall')}
        </div>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') onClose();
          }}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            fontSize: 13,
            padding: '6px 8px',
            border: '1px solid #D0D0D0',
            borderRadius: 6,
            outline: 'none',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
          <button onClick={onClose} style={dialogBtnStyle(false)}>
            {t('common.cancel')}
          </button>
          <button onClick={commit} style={dialogBtnStyle(true, 'primary')}>
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── 重命名 Space 弹窗 ─── */
export function RenameSpaceOverlay({ spaceId, onClose }: { spaceId: string; onClose: () => void }) {
  const spaces = useOverviewStore((s) => s.spaces);
  const renameSpaceFn = useOverviewStore((s) => s.renameSpace);
  const t = useT();
  const space = spaces.find((s) => s.id === spaceId);
  const [value, setValue] = useState(space?.name ?? '');

  if (!space) return null;

  const commit = () => {
    const v = value.trim();
    if (v && v !== space.name) renameSpaceFn(space.id, v);
    onClose();
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) commit(); }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000,
      }}
    >
      <div style={{
        background: '#FFFFFF', border: 'none', borderRadius: 10,
        boxShadow: '0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)',
        padding: 16, width: 300,
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 10 }}>
          {t('space.rename')}
        </div>
        <input
          autoFocus value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') onClose(); }}
          style={{
            width: '100%', boxSizing: 'border-box', fontSize: 13, padding: '6px 8px',
            border: '1px solid #D0D0D0', borderRadius: 6, outline: 'none',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
          <button onClick={onClose} style={dialogBtnStyle(false)}>{t('common.cancel')}</button>
          <button onClick={commit} style={dialogBtnStyle(true, 'primary')}>{t('common.save')}</button>
        </div>
      </div>
    </div>
  );
}

/* ─── 顶栏幽灵按钮 ─── */
export function HeaderButton({
  label,
  onClick,
  danger,
  disabled,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        height: 28,
        padding: '0 12px',
        fontSize: 12,
        color: disabled ? '#CCC' : danger ? '#C0392B' : '#1A1A1A',
        background: 'transparent',
        border: danger && !disabled ? '1px solid #C0392B' : '1px solid transparent',
        borderRadius: 6,
        cursor: disabled ? 'default' : 'pointer',
        transition: 'background 0.12s ease',
      }}
      onMouseEnter={(e) => {
        if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = '#F0F0F0';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
      }}
    >
      {label}
    </button>
  );
}

/* ─── 新建 Space 内联输入 ─── */
export function NewSpaceInline({
  onDone,
  onCancel,
}: {
  onDone: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const t = useT();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const commit = () => {
    const v = value.trim();
    if (v) onDone(v);
    else onCancel();
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') onCancel();
        }}
        placeholder={t('space.newPlaceholder')}
        style={{
          height: 30,
          width: 180,
          boxSizing: 'border-box',
          fontSize: 12,
          padding: '0 10px',
          border: '1px solid #D0D0D0',
          borderRadius: 6,
          outline: 'none',
        }}
      />
      <button onClick={commit} style={{ ...dialogBtnStyle(true), background: '#333' }}>{t('common.save')}</button>
      <button onClick={onCancel} style={dialogBtnStyle(false)}>{t('common.cancel')}</button>
    </div>
  );
}
