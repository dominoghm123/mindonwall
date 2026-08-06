import { useEffect, useRef, useCallback } from 'react';
import { useWallStore } from '../../store/useWallStore';
import { useUIStore } from '../../store/useUIStore';
import type { Item } from '../../store/types';

/** Stamp 预设颜色列表 */
const STAMP_COLORS = [
  { id: 'stamp-blue-travel', label: '蓝', color: '#3B82F6' },
  { id: 'stamp-gray-compass', label: '灰', color: '#6B7280' },
  { id: 'stamp-red-passport', label: '红', color: '#EF4444' },
  { id: 'stamp-green-nature', label: '绿', color: '#22C55E' },
  { id: 'stamp-yellow-sunshine', label: '黄', color: '#EAB308' },
];

/** 便利贴 8 色 */
const STICKY_COLORS = [
  '#FFF3B0', '#FFB3BA', '#BAFFC9', '#BAE1FF',
  '#E8D5FF', '#FFD8B1', '#F5F5F5', '#2C2C2C',
];

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
  const items = useWallStore((s) => s.items);
  const removeItem = useWallStore((s) => s.removeItem);
  const removeRope = useWallStore((s) => s.removeRope);
  const updateItem = useWallStore((s) => s.updateItem);
  const detachStamp = useWallStore((s) => s.detachStamp);
  const bringToFront = useWallStore((s) => s.bringToFront);
  const sendToBack = useWallStore((s) => s.sendToBack);

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

  // Rope 右键菜单
  if (contextMenu.type === 'rope') {
    return (
      <div
        ref={menuRef}
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
        <MenuItem
          label="Edit Note"
          onClick={handleItemClick(() => {
            // TODO: 进入 Rope 文字编辑模式
          })}
        />
        <Divider />
        <MenuItem
          label="Delete"
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

/* ─── 颜色选择子菜单 ─── */
function ColorDots({
  colors,
  onSelect,
}: {
  colors: { id: string; label: string; color: string }[];
  onSelect: (id: string) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 6, padding: '6px 14px' }}>
      {colors.map((c) => (
        <div
          key={c.id}
          title={c.label}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(c.id);
          }}
          style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: c.color,
            border: '1px solid #DDD',
            cursor: 'pointer',
          }}
        />
      ))}
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
}: {
  item: Item;
  onItemClick: (fn: () => void) => (e: React.MouseEvent) => void;
  startAttachMode: (stampId: string) => void;
  detachStamp: (stampId: string) => void;
  updateItem: (id: string, patch: Partial<Item>) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  removeItem: (id: string) => void;
}) {
  const isAttached = !!item.parentId;

  return (
    <>
      {!isAttached && (
        <MenuItem label="Attach to Paper" onClick={onItemClick(() => startAttachMode(item.id))} />
      )}
      {isAttached && (
        <MenuItem label="Detach" onClick={onItemClick(() => detachStamp(item.id))} />
      )}
      <Divider />
      <MenuItem label="Bring to Front" onClick={onItemClick(() => bringToFront(item.id))} />
      <MenuItem label="Send to Back" onClick={onItemClick(() => sendToBack(item.id))} />
      <Divider />
      <div style={{ padding: '4px 14px', fontSize: 13, color: '#333' }}>Change Color</div>
      <ColorDots
        colors={STAMP_COLORS}
        onSelect={(stampId) => updateItem(item.id, { stampId })}
      />
      <Divider />
      <MenuItem label="Delete" danger onClick={onItemClick(() => removeItem(item.id))} />
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
  return (
    <>
      <MenuItem label="Replace Image" onClick={onItemClick(() => openAssetPicker(item.id))} />
      <Divider />
      <MenuItem label="Bring to Front" onClick={onItemClick(() => bringToFront(item.id))} />
      <MenuItem label="Send to Back" onClick={onItemClick(() => sendToBack(item.id))} />
      <Divider />
      <MenuItem label="Delete" onClick={onItemClick(() => removeItem(item.id))} />
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
}: {
  item: Item;
  onItemClick: (fn: () => void) => (e: React.MouseEvent) => void;
  updateItem: (id: string, patch: Partial<Item>) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  removeItem: (id: string) => void;
}) {
  const isSticky = item.variant === 'sticky';
  const stickyColorOptions = STICKY_COLORS.map((c, i) => ({ id: `sticky-${i}`, label: c, color: c }));

  return (
    <>
      {isSticky && (
        <>
          <div style={{ padding: '4px 14px', fontSize: 13, color: '#333' }}>Change Color</div>
          <ColorDots
            colors={stickyColorOptions}
            onSelect={(color) => updateItem(item.id, { color })}
          />
          <Divider />
        </>
      )}
      <MenuItem label="Bring to Front" onClick={onItemClick(() => bringToFront(item.id))} />
      <MenuItem label="Send to Back" onClick={onItemClick(() => sendToBack(item.id))} />
      <Divider />
      <MenuItem label="Delete" onClick={onItemClick(() => removeItem(item.id))} />
    </>
  );
}
