import { useState, useCallback, useRef } from 'react';
import { useWallStore } from '../../store/useWallStore';
import { useUIStore } from '../../store/useUIStore';
import { useAssetStore } from '../../store/useAssetStore';
import type { Item, PaperVariant } from '../../store/types';

/* ─── 图标（20px，纯白底工具栏内使用） ─── */
const IconImage = ({ color = '#666' }: { color?: string }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <rect x="2" y="2" width="16" height="16" rx="2" stroke={color} strokeWidth="1.2" />
    <circle cx="7" cy="7" r="2" fill={color} />
    <path d="M2 14 L8 8 L12 12 L18 6" stroke={color} strokeWidth="1" />
  </svg>
);

const IconPaper = ({ color = '#666' }: { color?: string }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M4 2 H12 L16 6 V18 H4 Z" stroke={color} strokeWidth="1.2" />
    <path d="M12 2 V6 H16" stroke={color} strokeWidth="1" />
    <line x1="7" y1="10" x2="13" y2="10" stroke={color} strokeWidth="0.8" />
    <line x1="7" y1="13" x2="13" y2="13" stroke={color} strokeWidth="0.8" />
  </svg>
);

const IconStamp = ({ color = '#666' }: { color?: string }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="10" r="7" stroke={color} strokeWidth="1.2" />
    <circle cx="10" cy="10" r="3" stroke={color} strokeWidth="0.8" />
  </svg>
);

const IconRope = ({ color = '#666' }: { color?: string }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M2 16 Q10 4 18 16" stroke={color} strokeWidth="1.2" fill="none" />
    <circle cx="2" cy="16" r="2" fill={color} />
    <circle cx="18" cy="16" r="2" fill={color} />
  </svg>
);

let idCounter = 0;
function genId(prefix: string) {
  return `${prefix}-${Date.now()}-${++idCounter}`;
}

/** 样例图片列表 */
const DEMO_IMAGES = [
  { id: 'north-01-wat-chedi-luang', src: '/demo-assets/north-01-wat-chedi-luang.jpg' },
  { id: 'north-02-khao-soi', src: '/demo-assets/north-02-khao-soi.jpg' },
  { id: 'north-03-white-temple', src: '/demo-assets/north-03-white-temple.jpg' },
  { id: 'bangkok-01', src: '/demo-assets/bangkok-01.jpg' },
  { id: 'bangkok-02', src: '/demo-assets/bangkok-02.jpg' },
  { id: 'bangkok-03', src: '/demo-assets/bangkok-03.jpg' },
];

/** Stamp 预设 */
const STAMP_PRESETS = [
  { id: 'stamp-blue-travel', src: '/demo-assets/stamps/stamp-blue-travel.png' },
  { id: 'stamp-gray-compass', src: '/demo-assets/stamps/stamp-gray-compass.png' },
  { id: 'stamp-green-nature', src: '/demo-assets/stamps/stamp-green-nature.png' },
  { id: 'stamp-red-passport', src: '/demo-assets/stamps/stamp-red-passport.png' },
  { id: 'stamp-yellow-sunshine', src: '/demo-assets/stamps/stamp-yellow-sunshine.png' },
];

/** Paper 变体配置 */
const PAPER_TABS: { variant: PaperVariant; label: string; presets: { label: string; color?: string }[] }[] = [
  { variant: 'note', label: 'Note', presets: [{ label: 'White' }, { label: 'Cream', color: '#FBF7EE' }, { label: 'Gray', color: '#F2F2F0' }] },
  { variant: 'torn', label: 'Torn', presets: [{ label: 'Kraft', color: '#F5F0E8' }, { label: 'White', color: '#FFFFFF' }] },
  { variant: 'sticky', label: 'Sticky', presets: [{ label: 'Yellow', color: '#FFF3B0' }, { label: 'Pink', color: '#FFB3BA' }, { label: 'Green', color: '#BAFFC9' }] },
  { variant: 'tape', label: 'Tape', presets: [{ label: 'Washi', color: 'rgba(232,224,200,0.6)' }, { label: 'White', color: 'rgba(255,255,255,0.6)' }] },
];

const DEFAULT_SIZES: Record<PaperVariant, { w: number; h: number }> = {
  note: { w: 180, h: 90 },
  torn: { w: 180, h: 95 },
  sticky: { w: 130, h: 130 },
  tape: { w: 90, h: 26 },
};

interface BottomToolbarProps {
  zoom: number;
  panX: number;
  panY: number;
}

/**
 * 底部工具栏（v0.2）。
 * 48px 高，4 个 40×40 图标按钮（Image/Paper/Stamp/Rope）。
 * 点击图标向上弹出次级面板（同时只能开一个，再点同一图标关闭）。
 * Rope 图标切换点击连线模式（图标加深表示选中）。
 * 纯白底 + 1px border #E5E5E5，圆角 14px，无阴影。
 */
export function BottomToolbar({ zoom, panX, panY }: BottomToolbarProps) {
  const toolbarPanel = useUIStore((s) => s.toolbarPanel);
  const toggleToolbarPanel = useUIStore((s) => s.toggleToolbarPanel);
  const ropeMode = useUIStore((s) => s.ropeMode);
  const setRopeMode = useUIStore((s) => s.setRopeMode);
  const showToast = useUIStore((s) => s.showToast);
  const addItem = useWallStore((s) => s.addItem);
  const assets = useAssetStore((s) => s.assets);
  const addAsset = useAssetStore((s) => s.addAsset);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [paperTab, setPaperTab] = useState<PaperVariant>('note');

  /** 计算视口中心对应的画布坐标 */
  const canvasCenter = useCallback(() => {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    return { x: (cx - panX) / zoom, y: (cy - panY) / zoom };
  }, [zoom, panX, panY]);

  /** 在画布中心附近添加物件（带随机偏移与轻微旋转） */
  const placeItem = useCallback(
    (w: number, h: number) => {
      const c = canvasCenter();
      return {
        x: c.x - w / 2 + (Math.random() - 0.5) * 60,
        y: c.y - h / 2 + (Math.random() - 0.5) * 60,
        rotation: (Math.random() - 0.5) * 6,
      };
    },
    [canvasCenter],
  );

  /* ── Image：上传 ── */
  const handleUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      Array.from(files).forEach((file) => {
        if (!file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          const id = `asset-${Date.now()}-${++idCounter}`;
          const ok = addAsset({
            id,
            mimeType: file.type,
            byteSize: file.size,
            storageKey: id,
            dataUrl,
          });
          if (!ok) {
            showToast('Upload limit reached', 'warning');
            return;
          }
          // 上传后直接添加 Picture 到画布中心
          const place = placeItem(220, 165);
          const item: Item = {
            id: genId('item-pic'),
            type: 'picture',
            ...place,
            width: 220,
            height: 165,
            assetId: id,
            pinOffset: { x: 0.5, y: 0 },
          };
          addItem(item);
        };
        reader.readAsDataURL(file);
      });
      e.target.value = '';
    },
    [addAsset, addItem, placeItem, showToast],
  );

  /** 点击缩略图添加 Picture */
  const handleAddImage = useCallback(
    (assetId: string) => {
      const place = placeItem(220, 165);
      const item: Item = {
        id: genId('item-pic'),
        type: 'picture',
        ...place,
        width: 220,
        height: 165,
        assetId,
        pinOffset: { x: 0.5, y: 0 },
      };
      addItem(item);
    },
    [addItem, placeItem],
  );

  /* ── Paper ── */
  const handleAddPaper = useCallback(
    (variant: PaperVariant, color?: string) => {
      const { w, h } = DEFAULT_SIZES[variant];
      const place = placeItem(w, h);
      const item: Item = {
        id: genId('item-paper'),
        type: 'paper',
        variant,
        ...place,
        width: w,
        height: h,
        text: variant === 'tape' ? undefined : '',
        color,
        pinOffset: variant === 'tape' ? undefined : { x: 0.5, y: 0 },
      };
      addItem(item);
    },
    [addItem, placeItem],
  );

  /* ── Stamp ── */
  const handleAddStamp = useCallback(
    (stampId: string) => {
      const place = placeItem(64, 64);
      const item: Item = {
        id: genId('item-stamp'),
        type: 'stamp',
        ...place,
        width: 64,
        height: 64,
        rotation: (Math.random() - 0.5) * 10,
        stampId,
      };
      addItem(item);
    },
    [addItem, placeItem],
  );

  /* ── Rope 模式切换 ── */
  const handleRopeToggle = useCallback(() => {
    setRopeMode(!ropeMode);
    if (!ropeMode) showToast('Rope mode: click two pins to connect', 'info', 2500);
  }, [ropeMode, setRopeMode, showToast]);

  const iconBtnStyle = (active: boolean): React.CSSProperties => ({
    width: 40,
    height: 40,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: active ? '#F0F0F0' : 'none',
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    padding: 0,
  });

  return (
    <>
      {/* 次级面板 */}
      {toolbarPanel === 'image' && (
        <Panel title="Add Image">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 64px)', gap: 8 }}>
            {/* 上传按钮 */}
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: 64,
                height: 64,
                border: '1px dashed #CCC',
                borderRadius: 6,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#999',
                fontSize: 10,
                gap: 2,
              }}
              title="Upload image"
            >
              <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
              Upload
            </div>
            {/* 用户上传缩略图 */}
            {assets.filter((a) => a.dataUrl).map((a) => (
              <Thumb key={a.id} src={a.dataUrl!} onClick={() => handleAddImage(a.id)} />
            ))}
            {/* 样例素材 */}
            {DEMO_IMAGES.map((d) => (
              <Thumb key={d.id} src={d.src} onClick={() => handleAddImage(d.id)} />
            ))}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={handleUpload}
          />
        </Panel>
      )}

      {toolbarPanel === 'paper' && (
        <Panel title="Add Paper">
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
            {PAPER_TABS.map((t) => (
              <button
                key={t.variant}
                onClick={() => setPaperTab(t.variant)}
                style={{
                  padding: '4px 10px',
                  fontSize: 12,
                  border: '1px solid',
                  borderColor: paperTab === t.variant ? '#4A90D9' : '#E5E5E5',
                  color: paperTab === t.variant ? '#4A90D9' : '#666',
                  background: '#FFFFFF',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          {/* 变体 */}
          <div style={{ display: 'flex', gap: 10 }}>
            {PAPER_TABS.find((t) => t.variant === paperTab)!.presets.map((p) => (
              <div
                key={p.label}
                onClick={() => handleAddPaper(paperTab, p.color)}
                style={{ cursor: 'pointer', textAlign: 'center' }}
                title={p.label}
              >
                <div
                  style={{
                    width: 64,
                    height: paperTab === 'tape' ? 20 : paperTab === 'sticky' ? 56 : 44,
                    background: p.color ?? '#FFFFFF',
                    border: '1px solid #DDD',
                    borderRadius: paperTab === 'torn' ? 2 : 4,
                    marginBottom: 4,
                  }}
                />
                <span style={{ fontSize: 10, color: '#999' }}>{p.label}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {toolbarPanel === 'stamp' && (
        <Panel title="Add Stamp">
          <div style={{ display: 'flex', gap: 10 }}>
            {STAMP_PRESETS.map((s) => (
              <div
                key={s.id}
                onClick={() => handleAddStamp(s.id)}
                style={{
                  width: 52,
                  height: 52,
                  border: '1px solid #EEE',
                  borderRadius: 6,
                  cursor: 'pointer',
                  padding: 4,
                  boxSizing: 'border-box',
                  background: '#FFFFFF',
                }}
                title={s.id.replace('stamp-', '')}
              >
                <img
                  src={s.src}
                  alt=""
                  draggable={false}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Rope 模式提示 */}
      {ropeMode && (
        <div
          style={{
            position: 'fixed',
            bottom: 84,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#FFFFFF',
            border: '1px solid #E5E5E5',
            borderRadius: 8,
            padding: '6px 12px',
            fontSize: 12,
            color: '#666',
            zIndex: 1000,
          }}
        >
          Click two pins to connect · Esc to cancel
        </div>
      )}

      {/* 工具栏本体 */}
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          height: 48,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '0 4px',
          background: '#FFFFFF',
          border: '1px solid #E5E5E5',
          borderRadius: 14,
          zIndex: 1000,
        }}
      >
        <button
          style={iconBtnStyle(toolbarPanel === 'image')}
          onClick={() => toggleToolbarPanel('image')}
          title="Image"
        >
          <IconImage color={toolbarPanel === 'image' ? '#333' : '#666'} />
        </button>
        <button
          style={iconBtnStyle(toolbarPanel === 'paper')}
          onClick={() => toggleToolbarPanel('paper')}
          title="Paper"
        >
          <IconPaper color={toolbarPanel === 'paper' ? '#333' : '#666'} />
        </button>
        <button
          style={iconBtnStyle(toolbarPanel === 'stamp')}
          onClick={() => toggleToolbarPanel('stamp')}
          title="Stamp"
        >
          <IconStamp color={toolbarPanel === 'stamp' ? '#333' : '#666'} />
        </button>
        <button
          style={iconBtnStyle(ropeMode)}
          onClick={handleRopeToggle}
          title="Rope"
        >
          <IconRope color={ropeMode ? '#333' : '#666'} />
        </button>
      </div>
    </>
  );
}

/** 次级面板容器：纯白 + 1px border，无阴影 */
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 84,
        left: '50%',
        transform: 'translateX(-50%)',
        background: '#FFFFFF',
        border: '1px solid #E5E5E5',
        borderRadius: 14,
        padding: 14,
        zIndex: 1000,
        maxWidth: 420,
      }}
    >
      <div style={{ fontSize: 11, color: '#999', marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

/** 图片缩略图 */
function Thumb({ src, onClick }: { src: string; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        width: 64,
        height: 64,
        borderRadius: 6,
        overflow: 'hidden',
        border: '1px solid #E8E8E8',
        cursor: 'pointer',
      }}
    >
      <img
        src={src}
        alt=""
        draggable={false}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    </div>
  );
}
