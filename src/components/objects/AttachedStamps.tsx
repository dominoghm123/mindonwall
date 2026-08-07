import { useCallback, useRef } from 'react';
import type { Item } from '../../store/types';
import { useWallStore } from '../../store/useWallStore';
import { useUIStore } from '../../store/useUIStore';
import { pushUndo, makeMoveItemAction } from '../../store/undoMiddleware';
import { StampObject } from './StampObject';

/**
 * 渲染附着在宿主物件（Paper / Picture）上的 Stamp 子物件（v0.2 修订）。
 * - 位置跟随宿主移动/缩放（比例坐标）
 * - 可拖拽（拖拽后转为绝对坐标写回 store）
 * - 右键打开 stamp 自己的上下文菜单
 */
export function AttachedStamps({ host, zoom = 1 }: { host: Item; zoom?: number }) {
  const items = useWallStore((s) => s.items);
  const selectItem = useUIStore((s) => s.selectItem);
  const selectedIds = useUIStore((s) => s.selectedIds);
  const openContextMenu = useUIStore((s) => s.openContextMenu);

  const stampDragRef = useRef<{
    stampId: string;
    startClientX: number;
    startClientY: number;
    startAbsX: number;
    startAbsY: number;
    zoom: number;
  } | null>(null);

  /** 将 stamp 坐标归一化为绝对画布坐标 */
  const toAbs = useCallback(
    (stamp: Item) => {
      if (stamp.x > 1 || stamp.y > 1) return { x: stamp.x, y: stamp.y };
      return {
        x: host.x + stamp.x * host.width,
        y: host.y + stamp.y * host.height,
      };
    },
    [host.x, host.y, host.width, host.height],
  );

  const handleStampPointerDown = useCallback(
    (stamp: Item) => (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      selectItem(stamp.id);
      const abs = toAbs(stamp);
      stampDragRef.current = {
        stampId: stamp.id,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startAbsX: abs.x,
        startAbsY: abs.y,
        zoom,
      };
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    },
    [selectItem, toAbs, zoom],
  );

  const handleStampPointerMove = useCallback((e: React.PointerEvent) => {
    const d = stampDragRef.current;
    if (!d) return;
    const dx = (e.clientX - d.startClientX) / d.zoom;
    const dy = (e.clientY - d.startClientY) / d.zoom;
    // 实时反馈：直接移动 DOM，不触发 store 写入
    (e.currentTarget as HTMLElement).style.transform = `translate(${dx}px, ${dy}px)`;
  }, []);

  const handleStampPointerUp = useCallback((e: React.PointerEvent) => {
    const d = stampDragRef.current;
    if (!d) return;
    stampDragRef.current = null;
    (e.currentTarget as HTMLElement).style.transform = '';
    const dx = (e.clientX - d.startClientX) / d.zoom;
    const dy = (e.clientY - d.startClientY) / d.zoom;
    if (Math.abs(dx) < 2 && Math.abs(dy) < 2) return; // 视为点击
    const newX = d.startAbsX + dx;
    const newY = d.startAbsY + dy;
    // 更新 store（绝对坐标）并记录 undo
    useWallStore.setState((state) => ({
      items: state.items.map((i) =>
        i.id === d.stampId ? { ...i, x: newX, y: newY } : i,
      ),
      undoStack: pushUndo(
        state.undoStack,
        makeMoveItemAction(d.stampId, { x: d.startAbsX, y: d.startAbsY }, { x: newX, y: newY }),
      ),
      redoStack: [],
    }));
  }, []);

  const attached = items.filter((i) => i.type === 'stamp' && i.parentId === host.id);
  if (attached.length === 0) return null;

  return (
    <>
      {attached.map((stamp) => {
        // 兼容绝对像素坐标（x > 1）和比例坐标（0-1）
        const leftPct = stamp.x > 1 ? ((stamp.x - host.x) / host.width) * 100 : stamp.x * 100;
        const topPct = stamp.y > 1 ? ((stamp.y - host.y) / host.height) * 100 : stamp.y * 100;
        const isStampSelected = selectedIds.includes(stamp.id);
        return (
          <div
            key={stamp.id}
            style={{
              position: 'absolute',
              left: `${leftPct}%`,
              top: `${topPct}%`,
              width: stamp.width,
              height: stamp.height,
              pointerEvents: 'auto',
              cursor: 'move',
              zIndex: 5,
              outline: isStampSelected ? '1px dashed #4A90D9' : undefined,
            }}
            onPointerDown={handleStampPointerDown(stamp)}
            onPointerMove={handleStampPointerMove}
            onPointerUp={handleStampPointerUp}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              openContextMenu(stamp.id, e.clientX, e.clientY);
            }}
          >
            <StampObject item={stamp} />
          </div>
        );
      })}
    </>
  );
}
