import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWallStore } from '../../store/useWallStore';
import { useMapStore } from '../../store/useMapStore';
import { useUIStore } from '../../store/useUIStore';
import { useAssetStore } from '../../store/useAssetStore';
import { captureNodePng } from '../../utils/exportImage';
import { exportPdfFromDataUrl } from '../../utils/exportPdf';
import type { Item } from '../../store/types';

/**
 * Connection Map 视图（v0.3 重做，r2 增强）。
 * - xmind 式抽象树状图：统一圆角矩形节点 + 平滑连接线，去掉物件类型/图片/纹理等具象信息
 * - 树状自动布局：以 Rope 为边、连接最多的节点为根做 BFS 树；无连接节点排底部一行
 * - v0.3 r2: 去掉白色底图；无明确内容的模块（空 paper/无素材 picture）不显示；
 *   双击编辑文字、单击选中 + Delete 删除节点、hover 边中点加号新增连线、点击连线直接删除
 * - 交互：左键拖空白平移画布、滚轮缩放、拖节点重排、右键节点菜单（均存 Map 独立状态 + 独立撤销栈）
 */

const NODE_W = 176;
const NODE_H = 48;
const HGAP = 130; // 层级横向间距（r2: 加大，连线更舒展）
const VGAP = 32; // 兄弟节点纵向间距（r2: 加大，避免拥挤）
const COMP_GAP = 96; // 连通分量之间的纵向间距
const EDGE_COLOR = '#B9B9B9';

/* ── v0.3 r2: 节点边中点加号连线辅助 ── */
type HandleSide = 'top' | 'bottom' | 'left' | 'right';

/** 边中点在内容坐标系中的位置 */
function handlePoint(p: { x: number; y: number }, side: HandleSide) {
  switch (side) {
    case 'top':
      return { x: p.x + NODE_W / 2, y: p.y };
    case 'bottom':
      return { x: p.x + NODE_W / 2, y: p.y + NODE_H };
    case 'left':
      return { x: p.x, y: p.y + NODE_H / 2 };
    case 'right':
      return { x: p.x + NODE_W, y: p.y + NODE_H / 2 };
  }
}

const HANDLE_POS: Record<HandleSide, React.CSSProperties> = {
  top: { top: -9, left: '50%', marginLeft: -9 },
  bottom: { bottom: -9, left: '50%', marginLeft: -9 },
  left: { left: -9, top: '50%', marginTop: -9 },
  right: { right: -9, top: '50%', marginTop: -9 },
};

/** hover 节点时浮现的加号手柄（默认隐藏，由 .map-node:hover CSS 控制显隐） */
function HandlePlus({
  side,
  onClick,
}: {
  side: HandleSide;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      className="map-node-handle"
      onClick={onClick}
      onPointerDown={(e) => e.stopPropagation()}
      title="Drag to another node to connect"
      style={{
        position: 'absolute',
        width: 18,
        height: 18,
        borderRadius: '50%',
        background: '#4A90D9',
        color: '#FFFFFF',
        fontSize: 13,
        lineHeight: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'crosshair',
        boxShadow: '0 0 0 2px #FFFFFF',
        zIndex: 2,
        userSelect: 'none',
        ...HANDLE_POS[side],
      }}
    >
      +
    </div>
  );
}

export function ConnectionMapPage() {
  const items = useWallStore((s) => s.items);
  const ropes = useWallStore((s) => s.ropes);
  const wallName = useWallStore((s) => s.name);
  const nodePositions = useMapStore((s) => s.nodePositions);
  const nodeLabels = useMapStore((s) => s.nodeLabels);
  const canUndo = useMapStore((s) => s.undoStack.length > 0);
  const canRedo = useMapStore((s) => s.redoStack.length > 0);
  const mapUndo = useMapStore((s) => s.mapUndo);
  const mapRedo = useMapStore((s) => s.mapRedo);
  const updateNodePosition = useMapStore((s) => s.updateNodePosition);
  const clearNodePosition = useMapStore((s) => s.clearNodePosition);
  const updateNodeLabel = useMapStore((s) => s.updateNodeLabel);
  const hiddenChildren = useMapStore((s) => s.hiddenChildren);
  const toggleHideChild = useMapStore((s) => s.toggleHideChild);
  const extraEdges = useMapStore((s) => s.extraEdges);
  const hiddenRopes = useMapStore((s) => s.hiddenRopes);
  const addExtraEdge = useMapStore((s) => s.addExtraEdge);
  const removeExtraEdge = useMapStore((s) => s.removeExtraEdge);
  const toggleHideRope = useMapStore((s) => s.toggleHideRope);
  const resetMap = useMapStore((s) => s.resetMap);
  const showToast = useUIStore((s) => s.showToast);
  const setViewMode = useUIStore((s) => s.setViewMode);
  const assets = useAssetStore((s) => s.assets);

  const [exporting, setExporting] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /* ── 节点集合：顶层 picture/paper，且排除被删除/无明确内容的节点（v0.3 r2） ── */
  const hasContent = useCallback(
    (i: Item): boolean => {
      // 用户在 Map 内编辑过文本 → 视为有内容
      if (nodeLabels[i.id]?.trim()) return true;
      if (i.type === 'paper') return (i.text ?? '').trim().length > 0;
      return Boolean(i.assetId);
    },
    [nodeLabels],
  );

  const nodes: Item[] = useMemo(
    () =>
      items.filter(
        (i) =>
          (i.type === 'picture' || i.type === 'paper') &&
          !i.parentId &&
          !hiddenChildren.includes(i.id) &&
          hasContent(i),
      ),
    [items, hiddenChildren, hasContent],
  );

  /** 节点默认文本：paper 用文字；picture 用素材名（去掉编号前缀） */
  const labelOf = useCallback(
    (item: Item): string => {
      const custom = nodeLabels[item.id];
      if (custom !== undefined) return custom;
      if (item.type === 'paper') {
        const t = (item.text ?? '').trim();
        return t ? t.split('\n')[0] : '';
      }
      if (!item.assetId) return '';
      const userAsset = assets.find((a) => a.id === item.assetId);
      if (userAsset) return userAsset.id.replace(/^asset-/, 'Photo ');
      // demo 素材：north-01-wat-chedi-luang → Wat Chedi Luang
      const cleaned = item.assetId.replace(/^(north|bangkok)-\d+-?/, '').replace(/-/g, ' ').trim();
      if (!cleaned) return item.assetId.replace(/-/g, ' ');
      return cleaned
        .split(' ')
        .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
        .join(' ');
    },
    [nodeLabels, assets],
  );

  /* ── 可见连线：白墙 rope（排除 Map 内删除的）+ Map 内新增连线（v0.3 r2） ── */
  const visibleEdges = useMemo(() => {
    const ids = new Set(nodes.map((n) => n.id));
    const wall = ropes
      .filter((r) => ids.has(r.fromItemId) && ids.has(r.toItemId) && !hiddenRopes.includes(r.id))
      .map((r) => ({ kind: 'rope' as const, id: r.id, from: r.fromItemId, to: r.toItemId, note: r.note }));
    const extra = extraEdges
      .filter((e) => ids.has(e.from) && ids.has(e.to))
      .map((e) => ({ kind: 'extra' as const, id: e.id, from: e.from, to: e.to, note: undefined as string | undefined }));
    return [...wall, ...extra];
  }, [nodes, ropes, hiddenRopes, extraEdges]);

  /* ── xmind 式树状自动布局 ── */
  const autoLayout = useMemo(() => {
    const layout: Record<string, { x: number; y: number }> = {};
    if (nodes.length === 0) return layout;

    const ids = new Set(nodes.map((n) => n.id));
    const adj = new Map<string, string[]>();
    for (const id of ids) adj.set(id, []);
    const edges = visibleEdges;
    for (const r of edges) {
      adj.get(r.from)!.push(r.to);
      adj.get(r.to)!.push(r.from);
    }

    const placed = new Set<string>();
    let cursorY = 48;

    // 每个连通分量：连接最多的节点为根，BFS 建树后递归排布
    const connected = nodes.filter((n) => (adj.get(n.id) ?? []).length > 0);
    const comps: string[][] = [];
    for (const n of connected) {
      if (placed.has(n.id)) continue;
      const comp: string[] = [];
      const queue = [n.id];
      placed.add(n.id);
      while (queue.length) {
        const cur = queue.shift()!;
        comp.push(cur);
        for (const nb of adj.get(cur) ?? []) {
          if (!placed.has(nb)) {
            placed.add(nb);
            queue.push(nb);
          }
        }
      }
      comps.push(comp);
    }

    for (const comp of comps) {
      // 根 = 度数最大者
      const root = comp.reduce((a, b) =>
        (adj.get(a) ?? []).length >= (adj.get(b) ?? []).length ? a : b,
      );
      const parent = new Map<string, string>();
      const children = new Map<string, string[]>();
      const visited = new Set([root]);
      const q = [root];
      while (q.length) {
        const cur = q.shift()!;
        for (const nb of adj.get(cur) ?? []) {
          if (!visited.has(nb)) {
            visited.add(nb);
            parent.set(nb, cur);
            children.set(cur, [...(children.get(cur) ?? []), nb]);
            q.push(nb);
          }
        }
      }

      const depth = new Map<string, number>();
      depth.set(root, 0);
      for (const id of comp) {
        // BFS 顺序保证父先于子
        let d = 0;
        let cur = id;
        while (parent.has(cur)) {
          cur = parent.get(cur)!;
          d++;
        }
        depth.set(id, d);
      }

      // 递归子树高度 + 纵向居中排布
      const subtreeH = (id: string): number => {
        const kids = children.get(id) ?? [];
        if (kids.length === 0) return NODE_H;
        const total = kids.reduce((s, k) => s + subtreeH(k), 0) + VGAP * (kids.length - 1);
        return Math.max(NODE_H, total);
      };
      const placeSubtree = (id: string, top: number) => {
        const h = subtreeH(id);
        layout[id] = {
          x: 48 + (depth.get(id) ?? 0) * (NODE_W + HGAP),
          y: top + h / 2 - NODE_H / 2,
        };
        const kids = children.get(id) ?? [];
        let kidTop = top + h / 2 - (kids.reduce((s, k) => s + subtreeH(k), 0) + VGAP * (kids.length - 1)) / 2;
        for (const k of kids) {
          placeSubtree(k, kidTop);
          kidTop += subtreeH(k) + VGAP;
        }
      };
      placeSubtree(root, cursorY);

      let maxY = cursorY;
      for (const id of comp) maxY = Math.max(maxY, layout[id].y + NODE_H);
      cursorY = maxY + COMP_GAP;
    }

    // 无连接节点：底部一行（r2: 间距加大避免拥挤）
    const orphans = nodes.filter((n) => !placed.has(n.id));
    orphans.forEach((n, i) => {
      layout[n.id] = { x: 48 + i * (NODE_W + 80), y: cursorY + 32 };
    });

    return layout;
  }, [nodes, visibleEdges]);

  const posOf = useCallback(
    (id: string) => nodePositions[id] ?? autoLayout[id] ?? { x: 0, y: 0 },
    [nodePositions, autoLayout],
  );

  /* ── 内容包围盒 ── */
  const bounds = useMemo(() => {
    if (nodes.length === 0) return { w: 600, h: 400 };
    let maxX = 0;
    let maxY = 0;
    for (const n of nodes) {
      const p = posOf(n.id);
      maxX = Math.max(maxX, p.x + NODE_W);
      maxY = Math.max(maxY, p.y + NODE_H);
    }
    return { w: maxX + 48, h: maxY + 48 };
  }, [nodes, posOf]);

  /* ── 视口：fitScale + 用户缩放 + 平移 ── */
  const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [fitScale, setFitScale] = useState(1);
  const [view, setView] = useState({ panX: 0, panY: 0, zoom: 1 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const userMoved = useRef(false);

  useEffect(() => {
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const availW = viewport.w - 80;
    const availH = viewport.h - 140;
    setFitScale(Math.max(0.1, Math.min(1, availW / bounds.w, availH / bounds.h)));
  }, [viewport, bounds]);

  // 内容变化且用户未手动移动过 → 自动居中
  useEffect(() => {
    if (userMoved.current) return;
    setView({
      panX: (viewport.w - bounds.w * fitScale) / 2,
      panY: (viewport.h - bounds.h * fitScale) / 2 - 20,
      zoom: 1,
    });
  }, [fitScale, bounds, viewport]);

  const totalScale = fitScale * view.zoom;

  /* ── 画布平移（左键拖空白） ── */
  const panRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);

  const handleBgPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-map-node]') || target.closest('[data-toolbar-ui]')) return;
    panRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      panX: viewRef.current.panX,
      panY: viewRef.current.panY,
    };
    userMoved.current = true;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  }, []);

  const handleBgPointerMove = useCallback((e: React.PointerEvent) => {
    const p = panRef.current;
    if (!p) return;
    setView((v) => ({ ...v, panX: p.panX + e.clientX - p.startX, panY: p.panY + e.clientY - p.startY }));
  }, []);

  const handleBgPointerUp = useCallback((e: React.PointerEvent) => {
    panRef.current = null;
    try {
      (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  /* ── 滚轮缩放（以鼠标为不动点） ── */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      userMoved.current = true;
      const delta = -e.deltaY * 0.0012;
      setView((v) => {
        const newZoom = Math.max(0.4, Math.min(2.5, v.zoom * (1 + delta)));
        const ratio = newZoom / v.zoom;
        return {
          zoom: newZoom,
          panX: e.clientX - ratio * (e.clientX - v.panX),
          panY: e.clientY - ratio * (e.clientY - v.panY),
        };
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  /* ── 节点拖拽 ── */
  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    origin: { x: number; y: number };
    moved: boolean;
  } | null>(null);
  const [dragPos, setDragPos] = useState<{ id: string; x: number; y: number } | null>(null);

  /* ── 文本编辑 / 右键菜单 / 选中删除 / 加号连线状态（v0.3 r2） ── */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** 加号连线进行中：源节点 + 起点边中点 */
  const [pending, setPending] = useState<{ from: string; side: HandleSide; x: number; y: number } | null>(null);
  /** 连线进行中鼠标位置（内容坐标） */
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);

  const handleNodePointerDown = useCallback(
    (e: React.PointerEvent, id: string) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      const origin = posOf(id);
      // 连线进行中：不启动拖拽（moved 永为 false），由 pointerup 完成连线
      dragRef.current = { id, startX: e.clientX, startY: e.clientY, origin, moved: false };
      if (!pending) (e.currentTarget as Element).setPointerCapture(e.pointerId);
    },
    [posOf, pending],
  );

  const handleNodePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current;
      if (!d || pending) return; // 连线进行中不拖动节点
      const dx = (e.clientX - d.startX) / totalScale;
      const dy = (e.clientY - d.startY) / totalScale;
      if (!d.moved && Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
      d.moved = true;
      setDragPos({ id: d.id, x: d.origin.x + dx, y: d.origin.y + dy });
    },
    [totalScale, pending],
  );

  const handleNodePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current;
      dragRef.current = null;
      try {
        (e.currentTarget as Element).releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      if (d && d.moved && dragPos && dragPos.id === d.id) {
        updateNodePosition(d.id, { x: dragPos.x, y: dragPos.y });
      } else if (d && !d.moved) {
        if (pending) {
          // 连线进行中点击目标节点 → 完成连线
          if (pending.from !== d.id) addExtraEdge(pending.from, d.id);
          setPending(null);
          setGhost(null);
        } else {
          // 未移动视为单击 → 选中（Delete 可删除）
          setSelectedId(d.id);
        }
      }
      setDragPos(null);
    },
    [dragPos, updateNodePosition, pending, addExtraEdge],
  );

  /* ── Delete 删除选中节点 / Esc 取消连线 ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editingId) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault();
        toggleHideChild(selectedId);
        setSelectedId(null);
        showToast('Node removed from map (Undo to restore)', 'info');
      }
      if (e.key === 'Escape' && pending) {
        setPending(null);
        setGhost(null);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [editingId, selectedId, pending, toggleHideChild, showToast]);

  /** 屏幕坐标 → 内容坐标（用于加号连线预览） */
  const toContent = useCallback(
    (clientX: number, clientY: number) => {
      const rect = containerRef.current!.getBoundingClientRect();
      const s = fitScale * viewRef.current.zoom;
      return {
        x: (clientX - rect.left - viewRef.current.panX) / s,
        y: (clientY - rect.top - viewRef.current.panY) / s,
      };
    },
    [fitScale],
  );

  /** 点击空白：取消选中 / 取消连线中 */
  const handleBgClick = useCallback(() => {
    setSelectedId(null);
    if (pending) {
      setPending(null);
      setGhost(null);
    }
  }, [pending]);

  const handleNodeContextMenu = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ id, x: e.clientX, y: e.clientY });
  }, []);

  /** v0.3 r2: 双击节点进入文本编辑 */
  const handleNodeDoubleClick = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setEditingId(id);
  }, []);

  /** v0.3 r2: hover 边中点加号 → 开始连线 */
  const startConnect = useCallback(
    (e: React.MouseEvent, id: string, side: HandleSide) => {
      e.stopPropagation();
      const p = nodePos(id);
      const h = handlePoint(p, side);
      setPending({ from: id, side, x: h.x, y: h.y });
      setGhost(h);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodePositions, autoLayout, dragPos],
  );

  // 点击菜单外关闭
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-menu-layer]')) setMenu(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menu]);

  const nodePos = (id: string) =>
    dragPos && dragPos.id === id ? { x: dragPos.x, y: dragPos.y } : posOf(id);

  /** 删除连线：Map 新增连线直接移除，白墙 rope 在 Map 层隐藏 */
  const deleteEdge = useCallback(
    (kind: 'rope' | 'extra', id: string) => {
      if (kind === 'extra') removeExtraEdge(id);
      else toggleHideRope(id);
      showToast('Connection removed (Undo to restore)', 'info');
    },
    [removeExtraEdge, toggleHideRope, showToast],
  );

  /** 连接线几何：xmind 风格平滑贝塞尔曲线 + 中点（两端点同 x 时退化为直线） */
  const edgeGeometry = (from: string, to: string) => {
    const pf = nodePos(from);
    const pt = nodePos(to);
    const leftToRight = pf.x <= pt.x;
    const c1 = { x: leftToRight ? pf.x + NODE_W : pf.x, y: pf.y + NODE_H / 2 };
    const c2 = { x: leftToRight ? pt.x : pt.x + NODE_W, y: pt.y + NODE_H / 2 };
    const dx = Math.max(36, Math.min(80, Math.abs(c2.x - c1.x) / 2));
    const s = leftToRight ? 1 : -1;
    const d =
      Math.abs(c2.x - c1.x) < 2
        ? `M ${c1.x} ${c1.y} L ${c2.x} ${c2.y}`
        : `M ${c1.x} ${c1.y} C ${c1.x + dx * s} ${c1.y}, ${c2.x - dx * s} ${c2.y}, ${c2.x} ${c2.y}`;
    const mid = {
      x: Math.abs(c2.x - c1.x) < 2 ? c1.x : 0.125 * c1.x + 0.375 * (c1.x + dx * s) + 0.375 * (c2.x - dx * s) + 0.125 * c2.x,
      y: (c1.y + c2.y) / 2,
    };
    return { d, mid };
  };

  /* ── 连接线渲染（可见路径 + 加宽透明点击热区，点击直接删除） ── */
  const edgeEls = useMemo(
    () =>
      visibleEdges.map((edge) => {
        const { d, mid } = edgeGeometry(edge.from, edge.to);
        return (
          <g key={`${edge.kind}-${edge.id}`}>
            <path
              d={d}
              fill="none"
              stroke="transparent"
              strokeWidth={14}
              style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                deleteEdge(edge.kind, edge.id);
              }}
            />
            <path
              d={d}
              fill="none"
              stroke={EDGE_COLOR}
              strokeWidth={1.5}
              strokeDasharray={edge.kind === 'extra' ? '6 4' : undefined}
              pointerEvents="none"
            />
            {edge.note && (
              <text x={mid.x} y={mid.y - 6} textAnchor="middle" fontSize={10.5} fill="#999">
                {edge.note}
              </text>
            )}
          </g>
        );
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visibleEdges, nodePositions, autoLayout, dragPos, deleteEdge],
  );

  /* ── PNG / PDF 导出 ── */
  const fileBase = wallName.replace(/\s+/g, '-').toLowerCase() || 'wall';

  const handleExport = useCallback(async () => {
    if (!contentRef.current || exporting) return;
    setExporting(true);
    try {
      const dataUrl = await captureNodePng(contentRef.current);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${fileBase}-connection-map.png`;
      a.click();
      showToast('Connection Map exported', 'success');
    } catch {
      showToast('Export failed', 'error');
    } finally {
      setExporting(false);
    }
  }, [exporting, fileBase, showToast]);

  const handleExportPdf = useCallback(async () => {
    if (!contentRef.current || exporting) return;
    setExporting(true);
    try {
      const dataUrl = await captureNodePng(contentRef.current);
      await exportPdfFromDataUrl(dataUrl, `${fileBase}-connection-map.pdf`);
      showToast('PDF exported', 'success');
    } catch {
      showToast('Export failed', 'error');
    } finally {
      setExporting(false);
    }
  }, [exporting, fileBase, showToast]);

  return (
    <div
      ref={containerRef}
      onPointerDown={handleBgPointerDown}
      onContextMenu={(e) => e.preventDefault()}
      onClick={handleBgClick}
      onPointerMove={
        pending
          ? (e) => setGhost(toContent(e.clientX, e.clientY))
          : handleBgPointerMove
      }
      onPointerUp={handleBgPointerUp}
      style={{
        position: 'absolute',
        inset: 0,
        background: '#F5F5F3',
        overflow: 'hidden',
        cursor: pending ? 'crosshair' : panRef.current ? 'grabbing' : 'grab',
        touchAction: 'none',
      }}
    >
      {/* 变换层：pan + fitScale * zoom */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          transformOrigin: '0 0',
          transform: `translate(${view.panX}px, ${view.panY}px) scale(${totalScale})`,
        }}
      >
        {/* 内容层（导出捕获此节点；v0.3 r2: 去掉白色底图） */}
        <div
          ref={contentRef}
          style={{
            position: 'relative',
            width: bounds.w,
            height: bounds.h,
          }}
        >
          {/* 标题 */}
          <div
            style={{
              position: 'absolute',
              top: 18,
              left: 24,
              fontSize: 14,
              fontWeight: 700,
              color: '#333',
              userSelect: 'none',
            }}
          >
            {wallName}
          </div>

          {/* 连接线层 */}
          <svg
            width={bounds.w}
            height={bounds.h}
            style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none' }}
          >
            {edgeEls}
            {/* v0.3 r2: 加号连线进行中的预览虚线 */}
            {pending && ghost && (
              <path
                d={`M ${pending.x} ${pending.y} L ${ghost.x} ${ghost.y}`}
                fill="none"
                stroke="#4A90D9"
                strokeWidth={1.5}
                strokeDasharray="5 4"
              />
            )}
          </svg>

          {/* 节点 */}
          {nodes.map((item) => {
            const p = nodePos(item.id);
            const isEditing = editingId === item.id;
            const isSelected = selectedId === item.id;
            return (
              <div
                key={item.id}
                data-map-node
                onPointerDown={(e) => handleNodePointerDown(e, item.id)}
                onPointerMove={handleNodePointerMove}
                onPointerUp={handleNodePointerUp}
                onDoubleClick={(e) => handleNodeDoubleClick(e, item.id)}
                onClick={(e) => e.stopPropagation()}
                onContextMenu={(e) => handleNodeContextMenu(e, item.id)}
                className="map-node"
                style={{
                  position: 'absolute',
                  left: p.x,
                  top: p.y,
                  width: NODE_W,
                  minHeight: NODE_H,
                  background: '#FFFFFF',
                  border: isSelected ? '1.5px solid #4A90D9' : '1px solid #C9C9C9',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '6px 12px',
                  boxSizing: 'border-box',
                  cursor: pending && pending.from !== item.id ? 'crosshair' : 'grab',
                  touchAction: 'none',
                  userSelect: 'none',
                }}
              >
                {isEditing ? (
                  <NodeLabelEditor
                    initial={labelOf(item)}
                    onCommit={(v) => {
                      updateNodeLabel(item.id, v);
                      setEditingId(null);
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <span
                    style={{
                      fontSize: 12.5,
                      lineHeight: 1.45,
                      color: '#333',
                      textAlign: 'center',
                      wordBreak: 'break-word',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {labelOf(item)}
                  </span>
                )}

                {/* v0.3 r2: hover 各边中点浮现加号，点击开始连线 */}
                {(['top', 'bottom', 'left', 'right'] as HandleSide[]).map((side) => (
                  <HandlePlus key={side} side={side} onClick={(e) => startConnect(e, item.id, side)} />
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* 节点右键菜单 */}
      {menu && (
        <div
          data-menu-layer
          style={{
            position: 'fixed',
            left: Math.min(menu.x, window.innerWidth - 180),
            top: Math.min(menu.y, window.innerHeight - 100),
            background: '#FFFFFF',
            border: '1px solid #E0E0E0',
            borderRadius: 8,
            padding: '4px 0',
            minWidth: 150,
            zIndex: 10002,
            userSelect: 'none',
          }}
        >
          <MapMenuItem
            label="Edit label"
            onClick={() => {
              setEditingId(menu.id);
              setMenu(null);
            }}
          />
          <MapMenuItem
            label="Reset position"
            onClick={() => {
              clearNodePosition(menu.id);
              setMenu(null);
            }}
          />
          <MapMenuItem
            label="Delete node"
            danger
            onClick={() => {
              toggleHideChild(menu.id);
              setSelectedId(null);
              setMenu(null);
              showToast('Node removed from map (Undo to restore)', 'info');
            }}
          />
        </div>
      )}

      {/* 底部控制条 */}
      <div
        data-toolbar-ui
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
        <MapButton
          label="Reset layout"
          onClick={() => {
            resetMap();
            userMoved.current = false;
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
        <MapButton label="Export PDF" disabled={exporting} onClick={handleExportPdf} />
      </div>

      {/* 操作提示 */}
      <div
        style={{
          position: 'fixed',
          bottom: 20,
          left: 20,
          fontSize: 11,
          color: '#AAA',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        Drag canvas to pan · Scroll to zoom · Double-click node to edit · Select + Delete to remove · Hover node edge for + to connect · Click line to delete
      </div>
    </div>
  );
}

/* ─── 节点文本内联编辑器 ─── */
function NodeLabelEditor({
  initial,
  onCommit,
  onCancel,
}: {
  initial: string;
  onCommit: (v: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          onCommit(value.trim());
        }
        if (e.key === 'Escape') onCancel();
      }}
      onBlur={() => onCommit(value.trim())}
      rows={2}
      style={{
        width: '100%',
        fontSize: 12.5,
        lineHeight: 1.45,
        color: '#333',
        border: '1px solid #4A90D9',
        borderRadius: 4,
        outline: 'none',
        resize: 'none',
        padding: '4px 6px',
        boxSizing: 'border-box',
        fontFamily: 'inherit',
        textAlign: 'center',
      }}
    />
  );
}

function MapMenuItem({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <div
      onClick={onClick}
      style={{
        height: 32,
        display: 'flex',
        alignItems: 'center',
        padding: '0 14px',
        fontSize: 13,
        color: danger ? '#E25C5C' : '#333',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = '#F5F5F5';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = 'transparent';
      }}
    >
      {label}
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
