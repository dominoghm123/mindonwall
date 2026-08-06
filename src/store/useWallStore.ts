import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Item, Rope, WallpaperType, UndoAction } from './types';
import {
  pushUndo,
  popUndo,
  makeAddItemAction,
  makeRemoveItemAction,
  makeMoveItemAction,
  makeResizeItemAction,
  makeRotateItemAction,
  makeEditItemAction,
  makeAddRopeAction,
  makeRemoveRopeAction,
  makeEditRopeAction,
  applyUndoToItems,
  applyUndoToRopes,
  applyRedoToItems,
  applyRedoToRopes,
  getPinWorldPosition,
  pinDistance,
} from './undoMiddleware';
import {
  DEFAULT_WALL_ID,
  DEFAULT_WALL_NAME,
  DEFAULT_WALLPAPER,
  INITIAL_ITEMS,
  INITIAL_ROPES,
} from './initialData';

/** 物件上限（Rope 不计入） */
const MAX_ITEMS = 50;

interface WallState {
  /** 当前墙 ID */
  wallId: string;
  /** 墙名 */
  name: string;
  /** 墙纸类型 */
  wallpaper: WallpaperType;
  /** 物件列表 */
  items: Item[];
  /** 绳索列表 */
  ropes: Rope[];
  /** 撤销栈 */
  undoStack: UndoAction[];
  /** 重做栈 */
  redoStack: UndoAction[];

  // ─── Actions ────────────────────────────────────────────────
  /** 添加物件（返回新 Item 的 id，失败返回 null） */
  addItem: (item: Item) => string | null;
  /** 删除物件（级联：删除关联 Rope，删除 Paper 时级联删除附着 Stamp） */
  removeItem: (itemId: string) => void;
  /** 更新物件字段 */
  updateItem: (itemId: string, patch: Partial<Item>, undoType?: UndoAction['type']) => void;
  /** 添加 Rope（两端 Item 必须都存在） */
  addRope: (rope: Rope) => boolean;
  /** 删除 Rope */
  removeRope: (ropeId: string) => void;
  /** 更新 Rope */
  updateRope: (ropeId: string, patch: Partial<Rope>) => void;
  /** 设置墙纸 */
  setWallpaper: (wp: WallpaperType) => void;
  /** 重命名墙 */
  renameWall: (name: string) => void;
  /** 撤销 */
  undo: () => void;
  /** 重做 */
  redo: () => void;
  /** 初始化默认墙（首次启动） */
  initDefaultWall: () => void;
  /** 加载指定墙数据 */
  loadWall: (data: { wallId: string; name: string; wallpaper: WallpaperType; items: Item[]; ropes: Rope[] }) => void;
  /** 获取 Item 的 Pin 世界坐标 */
  getPinWorldPos: (itemId: string) => { x: number; y: number } | null;
  /** 附着 Stamp 到 Paper（设置 parentId，计算局部坐标百分比） */
  attachStamp: (stampId: string, paperId: string) => void;
  /** 解除 Stamp 附着（清除 parentId，保持绝对位置） */
  detachStamp: (stampId: string) => void;
  /** 将物件移到最前（渲染顺序最后） */
  bringToFront: (itemId: string) => void;
  /** 将物件移到最后（渲染顺序最前） */
  sendToBack: (itemId: string) => void;
}

export const useWallStore = create<WallState>()(
  persist(
    (set, get) => ({
      wallId: DEFAULT_WALL_ID,
      name: DEFAULT_WALL_NAME,
      wallpaper: DEFAULT_WALLPAPER,
      items: [],
      ropes: [],
      undoStack: [],
      redoStack: [],

      addItem: (item: Item) => {
        const { items, undoStack } = get();
        // 物件上限检查（Rope 不计入）
        if (items.length >= MAX_ITEMS) {
          console.warn(`[WallStore] 物件已达上限 ${MAX_ITEMS}`);
          return null;
        }
        const action = makeAddItemAction(item);
        set({
          items: [...items, item],
          undoStack: pushUndo(undoStack, action),
          redoStack: [], // 新操作清空 redo 栈
        });
        return item.id;
      },

      removeItem: (itemId: string) => {
        const { items, ropes, undoStack } = get();
        const target = items.find((i) => i.id === itemId);
        if (!target) return;

        // 级联：找到所有关联的 Rope
        const relatedRopes = ropes.filter(
          (r) => r.fromItemId === itemId || r.toItemId === itemId,
        );

        // 级联：删除 Paper 时，删除附着的 Stamp
        let stampsToRemove: Item[] = [];
        if (target.type === 'paper') {
          stampsToRemove = items.filter(
            (i) => i.type === 'stamp' && i.parentId === itemId,
          );
        }

        // 收集所有要删除的 Item ID
        const idsToRemove = new Set<string>([itemId, ...stampsToRemove.map((s) => s.id)]);
        const ropeIdsToRemove = new Set(relatedRopes.map((r) => r.id));

        // 构建撤销记录
        let newUndoStack = pushUndo(undoStack, makeRemoveItemAction(target));
        // 附着的 Stamp 也记录撤销
        for (const stamp of stampsToRemove) {
          newUndoStack = pushUndo(newUndoStack, makeRemoveItemAction(stamp));
        }
        // 关联 Rope 记录撤销
        for (const rope of relatedRopes) {
          newUndoStack = pushUndo(newUndoStack, makeRemoveRopeAction(rope));
        }

        set({
          items: items.filter((i) => !idsToRemove.has(i.id)),
          ropes: ropes.filter((r) => !ropeIdsToRemove.has(r.id)),
          undoStack: newUndoStack,
          redoStack: [],
        });
      },

      updateItem: (itemId: string, patch: Partial<Item>, undoType = 'edit') => {
        const { items, undoStack } = get();
        const target = items.find((i) => i.id === itemId);
        if (!target) return;

        const before: Partial<Item> = {};
        const after: Partial<Item> = {};
        for (const key of Object.keys(patch) as (keyof Item)[]) {
          (before as Record<string, unknown>)[key] = target[key];
          (after as Record<string, unknown>)[key] = patch[key];
        }

        let action: UndoAction;
        if (undoType === 'move') {
          action = makeMoveItemAction(itemId, before as Pick<Item, 'x' | 'y'>, after as Pick<Item, 'x' | 'y'>);
        } else if (undoType === 'resize') {
          action = makeResizeItemAction(itemId, before as Pick<Item, 'width' | 'height'>, after as Pick<Item, 'width' | 'height'>);
        } else if (undoType === 'rotate') {
          action = makeRotateItemAction(itemId, (before.rotation ?? 0), (after.rotation ?? 0));
        } else {
          action = makeEditItemAction(itemId, before, after);
        }

        set({
          items: items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)),
          undoStack: pushUndo(undoStack, action),
          redoStack: [],
        });
      },

      addRope: (rope: Rope) => {
        const { items, ropes, undoStack } = get();
        // 有效性验证：两端 Item 必须都存在
        const fromExists = items.some((i) => i.id === rope.fromItemId);
        const toExists = items.some((i) => i.id === rope.toItemId);
        if (!fromExists || !toExists) {
          console.warn('[WallStore] Rope 两端 Item 不存在');
          return false;
        }

        // 计算 naturalLength（两 Pin 距离 × 1.2）
        const fromItem = items.find((i) => i.id === rope.fromItemId)!;
        const toItem = items.find((i) => i.id === rope.toItemId)!;
        const fromPin = getPinWorldPosition(fromItem);
        const toPin = getPinWorldPosition(toItem);
        const dist = pinDistance(fromPin, toPin);
        const ropeWithLength: Rope = {
          ...rope,
          naturalLength: rope.naturalLength ?? dist * 1.2,
        };

        set({
          ropes: [...ropes, ropeWithLength],
          undoStack: pushUndo(undoStack, makeAddRopeAction(ropeWithLength)),
          redoStack: [],
        });
        return true;
      },

      removeRope: (ropeId: string) => {
        const { ropes, undoStack } = get();
        const target = ropes.find((r) => r.id === ropeId);
        if (!target) return;

        set({
          ropes: ropes.filter((r) => r.id !== ropeId),
          undoStack: pushUndo(undoStack, makeRemoveRopeAction(target)),
          redoStack: [],
        });
      },

      updateRope: (ropeId: string, patch: Partial<Rope>) => {
        const { ropes, undoStack } = get();
        const target = ropes.find((r) => r.id === ropeId);
        if (!target) return;

        const before: Partial<Rope> = {};
        const after: Partial<Rope> = {};
        for (const key of Object.keys(patch) as (keyof Rope)[]) {
          (before as Record<string, unknown>)[key] = target[key];
          (after as Record<string, unknown>)[key] = patch[key];
        }

        set({
          ropes: ropes.map((r) => (r.id === ropeId ? { ...r, ...patch } : r)),
          undoStack: pushUndo(undoStack, makeEditRopeAction(ropeId, before, after)),
          redoStack: [],
        });
      },

      setWallpaper: (wp: WallpaperType) => {
        set({ wallpaper: wp });
      },

      renameWall: (name: string) => {
        set({ name });
      },

      undo: () => {
        const { undoStack, redoStack, items, ropes } = get();
        const result = popUndo(undoStack);
        if (!result) return;
        const { action, remaining } = result;

        const newItems = applyUndoToItems(items, action);
        const newRopes = applyUndoToRopes(ropes, action);

        set({
          items: newItems,
          ropes: newRopes,
          undoStack: remaining,
          redoStack: pushUndo(redoStack, action),
        });
      },

      redo: () => {
        const { undoStack, redoStack, items, ropes } = get();
        const result = popUndo(redoStack);
        if (!result) return;
        const { action, remaining } = result;

        const newItems = applyRedoToItems(items, action);
        const newRopes = applyRedoToRopes(ropes, action);

        set({
          items: newItems,
          ropes: newRopes,
          undoStack: pushUndo(undoStack, action),
          redoStack: remaining,
        });
      },

      initDefaultWall: () => {
        const { items } = get();
        if (items.length > 0) return; // 已有数据，跳过
        set({
          wallId: DEFAULT_WALL_ID,
          name: DEFAULT_WALL_NAME,
          wallpaper: DEFAULT_WALLPAPER,
          items: INITIAL_ITEMS,
          ropes: INITIAL_ROPES,
          undoStack: [],
          redoStack: [],
        });
      },

      loadWall: (data) => {
        set({
          wallId: data.wallId,
          name: data.name,
          wallpaper: data.wallpaper,
          items: data.items,
          ropes: data.ropes,
          undoStack: [],
          redoStack: [],
        });
      },

      getPinWorldPos: (itemId: string) => {
        const item = get().items.find((i) => i.id === itemId);
        if (!item) return null;
        return getPinWorldPosition(item);
      },

      attachStamp: (stampId: string, paperId: string) => {
        const { items, undoStack } = get();
        const stamp = items.find((i) => i.id === stampId && i.type === 'stamp');
        const paper = items.find((i) => i.id === paperId && i.type === 'paper');
        if (!stamp || !paper) return;

        // 计算 Stamp 相对于 Paper 的局部坐标（百分比）
        const localX = (stamp.x - paper.x) / paper.width;
        const localY = (stamp.y - paper.y) / paper.height;

        const before: Partial<Item> = { parentId: stamp.parentId, x: stamp.x, y: stamp.y };
        const after: Partial<Item> = { parentId: paperId, x: localX, y: localY };

        const action: UndoAction = {
          type: 'edit',
          itemId: stampId,
          before,
          after,
          timestamp: Date.now(),
        };

        set({
          items: items.map((i) =>
            i.id === stampId
              ? { ...i, parentId: paperId, x: localX, y: localY }
              : i
          ),
          undoStack: pushUndo(undoStack, action),
          redoStack: [],
        });
      },

      detachStamp: (stampId: string) => {
        const { items, undoStack } = get();
        const stamp = items.find((i) => i.id === stampId && i.type === 'stamp');
        if (!stamp || !stamp.parentId) return;

        const paper = items.find((i) => i.id === stamp.parentId);
        if (!paper) return;

        // 将局部坐标（百分比）转回绝对坐标
        const absX = stamp.x * paper.width + paper.x;
        const absY = stamp.y * paper.height + paper.y;

        const before: Partial<Item> = { parentId: stamp.parentId, x: stamp.x, y: stamp.y };
        const after: Partial<Item> = { parentId: undefined, x: absX, y: absY };

        const action: UndoAction = {
          type: 'edit',
          itemId: stampId,
          before,
          after,
          timestamp: Date.now(),
        };

        set({
          items: items.map((i) =>
            i.id === stampId
              ? { ...i, parentId: undefined, x: absX, y: absY }
              : i
          ),
          undoStack: pushUndo(undoStack, action),
          redoStack: [],
        });
      },

      bringToFront: (itemId: string) => {
        const { items } = get();
        const idx = items.findIndex((i) => i.id === itemId);
        if (idx < 0 || idx === items.length - 1) return;
        const item = items[idx];
        const newItems = [...items.slice(0, idx), ...items.slice(idx + 1), item];
        set({ items: newItems });
      },

      sendToBack: (itemId: string) => {
        const { items } = get();
        const idx = items.findIndex((i) => i.id === itemId);
        if (idx <= 0) return;
        const item = items[idx];
        const newItems = [item, ...items.slice(0, idx), ...items.slice(idx + 1)];
        set({ items: newItems });
      },
    }),
    {
      name: 'mindonwall-wall',
      partialize: (state) => ({
        wallId: state.wallId,
        name: state.name,
        wallpaper: state.wallpaper,
        items: state.items,
        ropes: state.ropes,
        undoStack: state.undoStack,
        redoStack: state.redoStack,
      }),
    },
  ),
);
