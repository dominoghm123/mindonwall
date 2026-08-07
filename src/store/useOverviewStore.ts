import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WallSummary, WallpaperType, Item, Rope } from './types';
import { DEFAULT_WALL_ID, DEFAULT_WALL_NAME, DEFAULT_WALLPAPER } from './initialData';
import { useWallStore } from './useWallStore';
import { useMapStore } from './useMapStore';
import { useAssetStore } from './useAssetStore';
import type { MapViewSnapshot } from './useMapStore';
import type { SharedWallPayload } from '../utils/shareWall';

/** 持久化的墙数据（v0.2：多墙真正可切换） */
export interface SavedWallData {
  name: string;
  wallpaper: WallpaperType;
  items: Item[];
  ropes: Rope[];
  /** v0.3: Connection Map 视图快照（不写回白墙） */
  mapView?: MapViewSnapshot;
}

let dupCounter = 0;

interface OverviewState {
  /** 墙面列表 */
  walls: WallSummary[];
  /** 各墙的完整数据（v0.2） */
  wallData: Record<string, SavedWallData>;
  /** 是否已初始化 */
  initialized: boolean;

  /** 添加新墙 */
  addWall: (id: string, name: string, wallpaper?: WallpaperType) => void;
  /** 删除墙 */
  removeWall: (id: string) => void;
  /** 批量删除墙（v0.2） */
  removeWalls: (ids: string[]) => void;
  /** 重命名墙（同步 wallData 与当前编辑中的 wallStore） */
  renameWall: (id: string, name: string) => void;
  /** 重新排序墙 */
  reorderWalls: (fromIndex: number, toIndex: number) => void;
  /** 更新墙的 Item 计数 */
  updateItemCount: (id: string, count: number) => void;
  /** 首次启动初始化 */
  initIfNeeded: () => void;
  /** 保存指定墙数据 */
  saveWallData: (id: string, data: SavedWallData) => void;
  /** 把当前 wallStore 快照存入 wallData（返回当前墙 id） */
  captureCurrentWall: () => string;
  /** 打开指定墙（先快照当前墙，再加载目标墙） */
  openWall: (id: string) => void;
  /** 复制墙（深拷贝 items/ropes 并重新生成 id，返回新墙 id） */
  duplicateWall: (id: string) => string | null;
  /** 导出墙 JSON（Blob 下载） */
  exportWallJSON: (id: string) => void;
  /** v0.3: 导入分享链接中的墙（重映射 id，附带素材入素材库），返回新墙 id */
  importSharedWall: (payload: SharedWallPayload) => string;
}

export const useOverviewStore = create<OverviewState>()(
  persist(
    (set, get) => ({
      walls: [],
      wallData: {},
      initialized: false,

      addWall: (id: string, name: string, wallpaper: WallpaperType = 'white') => {
        const { walls } = get();
        if (walls.some((w) => w.id === id)) return;
        set({
          walls: [...walls, { id, name, wallpaper, itemCount: 0 }],
        });
      },

      removeWall: (id: string) => {
        set({ walls: get().walls.filter((w) => w.id !== id) });
      },

      removeWalls: (ids: string[]) => {
        const idSet = new Set(ids);
        const wallData = { ...get().wallData };
        for (const id of ids) delete wallData[id];
        set({
          walls: get().walls.filter((w) => !idSet.has(w.id)),
          wallData,
        });
      },

      renameWall: (id: string, name: string) => {
        const wallData = { ...get().wallData };
        if (wallData[id]) wallData[id] = { ...wallData[id], name };
        set({
          walls: get().walls.map((w) => (w.id === id ? { ...w, name } : w)),
          wallData,
        });
        // 同步当前编辑中的墙
        if (useWallStore.getState().wallId === id) {
          useWallStore.getState().renameWall(name);
        }
      },

      reorderWalls: (fromIndex: number, toIndex: number) => {
        const walls = [...get().walls];
        const [moved] = walls.splice(fromIndex, 1);
        walls.splice(toIndex, 0, moved);
        set({ walls });
      },

      updateItemCount: (id: string, count: number) => {
        set({
          walls: get().walls.map((w) => (w.id === id ? { ...w, itemCount: count } : w)),
        });
      },

      initIfNeeded: () => {
        const { walls, initialized } = get();
        // v0.2 墙纸迁移（幂等）：默认墙墙纸 beige → white（用户要求默认白色）
        if (walls.some((w) => w.id === DEFAULT_WALL_ID && w.wallpaper === 'beige')) {
          set({
            walls: walls.map((w) =>
              w.id === DEFAULT_WALL_ID && w.wallpaper === 'beige'
                ? { ...w, wallpaper: 'white' as WallpaperType }
                : w,
            ),
          });
          // 同步当前编辑中的墙（若仍是旧 beige）
          const ws = useWallStore.getState();
          if (ws.wallId === DEFAULT_WALL_ID && ws.wallpaper === 'beige') {
            useWallStore.setState({ wallpaper: 'white' });
          }
        }
        if (initialized) return;
        if (walls.length === 0) {
          set({
            walls: [
              {
                id: DEFAULT_WALL_ID,
                name: DEFAULT_WALL_NAME,
                wallpaper: DEFAULT_WALLPAPER,
                itemCount: 0,
              },
            ],
            initialized: true,
          });
        } else {
          set({ initialized: true });
        }
      },

      saveWallData: (id: string, data: SavedWallData) => {
        set({ wallData: { ...get().wallData, [id]: data } });
      },

      captureCurrentWall: () => {
        const w = useWallStore.getState();
        get().saveWallData(w.wallId, {
          name: w.name,
          wallpaper: w.wallpaper,
          items: w.items,
          ropes: w.ropes,
          // v0.3: 同步保存 Map 视图快照
          mapView: useMapStore.getState().getSnapshot(),
        });
        // 同步摘要的名称与计数
        set({
          walls: get().walls.map((wall) =>
            wall.id === w.wallId
              ? { ...wall, name: w.name, itemCount: w.items.length, wallpaper: w.wallpaper }
              : wall,
          ),
        });
        return w.wallId;
      },

      openWall: (id: string) => {
        // 先快照当前墙
        const currentId = get().captureCurrentWall();
        const data = get().wallData[id];
        const wallStore = useWallStore.getState();
        if (data) {
          wallStore.loadWall({
            wallId: id,
            name: data.name,
            wallpaper: data.wallpaper,
            items: data.items,
            ropes: data.ropes,
          });
          // v0.3: 恢复目标墙的 Map 快照
          useMapStore.getState().loadForWall(data.mapView);
        } else if (currentId !== id) {
          // 未保存过数据的墙（如新建）→ 空墙
          const wall = get().walls.find((w) => w.id === id);
          wallStore.loadWall({
            wallId: id,
            name: wall?.name ?? 'Wall',
            wallpaper: wall?.wallpaper ?? 'beige',
            items: [],
            ropes: [],
          });
          useMapStore.getState().loadForWall();
        }
      },

      duplicateWall: (id: string) => {
        const { walls, wallData } = get();
        const wall = walls.find((w) => w.id === id);
        if (!wall) return null;
        // 若复制的是当前编辑中的墙，先快照
        const src = useWallStore.getState().wallId === id
          ? (() => { get().captureCurrentWall(); return get().wallData[id]; })()
          : wallData[id];

        const idMap = new Map<string, string>();
        const newItems: Item[] = (src?.items ?? []).map((it) => {
          const nid = `item-${Date.now()}-${++dupCounter}`;
          idMap.set(it.id, nid);
          return { ...it, id: nid };
        });
        // 修正 parentId 引用
        for (const it of newItems) {
          if (it.parentId && idMap.has(it.parentId)) {
            it.parentId = idMap.get(it.parentId);
          }
        }
        const newRopes: Rope[] = (src?.ropes ?? []).map((r) => ({
          ...r,
          id: `rope-${Date.now()}-${++dupCounter}`,
          fromItemId: idMap.get(r.fromItemId) ?? r.fromItemId,
          toItemId: idMap.get(r.toItemId) ?? r.toItemId,
        }));
        // v0.3: Map 快照中的节点位置同步重映射 id
        const srcMapView = src?.mapView;
        const newMapView: MapViewSnapshot | undefined = srcMapView
          ? {
              nodePositions: Object.fromEntries(
                Object.entries(srcMapView.nodePositions)
                  .filter(([k]) => idMap.has(k))
                  .map(([k, v]) => [idMap.get(k)!, v]),
              ),
              hiddenChildren: srcMapView.hiddenChildren
                .filter((k) => idMap.has(k))
                .map((k) => idMap.get(k)!),
            }
          : undefined;

        const newId = `wall-${Date.now()}-${++dupCounter}`;
        set({
          walls: [
            ...get().walls,
            { id: newId, name: `${wall.name} (Copy)`, wallpaper: wall.wallpaper, itemCount: newItems.length },
          ],
          wallData: {
            ...get().wallData,
            [newId]: {
              name: `${wall.name} (Copy)`,
              wallpaper: src?.wallpaper ?? wall.wallpaper,
              items: newItems,
              ropes: newRopes,
              mapView: newMapView,
            },
          },
        });
        return newId;
      },

      exportWallJSON: (id: string) => {
        const { walls, wallData } = get();
        const wall = walls.find((w) => w.id === id);
        if (!wall) return;
        // 若导出当前编辑中的墙，先快照
        if (useWallStore.getState().wallId === id) get().captureCurrentWall();
        const data = get().wallData[id];
        const payload = {
          app: 'mindonwall',
          version: '0.2',
          exportedAt: new Date().toISOString(),
          wall: {
            id,
            name: wall.name,
            wallpaper: wall.wallpaper,
            items: data?.items ?? [],
            ropes: data?.ropes ?? [],
          },
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${wall.name.replace(/\s+/g, '-').toLowerCase()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      },

      importSharedWall: (payload: SharedWallPayload) => {
        // 1) 附带的用户上传素材入素材库（尊重上限，跳过已存在 id）
        const assetStore = useAssetStore.getState();
        for (const asset of payload.assets ?? []) {
          assetStore.addAsset(asset);
        }

        // 2) 重映射 item id，避免与本地数据冲突
        const idMap = new Map<string, string>();
        const newItems: Item[] = payload.items.map((it) => {
          const nid = `item-${Date.now()}-${++dupCounter}`;
          idMap.set(it.id, nid);
          return { ...it, id: nid };
        });
        for (const it of newItems) {
          if (it.parentId && idMap.has(it.parentId)) {
            it.parentId = idMap.get(it.parentId);
          }
        }
        const newRopes: Rope[] = payload.ropes.map((r) => ({
          ...r,
          id: `rope-${Date.now()}-${++dupCounter}`,
          fromItemId: idMap.get(r.fromItemId) ?? r.fromItemId,
          toItemId: idMap.get(r.toItemId) ?? r.toItemId,
        }));

        // 3) 创建新墙
        const newId = `wall-${Date.now()}-${++dupCounter}`;
        const name = payload.name || 'Shared Wall';
        set({
          walls: [
            ...get().walls,
            { id: newId, name, wallpaper: payload.wallpaper ?? 'white', itemCount: newItems.length },
          ],
          wallData: {
            ...get().wallData,
            [newId]: {
              name,
              wallpaper: payload.wallpaper ?? 'white',
              items: newItems,
              ropes: newRopes,
            },
          },
        });
        return newId;
      },
    }),
    {
      name: 'mindonwall-overview',
    },
  ),
);
