import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Asset } from './types';

/** 用户图片上限 */
const MAX_ASSETS = 12;

interface AssetState {
  /** 全局共享的 Asset 列表 */
  assets: Asset[];

  /** 添加 Asset（返回是否成功） */
  addAsset: (asset: Asset) => boolean;
  /** 删除 Asset */
  removeAsset: (id: string) => void;
  /** 获取 Asset 数量 */
  getAssetCount: () => number;
  /** 是否已达上限 */
  isAtLimit: () => boolean;
}

export const useAssetStore = create<AssetState>()(
  persist(
    (set, get) => ({
      assets: [],

      addAsset: (asset: Asset) => {
        const { assets } = get();
        if (assets.length >= MAX_ASSETS) {
          console.warn(`[AssetStore] 图片已达上限 ${MAX_ASSETS} 张`);
          return false;
        }
        if (assets.some((a) => a.id === asset.id)) {
          console.warn(`[AssetStore] Asset ${asset.id} 已存在`);
          return false;
        }
        set({ assets: [...assets, asset] });
        return true;
      },

      removeAsset: (id: string) => {
        set({ assets: get().assets.filter((a) => a.id !== id) });
      },

      getAssetCount: () => get().assets.length,

      isAtLimit: () => get().assets.length >= MAX_ASSETS,
    }),
    {
      name: 'mindonwall-assets',
    },
  ),
);
