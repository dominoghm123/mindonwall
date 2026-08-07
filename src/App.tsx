import { useEffect, useCallback, useState, useRef } from 'react';
import { useWallStore } from './store/useWallStore';
import { useUIStore } from './store/useUIStore';
import { useOverviewStore } from './store/useOverviewStore';
import { useMultiSelect } from './hooks/useMultiSelect';
import { useKeyboard } from './hooks/useKeyboard';
import { useRopeCreation } from './hooks/useRopeCreation';
import { TopBar } from './components/chrome/TopBar';
import { BottomToolbar } from './components/chrome/BottomToolbar';
import { OverviewPage } from './components/overview/OverviewPage';
import { InfiniteCanvas } from './components/canvas/InfiniteCanvas';
import type { InfiniteCanvasHandle } from './components/canvas/InfiniteCanvas';
import { ZoomWidget } from './components/chrome/ZoomWidget';
import { SelectionBox } from './components/canvas/SelectionBox';
import { RopeLayer } from './components/objects/RopeLayer';
import { ObjectWrapper } from './components/objects/ObjectWrapper';
import { PictureObject } from './components/objects/PictureObject';
import { PaperObject } from './components/objects/PaperObject';
import { StampObject } from './components/objects/StampObject';
import { ContextMenu } from './components/shared/ContextMenu';
import { AssetPickerModal } from './components/shared/AssetPickerModal';
import { ToastLayer } from './components/shared/ToastLayer';
import { ConnectionMapPage } from './components/map/ConnectionMapPage';
import { SharedWallBanner } from './components/shared/SharedWallBanner';
import { UserPageOverlay } from './components/pages/UserPages';
import { parseShareHash, parseSharePath, fetchSharedWall } from './utils/shareWall';
import { useT } from './i18n/useT';

function App() {
  // Store selectors
  const viewMode = useUIStore((s) => s.viewMode);
  const items = useWallStore((s) => s.items);
  const ropes = useWallStore((s) => s.ropes);
  const wallpaper = useWallStore((s) => s.wallpaper);
  const selectedIds = useUIStore((s) => s.selectedIds);
  const ropeCreating = useUIStore((s) => s.ropeCreating);
  const ropeMode = useUIStore((s) => s.ropeMode);
  const t = useT();

  // Store actions
  const uiStore = useUIStore();
  const wallStore = useWallStore();

  // Canvas view state
  const [canvasView, setCanvasView] = useState({ zoom: 1, panX: 0, panY: 0 });
  const canvasRef = useRef<InfiniteCanvasHandle>(null);

  // Initialize stores
  useEffect(() => {
    useOverviewStore.getState().initIfNeeded();
    useWallStore.getState().initDefaultWall();
    // v0.3: 检测分享链接（#/s/…）→ 弹出导入横幅
    const shared = parseShareHash();
    if (shared) {
      useUIStore.getState().setSharedImport(shared);
      return;
    }
    // v0.4: 检测短链路径 /s/:id → 异步获取墙数据
    const pathId = parseSharePath();
    if (pathId) {
      fetchSharedWall(pathId).then((payload) => {
        if (payload) {
          useUIStore.getState().setSharedImport(payload);
        }
      });
    }
  }, []);

  // MultiSelect hook
  const multiSelect = useMultiSelect({ items, uiStore, wallStore });

  // RopeCreation hook（v0.2 修订：尾巴线用画布坐标）
  const handleRopeCreate = useCallback(
    (fromItemId: string, toItemId: string, naturalLength: number) => {
      const id = `rope-${Date.now()}`;
      wallStore.addRope({ id, fromItemId, toItemId, naturalLength });
      // 连线完成后自动退出连线模式
      uiStore.setRopeMode(false);
      uiStore.showToast(t('toast.ropeConnected'), 'success', 2000);
    },
    [wallStore, uiStore, t],
  );

  const ropeCreation = useRopeCreation({
    items,
    onRopeCreate: handleRopeCreate,
    zoom: canvasView.zoom,
    panX: canvasView.panX,
    panY: canvasView.panY,
  });

  // Cancel rope creation / attach mode（ESC / 空白点击）
  const handleCancelRope = useCallback(() => {
    ropeCreation.cancelRopeCreation();
    uiStore.setRopeCreating(false);
    uiStore.setRopeMode(false);
    // v0.2 修订：ESC 同时退出附着模式
    if (uiStore.attachMode) {
      uiStore.cancelAttachMode();
      uiStore.showToast(t('toast.attachCanceled'), 'info', 2000);
    }
  }, [ropeCreation, uiStore, t]);

  // ropeMode 下点击处理：点 Pin/带 Pin 物件 → 连线；点空白 → 取消（v0.2 修订：扩大命中范围）
  const handleRootPointerDownCapture = useCallback(
    (e: React.PointerEvent) => {
      if (!useUIStore.getState().ropeMode) return;
      if (e.button !== 0) return;
      const target = e.target as HTMLElement;
      // 直接点在 Pin 上：由 Pin 自己处理
      if (target.closest('[data-pin-item-id]')) return;
      // 点在带 Pin 的物件本体上：等同点击该物件的 Pin
      const itemEl = target.closest('[data-item-id]');
      if (itemEl) {
        const itemId = itemEl.getAttribute('data-item-id');
        const it = useWallStore.getState().items.find((i) => i.id === itemId);
        const hasPin =
          it && !it.parentId &&
          (it.type === 'picture' || (it.type === 'paper' && it.variant !== 'tape'));
        if (hasPin && itemId) {
          ropeCreation.handlePinClick(itemId);
        } else {
          useUIStore.getState().showToast(t('toast.noPin'), 'warning', 2000);
        }
        return;
      }
      // 空白处：取消并退出模式
      ropeCreation.cancelRopeCreation();
      useUIStore.getState().setRopeMode(false);
    },
    [ropeCreation, t],
  );

  // v0.2：点击空白处清除选中（尺寸框消失）。物件自身 pointerdown 已 stopPropagation，
  // 这里只会收到空白/浮窗/菜单上的点击
  const handleBlankPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest(
          '[data-item-id], [data-toolbar-ui], [data-menu-layer], #top-bar',
        )
      ) {
        return;
      }
      // v0.2 修订：附着模式下点空白 = 取消附着
      if (uiStore.attachMode) {
        uiStore.cancelAttachMode();
        uiStore.showToast(t('toast.attachCanceled'), 'info', 2000);
        return;
      }
      uiStore.clearSelection();
    },
    [uiStore, t],
  );

  // Keyboard hook
  useKeyboard({
    uiStore,
    wallStore,
    items,
    onZoomIn: () => {},
    onZoomOut: () => {},
    onZoomReset: () => {},
    onCancel: handleCancelRope,
    onDeleteSelected: multiSelect.handleDeleteSelected,
    onSelectAll: multiSelect.handleSelectAll,
  });

  // Handle text change for Paper
  const handleTextChange = useCallback(
    (id: string, text: string) => {
      wallStore.updateItem(id, { text }, 'edit');
    },
    [wallStore],
  );

  // Handle pin drag end
  const handlePinDragEnd = useCallback(
    (id: string, offset: { x: number; y: number }) => {
      wallStore.updateItem(id, { pinOffset: offset }, 'edit');
    },
    [wallStore],
  );

  // View change callback from InfiniteCanvas
  const handleViewChange = useCallback(
    (view: { zoom: number; panX: number; panY: number }) => {
      setCanvasView(view);
    },
    [],
  );

  // Render overview page
  if (viewMode === 'overview') {
    return (
      <>
        <OverviewPage />
        <SharedWallBanner />
        <UserPageOverlay />
        <ToastLayer />
      </>
    );
  }

  // v0.3: Render Connection Map view（不渲染画布与工具栏）
  if (viewMode === 'map') {
    return (
      <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
        <TopBar />
        <ConnectionMapPage />
        <SharedWallBanner />
        <UserPageOverlay />
        <ToastLayer />
      </div>
    );
  }

  // Render wall editor
  return (
    <div
      style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}
      onPointerDownCapture={handleRootPointerDownCapture}
      onPointerDown={handleBlankPointerDown}
    >
      {/* TopBar */}
      <TopBar zoom={canvasView.zoom} />

      {/* BottomToolbar */}
      <BottomToolbar zoom={canvasView.zoom} panX={canvasView.panX} panY={canvasView.panY} />

      {/* Canvas area */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <SelectionBox
          items={items}
          zoom={canvasView.zoom}
          panX={canvasView.panX}
          panY={canvasView.panY}
          onSelect={multiSelect.handleBoxSelect}
        >
          <InfiniteCanvas
            ref={canvasRef}
            wallpaper={wallpaper}
            items={items}
            onViewChange={handleViewChange}
          >
            {/* Rope Layer (SVG) */}
            <RopeLayer
              ropes={ropes}
              items={items}
              dragTail={ropeCreation.dragTail}
              onRopeContextMenu={(id, x, y) => uiStore.openRopeContextMenu(id, x, y)}
            />

            {/* Items */}
            {items.map((item, index) => {
              // 附着在 Paper 上的 Stamp 由 PaperObject 内部渲染，跳过独立渲染
              if (item.type === 'stamp' && item.parentId) return null;
              return (
                <ObjectWrapper
                  key={item.id}
                  item={item}
                  selected={selectedIds.includes(item.id)}
                  zIndex={index + 2}
                  zoom={canvasView.zoom}
                  onSelect={multiSelect.handleSelect}
                  onPinDragEnd={handlePinDragEnd}
                  isRopeCreating={ropeMode || ropeCreating}
                  isRopeTarget={ropeCreation.ropeTargetId === item.id}
                  isRopeSource={ropeCreation.ropeSourceId === item.id}
                  onPinRopeClick={ropeCreation.handlePinClick}
                >
                  {item.type === 'picture' && <PictureObject item={item} zoom={canvasView.zoom} />}
                  {item.type === 'paper' && (
                    <PaperObject item={item} onTextChange={handleTextChange} zoom={canvasView.zoom} />
                  )}
                  {item.type === 'stamp' && <StampObject item={item} />}
                </ObjectWrapper>
              );
            })}
          </InfiniteCanvas>
        </SelectionBox>
      </div>

      {/* Context Menu */}
      <ContextMenu zoom={canvasView.zoom} />

      {/* Asset Picker Modal */}
      <AssetPickerModal />

      {/* 右下角缩放/Map 浮窗（v0.2） */}
      <ZoomWidget zoom={canvasView.zoom} canvasRef={canvasRef} />

      {/* Toast */}
      <SharedWallBanner />
      <UserPageOverlay />
      <ToastLayer />
    </div>
  );
}

export default App;
