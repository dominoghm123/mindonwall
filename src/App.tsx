import { useEffect, useCallback, useState } from 'react';
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
import { SelectionBox } from './components/canvas/SelectionBox';
import { RopeLayer } from './components/objects/RopeLayer';
import { ObjectWrapper } from './components/objects/ObjectWrapper';
import { PictureObject } from './components/objects/PictureObject';
import { PaperObject } from './components/objects/PaperObject';
import { StampObject } from './components/objects/StampObject';
import { ContextMenu } from './components/shared/ContextMenu';
import { AssetPickerModal } from './components/shared/AssetPickerModal';

function App() {
  // Store selectors
  const viewMode = useUIStore((s) => s.viewMode);
  const items = useWallStore((s) => s.items);
  const ropes = useWallStore((s) => s.ropes);
  const wallpaper = useWallStore((s) => s.wallpaper);
  const selectedIds = useUIStore((s) => s.selectedIds);
  const ropeCreating = useUIStore((s) => s.ropeCreating);

  // Store actions
  const uiStore = useUIStore();
  const wallStore = useWallStore();

  // Canvas view state
  const [canvasView, setCanvasView] = useState({ zoom: 1, panX: 0, panY: 0 });

  // Initialize stores
  useEffect(() => {
    useOverviewStore.getState().initIfNeeded();
    useWallStore.getState().initDefaultWall();
  }, []);

  // MultiSelect hook
  const multiSelect = useMultiSelect({ items, uiStore, wallStore });

  // RopeCreation hook
  const handleRopeCreate = useCallback(
    (fromItemId: string, toItemId: string, naturalLength: number) => {
      const id = `rope-${Date.now()}`;
      wallStore.addRope({ id, fromItemId, toItemId, naturalLength });
    },
    [wallStore],
  );

  const ropeCreation = useRopeCreation({
    items,
    onRopeCreate: handleRopeCreate,
  });

  // Cancel rope creation
  const handleCancelRope = useCallback(() => {
    ropeCreation.cancelRopeCreation();
    uiStore.setRopeCreating(false);
  }, [ropeCreation, uiStore]);

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
    return <OverviewPage />;
  }

  // Render wall editor
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      {/* TopBar */}
      <TopBar zoom={canvasView.zoom} />

      {/* BottomToolbar */}
      <BottomToolbar />

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
                  isRopeCreating={ropeCreating}
                  isRopeTarget={ropeCreation.ropeTargetId === item.id}
                  onPinRopeStart={ropeCreation.handlePinMouseDown}
                >
                  {item.type === 'picture' && <PictureObject item={item} />}
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
    </div>
  );
}

export default App;
