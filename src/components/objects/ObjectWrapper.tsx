import { useCallback, useRef, type ReactNode } from 'react';
import type { Item, PinOffset } from '../../store/types';
import { useUIStore } from '../../store/useUIStore';
import { useWallStore } from '../../store/useWallStore';
import { Pin } from './Pin';
import { useDrag } from '../../hooks/useDrag';
import { useResize, type ResizeDir } from '../../hooks/useResize';
import { useRotate } from '../../hooks/useRotate';
import { pushUndo, makeMoveItemAction, makeResizeItemAction, makeRotateItemAction } from '../../store/undoMiddleware';
import { useT } from '../../i18n/useT';

interface ObjectWrapperProps {
  item: Item;
  selected: boolean;
  zIndex: number;
  children: ReactNode;
  /** 画布缩放，传给 drag/resize 做坐标换算 */
  zoom?: number;
  onSelect?: (id: string, multi: boolean) => void;
  onMove?: (id: string, x: number, y: number) => void;
  onResize?: (id: string, w: number, h: number) => void;
  onRotate?: (id: string, rotation: number) => void;
  onPinDragEnd?: (id: string, offset: PinOffset) => void;
  /** Rope 创建相关 */
  isRopeTarget?: boolean;
  isRopeSource?: boolean;
  isRopeCreating?: boolean;
  onPinRopeStart?: (itemId: string, e: React.PointerEvent) => void;
  /** v0.2: Rope 点击连线模式下 Pin 被点击 */
  onPinRopeClick?: (itemId: string) => void;
}

/** 手柄光标映射 */
const HANDLE_CURSORS: Record<ResizeDir, string> = {
  nw: 'nwse-resize',
  n: 'ns-resize',
  ne: 'nesw-resize',
  e: 'ew-resize',
  se: 'nwse-resize',
  s: 'ns-resize',
  sw: 'nesw-resize',
  w: 'ew-resize',
};

/** 角手柄尺寸 */
const CORNER_SIZE = 6;
/** 边手柄尺寸 */
const EDGE_W = 10;
const EDGE_H = 4;

/**
 * 通用物件容器。
 * 集成 useDrag / useResize / useRotate hooks。
 * 提供选中态边框、8 个缩放手柄、旋转手柄、Pin。
 */
export function ObjectWrapper({
  item,
  selected,
  zIndex,
  children,
  zoom = 1,
  onSelect,
  onMove,
  onResize,
  onRotate,
  onPinDragEnd,
  isRopeTarget,
  isRopeSource,
  isRopeCreating,
  onPinRopeStart,
  onPinRopeClick,
}: ObjectWrapperProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  /** 当前活跃交互模式（ref 避免闭包 stale state） */
  const activeModeRef = useRef<'none' | 'drag' | 'resize' | 'rotate'>('none');

  /* ── Drag hook ── */
  const drag = useDrag({
    x: item.x,
    y: item.y,
    zoom,
    // v0.2：拖拽中实时写 store（不碰 undo 栈），让 rope 跟随移动
    onDragMove: useCallback(
      (pos: { x: number; y: number }) => {
        useWallStore.setState((state) => ({
          items: state.items.map((i) =>
            i.id === item.id ? { ...i, x: pos.x, y: pos.y } : i,
          ),
        }));
      },
      [item.id],
    ),
    onDragEnd: useCallback(
      (newPos: { x: number; y: number }, startPos: { x: number; y: number }) => {
        // 直接设置最终位置并记录正确的 undo（before=startPos, after=newPos）
        useWallStore.setState((state) => ({
          items: state.items.map((i) =>
            i.id === item.id ? { ...i, x: newPos.x, y: newPos.y } : i,
          ),
          undoStack: pushUndo(state.undoStack, makeMoveItemAction(item.id, startPos, newPos)),
          redoStack: [],
        }));
        onMove?.(item.id, newPos.x, newPos.y);
      },
      [item.id, onMove],
    ),
  });

  /* ── Resize hook ── */
  const resize = useResize({
    width: item.width,
    height: item.height,
    x: item.x,
    y: item.y,
    zoom,
    onResizeEnd: useCallback(
      (
        newSize: { width: number; height: number },
        startSize: { width: number; height: number },
      ) => {
        useWallStore.setState((state) => ({
          items: state.items.map((i) =>
            i.id === item.id
              ? { ...i, width: newSize.width, height: newSize.height }
              : i,
          ),
          undoStack: pushUndo(state.undoStack, makeResizeItemAction(item.id, startSize, newSize)),
          redoStack: [],
        }));
        onResize?.(item.id, newSize.width, newSize.height);
      },
      [item.id, onResize],
    ),
  });

  /* ── Rotate hook ── */
  const rotate = useRotate({
    rotation: item.rotation,
    wrapperRef,
    onRotateEnd: useCallback(
      (newRotation: number, startRotation: number) => {
        useWallStore.setState((state) => ({
          items: state.items.map((i) =>
            i.id === item.id ? { ...i, rotation: newRotation } : i,
          ),
          undoStack: pushUndo(state.undoStack, makeRotateItemAction(item.id, startRotation, newRotation)),
          redoStack: [],
        }));
        onRotate?.(item.id, newRotation);
      },
      [item.id, onRotate],
    ),
  });

  const openContextMenu = useUIStore((s) => s.openContextMenu);
  const attachMode = useUIStore((s) => s.attachMode);
  const cancelAttachMode = useUIStore((s) => s.cancelAttachMode);
  const showToast = useUIStore((s) => s.showToast);
  const attachStamp = useWallStore((s) => s.attachStamp);
  const t = useT();

  /* ── 右键菜单 ── */
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      openContextMenu(item.id, e.clientX, e.clientY);
    },
    [item.id, openContextMenu],
  );

  /* ── 附着模式：点击 Paper / Picture 完成附着（v0.2 修订：带反馈） ── */
  const handleClickForAttach = useCallback(() => {
    if (!attachMode) return;
    if (item.type === 'paper' || item.type === 'picture') {
      attachStamp(attachMode, item.id);
      cancelAttachMode();
      showToast(t('toast.stampAttached'), 'success', 2000);
    } else {
      showToast(t('toast.stampOnlyPaper'), 'warning', 2000);
    }
  }, [attachMode, item.id, item.type, attachStamp, cancelAttachMode, showToast, t]);

  /* ── 统一 pointer 事件分发 ── */
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Rope 连线模式下：不选中不拖拽（由 App 根节点处理连线点击）
      if (isRopeCreating) return;
      // 如果点击的是 Pin 区域，跳过物件拖拽
      const target = e.target as HTMLElement;
      if (target.closest('[data-pin-item-id]')) return;

      if (e.button !== 0) return;
      e.stopPropagation();
      onSelect?.(item.id, e.ctrlKey || e.metaKey);
      activeModeRef.current = 'drag';
      drag.handlePointerDown(e);
    },
    [item.id, onSelect, drag, isRopeCreating],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      // 分发给当前活跃的交互
      const mode = activeModeRef.current;
      if (mode === 'rotate') {
        rotate.handlePointerMove(e);
      } else if (mode === 'resize') {
        resize.handlePointerMove(e);
      } else if (mode === 'drag') {
        drag.handlePointerMove(e);
      } else if (rotate.isArmed || rotate.isRotating) {
        // 旋转长按激活后首次 move
        rotate.handlePointerMove(e);
      }
    },
    [drag, resize, rotate],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const mode = activeModeRef.current;
      if (mode === 'rotate') {
        rotate.handlePointerUp(e);
      } else if (mode === 'resize') {
        resize.handlePointerUp(e);
      } else {
        drag.handlePointerUp(e);
      }
      activeModeRef.current = 'none';
    },
    [drag, resize, rotate],
  );

  /* ── 计算当前渲染参数 ── */
  const displayX = resize.isResizing ? resize.resizeX : drag.dragX;
  const displayY = resize.isResizing ? resize.resizeY : drag.dragY;
  const displayW = resize.isResizing ? resize.resizeWidth : item.width;
  const displayH = resize.isResizing ? resize.resizeHeight : item.height;
  const displayRotation = rotate.currentRotation;

  // Pin 只出现在 picture 和非 tape 的 paper 上
  const showPin = item.type === 'picture' || (item.type === 'paper' && item.variant !== 'tape');
  const pinOffset = item.pinOffset ?? { x: 0.5, y: 0 };

  return (
    <div
      ref={wrapperRef}
      data-item-id={item.id}
      style={{
        position: 'absolute',
        left: displayX,
        top: displayY,
        width: displayW,
        height: displayH,
        transform: `rotate(${displayRotation}deg)`,
        zIndex,
        cursor:
          attachMode && (item.type === 'paper' || item.type === 'picture') ? 'crosshair' : 'move',
        outline:
          attachMode && (item.type === 'paper' || item.type === 'picture')
            ? '2px dashed #4A90D9'
            : undefined,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onContextMenu={handleContextMenu}
      onClick={handleClickForAttach}
    >
      {/* 物件内容 */}
      <div style={{ width: '100%', height: '100%', overflow: 'visible' }}>
        {children}
      </div>

      {/* 选中态边框：1px dashed #4A90D9 */}
      {selected && (
        <div
          style={{
            position: 'absolute',
            inset: -1,
            border: '1px dashed #4A90D9',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* 缩放手柄 */}
      {selected && (
        <>
          {(['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as ResizeDir[]).map(
            (dir) => {
              const isCorner = dir.length === 2;
              const w = isCorner ? CORNER_SIZE : EDGE_W;
              const h = isCorner ? CORNER_SIZE : EDGE_H;
              const style = getHandleStyle(dir, displayW, displayH, w, h);
              return (
                <div
                  key={dir}
                  style={{
                    position: 'absolute',
                    ...style,
                    width: w,
                    height: isCorner ? CORNER_SIZE : EDGE_H,
                    background: '#FFFFFF',
                    border: '1px solid #4A90D9',
                    borderRadius: isCorner ? 0 : 2,
                    cursor: HANDLE_CURSORS[dir],
                    zIndex: 20,
                  }}
                  onPointerDown={(e) => {
                    activeModeRef.current = 'resize';
                    resize.handleResizeStart(dir)(e);
                  }}
                />
              );
            },
          )}

          {/* 旋转触发区：选中框顶部区域，长按后拖动旋转（v0.2 修订） */}
          <div
            onPointerDown={(e) => {
              activeModeRef.current = 'rotate';
              rotate.handleRotateStart(e);
            }}
            title={t('common.rotateHint')}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: -22,
              height: 22,
              cursor: 'grab',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 20,
            }}
          >
            <span
              style={{
                fontSize: 14,
                color: rotate.isArmed || rotate.isRotating ? '#2E7D32' : '#4A90D9',
                userSelect: 'none',
                pointerEvents: 'none',
              }}
            >
              ⊙
            </span>
          </div>
          {/* 旋转手柄连线 */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: -8,
              width: 1,
              height: 8,
              background: '#4A90D9',
              transform: 'translateX(-50%)',
              pointerEvents: 'none',
            }}
          />
        </>
      )}

      {/* 实时尺寸反馈（缩放时） */}
      {resize.isResizing && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: -24,
            transform: 'translateX(-50%)',
            background: '#fff',
            border: '1px solid #4A90D9',
            borderRadius: 3,
            padding: '1px 6px',
            fontSize: 11,
            color: '#4A90D9',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 30,
          }}
        >
          {Math.round(displayW)} × {Math.round(displayH)}
        </div>
      )}

      {/* 旋转角度反馈（吸附整角时变绿） */}
      {rotate.isRotating && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: -48,
            transform: 'translateX(-50%)',
            background: '#fff',
            border: `1px solid ${rotate.isSnapped ? '#2E7D32' : '#4A90D9'}`,
            borderRadius: 3,
            padding: '1px 6px',
            fontSize: 11,
            fontWeight: rotate.isSnapped ? 700 : 400,
            color: rotate.isSnapped ? '#2E7D32' : '#4A90D9',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 30,
          }}
        >
          {Math.round(((displayRotation % 360) + 360) % 360)}°
        </div>
      )}

      {/* Pin */}
      {showPin && (
        <Pin
          offset={pinOffset}
          parentWidth={displayW}
          parentHeight={displayH}
          onDragEnd={(offset) => onPinDragEnd?.(item.id, offset)}
          itemId={item.id}
          isRopeTarget={isRopeTarget}
          isRopeSource={isRopeSource}
          isRopeCreating={isRopeCreating}
          onRopeStart={onPinRopeStart}
          onRopePinClick={onPinRopeClick}
        />
      )}
    </div>
  );
}

/** 根据方向计算手柄位置样式 */
function getHandleStyle(
  dir: ResizeDir,
  w: number,
  h: number,
  handleW: number,
  handleH: number,
): React.CSSProperties {
  const halfW = handleW / 2;
  const halfH = handleH / 2;
  switch (dir) {
    case 'nw':
      return { left: -halfW, top: -halfH };
    case 'n':
      return { left: w / 2 - halfW, top: -halfH };
    case 'ne':
      return { left: w - halfW, top: -halfH };
    case 'e':
      return { left: w - halfW, top: h / 2 - halfH };
    case 'se':
      return { left: w - halfW, top: h - halfH };
    case 's':
      return { left: w / 2 - halfW, top: h - halfH };
    case 'sw':
      return { left: -halfW, top: h - halfH };
    case 'w':
      return { left: -halfW, top: h / 2 - halfH };
  }
}
