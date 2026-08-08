import { useState, useCallback, useRef, useEffect } from 'react';
import { useWallStore } from '../../store/useWallStore';
import { useUIStore } from '../../store/useUIStore';
import { useOverviewStore } from '../../store/useOverviewStore';
import { useMapStore } from '../../store/useMapStore';
import { useAssetStore } from '../../store/useAssetStore';
import { AvatarMenu } from '../shared/AvatarMenu';
import { captureWallSpreadPng, downloadDataUrl } from '../../utils/exportImage';
import { exportPdfFromDataUrl } from '../../utils/exportPdf';
import { buildShareUrl, copyShareUrl, shareWallServer } from '../../utils/shareWall';
import { useT } from '../../i18n/useT';
import { track } from '../../utils/analytics';

/**
 * 40px 高顶部栏，默认隐藏，鼠标触顶滑入。
 * v0.5: #FAFAFA 背景 + subtle shadow 替代 border，ghost 按钮风格。
 */
export function TopBar({ zoom }: { zoom?: number }) {
  void zoom;
  const name = useWallStore((s) => s.name);
  const renameWall = useWallStore((s) => s.renameWall);
  const viewMode = useUIStore((s) => s.viewMode);
  const editMode = useUIStore((s) => s.editMode);
  const toggleEditMode = useUIStore((s) => s.toggleEditMode);
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
  const t = useT();

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
          showToast(t('toast.useMapExport'), 'info');
          return;
        }
        const items = useWallStore.getState().items;
        const dataUrl = await captureWallSpreadPng(items);
        if (kind === 'png') {
          downloadDataUrl(dataUrl, `${fileBase}-spread.png`);
          track('export_png');
        } else {
          await exportPdfFromDataUrl(dataUrl, `${fileBase}-spread.pdf`);
          track('export_pdf');
        }
        showToast(kind === 'png' ? t('toast.pngExported') : t('toast.pdfExported'), 'success');
      } catch {
        showToast(t('toast.exportFailed'), 'error');
      } finally {
        setExporting(false);
      }
    },
    [exporting, isMap, fileBase, showToast, t],
  );

  const handleShare = useCallback(async () => {
    const w = useWallStore.getState();
    const shareData = {
      name: w.name,
      wallpaper: w.wallpaper,
      items: w.items,
      ropes: w.ropes,
      assets: useAssetStore.getState().assets,
    };
    let url: string;
    try {
      url = await shareWallServer(shareData);
      track('wall_shared', { method: 'shortlink' });
    } catch {
      url = buildShareUrl(shareData);
      track('wall_shared', { method: 'urlhash' });
    }
    const ok = await copyShareUrl(url);
    showToast(ok ? t('toast.shareCopied') : t('toast.copyFailed'), ok ? 'success' : 'error');
  }, [showToast, t]);

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
    // v0.6: View mode 下不允许编辑墙名
    if (!editMode) return;
    setEditValue(name);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [name, editMode]);

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
        background: '#FAFAFA',
        borderBottom: 'none',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
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
          title={t('common.back')}
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
            label={t('top.wall')}
            active={viewMode === 'wall'}
            onClick={() => setViewMode('wall')}
          />
          <TabButton
            label={t('top.map')}
            active={isMap}
            onClick={() => setViewMode('map')}
          />
        </div>
      </div>

      {/* 右区（v0.2：Saved + Undo/Redo + Share + 头像） */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* v0.6: Edit/View Toggle - 仅在 Wall/Map 视图显示 */}
        {viewMode !== 'overview' && (
          <button
            onClick={() => toggleEditMode()}
            style={{
              height: 28,
              padding: '0 14px',
              fontSize: 12,
              fontWeight: 500,
              color: '#333',
              background: 'transparent',
              border: '1px solid transparent',
              borderRadius: 6,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'background 0.12s ease',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#F0F0F0'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          >
            {editMode ? (
              // Edit mode icon (pencil)
              <>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path d="M12.1 2.9 L13.1 3.9 L12.6 5.1 L12.1 4.9 C12 4.9 11.9 4.8 11.8 4.7 L11.3 4.2 C11.2 4.1 11.1 4 11 3.9 L12.1 2.9 Z M11 3.9 L3.9 11 L2 14 L5 14 L7.1 11.9 L11 3.9 Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {t('top.editMode')}
              </>
            ) : (
              // View mode icon (eye)
              <>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path d="M2 8 C2 8 4.5 4 8 4 C11.5 4 14 8 14 8 C14 8 11.5 12 8 12 C4.5 12 2 8 2 8 Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.2"/>
                </svg>
                {t('top.viewMode')}
              </>
            )}
          </button>
        )}
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
          <span style={{ fontSize: 10, color: '#999' }}>{t('top.saved')}</span>
        </div>

        {/* 撤销 / 重做（v0.2：右上角） */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <button
            onClick={undo}
            disabled={!canUndo}
            title={t('top.undo')}
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
            title={t('top.redo')}
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
              background: 'transparent',
              border: '1px solid transparent',
              borderRadius: 6,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'background 0.12s ease',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#F0F0F0'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          >
            {exporting ? t('top.exporting') : t('top.export')}
          </button>
          {exportOpen && (
            <div
              data-menu-layer
              style={{
                position: 'absolute',
                top: 32,
                right: 0,
                minWidth: 180,
                background: '#FFFFFF',
                border: 'none',
                borderRadius: 8,
                boxShadow: '0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)',
                padding: '4px 0',
                zIndex: 9999,
                userSelect: 'none',
              }}
            >
              {isMap ? (
                <ExportMenuItem label={t('top.mapExportHint')} disabled />
              ) : (
                <>
                  <ExportMenuItem label={t('top.spreadPng')} onClick={() => handleExport('png')} />
                  <ExportMenuItem label={t('top.spreadPdf')} onClick={() => handleExport('pdf')} />
                  <div style={{ height: 1, background: '#F0F0F0', margin: '4px 0' }} />
                </>
              )}
              {/* v0.3: Share 并入 Export 菜单（通过链接导出该墙） */}
              <ExportMenuItem
                label={t('top.shareLink')}
                onClick={() => {
                  setExportOpen(false);
                  handleShare();
                }}
              />
            </div>
          )}
        </div>

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
