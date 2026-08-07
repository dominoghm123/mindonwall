import { useEffect, useRef, useState } from 'react';
import { useUIStore } from '../../store/useUIStore';
import { useOverviewStore } from '../../store/useOverviewStore';
import { useAssetStore } from '../../store/useAssetStore';
import type { Asset } from '../../store/types';

/**
 * v0.3 P3: 全屏用户页面（Profile / Materials / Settings）。
 * 由头像菜单入口打开，覆盖在所有视图之上；Esc 或 Back 返回。
 */

export type UserPageKey = 'profile' | 'materials' | 'settings';

const PAGE_TITLES: Record<UserPageKey, string> = {
  profile: 'Profile',
  materials: 'Materials',
  settings: 'Settings',
};

/** 页面容器：根据 uiStore.page 渲染对应页面，无打开则返回 null */
export function UserPageOverlay() {
  const page = useUIStore((s) => s.page);
  if (!page) return null;
  return (
    <PageShell title={PAGE_TITLES[page]}>
      {page === 'profile' && <ProfilePage />}
      {page === 'materials' && <MaterialsPage />}
      {page === 'settings' && <SettingsPage />}
    </PageShell>
  );
}

/* ─── 页面外壳 ─── */
function PageShell({ title, children }: { title: string; children: React.ReactNode }) {
  const openPage = useUIStore((s) => s.openPage);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') openPage(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [openPage]);

  return (
    <div
      data-toolbar-ui
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 20000,
        background: '#FAFAF8',
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
      }}
    >
      {/* 顶栏 */}
      <div
        style={{
          height: 48,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '0 20px',
          background: '#FFFFFF',
          borderBottom: '1px solid #E8E8E8',
        }}
      >
        <button
          onClick={() => openPage(null)}
          style={{
            height: 28,
            padding: '0 12px',
            fontSize: 12,
            color: '#333',
            background: '#FFFFFF',
            border: '1px solid #D0D0D0',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          ← Back
        </button>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#333' }}>{title}</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: '#AAA' }}>Esc to close</span>
      </div>

      {/* 内容区 */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 880, margin: '0 auto', padding: '32px 24px 60px' }}>{children}</div>
      </div>
    </div>
  );
}

/* ─── Profile 页 ─── */
function ProfilePage() {
  const userName = useOverviewStore((s) => s.userName);
  const setUserName = useOverviewStore((s) => s.setUserName);
  const walls = useOverviewStore((s) => s.walls);
  const wallData = useOverviewStore((s) => s.wallData);
  const assets = useAssetStore((s) => s.assets);
  const [name, setName] = useState(userName);

  const totalObjects = walls.reduce((sum, w) => sum + w.itemCount, 0);
  const totalRopes = walls.reduce(
    (sum, w) => sum + (wallData[w.id]?.ropes.length ?? 0),
    0,
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* 头像 + 昵称 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: '#F0F0F0',
            border: '1px solid #E0E0E0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
            fontWeight: 700,
            color: '#666',
          }}
        >
          {(userName.trim()[0] ?? 'U').toUpperCase()}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 11, color: '#999' }}>Display name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => name.trim() && setUserName(name.trim())}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
            maxLength={24}
            style={{
              width: 240,
              height: 32,
              padding: '0 10px',
              fontSize: 13,
              color: '#333',
              background: '#FFFFFF',
              border: '1px solid #D0D0D0',
              borderRadius: 6,
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* 统计卡片 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <StatCard label="Walls" value={walls.length} />
        <StatCard label="Objects" value={totalObjects} />
        <StatCard label="Ropes" value={totalRopes} />
        <StatCard label="Materials" value={assets.length} />
      </div>

      <div style={{ fontSize: 11, color: '#BBB' }}>Mind on Wall · v0.3</div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E8E8E8',
        borderRadius: 10,
        padding: '18px 20px',
      }}
    >
      <div style={{ fontSize: 24, fontWeight: 700, color: '#333' }}>{value}</div>
      <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>{label}</div>
    </div>
  );
}

/* ─── Materials 页（素材库） ─── */
type MaterialFilter = 'all' | 'picture' | 'paper' | 'stamp';

const FILTERS: { key: MaterialFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'picture', label: 'Pictures' },
  { key: 'paper', label: 'Papers' },
  { key: 'stamp', label: 'Stamps' },
];

const MAX_ASSETS = 12;

function MaterialsPage() {
  const assets = useAssetStore((s) => s.assets);
  const addAsset = useAssetStore((s) => s.addAsset);
  const removeAsset = useAssetStore((s) => s.removeAsset);
  const wallData = useOverviewStore((s) => s.wallData);
  const showToast = useUIStore((s) => s.showToast);
  const [filter, setFilter] = useState<MaterialFilter>('all');
  const fileRef = useRef<HTMLInputElement>(null);
  const idCounter = useRef(0);

  const filtered = assets.filter((a) => filter === 'all' || (a.kind ?? 'picture') === filter);

  /** 素材是否被任一墙使用 */
  const isUsed = (assetId: string) =>
    Object.values(wallData).some((w) => w.items.some((i) => i.assetId === assetId));

  const handleUpload = (files: FileList | null) => {
    if (!files) return;
    if (assets.length >= MAX_ASSETS) {
      showToast(`Material limit reached (${MAX_ASSETS})`, 'warning');
      return;
    }
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const id = `asset-${Date.now()}-${++idCounter.current}`;
        const kind = filter === 'all' ? 'picture' : filter;
        const ok = addAsset({
          id,
          mimeType: file.type,
          byteSize: file.size,
          storageKey: id,
          dataUrl,
          kind,
        });
        showToast(ok ? 'Material added' : `Material limit reached (${MAX_ASSETS})`, ok ? 'success' : 'warning');
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemove = (asset: Asset) => {
    if (isUsed(asset.id)) {
      showToast('This material is used on a wall and cannot be removed', 'warning');
      return;
    }
    removeAsset(asset.id);
    showToast('Material removed', 'success');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 过滤 + 上传 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              height: 28,
              padding: '0 14px',
              fontSize: 12,
              color: filter === f.key ? '#FFFFFF' : '#555',
              background: filter === f.key ? '#333333' : '#FFFFFF',
              border: '1px solid ' + (filter === f.key ? '#333333' : '#D0D0D0'),
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            {f.label}
          </button>
        ))}
        <span style={{ fontSize: 11, color: '#999', marginLeft: 8 }}>
          {assets.length}/{MAX_ASSETS} used
        </span>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={assets.length >= MAX_ASSETS}
          style={{
            marginLeft: 'auto',
            height: 28,
            padding: '0 14px',
            fontSize: 12,
            color: assets.length >= MAX_ASSETS ? '#BBB' : '#FFFFFF',
            background: assets.length >= MAX_ASSETS ? '#F0F0F0' : '#4A90D9',
            border: 'none',
            borderRadius: 6,
            cursor: assets.length >= MAX_ASSETS ? 'not-allowed' : 'pointer',
          }}
        >
          Upload
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => {
            handleUpload(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {/* 素材网格 */}
      {filtered.length === 0 ? (
        <div
          style={{
            padding: '48px 0',
            textAlign: 'center',
            fontSize: 12,
            color: '#AAA',
            border: '1px dashed #DDDDDD',
            borderRadius: 10,
          }}
        >
          No materials yet. Upload images to build your library.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {filtered.map((a) => (
            <MaterialCard
              key={a.id}
              asset={a}
              used={isUsed(a.id)}
              onRemove={() => handleRemove(a)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MaterialCard({ asset, used, onRemove }: { asset: Asset; used: boolean; onRemove: () => void }) {
  const [hover, setHover] = useState(false);
  const kindLabel = (asset.kind ?? 'picture')[0].toUpperCase() + (asset.kind ?? 'picture').slice(1);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        background: '#FFFFFF',
        border: '1px solid #E8E8E8',
        borderRadius: 10,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          height: 110,
          background: `center/cover no-repeat url("${asset.dataUrl ?? ''}")`,
          backgroundColor: '#F5F5F5',
        }}
      />
      <div style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span
          style={{
            fontSize: 10,
            color: '#777',
            background: '#F2F2F0',
            borderRadius: 4,
            padding: '2px 6px',
          }}
        >
          {kindLabel}
        </span>
        <span style={{ fontSize: 10, color: '#AAA', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {(asset.byteSize / 1024).toFixed(0)} KB
        </span>
      </div>
      {hover && (
        <button
          onClick={onRemove}
          title={used ? 'In use on a wall' : 'Remove'}
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            width: 22,
            height: 22,
            borderRadius: '50%',
            border: 'none',
            background: used ? '#BBBBBB' : '#E25C5C',
            color: '#FFFFFF',
            fontSize: 12,
            lineHeight: 1,
            cursor: used ? 'not-allowed' : 'pointer',
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}

/* ─── Settings 页 ─── */
const BG_OPTIONS: { color: string; label: string }[] = [
  { color: '#FAFAF8', label: 'Ivory' },
  { color: '#FFFFFF', label: 'White' },
  { color: '#F2F2F0', label: 'Light gray' },
];

function SettingsPage() {
  const homeBackground = useOverviewStore((s) => s.homeBackground);
  const setHomeBackground = useOverviewStore((s) => s.setHomeBackground);
  const assets = useAssetStore((s) => s.assets);
  const showToast = useUIStore((s) => s.showToast);

  const totalBytes = assets.reduce((s, a) => s + a.byteSize, 0);
  let storeBytes = 0;
  try {
    for (const key of ['mindonwall-wall', 'mindonwall-overview', 'mindonwall-assets', 'mindonwall-map']) {
      storeBytes += (localStorage.getItem(key) ?? '').length;
    }
  } catch {
    /* ignore */
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* 总览页背景 */}
      <section>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 4 }}>
          Home background
        </div>
        <div style={{ fontSize: 11, color: '#999', marginBottom: 12 }}>
          Background color of the overview page.
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {BG_OPTIONS.map((opt) => {
            const active = homeBackground === opt.color;
            return (
              <div
                key={opt.color}
                onClick={() => {
                  setHomeBackground(opt.color);
                  showToast('Home background updated', 'success');
                }}
                style={{ cursor: 'pointer', textAlign: 'center' }}
              >
                <div
                  style={{
                    width: 88,
                    height: 56,
                    background: opt.color,
                    border: active ? '2px solid #4A90D9' : '1px solid #D8D8D8',
                    borderRadius: 8,
                    boxSizing: 'border-box',
                  }}
                />
                <div style={{ fontSize: 11, color: active ? '#4A90D9' : '#777', marginTop: 6 }}>
                  {opt.label}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 存储用量 */}
      <section>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 12 }}>
          Storage
        </div>
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E8E8E8',
            borderRadius: 10,
            padding: '14px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            maxWidth: 420,
          }}
        >
          <StorageRow label="Materials" value={`${assets.length}/${MAX_ASSETS} · ${(totalBytes / 1024 / 1024).toFixed(2)} MB`} />
          <StorageRow label="Wall data" value={`${(storeBytes / 1024).toFixed(0)} KB`} />
          <StorageRow label="Storage type" value="Local (browser)" />
        </div>
      </section>

      <div style={{ fontSize: 11, color: '#BBB' }}>Mind on Wall · v0.3</div>
    </div>
  );
}

function StorageRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
      <span style={{ color: '#999' }}>{label}</span>
      <span style={{ color: '#333' }}>{value}</span>
    </div>
  );
}
