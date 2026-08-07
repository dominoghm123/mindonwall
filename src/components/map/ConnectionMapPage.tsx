import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWallStore } from '../../store/useWallStore';
import { useMapStore } from '../../store/useMapStore';
import { useUIStore } from '../../store/useUIStore';
import { useAssetStore } from '../../store/useAssetStore';
import { captureNodePng } from '../../utils/exportImage';
import type { Item } from '../../store/types';

/**
 * Connection Map 视图（v0.3）。
 * - 忠实展示 Picture/Paper 节点 + Rope + 关联说明；隐藏墙纸与装饰纹理，高对比度
 * - 网格/环形自动排布（节点不重叠），可拖拽重排（不写回白墙）
 * - 附着 Stamp 作为子元素以小徽标展示，可点击隐藏/恢复
 * - 独立撤销栈（Ctrl+Z / Ctrl+Shift+Z），mapViewState 随墙持久化
 */

const NODE_W = 180;
const NODE_H = 140;
const DEFAULT_ROPE_COLOR = '#8B7355';

interface MapNode {
  item: Item;
  children: Item[]; // 附着的 stamp
}

export function ConnectionMapPage() {
  const items = useWallStore((s) => s.items);
  const ropes = useWallStore((s) => s.ropes);
  const wallName = useWallStore((s) => s.name);
  const nodePositions = useMapStore((s) => s.nodePositions);
  const hiddenChildren = useMapStore((s) => s.hiddenChildren);
  const canUndo = useMapStore((s) => s.undoStack.length > 0);
  const canRedo = useMapStore((s) => s.redoStack.length > 0);
  const mapUndo = useMapStore((s) => s.mapUndo);
  const mapRedo = useMapStore((s) => s.mapRedo);
  const updateNodePosition = useMapStore((s) => s.updateNodePosition);
  const toggleHideChild = useMapStore((s) => s.toggleHideChild);
  const resetMap = useMapStore((s) => s.resetMap);
  const showToast = useUIStore((s) => s.showToast);
  const setViewMode = useUIStore((s) => s.setViewMode);

  const [exporting, setExporting] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);
  const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight });

  /* ── 节点集合：顶层 picture/paper（stamp 不作为节点） ── */
  const nodes: MapNode[] = useMemo(() => {
    const topLevel = items.filter(
      (i) => (i.type === 'picture' || i.type === 'paper') && !i.parentId,
    );
    return topLevel.map((item) => ({
      item,
      children: items.filter((i) => i.type === 'stamp' && i.parentId === item.id),
    }));
  }, [items]);

  /* ── 自动排布：≤8 个环形，否则网格 ── */
  const autoLayout = useMemo(() => {
    const layout: Record<string, { x: number; y: number }> = {};
    const n = nodes.length;
    if (n === 0) return layout;
    if (n <= 8) {
      const radius = Math.max(240, (n * (NODE_W + 80)) / (2 * Math.PI));
      for (let i = 0; i < n; i++) {
        const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
        layout[nodes[i].item.id] = {
          x: radius + Math.cos(angle) * radius,
          y: radius + Math.sin(angle) * radius,
        };
      }
    } else {
      const cols = Math.ceil(Math.sqrt(n));
      for (let i = 0; i < n; i++) {
        layout[nodes[i].item.id] = {
          x: (i % cols) * (NODE_W + 100),
          y: Math.floor(i / cols) * (NODE_H + 110),
        };
      }
    }
    return layout;
  }, [nodes]);

  /** 最终位置：手动拖拽过的位置优先，否则自动排布 */
  const posOf = useCallback(
    (id: string) => nodePositions[id] ?? autoLayout[id] ?? { x: 0, y: 0 },
    [nodePositions, autoLayout],
  );

  /* ── 内容包围盒 ── */
  const bounds = useMemo(() => {
    if (nodes.length === 0) return { w: 600, h: 400 };
    let maxX = 0;
    let maxY = 0;
    for (const node of nodes) {
      const p = posOf(node.item.id);
      maxX = Math.max(maxX, p.x + NODE_W);
      maxY = Math.max(maxY, p.y + NODE_H);
    }
    return { w: maxX + 80, h: maxY + 80 };
  }, [nodes, posOf]);

  /* ── 视口自适应缩放 ── */
  useEffect(() => {
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const availW = viewport.w - 80;
    const availH = viewport.h - 160; // TopBar + 底部控制条
    setFitScale(Math.max(0.1, Math.min(1, availW / bounds.w, availH / bounds.h)));
  }, [viewport, bounds]);

  /* 键盘快捷键由 useKeyboard 统一处理（Map 视图走独立撤销栈） */

  /* ── 节点拖拽（实时本地状态，松手入撤销栈） ── */
  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    origin: { x: number; y: number };
    moved: boolean;
  } | null>(null);
  const [dragPos, setDragPos] = useState<{ id: string; x: number; y: number } | null>(null);

  const handleNodePointerDown = useCallback(
    (e: React.PointerEvent, id: string) => {
      e.stopPropagation();
      const origin = posOf(id);
      dragRef.current = { id, startX: e.clientX, startY: e.clientY, origin, moved: false };
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    },
    [posOf],
  );

  const handleNodePointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = (e.clientX - d.startX) / fitScale;
    const dy = (e.clientY - d.startY) / fitScale;
    if (!d.moved && Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
    d.moved = true;
    const next = { x: d.origin.x + dx, y: d.origin.y + dy };
    setDragPos({ id: d.id, x: next.x, y: next.y });
  }, [fitScale]);

  const handleNodePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current;
      dragRef.current = null;
      (e.currentTarget as Element).releasePointerCapture(e.pointerId);
      if (d && d.moved && dragPos && dragPos.id === d.id) {
        updateNodePosition(d.id, { x: dragPos.x, y: dragPos.y });
      }
      setDragPos(null);
    },
    [dragPos, updateNodePosition],
  );

  /* ── PNG 导出 ── */
  const handleExport = useCallback(async () => {
    if (!contentRef.current || exporting) return;
    setExporting(true);
    try {
      const dataUrl = await captureNodePng(contentRef.current);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${wallName.replace(/\s+/g, '-').toLowerCase()}-connection-map.png`;
      a.click();
      showToast('Connection Map exported', 'success');
    } catch {
      showToast('Export failed', 'error');
    } finally {
      setExporting(false);
    }
  }, [exporting, wallName, showToast]);

  const restoreHidden = useCallback(() => {
    for (const id of [...hiddenChildren]) toggleHideChild(id);
  }, [hiddenChildren, toggleHideChild]);

  const nodePos = (id: string) =>
    dragPos && dragPos.id === id ? { x: dragPos.x, y: dragPos.y } : posOf(id);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: '#F2F2F0',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      data-toolbar-ui
    >
      {/* 内容层（导出捕获此节点） */}
      <div
        style={{
          transform: `scale(${fitScale})`,
          transformOrigin: 'center center',
        }}
      >
        <div
          ref={contentRef}
          style={{
            position: 'relative',
            width: bounds.w,
            height: bounds.h,
            background: '#FFFFFF',
            border: '1px solid #E0E0E0',
            overflow: 'visible',
          }}
        >
          {/* 标题 */}
          <div
            style={{
              position: 'absolute',
              top: 20,
              left: 28,
              fontSize: 15,
              fontWeight: 700,
              color: '#222',
              userSelect: 'none',
            }}
          >
            {wallName} — Connection Map
          </div>

          {/* Rope 连线层 */}
          <svg
            width={bounds.w}
            height={bounds.h}
            style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none' }}
          >
            {ropes.map((rope) => {
              const from = nodes.find((n) => n.item.id === rope.fromItemId);
              const to = nodes.find((n) => n.item.id === rope.toItemId);
              if (!from || !to) return null;
              const p1 = nodePos(rope.fromItemId);
              const p2 = nodePos(rope.toItemId);
              const c1 = { x: p1.x + NODE_W / 2, y: p1.y + NODE_H / 2 };
              const c2 = { x: p2.x + NODE_W / 2, y: p2.y + NODE_H / 2 };
              const mid = { x: (c1.x + c2.x) / 2, y: (c1.y + c2.y) / 2 };
              const dist = Math.hypot(c2.x - c1.x, c2.y - c1.y);
              const ctrl = { x: mid.x, y: mid.y + Math.min(60, dist * 0.18) };
              // 贝塞尔 t=0.5 处的点（note 标签位置）
              const labelPt = {
                x: 0.25 * c1.x + 0.5 * ctrl.x + 0.25 * c2.x,
                y: 0.25 * c1.y + 0.5 * ctrl.y + 0.25 * c2.y,
              };
              return (
                <g key={rope.id}>
                  <path
                    d={`M ${c1.x} ${c1.y} Q ${ctrl.x} ${ctrl.y} ${c2.x} ${c2.y}`}
                    fill="none"
                    stroke={rope.color ?? DEFAULT_ROPE_COLOR}
                    strokeWidth={2}
                  />
                  {rope.note && (
                    <g>
                      <rect
                        x={labelPt.x - rope.note.length * 3.4 - 6}
                        y={labelPt.y - 10}
                        width={rope.note.length * 6.8 + 12}
                        height={20}
                        rx={4}
                        fill="#FFFFFF"
                        stroke="#DDD"
                      />
                      <text
                        x={labelPt.x}
                        y={labelPt.y + 4}
                        textAnchor="middle"
                        fontSize={11}
                        fill="#444"
                      >
                        {rope.note}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>

          {/* 节点 */}
          {nodes.map(({ item, children }) => {
            const p = nodePos(item.id);
            const visibleChildren = children.filter((c) => !hiddenChildren.includes(c.id));
            return (
              <MapNodeCard
                key={item.id}
                item={item}
                children={visibleChildren}
                x={p.x}
                y={p.y}
                onPointerDown={(e) => handleNodePointerDown(e, item.id)}
                onPointerMove={handleNodePointerMove}
                onPointerUp={handleNodePointerUp}
                onHideChild={toggleHideChild}
              />
            );
          })}
        </div>
      </div>

      {/* 底部控制条 */}
      <div
        style={{
          position: 'fixed',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: '#FFFFFF',
          border: '1px solid #E5E5E5',
          borderRadius: 10,
          padding: '6px 10px',
          zIndex: 1000,
          userSelect: 'none',
        }}
      >
        <MapButton label="Undo" disabled={!canUndo} onClick={mapUndo} />
        <MapButton label="Redo" disabled={!canRedo} onClick={mapRedo} />
        <div style={{ width: 1, height: 18, background: '#EEE' }} />
        {hiddenChildren.length > 0 && (
          <MapButton label={`Show hidden (${hiddenChildren.length})`} onClick={restoreHidden} />
        )}
        <MapButton
          label="Reset layout"
          onClick={() => {
            resetMap();
            showToast('Map layout reset', 'info');
          }}
        />
        <div style={{ width: 1, height: 18, background: '#EEE' }} />
        <MapButton label="Back to Wall" onClick={() => setViewMode('wall')} />
        <MapButton
          label={exporting ? 'Exporting…' : 'Export PNG'}
          disabled={exporting}
          onClick={handleExport}
          primary
        />
      </div>
    </div>
  );
}

/* ─── 节点卡片 ─── */
function MapNodeCard({
  item,
  children,
  x,
  y,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onHideChild,
}: {
  item: Item;
  children: Item[];
  x: number;
  y: number;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onHideChild: (id: string) => void;
}) {
  const assets = useAssetStore((s) => s.assets);
  const userAsset = item.assetId ? assets.find((a) => a.id === item.assetId) : undefined;
  const imgSrc = userAsset?.dataUrl ?? (item.assetId ? `/demo-assets/${item.assetId}.jpg` : '');

  const isPicture = item.type === 'picture';
  const isSticky = item.type === 'paper' && item.variant === 'sticky';
  const isTape = item.type === 'paper' && item.variant === 'tape';
  const bg = isSticky ? item.color ?? '#FFF9B0' : '#FFFFFF';

  const typeLabel = isPicture
    ? 'Picture'
    : item.variant === 'note'
      ? 'Note'
      : item.variant === 'torn'
        ? 'Torn Paper'
        : isSticky
          ? 'Sticky'
          : isTape
            ? 'Tape'
            : 'Paper';

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: NODE_W,
        height: NODE_H,
        background: bg,
        border: '1.5px solid #333',
        borderRadius: 8,
        cursor: 'grab',
        touchAction: 'none',
        userSelect: 'none',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* 类型标签 */}
      <div
        style={{
          height: 20,
          display: 'flex',
          alignItems: 'center',
          padding: '0 8px',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: 0.5,
          color: '#777',
          textTransform: 'uppercase',
          borderBottom: '1px solid #E8E8E8',
          background: isSticky ? 'rgba(255,255,255,0.4)' : '#FAFAFA',
        }}
      >
        {typeLabel}
      </div>

      {/* 内容区 */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {isPicture && imgSrc ? (
          <img
            src={imgSrc}
            alt=""
            draggable={false}
            style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
          />
        ) : isTape ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: item.color ?? '#D9E8D2',
              opacity: 0.75,
            }}
          />
        ) : (
          <div
            style={{
              padding: '8px 10px',
              fontSize: 11,
              lineHeight: 1.5,
              color: '#333',
              whiteSpace: 'pre-wrap',
              overflow: 'hidden',
            }}
          >
            {item.text || ''}
          </div>
        )}
      </div>

      {/* 附着子元素徽标（点击隐藏） */}
      {children.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: 4,
            padding: '4px 8px',
            borderTop: '1px solid #E8E8E8',
            background: '#FAFAFA',
          }}
        >
          {children.map((c) => (
            <div
              key={c.id}
              title="Click to hide this stamp from the map"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onHideChild(c.id);
              }}
              style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                border: '1px solid #999',
                background: '#FFF',
                fontSize: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#666',
              }}
            >
              ✦
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MapButton({
  label,
  onClick,
  disabled,
  primary,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        height: 26,
        padding: '0 10px',
        fontSize: 12,
        color: disabled ? '#BBB' : primary ? '#FFF' : '#444',
        background: primary && !disabled ? '#333' : '#FFFFFF',
        border: primary ? 'none' : '1px solid #DDD',
        borderRadius: 6,
        cursor: disabled ? 'default' : 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}
