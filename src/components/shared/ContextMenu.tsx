import { useEffect, useRef, useCallback } from 'react';
import { useWallStore } from '../../store/useWallStore';
import { useUIStore } from '../../store/useUIStore';
import { useT } from '../../i18n/useT';
import type { Item } from '../../store/types';

/** Stamp 预设颜色（v0.2：颜色写入 item.color，不再切换 stampId） */
const STAMP_COLORS = ['#3B82F6', '#6B7280', '#EF4444', '#22C55E', '#EAB308'];

/** 便利贴 8 色 */
const STICKY_COLORS = [
  '#FFF3B0', '#FFB3BA', '#BAFFC9', '#BAE1FF',
  '#E8D5FF', '#FFD8B1', '#F5F5F5', '#2C2C2C',
];

/** Note / Torn 纸面预设色 */
const PAPER_COLORS = [
  '#FFFFFF', '#F5F0E8', '#FFF3B0', '#FFB3BA',
  '#BAFFC9', '#BAE1FF', '#E8D5FF', '#FFD8B1',
];

/** Tape 预设色 */
const TAPE_COLORS = ['#FDE68A', '#FBCFE8', '#BBF7D0', '#BFDBFE', '#FCA5A5', '#DDD6FE'];

/** Rope 预设色（v0.2：右键改绳子颜色） */
const ROPE_COLORS = ['#8B6914', '#8B5E3C', '#6B7280', '#C0392B', '#2E7D32', '#3B82F6'];

interface ContextMenuProps {
  /** 画布缩放（用于将屏幕坐标转为画布坐标） */
  zoom?: number;
}

/**
 * 右键上下文菜单。
 * 完全扁平设计：纯白背景，1px #E0E0E0 边框，border-radius 8px，无投影。
 */
export function ContextMenu({ zoom = 1 }: ContextMenuProps) {
  const contextMenu = useUIStore((s) => s.contextMenu);
  const closeContextMenu = useUIStore((s) => s.closeContextMenu);
  const startAttachMode = useUIStore((s) => s.startAttachMode);
  const openAssetPicker = useUIStore((s) => s.openAssetPicker);
  const showToast = useUIStore((s) => s.showToast);
  const items = useWallStore((s) => s.items);
  const removeItem = useWallStore((s) => s.removeItem);
  const removeRope = useWallStore((s) => s.removeRope);
  const updateRope = useWallStore((s) => s.updateRope);
  const updateItem = useWallStore((s) => s.updateItem);
  const detachStamp = useWallStore((s) => s.detachStamp);
  const bringToFront = useWallStore((s) => s.bringToFront);
  const sendToBack = useWallStore((s) => s.sendToBack);
  const t = useT();

  const menuRef = useRef<HTMLDivElement>(null);

  // 点击菜单外关闭
  useEffect(() => {
    if (!contextMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeContextMenu();
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeContextMenu();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [contextMenu, closeContextMenu]);

  const handleItemClick = useCallback((fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
    closeContextMenu();
  }, [closeContextMenu]);

  if (!contextMenu) return null;

  // Rope 右键菜单（v0.2 修订：改绳色 + 删除）
  if (contextMenu.type === 'rope') {
    const rope = useWallStore.getState().ropes.find((r) => r.id === contextMenu.ropeId);
    return (
      <div
        ref={menuRef}
        data-menu-layer
        style={{
          position: 'fixed',
          left: contextMenu.x,
          top: contextMenu.y,
          background: '#FFFFFF',
          border: '1px solid #E0E0E0',
          borderRadius: 8,
          padding: '4px 0',
          minWidth: 180,
          zIndex: 9999,
          userSelect: 'none',
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div style={{ padding: '4px 14px', fontSize: 13, color: '#333' }}>{t('ctx.changeColor')}</div>
        <ColorRow
          colors={ROPE_COLORS}
          current={rope?.color}
          onSelect={(color) => updateRope(contextMenu.ropeId, { color })}
          onDone={closeContextMenu}
        />
        <Divider />
        <MenuItem
          label={t('common.delete')}
          danger
          onClick={handleItemClick(() => {
            removeRope(contextMenu.ropeId);
          })}
        />
      </div>
    );
  }

  const { itemId, x, y } = contextMenu;
  const item = items.find((i) => i.id === itemId);
  if (!item) return null;

  return (
    <div
      ref={menuRef}
      data-menu-layer
      style={{
        position: 'fixed',
        left: x,
        top: y,
        background: '#FFFFFF',
        border: '1px solid #E0E0E0',
        borderRadius: 8,
        padding: '4px 0',
        minWidth: 180,
        zIndex: 9999,
        userSelect: 'none',
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {item.type === 'stamp' && (
        <StampMenuItems
          item={item}
          onItemClick={handleItemClick}
          startAttachMode={startAttachMode}
          detachStamp={detachStamp}
          updateItem={updateItem}
          bringToFront={bringToFront}
          sendToBack={sendToBack}
          removeItem={removeItem}
          closeMenu={closeContextMenu}
        />
      )}
      {item.type === 'picture' && (
        <PictureMenuItems
          item={item}
          onItemClick={handleItemClick}
          openAssetPicker={openAssetPicker}
          bringToFront={bringToFront}
          sendToBack={sendToBack}
          removeItem={removeItem}
        />
      )}
      {item.type === 'paper' && (
        <PaperMenuItems
          item={item}
          onItemClick={handleItemClick}
          updateItem={updateItem}
          bringToFront={bringToFront}
          sendToBack={sendToBack}
          removeItem={removeItem}
          closeMenu={closeContextMenu}
        />
      )}
    </div>
  );
}

/* ─── 通用菜单项组件 ─── */
function MenuItem({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: (e: React.MouseEvent) => void;
  danger?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <div
        onClick={onClick}
        style={{
          height: 36,
          display: 'flex',
          alignItems: 'center',
          padding: '0 14px',
          fontSize: 13,
          color: danger ? '#C0392B' : '#333',
          cursor: 'pointer',
          justifyContent: 'space-between',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.background = '#F5F5F5';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.background = 'transparent';
        }}
      >
        <span>{label}</span>
        {children}
      </div>
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: '#EEE', margin: '4px 0' }} />;
}

/* ─── 颜色选择行：预设色点 + 自定义调色盘（v0.2） ─── */
function ColorRow({
  colors,
  current,
  onSelect,
  onDone,
}: {
  colors: string[];
  current?: string;
  onSelect: (color: string) => void;
  /** 点选预设色后回调（关闭菜单）；调色盘微调不触发 */
  onDone?: () => void;
}) {
  const pickerValue = /^#[0-9a-fA-F]{6}$/.test(current ?? '') ? current : '#FFFFFF';
  return (
    <div style={{ display: 'flex', gap: 6, padding: '6px 14px', flexWrap: 'wrap', alignItems: 'center' }}>
      {colors.map((c) => (
        <div
          key={c}
          title={c}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(c);
            onDone?.();
          }}
          style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: c,
            border: current === c ? '2px solid #4A90D9' : '1px solid #DDD',
            cursor: 'pointer',
            boxSizing: 'border-box',
          }}
        />
      ))}
      {/* 自定义调色盘 */}
      <label
        title={useT()('ctx.customColor')}
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          border: '1px dashed #BBB',
          cursor: 'pointer',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          color: '#999',
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
    </div>
  );
}

/* ─── Stamp 菜单项 ─── */
function StampMenuItems({
  item,
  onItemClick,
  startAttachMode,
  detachStamp,
  updateItem,
  bringToFront,
  sendToBack,
  removeItem,
  closeMenu,
}: {
  item: Item;
  onItemClick: (fn: () => void) => (e: React.MouseEvent) => void;
  startAttachMode: (stampId: string) => void;
  detachStamp: (stampId: string) => void;
  updateItem: (id: string, patch: Partial<Item>) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  removeItem: (id: string) => void;
  closeMenu: () => void;
}) {
  const isAttached = !!item.parentId;
  const showToast = useUIStore((s) => s.showToast);
  const t = useT();

  return (
    <>
      {!isAttached && (
        <MenuItem label={t('ctx.attach')} onClick={onItemClick(() => startAttachMode(item.id))} />
      )}
      {isAttached && (
        <MenuItem
          label={t('ctx.detach')}
          onClick={onItemClick(() => {
            detachStamp(item.id);
            showToast(t('toast.stampDetached'), 'success', 2000);
          })}
        />
      )}
      <Divider />
      <MenuItem label={t('ctx.front')} onClick={onItemClick(() => bringToFront(item.id))} />
      <MenuItem label={t('ctx.back')} onClick={onItemClick(() => sendToBack(item.id))} />
      <Divider />
      <div style={{ padding: '4px 14px', fontSize: 13, color: '#333' }}>{t('ctx.changeColor')}</div>
      <ColorRow
        colors={STAMP_COLORS}
        current={item.color}
        onSelect={(color) => updateItem(item.id, { color })}
        onDone={closeMenu}
      />
      <Divider />
      <MenuItem label={t('common.delete')} danger onClick={onItemClick(() => removeItem(item.id))} />
    </>
  );
}

/* ─── Picture 菜单项 ─── */
function PictureMenuItems({
  item,
  onItemClick,
  openAssetPicker,
  bringToFront,
  sendToBack,
  removeItem,
}: {
  item: Item;
  onItemClick: (fn: () => void) => (e: React.MouseEvent) => void;
  openAssetPicker: (pictureId: string) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  removeItem: (id: string) => void;
}) {
  const t = useT();
  return (
    <>
      <MenuItem label={t('ctx.replaceImage')} onClick={onItemClick(() => openAssetPicker(item.id))} />
      <Divider />
      <MenuItem label={t('ctx.front')} onClick={onItemClick(() => bringToFront(item.id))} />
      <MenuItem label={t('ctx.back')} onClick={onItemClick(() => sendToBack(item.id))} />
      <Divider />
      <MenuItem label={t('common.delete')} onClick={onItemClick(() => removeItem(item.id))} />
    </>
  );
}

/* ─── Paper 菜单项 ─── */
function PaperMenuItems({
  item,
  onItemClick,
  updateItem,
  bringToFront,
  sendToBack,
  removeItem,
  closeMenu,
}: {
  item: Item;
  onItemClick: (fn: () => void) => (e: React.MouseEvent) => void;
  updateItem: (id: string, patch: Partial<Item>) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  removeItem: (id: string) => void;
  closeMenu: () => void;
}) {
  // v0.2：所有 paper 变体均支持改色（预设色点 + 调色盘）
  const colors =
    item.variant === 'sticky' ? STICKY_COLORS
    : item.variant === 'tape' ? TAPE_COLORS
    : PAPER_COLORS;
  const t = useT();

  return (
    <>
      <div style={{ padding: '4px 14px', fontSize: 13, color: '#333' }}>{t('ctx.changeColor')}</div>
      <ColorRow
        colors={colors}
        current={item.color}
        onSelect={(color) => updateItem(item.id, { color })}
        onDone={closeMenu}
      />
      <Divider />
      <MenuItem label={t('ctx.front')} onClick={onItemClick(() => bringToFront(item.id))} />
      <MenuItem label={t('ctx.back')} onClick={onItemClick(() => sendToBack(item.id))} />
      <Divider />
      <MenuItem label={t('common.delete')} onClick={onItemClick(() => removeItem(item.id))} />
    </>
  );
}
