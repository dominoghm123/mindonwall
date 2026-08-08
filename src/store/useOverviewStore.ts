import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WallSummary, WallpaperType, Item, Rope, Project } from './types';
import { DEFAULT_WALL_ID, DEFAULT_WALL_NAME, DEFAULT_WALLPAPER } from './initialData';
import { useWallStore } from './useWallStore';
import { useMapStore } from './useMapStore';
import { useAssetStore } from './useAssetStore';
import type { MapViewSnapshot } from './useMapStore';
import type { SharedWallPayload } from '../utils/shareWall';
import type { Lang } from '../i18n';

/** v0.5: localStorage key factory for user-isolated storage */
export function getStorageKey(userId?: string | null): string {
  return userId ? `mindonwall-overview-${userId}` : 'mindonwall-overview';
}

/** v0.5: current authenticated userId (set by App.tsx auth listener) */
let _currentUserId: string | null = null;
export function setCurrentUserId(id: string | null) { _currentUserId = id; }

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

/** v0.3 r3: 素材收藏夹 */
export interface AssetCollection {
  id: string;
  name: string;
  assetIds: string[];
}

interface OverviewState {
  /** 墙面列表 */
  walls: WallSummary[];
  /** 各墙的完整数据（v0.2） */
  wallData: Record<string, SavedWallData>;
  /** 是否已初始化 */
  initialized: boolean;
  /** v0.3 墙纸迁移一次性标记（默认墙 white/beige → cream） */
  creamMigrated?: boolean;
  /** v0.3 r4 背景迁移一次性标记（#FAFAF8 → White） */
  bgMigrated?: boolean;
  /** v0.3 P3: 总览页背景色 */
  homeBackground: string;
  /** v0.3 r2: 总览页自定义背景图（data URL，优先于背景色） */
  homeBackgroundImage: string | null;
  /** v0.3 P3: 用户昵称 */
  userName: string;
  /** v0.3 r2: 用户头像（data URL，缺省显示昵称首字母） */
  avatarDataUrl: string | null;
  /** v0.3 r3: 用户自定义收藏夹 */
  collections: AssetCollection[];
  /** v0.3 r3: 已从 Library 删除的内置素材 id */
  removedBuiltins: string[];
  /** v0.3 r4: 界面语言（i18n） */
  language: Lang;
  /** v0.4: Project 分组 */
  projects: Project[];
  /** v0.4: 是否已执行 Project 迁移（已有墙归入 Uncategorized） */
  projectsMigrated?: boolean;

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
  /** v0.3 P3: 设置总览页背景色 */
  setHomeBackground: (color: string) => void;
  /** v0.3 r2: 设置总览页自定义背景图 */
  setHomeBackgroundImage: (dataUrl: string | null) => void;
  /** v0.3 P3: 设置用户昵称 */
  setUserName: (name: string) => void;
  /** v0.3 r2: 设置用户头像 */
  setAvatarDataUrl: (dataUrl: string | null) => void;
  /** v0.3 r3: 新建收藏夹 */
  addCollection: (name: string) => void;
  /** v0.3 r3: 重命名收藏夹 */
  renameCollection: (id: string, name: string) => void;
  /** v0.3 r3: 删除收藏夹 */
  removeCollection: (id: string) => void;
  /** v0.3 r3: 设置收藏夹内素材 */
  setCollectionAssets: (id: string, assetIds: string[]) => void;
  /** v0.3 r3: 删除内置素材（隐藏，不影响已上墙物件） */
  removeBuiltinAsset: (id: string) => void;
  /** v0.3 r3: 恢复全部内置素材 */
  restoreBuiltinAssets: () => void;
  /** v0.3 r4: 设置界面语言 */
  setLanguage: (lang: Lang) => void;
  /** v0.4: 新建 Project */
  addProject: (name: string) => void;
  /** v0.4: 删除 Project（墙移回 Uncategorized） */
  removeProject: (id: string) => void;
  /** v0.4: 重命名 Project */
  renameProject: (id: string, name: string) => void;
  /** v0.4: 设置 Project 颜色 */
  setProjectColor: (id: string, color: string) => void;
  /** v0.4: 移动墙到指定 Project */
  moveWallToProject: (wallId: string, projectId: string) => void;
  /** v0.5: Sync all data to cloud (requires auth) */
  syncToCloud: () => Promise<{ error: string | null }>;
  /** v0.5: Load data from cloud (requires auth) */
  loadFromCloud: () => Promise<{ error: string | null }>;
  /** v0.5: Switch user context (save current, load new user data) */
  switchUser: (userId: string | null) => void;
}

export const useOverviewStore = create<OverviewState>()(
  persist(
    (set, get) => ({
      walls: [],
      wallData: {},
      initialized: false,
      creamMigrated: false,
      bgMigrated: false,
      homeBackground: '#FFFFFF',
      homeBackgroundImage: null,
      userName: 'Wall Keeper',
      avatarDataUrl: null,
      collections: [],
      removedBuiltins: [],
      language: 'en',
      projects: [],
      projectsMigrated: false,

      addWall: (id: string, name: string, wallpaper: WallpaperType = 'none') => {
        const { walls } = get();
        if (walls.some((w) => w.id === id)) return;
        set({
          walls: [...walls, { id, name, wallpaper, itemCount: 0 }],
        });
        // v0.4: 新墙自动归入 Uncategorized
        const uc = get().projects.find((p) => p.id === 'project-uncategorized');
        if (uc) {
          set({
            projects: get().projects.map((p) =>
              p.id === 'project-uncategorized' ? { ...p, wallIds: [...p.wallIds, id] } : p,
            ),
          });
        }
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
          // v0.4: 从所有 project 中清除被删墙的引用
          projects: get().projects.map((p) => ({
            ...p,
            wallIds: p.wallIds.filter((wid) => !idSet.has(wid)),
          })),
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
        const { walls, initialized, creamMigrated } = get();
        // v0.3 墙纸迁移（一次性）：默认墙旧默认 white/beige → cream 米白（新默认）
        if (!creamMigrated) {
          const needMigrate = walls.some(
            (w) => w.id === DEFAULT_WALL_ID && (w.wallpaper === 'white' || w.wallpaper === 'beige'),
          );
          if (needMigrate) {
            set({
              walls: walls.map((w) =>
                w.id === DEFAULT_WALL_ID && (w.wallpaper === 'white' || w.wallpaper === 'beige')
                  ? { ...w, wallpaper: 'cream' as WallpaperType }
                  : w,
              ),
            });
            const ws = useWallStore.getState();
            if (
              ws.wallId === DEFAULT_WALL_ID &&
              (ws.wallpaper === 'white' || ws.wallpaper === 'beige')
            ) {
              useWallStore.setState({ wallpaper: 'cream' });
            }
            // 同步 wallData 中的墙纸
            const wd = get().wallData[DEFAULT_WALL_ID];
            if (wd && (wd.wallpaper === 'white' || wd.wallpaper === 'beige')) {
              set({
                wallData: {
                  ...get().wallData,
                  [DEFAULT_WALL_ID]: { ...wd, wallpaper: 'cream' as WallpaperType },
                },
              });
            }
          }
          set({ creamMigrated: true });
        }
        // v0.4 一次性迁移：已有墙归入默认 project "Uncategorized"
        if (!get().projectsMigrated) {
          const { walls, projects } = get();
          if (walls.length > 0 && projects.length === 0) {
            const defaultProject: Project = {
              id: 'project-uncategorized',
              name: 'Uncategorized',
              wallIds: walls.map((w) => w.id),
              createdAt: Date.now(),
            };
            set({ projects: [defaultProject] });
          }
          set({ projectsMigrated: true });
        }
        // v0.4 defensive: 确保所有墙都在某个 project 中（防止迁移后墙被孤立）
        {
          const { walls, projects } = get();
          const assignedIds = new Set(projects.flatMap((p) => p.wallIds));
          const orphans = walls.filter((w) => !assignedIds.has(w.id));
          if (orphans.length > 0) {
            let uc = projects.find((p) => p.id === 'project-uncategorized');
            if (uc) {
              set({
                projects: projects.map((p) =>
                  p.id === 'project-uncategorized'
                    ? { ...p, wallIds: [...p.wallIds, ...orphans.map((w) => w.id)] }
                    : p,
                ),
              });
            } else {
              const newUc: Project = {
                id: 'project-uncategorized',
                name: 'Uncategorized',
                wallIds: orphans.map((w) => w.id),
                createdAt: Date.now(),
              };
              set({ projects: [newUc, ...projects] });
            }
          }
        }
        // v0.3 r4 一次性迁移：默认背景 #FAFAF8 → White（未自定义过的用户）
        if (!get().bgMigrated) {
          const { homeBackground, homeBackgroundImage } = get();
          if (homeBackground === '#FAFAF8' && !homeBackgroundImage) {
            set({ homeBackground: '#FFFFFF' });
          }
          set({ bgMigrated: true });
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
            wallpaper: wall?.wallpaper ?? 'cream',
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
        const ropeIdMap = new Map<string, string>();
        const newRopes: Rope[] = (src?.ropes ?? []).map((r) => {
          const nid = `rope-${Date.now()}-${++dupCounter}`;
          ropeIdMap.set(r.id, nid);
          return {
            ...r,
            id: nid,
            fromItemId: idMap.get(r.fromItemId) ?? r.fromItemId,
            toItemId: idMap.get(r.toItemId) ?? r.toItemId,
          };
        });
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
              // v0.3: 节点文本同步重映射
              nodeLabels: srcMapView.nodeLabels
                ? Object.fromEntries(
                    Object.entries(srcMapView.nodeLabels)
                      .filter(([k]) => idMap.has(k))
                      .map(([k, v]) => [idMap.get(k)!, v]),
                  )
                : undefined,
              // v0.3 r2: Map 新增连线与隐藏 rope 同步重映射
              extraEdges: srcMapView.extraEdges
                ? srcMapView.extraEdges.map((e) => ({
                    ...e,
                    from: idMap.get(e.from) ?? e.from,
                    to: idMap.get(e.to) ?? e.to,
                  }))
                : undefined,
              hiddenRopes: srcMapView.hiddenRopes
                ? srcMapView.hiddenRopes
                    .filter((rid) => ropeIdMap.has(rid))
                    .map((rid) => ropeIdMap.get(rid)!)
                : undefined,
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
        // v0.4: 复制的墙与源墙归入同一 project，否则归入 Uncategorized
        const sourceProject = get().projects.find((p) => p.wallIds.includes(id));
        const targetProjectId = sourceProject?.id ?? 'project-uncategorized';
        const tp = get().projects.find((p) => p.id === targetProjectId);
        if (tp) {
          set({
            projects: get().projects.map((p) =>
              p.id === targetProjectId ? { ...p, wallIds: [...p.wallIds, newId] } : p,
            ),
          });
        }
        return newId;
      },

      exportWallJSON: (id: string) => {
        const { walls } = get();
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
            { id: newId, name, wallpaper: payload.wallpaper ?? 'cream', itemCount: newItems.length },
          ],
          wallData: {
            ...get().wallData,
            [newId]: {
              name,
              wallpaper: payload.wallpaper ?? 'cream',
              items: newItems,
              ropes: newRopes,
            },
          },
        });
        // v0.4: 导入墙自动归入 Uncategorized
        const uc = get().projects.find((p) => p.id === 'project-uncategorized');
        if (uc) {
          set({
            projects: get().projects.map((p) =>
              p.id === 'project-uncategorized' ? { ...p, wallIds: [...p.wallIds, newId] } : p,
            ),
          });
        }
        return newId;
      },

      setHomeBackground: (color: string) => {
        set({ homeBackground: color });
      },

      setHomeBackgroundImage: (dataUrl: string | null) => {
        set({ homeBackgroundImage: dataUrl });
      },

      setUserName: (name: string) => {
        set({ userName: name });
      },

      setAvatarDataUrl: (dataUrl: string | null) => {
        set({ avatarDataUrl: dataUrl });
      },

      /* ── v0.3 r4: i18n ── */
      setLanguage: (lang: Lang) => {
        set({ language: lang });
      },

      /* ── v0.4: Project 分组 ── */
      addProject: (name: string) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        const id = `project-${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
        const project: Project = {
          id,
          name: trimmed,
          wallIds: [],
          createdAt: Date.now(),
        };
        set({ projects: [...get().projects, project] });
      },

      removeProject: (id: string) => {
        const { projects } = get();
        const target = projects.find((p) => p.id === id);
        if (!target) return;
        // 把墙移回 Uncategorized（如果有的话）
        const uncategorized = projects.find((p) => p.id === 'project-uncategorized');
        if (uncategorized && id !== 'project-uncategorized') {
          const merged = [...new Set([...uncategorized.wallIds, ...target.wallIds])];
          set({
            projects: projects
              .filter((p) => p.id !== id)
              .map((p) => (p.id === 'project-uncategorized' ? { ...p, wallIds: merged } : p)),
          });
        } else {
          set({ projects: projects.filter((p) => p.id !== id) });
        }
      },

      renameProject: (id: string, name: string) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        set({
          projects: get().projects.map((p) => (p.id === id ? { ...p, name: trimmed } : p)),
        });
      },

      setProjectColor: (id: string, color: string) => {
        set({
          projects: get().projects.map((p) => (p.id === id ? { ...p, color } : p)),
        });
      },

      moveWallToProject: (wallId: string, projectId: string) => {
        set({
          projects: get().projects.map((p) => {
            // 从所有 project 中移除该 wall，再加到目标 project
            const without = p.wallIds.filter((id) => id !== wallId);
            if (p.id === projectId) {
              return { ...p, wallIds: [...without, wallId] };
            }
            return { ...p, wallIds: without };
          }),
        });
      },

      /* ── v0.3 r3: 收藏夹 ── */
      addCollection: (name: string) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        const id = `collection-${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
        set({ collections: [...get().collections, { id, name: trimmed, assetIds: [] }] });
      },

      renameCollection: (id: string, name: string) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        set({
          collections: get().collections.map((c) => (c.id === id ? { ...c, name: trimmed } : c)),
        });
      },

      removeCollection: (id: string) => {
        set({ collections: get().collections.filter((c) => c.id !== id) });
      },

      setCollectionAssets: (id: string, assetIds: string[]) => {
        set({
          collections: get().collections.map((c) => (c.id === id ? { ...c, assetIds } : c)),
        });
      },

      /* ── v0.3 r3: 内置素材删除/恢复 ── */
      removeBuiltinAsset: (id: string) => {
        const { removedBuiltins } = get();
        if (!removedBuiltins.includes(id)) {
          set({ removedBuiltins: [...removedBuiltins, id] });
        }
      },

      restoreBuiltinAssets: () => {
        set({ removedBuiltins: [] });
      },

      /* ── v0.5: Cloud sync ── */
      syncToCloud: async () => {
        const session = (await import('./useAuthStore')).useAuthStore.getState().session;
        if (!session?.access_token) return { error: 'Not authenticated' };
        try {
          // Snapshot current wall before syncing
          get().captureCurrentWall();
          const { walls, wallData, projects, homeBackground, homeBackgroundImage,
            userName, avatarDataUrl, collections, removedBuiltins, language } = get();
          const payload = {
            walls, wallData, projects, homeBackground, homeBackgroundImage,
            userName, avatarDataUrl, collections, removedBuiltins, language,
          };
          const res = await fetch('/api/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify(payload),
          });
          if (!res.ok) return { error: `Sync failed: ${res.status}` };
          return { error: null };
        } catch (err) {
          return { error: String(err) };
        }
      },

      loadFromCloud: async () => {
        const session = (await import('./useAuthStore')).useAuthStore.getState().session;
        if (!session?.access_token) return { error: 'Not authenticated' };
        try {
          const res = await fetch('/api/sync', {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          if (!res.ok) return { error: `Load failed: ${res.status}` };
          const json = await res.json();
          if (!json.data) return { error: null }; // No cloud data yet
          // Merge cloud data into store
          const d = json.data;
          set({
            walls: d.walls ?? get().walls,
            wallData: d.wallData ?? get().wallData,
            projects: d.projects ?? get().projects,
            homeBackground: d.homeBackground ?? get().homeBackground,
            homeBackgroundImage: d.homeBackgroundImage ?? get().homeBackgroundImage,
            userName: d.userName ?? get().userName,
            avatarDataUrl: d.avatarDataUrl ?? get().avatarDataUrl,
            collections: d.collections ?? get().collections,
            removedBuiltins: d.removedBuiltins ?? get().removedBuiltins,
            language: d.language ?? get().language,
            initialized: true,
          });
          return { error: null };
        } catch (err) {
          return { error: String(err) };
        }
      },

      switchUser: (userId: string | null) => {
        // Save current state to old user's localStorage
        const oldKey = getStorageKey(_currentUserId);
        const stateToSave = get();
        try {
          const persistData = { state: stateToSave, version: 0 };
          localStorage.setItem(`zustand:${oldKey}`, JSON.stringify(persistData));
        } catch { /* ignore quota errors */ }

        // Update current user
        _currentUserId = userId;

        // Load new user's data from localStorage
        const newKey = getStorageKey(userId);
        try {
          const raw = localStorage.getItem(`zustand:${newKey}`);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed.state) {
              set({
                walls: parsed.state.walls ?? [],
                wallData: parsed.state.wallData ?? {},
                projects: parsed.state.projects ?? [],
                homeBackground: parsed.state.homeBackground ?? '#FFFFFF',
                homeBackgroundImage: parsed.state.homeBackgroundImage ?? null,
                userName: parsed.state.userName ?? 'Wall Keeper',
                avatarDataUrl: parsed.state.avatarDataUrl ?? null,
                collections: parsed.state.collections ?? [],
                removedBuiltins: parsed.state.removedBuiltins ?? [],
                language: parsed.state.language ?? 'en',
                initialized: parsed.state.initialized ?? false,
              });
              return;
            }
          }
        } catch { /* ignore parse errors */ }

        // No saved data for new user → reset to defaults
        set({
          walls: [],
          wallData: {},
          projects: [],
          homeBackground: '#FFFFFF',
          homeBackgroundImage: null,
          userName: 'Wall Keeper',
          avatarDataUrl: null,
          collections: [],
          removedBuiltins: [],
          language: 'en',
          initialized: false,
        });
        // Re-run init for default wall
        get().initIfNeeded();
      },
    }),
    {
      name: 'mindonwall-overview', // base key; switchUser handles per-user isolation
      storage: {
        getItem: (_name: string) => {
          const key = getStorageKey(_currentUserId);
          const raw = localStorage.getItem(`zustand:${key}`);
          return raw ? JSON.parse(raw) : null;
        },
        setItem: (_name: string, value: unknown) => {
          const key = getStorageKey(_currentUserId);
          localStorage.setItem(`zustand:${key}`, JSON.stringify(value));
        },
        removeItem: (_name: string) => {
          const key = getStorageKey(_currentUserId);
          localStorage.removeItem(`zustand:${key}`);
        },
      },
    },
  ),
);
