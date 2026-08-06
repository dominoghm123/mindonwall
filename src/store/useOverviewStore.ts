import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WallSummary, WallpaperType } from './types';
import { DEFAULT_WALL_ID, DEFAULT_WALL_NAME, DEFAULT_WALLPAPER } from './initialData';

interface OverviewState {
  /** 墙面列表 */
  walls: WallSummary[];
  /** 是否已初始化 */
  initialized: boolean;

  /** 添加新墙 */
  addWall: (id: string, name: string, wallpaper?: WallpaperType) => void;
  /** 删除墙 */
  removeWall: (id: string) => void;
  /** 重命名墙 */
  renameWall: (id: string, name: string) => void;
  /** 重新排序墙 */
  reorderWalls: (fromIndex: number, toIndex: number) => void;
  /** 更新墙的 Item 计数 */
  updateItemCount: (id: string, count: number) => void;
  /** 首次启动初始化 */
  initIfNeeded: () => void;
}

export const useOverviewStore = create<OverviewState>()(
  persist(
    (set, get) => ({
      walls: [],
      initialized: false,

      addWall: (id: string, name: string, wallpaper: WallpaperType = 'beige') => {
        const { walls } = get();
        if (walls.some((w) => w.id === id)) return;
        set({
          walls: [...walls, { id, name, wallpaper, itemCount: 0 }],
        });
      },

      removeWall: (id: string) => {
        set({ walls: get().walls.filter((w) => w.id !== id) });
      },

      renameWall: (id: string, name: string) => {
        set({
          walls: get().walls.map((w) => (w.id === id ? { ...w, name } : w)),
        });
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
    }),
    {
      name: 'mindonwall-overview',
    },
  ),
);
