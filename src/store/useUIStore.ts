import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ViewMode, ToastMessage } from './types';
import type { SharedWallPayload } from '../utils/shareWall';

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
  /** Rope 创建模式 */
  ropeCreating: boolean;
  /** v0.2: Rope 点击连线模式（工具栏激活） */
  ropeMode: boolean;
  /** v0.2: 底部工具栏当前打开的次级面板（同时只能开一个） */
  toolbarPanel: 'image' | 'paper' | 'stamp' | null;
  /** v0.3: 通过分享链接打开的墙数据（待用户确认导入） */
  sharedImport: SharedWallPayload | null;
  /** v0.3 r2: 全屏用户页面（Library / Settings，Profile 已并入 Settings） */
  page: 'materials' | 'settings' | null;

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
  /** 设置 Rope 创建模式 */
  setRopeCreating: (value: boolean) => void;
  /** v0.2: 设置 Rope 点击连线模式 */
  setRopeMode: (value: boolean) => void;
  /** v0.2: 切换工具栏次级面板（再点同一图标关闭） */
  toggleToolbarPanel: (panel: 'image' | 'paper' | 'stamp') => void;
  /** v0.2: 关闭次级面板 */
  closeToolbarPanel: () => void;
  /** v0.3: 设置分享导入数据 */
  setSharedImport: (payload: SharedWallPayload | null) => void;
  /** v0.3 r2: 打开/关闭用户页面 */
  openPage: (page: 'materials' | 'settings' | null) => void;
}

let toastCounter = 0;

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      selectedIds: [],
      viewMode: 'overview',
      expandedPopups: {},
      toasts: [],
      contextMenu: null,
      attachMode: null,
      assetPickerOpen: null,
      ropeCreating: false,
      ropeMode: false,
      toolbarPanel: null,
      sharedImport: null,
      page: null,

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
        // v0.2 修订：进入附着模式时给出明确引导（否则用户不知道要点哪里）
        get().showToast('Click a paper or photo to attach the stamp (Esc to cancel)', 'info', 4000);
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

      setRopeCreating: (value: boolean) => {
        set({ ropeCreating: value });
      },

      setRopeMode: (value: boolean) => {
        // 进入连线模式时关闭次级面板
        set(value ? { ropeMode: true, toolbarPanel: null } : { ropeMode: false });
      },

      toggleToolbarPanel: (panel) => {
        const cur = get().toolbarPanel;
        set({ toolbarPanel: cur === panel ? null : panel, ropeMode: false });
      },

      closeToolbarPanel: () => {
        set({ toolbarPanel: null });
      },

      setSharedImport: (payload: SharedWallPayload | null) => {
        set({ sharedImport: payload });
      },

      openPage: (page) => {
        set({ page });
      },
    }),
    {
      name: 'mindonwall-ui',
      // v0.3: viewMode 不再持久化，刷新后始终回到总览页
      version: 1,
      migrate: (persisted) => {
        const p = persisted as Record<string, unknown>;
        delete p.viewMode;
        return p;
      },
      partialize: () => ({}),
    },
  ),
);
