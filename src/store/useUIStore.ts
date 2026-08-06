import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ViewMode, ToastMessage } from './types';

/** 右键菜单位置 */
export interface ContextMenuPosition {
  x: number;
  y: number;
}

export interface UIState {
  /** 选中物件 IDs（支持多选） */
  selectedIds: string[];
  /** 当前视图模式 */
  viewMode: ViewMode;
  /** 浮窗展开状态（以 Item ID 为 key） */
  expandedPopups: Record<string, boolean>;
  /** Toast 消息队列 */
  toasts: ToastMessage[];
  /** 右键菜单状态 */
  contextMenu: { type: 'item'; itemId: string; x: number; y: number } | { type: 'rope'; ropeId: string; x: number; y: number } | null;
  /** “选择目标 Paper” 附着模式 */
  attachMode: string | null; // stampId
  /** AssetPicker 弹窗 */
  assetPickerOpen: string | null; // picture itemId

  /** 选中单个物件 */
  selectItem: (id: string) => void;
  /** 取消选中 */
  deselectItem: (id: string) => void;
  /** 多选 */
  selectMultiple: (ids: string[]) => void;
  /** 清空选择 */
  clearSelection: () => void;
  /** 设置视图模式 */
  setViewMode: (mode: ViewMode) => void;
  /** 切换浮窗展开 */
  togglePopup: (id: string) => void;
  /** 关闭浮窗 */
  closePopup: (id: string) => void;
  /** 显示 Toast */
  showToast: (text: string, type?: ToastMessage['type'], duration?: number) => void;
  /** 移除 Toast */
  removeToast: (id: string) => void;
  /** 打开物件右键菜单 */
  openContextMenu: (itemId: string, x: number, y: number) => void;
  /** 打开 Rope 右键菜单 */
  openRopeContextMenu: (ropeId: string, x: number, y: number) => void;
  /** 关闭右键菜单 */
  closeContextMenu: () => void;
  /** 进入附着模式 */
  startAttachMode: (stampId: string) => void;
  /** 退出附着模式 */
  cancelAttachMode: () => void;
  /** 打开素材选择弹窗 */
  openAssetPicker: (pictureId: string) => void;
  /** 关闭素材选择弹窗 */
  closeAssetPicker: () => void;
}

let toastCounter = 0;

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      selectedIds: [],
      viewMode: 'wall',
      expandedPopups: {},
      toasts: [],
      contextMenu: null,
      attachMode: null,
      assetPickerOpen: null,

      selectItem: (id: string) => {
        set({ selectedIds: [id] });
      },

      deselectItem: (id: string) => {
        set({ selectedIds: get().selectedIds.filter((sid) => sid !== id) });
      },

      selectMultiple: (ids: string[]) => {
        set({ selectedIds: ids });
      },

      clearSelection: () => {
        set({ selectedIds: [] });
      },

      setViewMode: (mode: ViewMode) => {
        set({ viewMode: mode });
      },

      togglePopup: (id: string) => {
        const popups = { ...get().expandedPopups };
        popups[id] = !popups[id];
        set({ expandedPopups: popups });
      },

      closePopup: (id: string) => {
        const popups = { ...get().expandedPopups };
        delete popups[id];
        set({ expandedPopups: popups });
      },

      showToast: (text: string, type: ToastMessage['type'] = 'info', duration = 3000) => {
        const id = `toast-${++toastCounter}`;
        const toast: ToastMessage = { id, text, type, duration };
        set({ toasts: [...get().toasts, toast] });

        // 自动移除
        if (duration > 0) {
          setTimeout(() => {
            set({ toasts: get().toasts.filter((t) => t.id !== id) });
          }, duration);
        }
      },

      removeToast: (id: string) => {
        set({ toasts: get().toasts.filter((t) => t.id !== id) });
      },

      openContextMenu: (itemId: string, x: number, y: number) => {
        set({ contextMenu: { type: 'item', itemId, x, y } });
      },

      openRopeContextMenu: (ropeId: string, x: number, y: number) => {
        set({ contextMenu: { type: 'rope', ropeId, x, y } });
      },

      closeContextMenu: () => {
        set({ contextMenu: null });
      },

      startAttachMode: (stampId: string) => {
        set({ attachMode: stampId, contextMenu: null });
      },

      cancelAttachMode: () => {
        set({ attachMode: null });
      },

      openAssetPicker: (pictureId: string) => {
        set({ assetPickerOpen: pictureId, contextMenu: null });
      },

      closeAssetPicker: () => {
        set({ assetPickerOpen: null });
      },
    }),
    {
      name: 'mindonwall-ui',
      partialize: (state) => ({
        viewMode: state.viewMode,
        // selectedIds 和 toasts 不持久化
      }),
    },
  ),
);
