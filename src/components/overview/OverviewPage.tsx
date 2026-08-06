import { useCallback, useEffect, useRef, useState } from 'react';
import { useOverviewStore } from '../../store/useOverviewStore';
import { useUIStore } from '../../store/useUIStore';
import { getWallpaperStyle } from '../../utils/wallpaperCSS';
import type { WallSummary } from '../../store/types';

/**
 * 总览页（v0.2）。
 * - 顶栏：标题 + Manage + New Wall
 * - 管理模式：卡片多选 → 批量删除（二次确认）
 * - 卡片三点菜单：Rename / Duplicate / Export JSON / Share / Delete
 */
export function OverviewPage() {
  const walls = useOverviewStore((s) => s.walls);
  const addWall = useOverviewStore((s) => s.addWall);
  const openWall = useOverviewStore((s) => s.openWall);
  const duplicateWall = useOverviewStore((s) => s.duplicateWall);
  const exportWallJSON = useOverviewStore((s) => s.exportWallJSON);
  const removeWalls = useOverviewStore((s) => s.removeWalls);
  const captureCurrentWall = useOverviewStore((s) => s.captureCurrentWall);
  const showToast = useUIStore((s) => s.showToast);
  const setViewMode = useUIStore((s) => s.setViewMode);

  const [manageMode, setManageMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<{ ids: string[] } | null>(null);
  const [menu, setMenu] = useState<{ wallId: string; x: number; y: number } | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);

  // 进入总览页时快照当前编辑的墙
  useEffect(() => {
    captureCurrentWall();
  }, [captureCurrentWall]);

  const handleNewWall = useCallback(() => {
    const id = `wall-${Date.now()}`;
    const name = `Wall ${String(walls.length + 1).padStart(2, '0')}`;
    addWall(id, name);
  }, [walls.length, addWall]);

  const handleCardClick = useCallback(
    (wall: WallSummary) => {
      if (manageMode) {
        setSelected((prev) =>
          prev.includes(wall.id) ? prev.filter((id) => id !== wall.id) : [...prev, wall.id],
        );
        return;
      }
      openWall(wall.id);
      setViewMode('wall');
    },
    [manageMode, openWall, setViewMode],
  );

  const handleMenuAction = useCallback(
    (action: string, wall: WallSummary) => {
      setMenu(null);
      switch (action) {
        case 'duplicate':
          duplicateWall(wall.id);
          showToast('Wall duplicated', 'success');
          break;
        case 'export':
          exportWallJSON(wall.id);
          showToast('JSON exported', 'success');
          break;
        case 'share':
          showToast('Link copied', 'success');
          break;
        case 'delete':
          setConfirm({ ids: [wall.id] });
          break;
        default:
          break;
      }
    },
    [duplicateWall, exportWallJSON, showToast],
  );

  const exitManage = useCallback(() => {
    setManageMode(false);
    setSelected([]);
  }, []);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#FAFAF8',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* 顶部栏 */}
      <div
        style={{
          height: 40,
          minHeight: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          borderBottom: '1px solid #E8E8E8',
          background: '#FFFFFF',
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700, color: '#333' }}>Mind on Wall</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {manageMode ? (
            <>
              <span style={{ fontSize: 12, color: '#999' }}>{selected.length} selected</span>
              <HeaderButton
                label={`Delete${selected.length > 0 ? ` (${selected.length})` : ''}`}
                danger={selected.length > 0}
                disabled={selected.length === 0}
                onClick={() => setConfirm({ ids: selected })}
              />
              <HeaderButton label="Cancel" onClick={exitManage} />
            </>
          ) : (
            <>
              <HeaderButton label="Manage" onClick={() => setManageMode(true)} />
              <HeaderButton label="+ New Wall" onClick={handleNewWall} />
            </>
          )}
        </div>
      </div>

      {/* 卡片网格 */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: 24,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 280px)',
          gap: 20,
          justifyContent: 'center',
          alignContent: 'start',
        }}
      >
        {walls.map((wall) => (
          <WallCard
            key={wall.id}
            wall={wall}
            manageMode={manageMode}
            checked={selected.includes(wall.id)}
            onClick={() => handleCardClick(wall)}
            onMenuOpen={(x, y) => setMenu({ wallId: wall.id, x, y })}
          />
        ))}
      </div>

      {/* 三点菜单 */}
      {menu && (
        <CardMenu
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          onAction={(action) => {
            const wall = walls.find((w) => w.id === menu.wallId);
            if (wall) handleMenuAction(action, wall);
          }}
          onRename={() => {
            setMenu(null);
            setRenamingId(menu.wallId);
          }}
        />
      )}

      {/* 删除确认弹窗 */}
      {confirm && (
        <ConfirmDialog
          message={
            confirm.ids.length === 1
              ? 'Delete this wall? This cannot be undone.'
              : `Delete ${confirm.ids.length} walls? This cannot be undone.`
          }
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            removeWalls(confirm.ids);
            setSelected([]);
            setConfirm(null);
            showToast('Deleted', 'success');
          }}
        />
      )}

      {/* 重命名弹窗 */}
      {renamingId && (
        <RenameCardOverlay wallId={renamingId} onClose={() => setRenamingId(null)} />
      )}
    </div>
  );
}

function RenameCardOverlay({ wallId, onClose }: { wallId: string; onClose: () => void }) {
  const walls = useOverviewStore((s) => s.walls);
  const renameWall = useOverviewStore((s) => s.renameWall);
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
          border: '1px solid #E0E0E0',
          borderRadius: 10,
          padding: 16,
          width: 300,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 10 }}>
          Rename Wall
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
          <button
            onClick={onClose}
            style={dialogBtnStyle(false)}
          >
            Cancel
          </button>
          <button onClick={commit} style={dialogBtnStyle(true)}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── 卡片 ─── */
function WallCard({
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
  const wallpaperStyle = getWallpaperStyle(wall.wallpaper);

  return (
    <div
      onClick={onClick}
      style={{
        width: 280,
        height: 200,
        background: '#FFFFFF',
        border: checked ? '2px solid #4A90D9' : '1px solid #E8E8E8',
        borderRadius: 8,
        overflow: 'hidden',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
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
          {wall.itemCount} {wall.itemCount === 1 ? 'item' : 'items'}
        </span>
      </div>
      {/* 三点菜单按钮（右上角，规格要求） */}
      {!manageMode && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMenuOpen(e.clientX, e.clientY);
          }}
          title="More"
          style={{
            position: 'absolute',
            right: 8,
            top: 8,
            width: 26,
            height: 26,
            border: '1px solid #E5E5E5',
            background: 'rgba(255,255,255,0.92)',
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

/* ─── 三点菜单 ─── */
function CardMenu({
  x,
  y,
  onClose,
  onAction,
  onRename,
}: {
  x: number;
  y: number;
  onClose: () => void;
  onAction: (action: string) => void;
  onRename: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

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
    { key: 'rename', label: 'Rename' },
    { key: 'duplicate', label: 'Duplicate' },
    { key: 'export', label: 'Export JSON' },
    { key: 'share', label: 'Share' },
    { key: 'delete', label: 'Delete', danger: true },
  ];

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        left: Math.min(x, window.innerWidth - 180),
        top: Math.max(y - 160, 8),
        background: '#FFFFFF',
        border: '1px solid #E0E0E0',
        borderRadius: 8,
        padding: '4px 0',
        minWidth: 160,
        zIndex: 9999,
        userSelect: 'none',
      }}
    >
      {items.map((it) => (
        <div
          key={it.key}
          onClick={() => (it.key === 'rename' ? onRename() : onAction(it.key))}
          style={{
            height: 32,
            display: 'flex',
            alignItems: 'center',
            padding: '0 14px',
            fontSize: 13,
            color: it.danger ? '#C0392B' : '#333',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.background = '#F5F5F5';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.background = 'transparent';
          }}
        >
          {it.label}
        </div>
      ))}
    </div>
  );
}

/* ─── 确认弹窗 ─── */
function ConfirmDialog({
  message,
  onCancel,
  onConfirm,
}: {
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
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
          border: '1px solid #E0E0E0',
          borderRadius: 10,
          padding: 16,
          width: 320,
        }}
      >
        <div style={{ fontSize: 13, color: '#333', marginBottom: 14 }}>{message}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onCancel} style={dialogBtnStyle(false)}>
            Cancel
          </button>
          <button onClick={onConfirm} style={dialogBtnStyle(true)}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function dialogBtnStyle(primary: boolean): React.CSSProperties {
  return {
    height: 28,
    padding: '0 12px',
    fontSize: 12,
    color: primary ? '#FFFFFF' : '#666',
    background: primary ? '#C0392B' : '#FFFFFF',
    border: primary ? 'none' : '1px solid #D0D0D0',
    borderRadius: 6,
    cursor: 'pointer',
  };
}

function HeaderButton({
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
        color: disabled ? '#CCC' : danger ? '#C0392B' : '#333',
        background: '#FFFFFF',
        border: `1px solid ${danger && !disabled ? '#C0392B' : '#D0D0D0'}`,
        borderRadius: 6,
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      {label}
    </button>
  );
}
