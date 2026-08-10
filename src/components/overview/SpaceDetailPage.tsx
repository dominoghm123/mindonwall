import { useCallback, useEffect, useState } from 'react';
import { useOverviewStore } from '../../store/useOverviewStore';
import { useUIStore } from '../../store/useUIStore';
import { useAssetStore } from '../../store/useAssetStore';
import { useWallStore } from '../../store/useWallStore';
import { AvatarMenu } from '../shared/AvatarMenu';
import { buildShareUrl, copyShareUrl, shareWallServer } from '../../utils/shareWall';
import type { WallSummary } from '../../store/types';
import { useT } from '../../i18n/useT';
import { track } from '../../utils/analytics';
import {
  SPACE_COLORS,
  UNCATEGORIZED_ID,
  ColorDots,
  WallCard,
  CardMenu,
  SpaceMenu,
  ConfirmDialog,
  HeaderButton,
  RenameCardOverlay,
  RenameSpaceOverlay,
} from './shared';

/**
 * Space 详情页（v0.8 两级交互 · L2）。
 * - 顶栏：← Spaces 返回 + 内联重命名 + 常显标签色点行 + 墙计数 + Manage / + New Wall / ⋮
 * - 主体：该 Space 的墙卡片网格（WallCard + CardMenu 与现网一致）
 * - Manage 模式多选墙：批量删除 / 移动 / 分享
 * - Uncategorized：标题不可编辑、无色点、无 ⋮（兜底容器）
 */
export function SpaceDetailPage() {
  const activeSpaceId = useUIStore((s) => s.activeSpaceId);
  const setViewMode = useUIStore((s) => s.setViewMode);
  const setActiveSpace = useUIStore((s) => s.setActiveSpace);
  const showToast = useUIStore((s) => s.showToast);

  const spaces = useOverviewStore((s) => s.spaces);
  const walls = useOverviewStore((s) => s.walls);
  const addWall = useOverviewStore((s) => s.addWall);
  const openWall = useOverviewStore((s) => s.openWall);
  const moveWallToSpace = useOverviewStore((s) => s.moveWallToSpace);
  const duplicateWall = useOverviewStore((s) => s.duplicateWall);
  const exportWallJSON = useOverviewStore((s) => s.exportWallJSON);
  const removeWalls = useOverviewStore((s) => s.removeWalls);
  const removeSpace = useOverviewStore((s) => s.removeSpace);
  const setSpaceColor = useOverviewStore((s) => s.setSpaceColor);
  const captureCurrentWall = useOverviewStore((s) => s.captureCurrentWall);

  const t = useT();
  const space = spaces.find((s) => s.id === activeSpaceId);
  const isUncat = space?.id === UNCATEGORIZED_ID;

  const [manageMode, setManageMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<{ ids: string[] } | null>(null);
  const [menu, setMenu] = useState<{ wallId: string; x: number; y: number } | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [spaceMenu, setSpaceMenu] = useState<{ x: number; y: number } | null>(null);
  const [renamingSpace, setRenamingSpace] = useState(false);
  const [confirmSpaceDelete, setConfirmSpaceDelete] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [manageMoveOpen, setManageMoveOpen] = useState(false);

  // 进入详情页时快照当前编辑的墙
  useEffect(() => {
    captureCurrentWall();
  }, [captureCurrentWall]);

  const goBack = useCallback(() => {
    setActiveSpace(null);
    setViewMode('overview');
  }, [setActiveSpace, setViewMode]);

  // Space 不存在（如被删除）→ 自动回到主页
  useEffect(() => {
    if (!space) goBack();
  }, [space, goBack]);

  const spaceWalls: WallSummary[] = space
    ? walls.filter((w) => space.wallIds.includes(w.id))
    : [];

  const handleNewWall = useCallback(() => {
    if (!space) return;
    const id = `wall-${Date.now()}`;
    const name = `Wall ${String(walls.length + 1).padStart(2, '0')}`;
    addWall(id, name);
    moveWallToSpace(id, space.id);
    track('wall_created', { wallId: id, spaceId: space.id });
  }, [space, walls.length, addWall, moveWallToSpace]);

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

  /** Manage 模式批量分享（仅单选时可用） */
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

  // 内联重命名提交
  const commitTitle = useCallback(
    (value: string) => {
      const v = value.trim();
      if (space && v && v !== space.name) {
        useOverviewStore.getState().renameSpace(space.id, v);
        track('space_renamed', { spaceId: space.id });
      }
      setEditingTitle(false);
    },
    [space],
  );

  if (!space) return null;

  const otherSpaces = spaces.filter((p) => p.id !== space.id);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#FFFFFF',
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
          background: '#FAFAFA',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <HeaderButton label={`← ${t('space.back')}`} onClick={goBack} />
          {/* 标题：点击变内联输入框（v0.8 微调：Uncategorized 也可重命名） */}
          {editingTitle ? (
            <input
              autoFocus
              defaultValue={space.name}
              onBlur={(e) => commitTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitTitle((e.target as HTMLInputElement).value);
                if (e.key === 'Escape') setEditingTitle(false);
              }}
              style={{
                height: 26,
                width: 180,
                boxSizing: 'border-box',
                fontSize: 13,
                fontWeight: 700,
                padding: '0 8px',
                border: '1px solid #4A90D9',
                borderRadius: 6,
                outline: 'none',
              }}
            />
          ) : (
            <span
              onClick={() => setEditingTitle(true)}
              title={t('space.rename')}
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: '#1A1A1A',
                cursor: 'text',
                padding: '4px 6px',
                borderRadius: 6,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 260,
              }}
            >
              {isUncat && (!space.name || space.name === 'Uncategorized')
                ? t('space.uncategorized')
                : space.name}
            </span>
          )}
          {/* 常显标签色点行（v0.8 微调：Uncategorized 也可改色） */}
          <ColorDots
            colors={SPACE_COLORS}
            current={space.color}
            size={14}
            withPicker
            onSelect={(color) => {
              setSpaceColor(space.id, color);
              track('space_color_changed', { spaceId: space.id });
            }}
          />
          <span style={{ fontSize: 11, color: '#999', whiteSpace: 'nowrap' }}>
            {spaceWalls.length === 1
              ? t('space.wallOne', { n: spaceWalls.length })
              : t('space.wallMany', { n: spaceWalls.length })}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {manageMode ? (
            <>
              <span style={{ fontSize: 12, color: '#999' }}>{t('common.selected', { n: selected.length })}</span>
              {otherSpaces.length > 0 && (
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
                      {otherSpaces.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => {
                            selected.forEach((id) => moveWallToSpace(id, p.id));
                            track('wall_moved_to_space', { spaceId: p.id, count: selected.length });
                            setManageMoveOpen(false);
                            setSelected([]);
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
              <HeaderButton label={t('ov.newWall')} onClick={handleNewWall} />
              <button
                onClick={(e) => setSpaceMenu({ x: e.clientX, y: e.clientY })}
                  title={t('ov.more')}
                  style={{
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
              <div style={{ marginLeft: 8 }}>
                <AvatarMenu />
              </div>
            </>
          )}
        </div>
      </div>

      {/* 墙卡片网格 */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}>
        {spaceWalls.length === 0 ? (
          <div
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              color: '#999',
              fontSize: 13,
            }}
          >
            <span>{t('space.noWalls')}</span>
            <HeaderButton label={t('ov.newWall')} onClick={handleNewWall} />
          </div>
        ) : (
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
              />
            ))}
          </div>
        )}
      </div>

      {/* 墙卡片菜单 */}
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

      {/* Space 菜单（顶栏 ⋮；Uncategorized 仅 Rename） */}
      {spaceMenu && (
        <SpaceMenu
          x={spaceMenu.x}
          y={spaceMenu.y}
          spaceId={space.id}
          isUncategorized={isUncat}
          onClose={() => setSpaceMenu(null)}
          onRename={() => {
            setSpaceMenu(null);
            setRenamingSpace(true);
          }}
          onDelete={() => {
            setSpaceMenu(null);
            setConfirmSpaceDelete(true);
          }}
        />
      )}

      {/* 删除墙确认 */}
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

      {/* 墙重命名弹窗 */}
      {renamingId && (
        <RenameCardOverlay wallId={renamingId} onClose={() => setRenamingId(null)} />
      )}

      {/* Space 重命名弹窗 */}
      {renamingSpace && (
        <RenameSpaceOverlay spaceId={space.id} onClose={() => setRenamingSpace(false)} />
      )}

      {/* Space 删除确认 → 墙移回 Uncategorized，返回主页 */}
      {confirmSpaceDelete && (
        <ConfirmDialog
          message={t('space.confirmDelete')}
          onCancel={() => setConfirmSpaceDelete(false)}
          onConfirm={() => {
            removeSpace(space.id);
            track('space_deleted', { spaceId: space.id });
            setConfirmSpaceDelete(false);
            showToast(t('toast.deleted'), 'success');
            goBack();
          }}
        />
      )}
    </div>
  );
}
