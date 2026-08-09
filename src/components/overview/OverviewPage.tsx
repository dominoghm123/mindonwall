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
import logoSvg from '../../assets/logo.svg';
import { track } from '../../utils/analytics';

/**
 * 总览页（v0.2）。
 * - 顶栏：标题 + Manage + New Wall
 * - 管理模式：卡片多选 → 批量删除（二次确认）
 * - 卡片三点菜单：Rename / Duplicate / Export JSON / Share / Delete
 */
export function OverviewPage() {
  const walls = useOverviewStore((s) => s.walls);
  const spaces = useOverviewStore((s) => s.spaces);
  const addWall = useOverviewStore((s) => s.addWall);
  const addSpace = useOverviewStore((s) => s.addSpace);
  const openWall = useOverviewStore((s) => s.openWall);
  const duplicateWall = useOverviewStore((s) => s.duplicateWall);
  const exportWallJSON = useOverviewStore((s) => s.exportWallJSON);
  const removeWalls = useOverviewStore((s) => s.removeWalls);
  const captureCurrentWall = useOverviewStore((s) => s.captureCurrentWall);
  const moveWallToSpace = useOverviewStore((s) => s.moveWallToSpace);
  const renameSpace = useOverviewStore((s) => s.renameSpace);
  const removeSpace = useOverviewStore((s) => s.removeSpace);
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
  const [spaceMenu, setSpaceMenu] = useState<{ spaceId: string; x: number; y: number } | null>(null);
  const [renamingSpaceId, setRenamingSpaceId] = useState<string | null>(null);
  const [confirmSpaceDelete, setConfirmSpaceDelete] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [spaceViewMode, setSpaceViewMode] = useState<'folder' | 'list'>('folder');
  const [newSpaceInput, setNewSpaceInput] = useState(false);
  const [manageMoveOpen, setManageMoveOpen] = useState(false);

  // v0.5 B1: Drag state
  const [dragWallId, setDragWallId] = useState<string | null>(null);
  const [dropSpaceId, setDropSpaceId] = useState<string | null>(null);
  const [dropCardId, setDropCardId] = useState<string | null>(null);

  // v0.5 B3: Box selection state
  const [boxSelect, setBoxSelect] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const boxSelecting = useRef(false);

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



  // v0.5 B4: Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only when not in manage mode and no dialogs open
      if (confirm || renamingId || menu) return;
      if (selected.length === 0) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        setConfirm({ ids: selected });
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        if (selected.length === 1) {
          duplicateWall(selected[0]);
          track('wall_duplicated', { wallId: selected[0] });
          showToast(t('toast.wallDuplicated'), 'success');
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selected, confirm, renamingId, menu, duplicateWall, showToast, t]);

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
          borderBottom: 'none',
          background: '#FAFAFA',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700, color: '#333', display: 'flex', alignItems: 'center', gap: 6 }}>
          <img src={logoSvg} alt="" style={{ width: 18, height: 18 }} />
          Mind on Wall
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {manageMode ? (
            <>
              <span style={{ fontSize: 12, color: '#999' }}>{t('common.selected', { n: selected.length })}</span>
              {/* v0.4: Manage 模式 Move-to 批量归类 */}
              {spaces.length > 1 && (
                <div style={{ position: 'relative' }}>
                  <HeaderButton
                    label={t('space.moveTo')}
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
                        border: 'none',
                        borderRadius: 8,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)',
                        padding: '4px 0',
                        minWidth: 140,
                        zIndex: 10000,
                      }}
                    >
                      {spaces.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => {
                            selected.forEach((id) => moveWallToSpace(id, p.id));
                            track('wall_moved_to_space', { spaceId: p.id, count: selected.length });
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
              {/* v0.7: + New Space */}
              {newSpaceInput ? (
                <NewSpaceInline
                  onDone={(name) => { addSpace(name); track('space_created'); setNewSpaceInput(false); }}
                  onCancel={() => setNewSpaceInput(false)}
                />
              ) : (
                <HeaderButton label={`+ ${t('space.new')}`} onClick={() => setNewSpaceInput(true)} />
              )}
              <HeaderButton label={t('ov.newWall')} onClick={handleNewWall} />
              {/* v0.7: 视图切换（文件夹 / 列表） */}
              <button
                onClick={() => setSpaceViewMode((v) => v === 'folder' ? 'list' : 'folder')}
                title={spaceViewMode === 'folder' ? t('space.listView') : t('space.folderView')}
                style={{
                  width: 28, height: 28, border: 'none', background: 'transparent',
                  borderRadius: 6, cursor: 'pointer', fontSize: 14, color: '#666',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#F0F0F0'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              >
                {spaceViewMode === 'folder' ? '☰' : '⊞'}
              </button>
              {/* 头像入口（v0.2：顶栏最右侧） */}
              <div style={{ marginLeft: 8 }}>
                <AvatarMenu />
              </div>
            </>
          )}
        </div>
      </div>

      {/* v0.7: 按 Space 分组的卡片网格 */}
      <div
        ref={gridRef}
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '16px 24px',
          position: 'relative',
        }}
        onPointerDown={(e) => {
          // v0.5 B3: Box select — only start on empty area (not on cards)
          if (e.target === e.currentTarget || (e.target as HTMLElement).dataset?.gridArea === 'true') {
            boxSelecting.current = true;
            setBoxSelect({ startX: e.clientX, startY: e.clientY, endX: e.clientX, endY: e.clientY });
          }
        }}
        onPointerMove={(e) => {
          if (!boxSelecting.current) return;
          setBoxSelect((prev) => prev ? { ...prev, endX: e.clientX, endY: e.clientY } : null);
        }}
        onPointerUp={() => {
          if (!boxSelecting.current || !boxSelect || !gridRef.current) {
            boxSelecting.current = false;
            setBoxSelect(null);
            return;
          }
          boxSelecting.current = false;
          // Calculate selection rectangle
          const rect = { left: Math.min(boxSelect.startX, boxSelect.endX), right: Math.max(boxSelect.startX, boxSelect.endX), top: Math.min(boxSelect.startY, boxSelect.endY), bottom: Math.max(boxSelect.startY, boxSelect.endY) };
          // If selection box is too small, ignore
          if (rect.right - rect.left < 10 && rect.bottom - rect.top < 10) {
            setBoxSelect(null);
            return;
          }
          // Find cards that intersect with selection rectangle
          const cardEls = gridRef.current.querySelectorAll('[data-wall-card]');
          const newSelected: string[] = [];
          cardEls.forEach((el) => {
            const cardRect = el.getBoundingClientRect();
            const wallId = (el as HTMLElement).dataset.wallCard;
            if (!wallId) return;
            if (cardRect.left < rect.right && cardRect.right > rect.left && cardRect.top < rect.bottom && cardRect.bottom > rect.top) {
              newSelected.push(wallId);
            }
          });
          if (newSelected.length > 0) {
            setSelected(newSelected);
            setManageMode(true);
          }
          setBoxSelect(null);
        }}
      >
        {spaceViewMode === 'folder' ? (
        spaces.length > 0 ? (
          spaces.map((space) => {
            const spaceWalls = walls.filter((w) => space.wallIds.includes(w.id));
            const isCollapsed = collapsed[space.id];
            return (
              <div key={space.id} style={{ marginBottom: 20 }}>
                {/* Space 标题栏 — 文件夹样式 */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 12,
                    cursor: 'pointer',
                    userSelect: 'none',
                    padding: '4px 8px',
                    borderRadius: 6,
                    background: dropSpaceId === space.id ? 'rgba(74,144,217,0.08)' : 'transparent',
                    border: dropSpaceId === space.id ? '1px dashed #4A90D9' : '1px solid transparent',
                    transition: 'background 0.15s, border 0.15s',
                  }}
                  onClick={() => setCollapsed((prev) => ({ ...prev, [space.id]: !prev[space.id] }))}
                  onDragOver={(e) => {
                    if (!dragWallId) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    setDropSpaceId(space.id);
                  }}
                  onDragLeave={() => setDropSpaceId(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragWallId) {
                      moveWallToSpace(dragWallId, space.id);
                      track('wall_moved_to_space', { spaceId: space.id, wallId: dragWallId });
                      showToast(t('toast.wallMoved') || 'Wall moved', 'success');
                    }
                    setDragWallId(null);
                    setDropSpaceId(null);
                  }}
                >
                  <span style={{ fontSize: 12, color: '#999', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.15s', display: 'inline-block' }}>▼</span>
                  {space.color && (
                    <span style={{ width: 2, height: 16, background: space.color, flexShrink: 0, borderRadius: 1 }} />
                  )}
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>{space.name}</span>
                  <span style={{ fontSize: 11, color: '#BBB' }}>({spaceWalls.length})</span>
                  {/* Space 三点菜单 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSpaceMenu({ spaceId: space.id, x: e.clientX, y: e.clientY });
                    }}
                    style={{
                      marginLeft: 'auto',
                      width: 28,
                      height: 28,
                      border: 'none',
                      background: 'transparent',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: 16,
                      color: '#999',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#F0F0F0'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                  >
                    ⋮
                  </button>
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
                    {spaceWalls.map((wall) => (
                      <WallCard
                        key={wall.id}
                        wall={wall}
                        manageMode={manageMode}
                        checked={selected.includes(wall.id)}
                        onClick={() => handleCardClick(wall)}
                        onMenuOpen={(x, y) => setMenu({ wallId: wall.id, x, y })}
                        isDragging={dragWallId === wall.id}
                        isDropTarget={dropCardId === wall.id}
                        onDragStart={() => setDragWallId(wall.id)}
                        onDragEnd={() => { setDragWallId(null); setDropCardId(null); }}
                        onDragOver={() => { if (dragWallId && dragWallId !== wall.id) setDropCardId(wall.id); }}
                        onDragLeave={() => setDropCardId(null)}
                        onDrop={() => {
                          if (dragWallId && dragWallId !== wall.id) {
                            // v0.7: Dragging a wall onto another wall — if different Space, create new Space
                            const allSpaces = useOverviewStore.getState().spaces;
                            const srcSpace = allSpaces.find((p) => p.wallIds.includes(dragWallId));
                            const tgtSpace = allSpaces.find((p) => p.wallIds.includes(wall.id));
                            if (srcSpace && tgtSpace && srcSpace.id !== tgtSpace.id) {
                              // Different spaces: create new Space and merge both walls
                              const newName = `Space ${String(allSpaces.length + 1).padStart(2, '0')}`;
                              addSpace(newName);
                              const newSpaces = useOverviewStore.getState().spaces;
                              const created = newSpaces[newSpaces.length - 1];
                              if (created) {
                                moveWallToSpace(dragWallId, created.id);
                                moveWallToSpace(wall.id, created.id);
                                track('space_created_from_merge', { spaceId: created.id });
                                showToast(t('toast.spaceCreated') || 'Space created', 'success');
                              }
                            } else if (tgtSpace) {
                              moveWallToSpace(dragWallId, tgtSpace.id);
                              track('wall_moved_to_space', { spaceId: tgtSpace.id, wallId: dragWallId });
                              showToast(t('toast.wallMoved') || 'Wall moved', 'success');
                            }
                          }
                          setDragWallId(null);
                          setDropCardId(null);
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          // 无 Space 时直接显示所有墙（兼容旧数据未迁移场景）
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
                isDragging={dragWallId === wall.id}
                isDropTarget={dropCardId === wall.id}
                onDragStart={() => setDragWallId(wall.id)}
                onDragEnd={() => { setDragWallId(null); setDropCardId(null); }}
                onDragOver={() => { if (dragWallId && dragWallId !== wall.id) setDropCardId(wall.id); }}
                onDragLeave={() => setDropCardId(null)}
                onDrop={() => {
                  if (dragWallId && dragWallId !== wall.id) {
                    // v0.7: Drag wall onto wall — different Spaces → create new Space merge
                    const allSp = useOverviewStore.getState().spaces;
                    const srcSp = allSp.find((p) => p.wallIds.includes(dragWallId));
                    const tgtSp = allSp.find((p) => p.wallIds.includes(wall.id));
                    if (srcSp && tgtSp && srcSp.id !== tgtSp.id) {
                      const nm = `Space ${String(allSp.length + 1).padStart(2, '0')}`;
                      addSpace(nm);
                      const ns = useOverviewStore.getState().spaces;
                      const cr = ns[ns.length - 1];
                      if (cr) { moveWallToSpace(dragWallId, cr.id); moveWallToSpace(wall.id, cr.id); }
                    } else if (tgtSp) {
                      moveWallToSpace(dragWallId, tgtSp.id);
                    }
                  }
                  setDragWallId(null);
                  setDropCardId(null);
                }}
              />
            ))}
          </div>
        )
        ) : (
          /* v0.7: 列表视图 — 每行 Space 名称 + 墙数量 + 操作 */
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            {spaces.map((space) => {
              const spaceWalls = walls.filter((w) => space.wallIds.includes(w.id));
              return (
                <div
                  key={space.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', marginBottom: 2,
                    background: '#FFFFFF', borderRadius: 6,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    if (spaceWalls.length === 1) {
                      openWall(spaceWalls[0].id);
                      setViewMode('wall');
                    }
                  }}
                >
                  <span style={{ fontSize: 16 }}>📁</span>
                  {space.color && <span style={{ width: 3, height: 20, background: space.color, borderRadius: 2, flexShrink: 0 }} />}
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#333', flex: 1 }}>{space.name}</span>
                  <span style={{ fontSize: 11, color: '#BBB' }}>
                    {spaceWalls.length === 1
                      ? t('space.wallOne', { n: spaceWalls.length })
                      : t('space.wallMany', { n: spaceWalls.length })}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSpaceMenu({ spaceId: space.id, x: e.clientX, y: e.clientY });
                    }}
                    style={{
                      width: 24, height: 24, border: 'none', background: 'transparent',
                      borderRadius: 4, cursor: 'pointer', fontSize: 14, color: '#999',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#F0F0F0'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                  >⋮</button>
                </div>
              );
            })}
          </div>
        )
        }
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

      {/* Space 三点菜单 */}
      {spaceMenu && (
        <SpaceMenu
          x={spaceMenu.x}
          y={spaceMenu.y}
          spaceId={spaceMenu.spaceId}
          onClose={() => setSpaceMenu(null)}
          onRename={() => {
            setSpaceMenu(null);
            setRenamingSpaceId(spaceMenu.spaceId);
          }}
          onDelete={() => {
            setSpaceMenu(null);
            setConfirmSpaceDelete(spaceMenu.spaceId);
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

      {/* Space 重命名弹窗 */}
      {renamingSpaceId && (
        <RenameSpaceOverlay spaceId={renamingSpaceId} onClose={() => setRenamingSpaceId(null)} />
      )}

      {/* Space 删除确认 */}
      {confirmSpaceDelete && (
        <ConfirmDialog
          message={t('space.confirmDelete')}
          onCancel={() => setConfirmSpaceDelete(null)}
          onConfirm={() => {
            removeSpace(confirmSpaceDelete);
            track('space_deleted', { spaceId: confirmSpaceDelete });
            setConfirmSpaceDelete(null);
            showToast(t('toast.deleted'), 'success');
          }}
        />
      )}

      {/* v0.5 B3: Box selection rectangle overlay */}
      {boxSelect && (
        <div
          style={{
            position: 'fixed',
            left: Math.min(boxSelect.startX, boxSelect.endX),
            top: Math.min(boxSelect.startY, boxSelect.endY),
            width: Math.abs(boxSelect.endX - boxSelect.startX),
            height: Math.abs(boxSelect.endY - boxSelect.startY),
            border: '1px solid #4A90D9',
            background: 'rgba(74,144,217,0.08)',
            borderRadius: 2,
            pointerEvents: 'none',
            zIndex: 9998,
          }}
        />
      )}
    </div>
  );
}

function RenameSpaceOverlay({ spaceId, onClose }: { spaceId: string; onClose: () => void }) {
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
          <button onClick={commit} style={dialogBtnStyle(true)}>{t('common.save')}</button>
        </div>
      </div>
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

/** v0.7: 重命名 Space 弹窗（合并后使用） */

/* ── 卡片 ─── */
function WallCard({
  wall,
  manageMode,
  checked,
  onClick,
  onMenuOpen,
  isDragging,
  isDropTarget,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  wall: WallSummary;
  manageMode: boolean;
  checked: boolean;
  onClick: () => void;
  onMenuOpen: (x: number, y: number) => void;
  isDragging?: boolean;
  isDropTarget?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onDragOver?: () => void;
  onDragLeave?: () => void;
  onDrop?: () => void;
}) {
  const t = useT();
  const wallpaperStyle = getWallpaperStyle(wall.wallpaper);

  return (
    <div
      data-wall-card={wall.id}
      onClick={onClick}
      onDoubleClick={(e) => {
        e.preventDefault();
        // v0.5 B4: Double-click always opens wall
        if (!manageMode) onClick();
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        onMenuOpen(e.clientX, e.clientY);
      }}
      draggable={!manageMode}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', wall.id);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart?.();
      }}
      onDragEnd={() => onDragEnd?.()}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        onDragOver?.();
      }}
      onDragLeave={() => onDragLeave?.()}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDrop?.();
      }}
      style={{
        // v0.3: 宽度跟随网格列自适应
        width: '100%',
        height: 200,
        background: '#FFFFFF',
        border: checked ? '2px solid #4A90D9' : isDropTarget ? '2px dashed #4A90D9' : 'none',
        borderRadius: 8,
        boxShadow: checked ? 'none' : '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        overflow: 'hidden',
        cursor: manageMode ? 'pointer' : 'grab',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, opacity 0.15s',
        opacity: isDragging ? 0.4 : 1,
        transform: isDropTarget ? 'scale(1.02)' : 'scale(1)',
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
  const spaces = useOverviewStore((s) => s.spaces);
  const moveWallToSpace = useOverviewStore((s) => s.moveWallToSpace);
  const renameSpace = useOverviewStore((s) => s.renameSpace);
  const removeSpace = useOverviewStore((s) => s.removeSpace);
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

/* ─── Space 三点菜单 ─── */
function SpaceMenu({
  x,
  y,
  spaceId,
  onClose,
  onRename,
  onDelete,
}: {
  x: number;
  y: number;
  spaceId: string;
  onClose: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const t = useT();

  void spaceId;

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
    { key: 'rename', label: t('space.rename'), action: onRename },
    { key: 'delete', label: t('common.delete'), danger: true, action: onDelete },
  ];

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
      {items.map((it) => (
        <div
          key={it.key}
          onClick={() => it.action()}
          style={{
            height: 32,
            display: 'flex',
            alignItems: 'center',
            padding: '0 14px',
            fontSize: 13,
            color: it.danger ? '#C0392B' : '#333',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#F5F5F5'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
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

function dialogBtnStyle(primary: boolean, variant: 'danger' | 'primary' = 'danger'): React.CSSProperties {
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

/* ─── v0.7: 新建 Space 内联输入 ─── */
function NewSpaceInline({
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
