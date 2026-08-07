import { useCallback, useEffect, useRef, useState } from 'react';
import { useOverviewStore } from '../../store/useOverviewStore';
import { useUIStore } from '../../store/useUIStore';
import { useWallStore } from '../../store/useWallStore';
import { useAssetStore } from '../../store/useAssetStore';
import { getWallpaperStyle } from '../../utils/wallpaperCSS';
import { AvatarMenu } from '../shared/AvatarMenu';
import { buildShareUrl, copyShareUrl, shareWallServer } from '../../utils/shareWall';
import type { WallSummary } from '../../store/types';
import { useT } from '../../i18n/useT';
import { track } from '../../utils/analytics';

/**
 * 总览页（v0.2）。
 * - 顶栏：标题 + Manage + New Wall
 * - 管理模式：卡片多选 → 批量删除（二次确认）
 * - 卡片三点菜单：Rename / Duplicate / Export JSON / Share / Delete
 */
export function OverviewPage() {
  const walls = useOverviewStore((s) => s.walls);
  const projects = useOverviewStore((s) => s.projects);
  const addWall = useOverviewStore((s) => s.addWall);
  const addProject = useOverviewStore((s) => s.addProject);
  const openWall = useOverviewStore((s) => s.openWall);
  const duplicateWall = useOverviewStore((s) => s.duplicateWall);
  const exportWallJSON = useOverviewStore((s) => s.exportWallJSON);
  const removeWalls = useOverviewStore((s) => s.removeWalls);
  const captureCurrentWall = useOverviewStore((s) => s.captureCurrentWall);
  const moveWallToProject = useOverviewStore((s) => s.moveWallToProject);
  const homeBackground = useOverviewStore((s) => s.homeBackground);
  const homeBackgroundImage = useOverviewStore((s) => s.homeBackgroundImage);
  const showToast = useUIStore((s) => s.showToast);
  const setViewMode = useUIStore((s) => s.setViewMode);
  const t = useT();

  const [manageMode, setManageMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<{ ids: string[] } | null>(null);
  const [menu, setMenu] = useState<{ wallId: string; x: number; y: number } | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [newProjectInput, setNewProjectInput] = useState(false);
  const [manageMoveOpen, setManageMoveOpen] = useState(false);

  // 进入总览页时快照当前编辑的墙
  useEffect(() => {
    captureCurrentWall();
  }, [captureCurrentWall]);

  const handleNewWall = useCallback(() => {
    const id = `wall-${Date.now()}`;
    const name = `Wall ${String(walls.length + 1).padStart(2, '0')}`;
    addWall(id, name);
    track('wall_created', { wallId: id });
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
    async (action: string, wall: WallSummary) => {
      setMenu(null);
      switch (action) {
        case 'duplicate':
          duplicateWall(wall.id);
          track('wall_duplicated', { wallId: wall.id });
          showToast(t('toast.wallDuplicated'), 'success');
          break;
        case 'export':
          exportWallJSON(wall.id);
          showToast(t('toast.jsonExported'), 'success');
          break;
        case 'share': {
          // v0.4: 优先服务端短链，失败降级 URL hash
          const overview = useOverviewStore.getState();
          if (useWallStore.getState().wallId === wall.id) overview.captureCurrentWall();
          const data = useOverviewStore.getState().wallData[wall.id];
          if (!data) {
            showToast(t('toast.nothingToShare'), 'warning');
            break;
          }
          const shareData = {
            name: data.name,
            wallpaper: data.wallpaper,
            items: data.items,
            ropes: data.ropes,
            assets: useAssetStore.getState().assets,
          };
          let url: string;
          try {
            url = await shareWallServer(shareData);
            track('wall_shared', { method: 'shortlink', wallId: wall.id });
          } catch {
            url = buildShareUrl(shareData);
            track('wall_shared', { method: 'urlhash', wallId: wall.id });
          }
          const ok = await copyShareUrl(url);
          showToast(ok ? t('toast.shareCopied') : t('toast.copyFailed'), ok ? 'success' : 'error');
          break;
        }
        case 'delete':
          setConfirm({ ids: [wall.id] });
          break;
        default:
          break;
      }
    },
    [duplicateWall, exportWallJSON, showToast, t],
  );

  /** v0.4: Manage 模式批量分享（优先短链，降级 URL hash） */
  const handleManageShare = useCallback(async () => {
    if (selected.length !== 1) return;
    const wallId = selected[0];
    const overview = useOverviewStore.getState();
    if (useWallStore.getState().wallId === wallId) overview.captureCurrentWall();
    const data = useOverviewStore.getState().wallData[wallId];
    const wall = useOverviewStore.getState().walls.find((w) => w.id === wallId);
    if (!data || !wall) {
      showToast(t('toast.nothingToShare'), 'warning');
      return;
    }
    const shareData = {
      name: data.name,
      wallpaper: data.wallpaper,
      items: data.items,
      ropes: data.ropes,
      assets: useAssetStore.getState().assets,
    };
    let url: string;
    try {
      url = await shareWallServer(shareData);
      track('wall_shared', { method: 'shortlink', wallId });
    } catch {
      url = buildShareUrl(shareData);
      track('wall_shared', { method: 'urlhash', wallId });
    }
    const ok = await copyShareUrl(url);
    showToast(ok ? t('toast.shareCopied') : t('toast.copyFailed'), ok ? 'success' : 'error');
  }, [selected, showToast, t]);

  const exitManage = useCallback(() => {
    setManageMode(false);
    setSelected([]);
    setManageMoveOpen(false);
  }, []);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        // v0.3 r2: 总览页背景可在 Settings 中更换（自定义图片优先）
        background: homeBackgroundImage
          ? `#F5F5F3 url("${homeBackgroundImage}") center/cover no-repeat fixed`
          : homeBackground,
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
              <span style={{ fontSize: 12, color: '#999' }}>{t('common.selected', { n: selected.length })}</span>
              {/* v0.4: Manage 模式 Move-to 批量归类 */}
              {projects.length > 1 && (
                <div style={{ position: 'relative' }}>
                  <HeaderButton
                    label={t('project.moveTo')}
                    disabled={selected.length === 0}
                    onClick={() => setManageMoveOpen((v) => !v)}
                  />
                  {manageMoveOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: '100%',
                        marginTop: 4,
                        background: '#FFFFFF',
                        border: '1px solid #E0E0E0',
                        borderRadius: 8,
                        padding: '4px 0',
                        minWidth: 140,
                        zIndex: 10000,
                      }}
                    >
                      {projects.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => {
                            selected.forEach((id) => moveWallToProject(id, p.id));
                            track('wall_moved_to_project', { projectId: p.id, count: selected.length });
                            setManageMoveOpen(false);
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
              )}
              <HeaderButton
                label={t('common.share')}
                disabled={selected.length !== 1}
                onClick={handleManageShare}
              />
              <HeaderButton
                label={`${t('common.delete')}${selected.length > 0 ? ` (${selected.length})` : ''}`}
                danger={selected.length > 0}
                disabled={selected.length === 0}
                onClick={() => setConfirm({ ids: selected })}
              />
              <HeaderButton label={t('common.cancel')} onClick={exitManage} />
            </>
          ) : (
            <>
              <HeaderButton label={t('ov.manage')} onClick={() => setManageMode(true)} />
              {/* v0.4: + New Project 移到 TopBar */}
              {newProjectInput ? (
                <NewProjectInline
                  onDone={(name) => { addProject(name); track('project_created'); setNewProjectInput(false); }}
                  onCancel={() => setNewProjectInput(false)}
                />
              ) : (
                <HeaderButton label={`+ ${t('project.new')}`} onClick={() => setNewProjectInput(true)} />
              )}
              <HeaderButton label={t('ov.newWall')} onClick={handleNewWall} />
              {/* 头像入口（v0.2：顶栏最右侧） */}
              <div style={{ marginLeft: 8 }}>
                <AvatarMenu />
              </div>
            </>
          )}
        </div>
      </div>

      {/* v0.4: 按 Project 分组的卡片网格 */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '16px 24px',
        }}
      >
        {projects.length > 0 ? (
          projects.map((project) => {
            const projectWalls = walls.filter((w) => project.wallIds.includes(w.id));
            const isCollapsed = collapsed[project.id];
            return (
              <div key={project.id} style={{ marginBottom: 20 }}>
                {/* Project 标题栏 */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 12,
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                  onClick={() => setCollapsed((prev) => ({ ...prev, [project.id]: !prev[project.id] }))}
                >
                  <span style={{ fontSize: 12, color: '#999', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.15s', display: 'inline-block' }}>▼</span>
                  {project.color && (
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: project.color, flexShrink: 0 }} />
                  )}
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#555' }}>{project.name}</span>
                  <span style={{ fontSize: 11, color: '#BBB' }}>({projectWalls.length})</span>
                </div>
                {/* 墙卡片网格 */}
                {!isCollapsed && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 280px))',
                      gap: 20,
                      justifyContent: 'center',
                      alignContent: 'start',
                    }}
                  >
                    {projectWalls.map((wall) => (
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
                )}
              </div>
            );
          })
        ) : (
          // 无 project 时直接显示所有墙（兼容旧数据未迁移场景）
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 280px))',
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
        )}
      </div>

      {/* 三点菜单 */}
      {menu && (
        <CardMenu
          x={menu.x}
          y={menu.y}
          wallId={menu.wallId}
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
              ? t('ov.confirmOne')
              : t('ov.confirmMany', { n: confirm.ids.length })
          }
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            removeWalls(confirm.ids);
            track('wall_deleted', { count: confirm.ids.length });
            setSelected([]);
            setConfirm(null);
            showToast(t('toast.deleted'), 'success');
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
          border: '1px solid #E0E0E0',
          borderRadius: 10,
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
          <button
            onClick={onClose}
            style={dialogBtnStyle(false)}
          >
            {t('common.cancel')}
          </button>
          <button onClick={commit} style={dialogBtnStyle(true)}>
            {t('common.save')}
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
  const t = useT();
  const wallpaperStyle = getWallpaperStyle(wall.wallpaper);

  return (
    <div
      onClick={onClick}
      style={{
        // v0.3: 宽度跟随网格列自适应
        width: '100%',
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
            // v0.2 修订：去掉圈线边框，只留三点图标
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

/* ─── 三点菜单 ─── */
function CardMenu({
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
  const projects = useOverviewStore((s) => s.projects);
  const moveWallToProject = useOverviewStore((s) => s.moveWallToProject);
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
    { key: 'moveTo', label: t('project.moveTo'), hasSub: true },
    { key: 'export', label: t('ov.exportJson') },
    { key: 'share', label: t('common.share') },
    { key: 'delete', label: t('common.delete'), danger: true },
  ];

  // 当前墙所属的 project
  const currentProject = projects.find((p) => p.wallIds.includes(wallId));
  const otherProjects = projects.filter((p) => p.id !== currentProject?.id);

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        left: Math.min(x, window.innerWidth - 200),
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
      {items.map((it) => {
        if (it.key === 'moveTo' && otherProjects.length === 0) return null;
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
                  border: '1px solid #E0E0E0',
                  borderRadius: 8,
                  padding: '4px 0',
                  minWidth: 140,
                  zIndex: 10000,
                }}
              >
                {otherProjects.map((p) => (
                  <div
                    key={p.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      moveWallToProject(wallId, p.id);
                      track('wall_moved_to_project', { projectId: p.id });
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
          border: '1px solid #E0E0E0',
          borderRadius: 10,
          padding: 16,
          width: 320,
        }}
      >
        <div style={{ fontSize: 13, color: '#333', marginBottom: 14 }}>{message}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onCancel} style={dialogBtnStyle(false)}>
            {t('common.cancel')}
          </button>
          <button onClick={onConfirm} style={dialogBtnStyle(true)}>
            {t('common.delete')}
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

/* ─── v0.4: 新建 Project 内联输入 ─── */
function NewProjectInline({
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
        placeholder={t('project.newPlaceholder')}
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
