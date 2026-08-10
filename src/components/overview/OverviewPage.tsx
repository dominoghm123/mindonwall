import { useCallback, useEffect, useState } from 'react';
import { useOverviewStore } from '../../store/useOverviewStore';
import { useAssetStore } from '../../store/useAssetStore';
import { useUIStore } from '../../store/useUIStore';
import { getWallpaperStyle } from '../../utils/wallpaperCSS';
import { AvatarMenu } from '../shared/AvatarMenu';
import type { Space } from '../../store/types';
import { useT } from '../../i18n/useT';
import logoSvg from '../../assets/logo.svg';
import { track } from '../../utils/analytics';
import {
  SPACE_COLORS,
  UNCATEGORIZED_ID,
  ColorDots,
  SpaceMenu,
  ConfirmDialog,
  HeaderButton,
  RenameSpaceOverlay,
  NewSpaceInline,
} from './shared';

/**
 * 总览页（v0.8 两级交互 · L1 Spaces 主页）。
 * - 只显示 Space 卡片网格（封面拼贴 + 标签色条 + 名称 + 墙数）
 * - 点击卡片进入 Space 详情页（L2）
 * - ⋮ / 右键：Rename / Change Color / Delete（Uncategorized 不可编辑）
 * - Manage 模式多选 Space：批量删除、批量改标签色
 * - v0.8 移除：列表视图、框选、全部拖拽交互
 */
export function OverviewPage() {
  const walls = useOverviewStore((s) => s.walls);
  const spaces = useOverviewStore((s) => s.spaces);
  const addWall = useOverviewStore((s) => s.addWall);
  const addSpace = useOverviewStore((s) => s.addSpace);
  const removeSpace = useOverviewStore((s) => s.removeSpace);
  const setSpaceColor = useOverviewStore((s) => s.setSpaceColor);
  const captureCurrentWall = useOverviewStore((s) => s.captureCurrentWall);
  const homeBackground = useOverviewStore((s) => s.homeBackground);
  const homeBackgroundImage = useOverviewStore((s) => s.homeBackgroundImage);
  const setViewMode = useUIStore((s) => s.setViewMode);
  const setActiveSpace = useUIStore((s) => s.setActiveSpace);
  const showToast = useUIStore((s) => s.showToast);
  const t = useT();

  const [manageMode, setManageMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [spaceMenu, setSpaceMenu] = useState<{ spaceId: string; x: number; y: number } | null>(null);
  const [renamingSpaceId, setRenamingSpaceId] = useState<string | null>(null);
  const [confirmSpaceDelete, setConfirmSpaceDelete] = useState<string[] | null>(null);
  const [newSpaceInput, setNewSpaceInput] = useState(false);

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

  const openSpace = useCallback(
    (spaceId: string) => {
      setActiveSpace(spaceId);
      setViewMode('space');
    },
    [setActiveSpace, setViewMode],
  );

  const toggleSelect = useCallback((spaceId: string) => {
    setSelected((prev) =>
      prev.includes(spaceId) ? prev.filter((id) => id !== spaceId) : [...prev, spaceId],
    );
  }, []);

  const exitManage = useCallback(() => {
    setManageMode(false);
    setSelected([]);
  }, []);

  // Uncategorized 空时隐藏；其余 Space 全部显示
  const visibleSpaces = spaces.filter(
    (s) => s.id !== UNCATEGORIZED_ID || s.wallIds.length > 0,
  );

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
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
              {/* 批量改标签色 */}
              {selected.length > 0 && (
                <ColorDots
                  colors={SPACE_COLORS}
                  size={16}
                  onSelect={(color) => {
                    selected.forEach((id) => setSpaceColor(id, color));
                    track('space_color_changed', { count: selected.length });
                  }}
                />
              )}
              <HeaderButton
                label={`${t('common.delete')}${selected.length > 0 ? ` (${selected.length})` : ''}`}
                danger={selected.length > 0}
                disabled={selected.length === 0}
                onClick={() => setConfirmSpaceDelete(selected)}
              />
              <HeaderButton label={t('common.cancel')} onClick={exitManage} />
            </>
          ) : (
            <>
              <HeaderButton label={t('ov.manage')} onClick={() => setManageMode(true)} />
              {newSpaceInput ? (
                <NewSpaceInline
                  onDone={(name) => { addSpace(name); track('space_created'); setNewSpaceInput(false); }}
                  onCancel={() => setNewSpaceInput(false)}
                />
              ) : (
                <HeaderButton label={`+ ${t('space.new')}`} onClick={() => setNewSpaceInput(true)} />
              )}
              <HeaderButton label={t('ov.newWall')} onClick={handleNewWall} />
              <div style={{ marginLeft: 8 }}>
                <AvatarMenu />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Space 卡片网格 */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 280px))',
            gap: 20,
            justifyContent: 'center',
            alignContent: 'start',
          }}
        >
          {visibleSpaces.map((space) => (
            <SpaceCard
              key={space.id}
              space={space}
              manageMode={manageMode}
              checked={selected.includes(space.id)}
              onClick={() => (manageMode ? toggleSelect(space.id) : openSpace(space.id))}
              onMenuOpen={(x, y) => setSpaceMenu({ spaceId: space.id, x, y })}
            />
          ))}
        </div>
      </div>

      {/* Space 菜单（⋮ / 右键；Uncategorized 仅 Rename） */}
      {spaceMenu && (
        <SpaceMenu
          x={spaceMenu.x}
          y={spaceMenu.y}
          spaceId={spaceMenu.spaceId}
          isUncategorized={spaceMenu.spaceId === UNCATEGORIZED_ID}
          onClose={() => setSpaceMenu(null)}
          onRename={() => {
            setSpaceMenu(null);
            setRenamingSpaceId(spaceMenu.spaceId);
          }}
          onDelete={() => {
            setSpaceMenu(null);
            setConfirmSpaceDelete([spaceMenu.spaceId]);
          }}
        />
      )}

      {/* Space 重命名弹窗 */}
      {renamingSpaceId && (
        <RenameSpaceOverlay spaceId={renamingSpaceId} onClose={() => setRenamingSpaceId(null)} />
      )}

      {/* Space 删除确认（单个/批量） */}
      {confirmSpaceDelete && (
        <ConfirmDialog
          message={t('space.confirmDelete')}
          onCancel={() => setConfirmSpaceDelete(null)}
          onConfirm={() => {
            confirmSpaceDelete.forEach((id) => {
              removeSpace(id);
              track('space_deleted', { spaceId: id });
            });
            setSelected([]);
            setManageMode(false);
            setConfirmSpaceDelete(null);
            showToast(t('toast.deleted'), 'success');
          }}
        />
      )}
    </div>
  );
}

/* ─── 封面拼贴：首面墙的墙纸 + 前 3 张照片 ─── */
const MINI_SLOTS = [
  { left: '12%', top: '14%', width: 70, height: 52, rot: -3 },
  { left: '44%', top: '30%', width: 64, height: 48, rot: 2 },
  { left: '70%', top: '10%', width: 56, height: 42, rot: -1.5 },
];

function SpaceCover({ space }: { space: Space }) {
  const walls = useOverviewStore((s) => s.walls);
  const wallData = useOverviewStore((s) => s.wallData);
  const assets = useAssetStore((s) => s.assets);
  const isUncat = space.id === UNCATEGORIZED_ID;
  const firstWall = walls.find((w) => space.wallIds.includes(w.id));
  const wp = firstWall && !isUncat
    ? getWallpaperStyle(firstWall.wallpaper)
    : { backgroundColor: '#F5F5F5' };
  const pictures = firstWall
    ? (wallData[firstWall.id]?.items ?? []).filter((i) => i.type === 'picture' && i.assetId).slice(0, 3)
    : [];

  return (
    <div style={{ height: '70%', position: 'relative', overflow: 'hidden', ...wp }}>
      {pictures.map((p, idx) => {
        const slot = MINI_SLOTS[idx];
        if (!slot) return null;
        return (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: slot.left,
              top: slot.top,
              width: slot.width,
              height: slot.height,
              transform: `rotate(${slot.rot}deg)`,
              background: '#FFF',
              padding: 3,
              boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
            }}
          >
            <img
              src={assets.find((a) => a.id === p.assetId)?.dataUrl ?? `/demo-assets/${p.assetId}.jpg`}
              alt=""
              style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {/* 迷你 Pin */}
            <div
              style={{
                position: 'absolute',
                top: -4,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'radial-gradient(circle at 35% 30%, #FFF, #DDD 70%)',
                boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

/* ─── Space 卡片 ─── */
function SpaceCard({
  space,
  manageMode,
  checked,
  onClick,
  onMenuOpen,
}: {
  space: Space;
  manageMode: boolean;
  checked: boolean;
  onClick: () => void;
  onMenuOpen: (x: number, y: number) => void;
}) {
  const t = useT();
  const walls = useOverviewStore((s) => s.walls);
  const isUncat = space.id === UNCATEGORIZED_ID;
  const wallCount = space.wallIds.filter((id) => walls.some((w) => w.id === id)).length;
  // v0.8 微调：Uncategorized 可重命名 —— 默认名显示本地化翻译，改名后显示新名
  const displayName = isUncat && (!space.name || space.name === 'Uncategorized')
    ? t('space.uncategorized')
    : space.name;

  return (
    <div
      onClick={onClick}
      onContextMenu={(e) => {
        if (manageMode) return;
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
        opacity: isUncat ? 0.75 : 1,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      }}
    >
      {/* 管理模式 checkbox */}
      {manageMode && !isUncat && (
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
      <SpaceCover space={space} />
      {/* 信息区：标签色条 + 名称 + 墙数 + ⋮ */}
      <div
        style={{
          height: '30%',
          background: '#FFFFFF',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span
          style={{
            width: 3,
            height: 20,
            borderRadius: 2,
            flexShrink: 0,
            background: space.color ?? (isUncat ? '#CCC' : 'transparent'),
          }}
        />
        <span style={{ fontSize: 13, fontWeight: 700, color: isUncat ? '#999' : '#333', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayName}
        </span>
        <span style={{ fontSize: 10, color: '#BBB', flexShrink: 0 }}>
          {wallCount === 1 ? t('space.wallOne', { n: wallCount }) : t('space.wallMany', { n: wallCount })}
        </span>
        {/* ⋮ 菜单（v0.8 微调：Uncategorized 也可重命名） */}
        {!manageMode && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMenuOpen(e.clientX, e.clientY);
            }}
            title={t('ov.more')}
            style={{
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
              flexShrink: 0,
            }}
          >
            ⋮
          </button>
        )}
      </div>
    </div>
  );
}
