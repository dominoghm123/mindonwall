// ============================================================
// Mind on Wall — 全局类型定义（跨 Slice 共享）
// ============================================================

/** 墙纸类型（v0.3：新增 cream 米白为默认） */
export type WallpaperType = 'cream' | 'none' | 'white' | 'beige' | 'textured' | 'watercolor' | 'kraft';

/** Paper 变体 */
export type PaperVariant = 'note' | 'torn' | 'sticky' | 'tape';

/** 物件类型 */
export type ItemType = 'picture' | 'paper' | 'stamp' | 'audio' | 'video';

/** Pin 偏移（局部坐标，相对于物件，0-1 比例） */
export interface PinOffset {
  x: number; // 0-1 比例
  y: number; // 0-1 比例
}

/** 物件 */
export interface Item {
  id: string;
  type: ItemType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  /** paper 变体 */
  variant?: PaperVariant;
  /** Stamp 附着时的 Paper ID */
  parentId?: string;
  /** Picture 的图片资源 ID */
  assetId?: string;
  /** Paper 文字内容 */
  text?: string;
  /** 便利贴颜色 */
  color?: string;
  /** Stamp 印章 ID */
  stampId?: string;
  /** Pin 局部坐标偏移 */
  pinOffset?: PinOffset;
}

/** Rope（绳索连接） */
export interface Rope {
  id: string;
  fromItemId: string;
  toItemId: string;
  /** 关联说明 */
  note?: string;
  /** 绳索自然长度（用于物理弧度计算） */
  naturalLength?: number;
  /** v0.2: 绳索颜色（缺省为默认麻绳棕） */
  color?: string;
}

/** 资源（素材库） */
export interface Asset {
  id: string;
  mimeType: string;
  byteSize: number;
  /** IndexedDB 中的 key */
  storageKey: string;
  /** v0.2: base64 data URL（本地存储模式下直接作为图片源） */
  dataUrl?: string;
  /** v0.2 修订：素材类型（对应上传面板），缺省为 picture */
  kind?: 'picture' | 'paper' | 'stamp' | 'audio' | 'video';
}

/** 撤销动作 */
export interface UndoAction {
  type: 'add' | 'remove' | 'move' | 'resize' | 'rotate' | 'edit' | 'addRope' | 'removeRope' | 'editRope' | 'editEdgeColor';
  itemId?: string;
  ropeId?: string;
  before: Partial<Item> | Partial<Rope> | null;
  after: Partial<Item> | Partial<Rope> | null;
  timestamp: number;
}

/** 墙面 */
export interface Wall {
  id: string;
  name: string;
  wallpaper: WallpaperType;
  items: Item[];
  ropes: Rope[];
  undoStack: UndoAction[];
  redoStack: UndoAction[];
}

/** 墙面列表项（总览页用） */
export interface WallSummary {
  id: string;
  name: string;
  wallpaper: WallpaperType;
  itemCount: number;
  /** v0.1 为 null，后续用实时缩略图 */
  thumbnail?: string;
}

/** 视图模式（v0.8: 'space' = Space 详情页） */
export type ViewMode = 'wall' | 'overview' | 'map' | 'space';

/** Toast 消息 */
export interface ToastMessage {
  id: string;
  text: string;
  type: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
}

/** v0.7: Space 分组（墙归类到空间下，UI 展示为文件夹） */
export interface Space {
  id: string;
  name: string;
  /** 可选标签色（用于 UI 区分） */
  color?: string;
  /** 归属的墙 ID 列表 */
  wallIds: string[];
  /** 创建时间戳 */
  createdAt: number;
}
