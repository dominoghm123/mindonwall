import { useState, useCallback, useRef, useEffect } from 'react';
import { useWallStore } from '../../store/useWallStore';
import { useUIStore } from '../../store/useUIStore';
import { useOverviewStore } from '../../store/useOverviewStore';
import { useMapStore } from '../../store/useMapStore';
import { useAssetStore } from '../../store/useAssetStore';
import { AvatarMenu } from '../shared/AvatarMenu';
import { captureWallSpreadPng, downloadDataUrl } from '../../utils/exportImage';
import { exportPdfFromDataUrl } from '../../utils/exportPdf';
import { buildShareUrl, copyShareUrl } from '../../utils/shareWall';

/**
 * 40px 高顶部栏，默认隐藏，鼠标触顶滑入。
 * 纯白背景 #FFFFFF，1px bottom border #E8E8E8，无阴影。
 */
export function TopBar({ zoom }: { zoom?: number }) {
  void zoom;
  const name = useWallStore((s) => s.name);
  const renameWall = useWallStore((s) => s.renameWall);
  const viewMode = useUIStore((s) => s.viewMode);
  // v0.3: Map 视图下 Undo/Redo 走 Map 独立撤销栈
  const isMap = viewMode === 'map';
  const wallUndo = useWallStore((s) => s.undo);
  const wallRedo = useWallStore((s) => s.redo);
  const mapUndo = useMapStore((s) => s.mapUndo);
  const mapRedo = useMapStore((s) => s.mapRedo);
  const wallCanUndo = useWallStore((s) => s.undoStack.length > 0);
  const wallCanRedo = useWallStore((s) => s.redoStack.length > 0);
  const mapCanUndo = useMapStore((s) => s.undoStack.length > 0);
  const mapCanRedo = useMapStore((s) => s.redoStack.length > 0);
  const undo = isMap ? mapUndo : wallUndo;
  const redo = isMap ? mapRedo : wallRedo;
  const canUndo = isMap ? mapCanUndo : wallCanUndo;
  const canRedo = isMap ? mapCanRedo : wallCanRedo;
  const setViewMode = useUIStore((s) => s.setViewMode);
  const showToast = useUIStore((s) => s.showToast);

  /* ── v0.3: Export 下拉菜单 + 真实分享 ── */
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!exportOpen) return;
    const handle = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [exportOpen]);

  const fileBase = name.replace(/\s+/g, '-').toLowerCase() || 'wall';

  const handleExport = useCallback(
    async (kind: 'png' | 'pdf') => {
      setExportOpen(false);
      if (exporting) return;
      setExporting(true);
      try {
        if (isMap) {
          showToast('Use Export in the Map toolbar', 'info');
          return;
        }
        const items = useWallStore.getState().items;
        const dataUrl = await captureWallSpreadPng(items);
        if (kind === 'png') {
          downloadDataUrl(dataUrl, `${fileBase}-spread.png`);
        } else {
          await exportPdfFromDataUrl(dataUrl, `${fileBase}-spread.pdf`);
        }
        showToast(kind === 'png' ? 'PNG exported' : 'PDF exported', 'success');
      } catch {
        showToast('Export failed', 'error');
      } finally {
        setExporting(false);
      }
    },
    [exporting, isMap, fileBase, showToast],
  );

  const handleShare = useCallback(async () => {
    const w = useWallStore.getState();
    const url = buildShareUrl({
      name: w.name,
      wallpaper: w.wallpaper,
      items: w.items,
      ropes: w.ropes,
      assets: useAssetStore.getState().assets,
    });
    const ok = await copyShareUrl(url);
    showToast(ok ? 'Share link copied' : 'Copy failed', ok ? 'success' : 'error');
  }, [showToast]);

  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  // 鼠标触顶滑入
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (e.clientY <= 8) {
        setVisible(true);
      }
    };
    const handleMouseLeave = (e: MouseEvent) => {
      // 当鼠标离开顶部栏区域（向下移出）时隐藏
      const el = document.getElementById('top-bar');
      if (el) {
        const rect = el.getBoundingClientRect();
        if (e.clientY > rect.bottom + 4) {
          setVisible(false);
          setEditing(false);
        }
      }
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  // 点击外部退出编辑
  useEffect(() => {
    if (!editing) return;
    const handle = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setEditing(false);
        renameWall(editValue.trim() || name);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [editing, editValue, name, renameWall]);

  const handleNameClick = useCallback(() => {
    setEditValue(name);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [name]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        setEditing(false);
        renameWall(editValue.trim() || name);
      }
      if (e.key === 'Escape') {
        setEditing(false);
        setEditValue(name);
      }
    },
    [editValue, name, renameWall],
  );

  const handleBack = useCallback(() => {
    // 返回总览前快照当前墙数据（v0.2 多墙切换）
    useOverviewStore.getState().captureCurrentWall();
    setViewMode('overview');
  }, [setViewMode]);

  return (
    <div
      id="top-bar"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 40,
        background: '#FFFFFF',
        borderBottom: '1px solid #E8E8E8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        zIndex: 1000,
        transform: visible ? 'translateY(0)' : 'translateY(-100%)',
        transition: 'transform 0.2s ease',
        userSelect: 'none',
      }}
      onMouseLeave={() => setVisible(false)}
    >
      {/* 左区 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* 返回箭头 */}
        <button
          onClick={handleBack}
          style={{
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 20,
            color: '#333',
            padding: 0,
          }}
          title="Back"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M9.8 3.2 L5 8 L9.8 12.8"
              stroke="#333"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        {/* 墙名 */}
        {editing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => {
              setEditing(false);
              renameWall(editValue.trim() || name);
            }}
            onKeyDown={handleKeyDown}
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: '#333',
              border: '1px solid #D0D0D0',
              borderRadius: 4,
              padding: '2px 6px',
              outline: 'none',
              background: '#FFFFFF',
              width: 140,
            }}
          />
        ) : (
          <span
            onClick={handleNameClick}
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: '#333',
              cursor: 'pointer',
            }}
          >
            {name}
          </span>
        )}

        {/* v0.3: Wall / Connection Map 视图 Tab */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            marginLeft: 8,
            background: '#F5F5F5',
            borderRadius: 7,
            padding: 2,
          }}
        >
          <TabButton
            label="Wall"
            active={viewMode === 'wall'}
            onClick={() => setViewMode('wall')}
          />
          <TabButton
            label="Connection Map"
            active={isMap}
            onClick={() => setViewMode('map')}
          />
        </div>
      </div>

      {/* 右区（v0.2：Saved + Undo/Redo + Share + 头像） */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Saved 指示 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#4CAF50',
            }}
          />
          <span style={{ fontSize: 10, color: '#999' }}>Saved</span>
        </div>

        {/* 撤销 / 重做（v0.2：右上角） */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <button
            onClick={undo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            style={historyBtnStyle(canUndo)}
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <path
                d="M6.5 3.5 L3 6.5 L6.5 9.5 M3 6.5 H9.5 A3.5 3.5 0 0 1 9.5 13.5 H6"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            title="Redo (Ctrl+Shift+Z)"
            style={historyBtnStyle(canRedo)}
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ transform: 'scaleX(-1)' }}>
              <path
                d="M6.5 3.5 L3 6.5 L6.5 9.5 M3 6.5 H9.5 A3.5 3.5 0 0 1 9.5 13.5 H6"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* v0.3: Export 下拉（PNG/PDF） */}
        <div ref={exportRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setExportOpen((o) => !o)}
            style={{
              height: 28,
              padding: '0 12px',
              fontSize: 12,
              color: '#333',
              background: '#FFFFFF',
              border: '1px solid #D0D0D0',
              borderRadius: 6,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {exporting ? 'Exporting…' : 'Export ▾'}
          </button>
          {exportOpen && (
            <div
              data-menu-layer
              style={{
                position: 'absolute',
                top: 32,
                right: 0,
                minWidth: 170,
                background: '#FFFFFF',
                border: '1px solid #E0E0E0',
                borderRadius: 8,
                padding: '4px 0',
                zIndex: 9999,
                userSelect: 'none',
              }}
            >
              {isMap ? (
                <ExportMenuItem label="Use the Map toolbar below" disabled />
              ) : (
                <>
                  <ExportMenuItem label="Spread PNG" onClick={() => handleExport('png')} />
                  <ExportMenuItem label="Spread PDF" onClick={() => handleExport('pdf')} />
                </>
              )}
            </div>
          )}
        </div>

        {/* Share 按钮（v0.3：复制真实分享链接） */}
        <button
          onClick={handleShare}
          style={{
            height: 28,
            padding: '0 12px',
            fontSize: 12,
            color: '#333',
            background: '#FFFFFF',
            border: '1px solid #D0D0D0',
            borderRadius: 6,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Share
        </button>

        {/* 用户头像入口（v0.2：下拉 Profile / Materials / Settings） */}
        <AvatarMenu />
      </div>
    </div>
  );
}

/** Export 菜单项（v0.3） */
function ExportMenuItem({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      style={{
        height: 32,
        display: 'flex',
        alignItems: 'center',
        padding: '0 14px',
        fontSize: 13,
        color: disabled ? '#AAA' : '#333',
        cursor: disabled ? 'default' : 'pointer',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => {
        if (!disabled) (e.currentTarget as HTMLDivElement).style.background = '#F5F5F5';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = 'transparent';
      }}
    >
      {label}
    </div>
  );
}

/** 视图 Tab 按钮样式（v0.3） */
function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        height: 22,
        padding: '0 10px',
        fontSize: 11,
        fontWeight: active ? 700 : 500,
        color: active ? '#333' : '#888',
        background: active ? '#FFFFFF' : 'transparent',
        border: active ? '1px solid #E0E0E0' : '1px solid transparent',
        borderRadius: 5,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}

/** 撤销/重做按钮样式 */
function historyBtnStyle(enabled: boolean): React.CSSProperties {
  return {
    width: 26,
    height: 26,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'none',
    border: 'none',
    borderRadius: 6,
    cursor: enabled ? 'pointer' : 'default',
    color: enabled ? '#333' : '#CCC',
    padding: 0,
  };
}
