import { useEffect, useRef, useState } from 'react';
import { useUIStore } from '../../store/useUIStore';
import { useOverviewStore } from '../../store/useOverviewStore';
import { useAssetStore } from '../../store/useAssetStore';
import type { Asset } from '../../store/types';

/**
 * v0.3 r2: 全屏用户页面（Library / Settings）。
 * - Profile 内容并入 Settings 顶部（头像可上传）
 * - Materials 更名 Library：含初始墙内置素材 + manage 多选删除
 */

export type UserPageKey = 'materials' | 'settings';

const PAGE_TITLES: Record<UserPageKey, string> = {
  materials: 'Library',
  settings: 'Settings',
};

/** 页面容器：根据 uiStore.page 渲染对应页面，无打开则返回 null */
export function UserPageOverlay() {
  const page = useUIStore((s) => s.page);
  if (!page) return null;
  return (
    <PageShell title={PAGE_TITLES[page]}>
      {page === 'materials' && <LibraryPage />}
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

/* ─── Settings 页（Profile 并入顶部） ─── */
const BG_OPTIONS: { color: string; label: string }[] = [
  { color: '#FAFAF8', label: 'Ivory' },
  { color: '#FFFFFF', label: 'White' },
  { color: '#F2F2F0', label: 'Light gray' },
];

function SettingsPage() {
  const userName = useOverviewStore((s) => s.userName);
  const setUserName = useOverviewStore((s) => s.setUserName);
  const avatarDataUrl = useOverviewStore((s) => s.avatarDataUrl);
  const setAvatarDataUrl = useOverviewStore((s) => s.setAvatarDataUrl);
  const homeBackground = useOverviewStore((s) => s.homeBackground);
  const setHomeBackground = useOverviewStore((s) => s.setHomeBackground);
  const homeBackgroundImage = useOverviewStore((s) => s.homeBackgroundImage);
  const setHomeBackgroundImage = useOverviewStore((s) => s.setHomeBackgroundImage);
  const walls = useOverviewStore((s) => s.walls);
  const wallData = useOverviewStore((s) => s.wallData);
  const assets = useAssetStore((s) => s.assets);
  const showToast = useUIStore((s) => s.showToast);

  const [name, setName] = useState(userName);
  const avatarFileRef = useRef<HTMLInputElement>(null);
  const bgFileRef = useRef<HTMLInputElement>(null);

  const totalObjects = walls.reduce((sum, w) => sum + w.itemCount, 0);
  const totalRopes = walls.reduce((sum, w) => sum + (wallData[w.id]?.ropes.length ?? 0), 0);

  /** 读取图片文件为 data URL（限制大小，避免撑爆 localStorage） */
  const readFile = (file: File, maxMB: number, cb: (dataUrl: string) => void) => {
    if (!file.type.startsWith('image/')) return;
    if (file.size > maxMB * 1024 * 1024) {
      showToast(`Image too large (max ${maxMB} MB)`, 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => cb(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* ── Profile 区（原 Profile 页并入） ── */}
      <section>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 14 }}>Profile</div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24 }}>
          {/* 头像 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: avatarDataUrl ? `center/cover no-repeat url("${avatarDataUrl}")` : '#F0F0F0',
                border: '1px solid #E0E0E0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                fontWeight: 700,
                color: '#666',
                overflow: 'hidden',
              }}
            >
              {avatarDataUrl ? null : (userName.trim()[0] ?? 'U').toUpperCase()}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <MiniBtn label={avatarDataUrl ? 'Replace' : 'Upload'} onClick={() => avatarFileRef.current?.click()} />
              {avatarDataUrl && <MiniBtn label="Remove" onClick={() => setAvatarDataUrl(null)} />}
            </div>
            <div style={{ fontSize: 10, color: '#AAA', textAlign: 'center', maxWidth: 120 }}>
              Square image recommended, 256×256 px or larger
            </div>
            <input
              ref={avatarFileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  readFile(f, 2, (dataUrl) => {
                    setAvatarDataUrl(dataUrl);
                    showToast('Avatar updated', 'success');
                  });
                }
                e.target.value = '';
              }}
            />
          </div>

          {/* 昵称 + 统计 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              <StatCard label="Walls" value={walls.length} />
              <StatCard label="Objects" value={totalObjects} />
              <StatCard label="Ropes" value={totalRopes} />
              <StatCard label="Library" value={assets.length} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Home background 区 ── */}
      <section>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 4 }}>Home background</div>
        <div style={{ fontSize: 11, color: '#999', marginBottom: 12 }}>
          Pick a color or upload your own image (recommended 1920×1080 px or larger, max 3 MB).
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {BG_OPTIONS.map((opt) => {
            const active = !homeBackgroundImage && homeBackground === opt.color;
            return (
              <div
                key={opt.color}
                onClick={() => {
                  setHomeBackgroundImage(null);
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
                <div style={{ fontSize: 11, color: active ? '#4A90D9' : '#777', marginTop: 6 }}>{opt.label}</div>
              </div>
            );
          })}

          {/* 已上传的自定义背景 */}
          {homeBackgroundImage && (
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: 88,
                  height: 56,
                  background: `center/cover no-repeat url("${homeBackgroundImage}")`,
                  border: '2px solid #4A90D9',
                  borderRadius: 8,
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 6 }}>
                <span style={{ fontSize: 11, color: '#4A90D9' }}>Custom</span>
                <span
                  onClick={() => {
                    setHomeBackgroundImage(null);
                    showToast('Custom background removed', 'info');
                  }}
                  style={{ fontSize: 11, color: '#E25C5C', cursor: 'pointer' }}
                >
                  Remove
                </span>
              </div>
            </div>
          )}

          {/* 上传自定义背景 */}
          <div
            onClick={() => bgFileRef.current?.click()}
            style={{
              width: 88,
              height: 56,
              border: '1px dashed #CCC',
              borderRadius: 8,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#999',
              fontSize: 10,
              gap: 2,
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
            Upload
          </div>
          <input
            ref={bgFileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                readFile(f, 3, (dataUrl) => {
                  setHomeBackgroundImage(dataUrl);
                  showToast('Home background updated', 'success');
                });
              }
              e.target.value = '';
            }}
          />
        </div>
      </section>

      {/* ── Storage 区 ── */}
      <section>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 12 }}>Storage</div>
        <StorageCard />
      </section>

      <div style={{ fontSize: 11, color: '#BBB' }}>Mind on Wall · v0.3</div>
    </div>
  );
}

function MiniBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        height: 22,
        padding: '0 10px',
        fontSize: 10.5,
        color: '#555',
        background: '#FFFFFF',
        border: '1px solid #D0D0D0',
        borderRadius: 5,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E8E8E8',
        borderRadius: 10,
        padding: '14px 16px',
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 700, color: '#333' }}>{value}</div>
      <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>{label}</div>
    </div>
  );
}

function StorageCard() {
  const assets = useAssetStore((s) => s.assets);
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
      <StorageRow label="Library" value={`${assets.length}/${MAX_ASSETS} · ${(totalBytes / 1024 / 1024).toFixed(2)} MB`} />
      <StorageRow label="Wall data" value={`${(storeBytes / 1024).toFixed(0)} KB`} />
      <StorageRow label="Storage type" value="Local (browser)" />
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

/* ─── Library 页（原 Materials，含内置素材 + manage） ─── */
type MaterialFilter = 'all' | 'picture' | 'paper' | 'stamp';

const FILTERS: { key: MaterialFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'picture', label: 'Pictures' },
  { key: 'paper', label: 'Papers' },
  { key: 'stamp', label: 'Stamps' },
];

const MAX_ASSETS = 12;

/** 内置素材：初始墙中的物件素材（不可删除） */
const BUILTIN_ASSETS: { id: string; kind: 'picture' | 'stamp'; src: string; label: string }[] = [
  { id: 'north-01-wat-chedi-luang', kind: 'picture', src: '/demo-assets/north-01-wat-chedi-luang.jpg', label: 'Wat Chedi Luang' },
  { id: 'north-02-khao-soi', kind: 'picture', src: '/demo-assets/north-02-khao-soi.jpg', label: 'Khao Soi' },
  { id: 'north-03-white-temple', kind: 'picture', src: '/demo-assets/north-03-white-temple.jpg', label: 'White Temple' },
  { id: 'bangkok-01', kind: 'picture', src: '/demo-assets/bangkok-01.jpg', label: 'Bangkok 01' },
  { id: 'bangkok-02', kind: 'picture', src: '/demo-assets/bangkok-02.jpg', label: 'Bangkok 02' },
  { id: 'bangkok-03', kind: 'picture', src: '/demo-assets/bangkok-03.jpg', label: 'Bangkok 03' },
  { id: 'stamp-blue-travel', kind: 'stamp', src: '/demo-assets/stamps/stamp-blue-travel.png', label: 'Travel' },
  { id: 'stamp-gray-compass', kind: 'stamp', src: '/demo-assets/stamps/stamp-gray-compass.png', label: 'Compass' },
  { id: 'stamp-red-passport', kind: 'stamp', src: '/demo-assets/stamps/stamp-red-passport.png', label: 'Passport' },
  { id: 'stamp-green-nature', kind: 'stamp', src: '/demo-assets/stamps/stamp-green-nature.png', label: 'Nature' },
  { id: 'stamp-yellow-sunshine', kind: 'stamp', src: '/demo-assets/stamps/stamp-yellow-sunshine.png', label: 'Sunshine' },
];

function LibraryPage() {
  const assets = useAssetStore((s) => s.assets);
  const addAsset = useAssetStore((s) => s.addAsset);
  const removeAsset = useAssetStore((s) => s.removeAsset);
  const wallData = useOverviewStore((s) => s.wallData);
  const showToast = useUIStore((s) => s.showToast);
  const [filter, setFilter] = useState<MaterialFilter>('all');
  const [manageMode, setManageMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirm, setConfirm] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const idCounter = useRef(0);

  const builtinVisible = BUILTIN_ASSETS.filter((b) => filter === 'all' || b.kind === filter);
  const userVisible = assets.filter((a) => filter === 'all' || (a.kind ?? 'picture') === filter);

  /** 素材是否被任一墙使用 */
  const isUsed = (assetId: string) =>
    Object.values(wallData).some((w) => w.items.some((i) => i.assetId === assetId));

  const handleUpload = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      if (useAssetStore.getState().assets.length >= MAX_ASSETS) {
        showToast(`Material limit reached (${MAX_ASSETS})`, 'warning');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const id = `asset-${Date.now()}-${++idCounter.current}`;
        const kind = filter === 'all' || filter === 'paper' ? 'picture' : filter;
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

  const toggleSelect = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleDeleteSelected = () => {
    // 过滤掉被使用的素材
    const blocked = selected.filter((id) => isUsed(id));
    const deletable = selected.filter((id) => !isUsed(id));
    deletable.forEach((id) => removeAsset(id));
    setSelected([]);
    setConfirm(false);
    if (blocked.length > 0) {
      showToast(`${deletable.length} removed · ${blocked.length} in use and kept`, 'warning');
    } else {
      showToast(`${deletable.length} material(s) removed`, 'success');
    }
  };

  const exitManage = () => {
    setManageMode(false);
    setSelected([]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 过滤 + 操作区 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
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

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {manageMode ? (
            <>
              <span style={{ fontSize: 12, color: '#777', alignSelf: 'center' }}>{selected.length} selected</span>
              <button
                onClick={() => selected.length > 0 && setConfirm(true)}
                disabled={selected.length === 0}
                style={{
                  height: 28,
                  padding: '0 14px',
                  fontSize: 12,
                  color: selected.length === 0 ? '#BBB' : '#FFFFFF',
                  background: selected.length === 0 ? '#F0F0F0' : '#E25C5C',
                  border: 'none',
                  borderRadius: 6,
                  cursor: selected.length === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                Delete ({selected.length})
              </button>
              <button
                onClick={exitManage}
                style={{
                  height: 28,
                  padding: '0 14px',
                  fontSize: 12,
                  color: '#555',
                  background: '#FFFFFF',
                  border: '1px solid #D0D0D0',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setManageMode(true)}
                style={{
                  height: 28,
                  padding: '0 14px',
                  fontSize: 12,
                  color: '#555',
                  background: '#FFFFFF',
                  border: '1px solid #D0D0D0',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                Manage
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={assets.length >= MAX_ASSETS}
                style={{
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
            </>
          )}
        </div>
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

      {/* 内置素材 */}
      {builtinVisible.length > 0 && (
        <section>
          <div style={{ fontSize: 11, color: '#999', marginBottom: 8 }}>Built-in · from your first wall</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {builtinVisible.map((b) => (
              <LibraryCard
                key={b.id}
                src={b.src}
                badge={b.kind === 'stamp' ? 'Stamp' : 'Picture'}
                label={b.label}
                builtin
              />
            ))}
          </div>
        </section>
      )}

      {/* 用户素材 */}
      <section>
        <div style={{ fontSize: 11, color: '#999', marginBottom: 8 }}>Your uploads</div>
        {userVisible.length === 0 ? (
          <div
            style={{
              padding: '36px 0',
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
            {userVisible.map((a) => {
              const selectable = manageMode && !isUsed(a.id);
              return (
                <LibraryCard
                  key={a.id}
                  src={a.dataUrl ?? ''}
                  badge={(a.kind ?? 'picture')[0].toUpperCase() + (a.kind ?? 'picture').slice(1)}
                  label={`${(a.byteSize / 1024).toFixed(0)} KB`}
                  manageMode={manageMode}
                  selectable={selectable}
                  selected={selected.includes(a.id)}
                  inUse={isUsed(a.id)}
                  onToggle={() => selectable && toggleSelect(a.id)}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* 删除确认 */}
      {confirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 21000,
            background: 'rgba(0,0,0,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #E0E0E0',
              borderRadius: 10,
              padding: 16,
              width: 320,
            }}
          >
            <div style={{ fontSize: 13, color: '#333', marginBottom: 14 }}>
              Delete {selected.length} material(s)? Materials in use on a wall will be kept. This cannot be undone.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                onClick={() => setConfirm(false)}
                style={{ height: 28, padding: '0 12px', fontSize: 12, background: '#FFFFFF', border: '1px solid #D0D0D0', borderRadius: 6, cursor: 'pointer', color: '#555' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSelected}
                style={{ height: 28, padding: '0 12px', fontSize: 12, background: '#E25C5C', border: 'none', borderRadius: 6, cursor: 'pointer', color: '#FFFFFF' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LibraryCard({
  src,
  badge,
  label,
  builtin,
  manageMode,
  selectable,
  selected,
  inUse,
  onToggle,
}: {
  src: string;
  badge: string;
  label: string;
  builtin?: boolean;
  manageMode?: boolean;
  selectable?: boolean;
  selected?: boolean;
  inUse?: boolean;
  onToggle?: () => void;
}) {
  return (
    <div
      onClick={onToggle}
      style={{
        position: 'relative',
        background: '#FFFFFF',
        border: selected ? '2px solid #4A90D9' : '1px solid #E8E8E8',
        borderRadius: 10,
        overflow: 'hidden',
        cursor: manageMode && selectable ? 'pointer' : 'default',
        opacity: manageMode && !selectable && !builtin ? 0.45 : 1,
      }}
    >
      <div
        style={{
          height: 110,
          background: `center/cover no-repeat url("${src}")`,
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
          {badge}
        </span>
        <span
          style={{
            fontSize: 10,
            color: '#AAA',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </span>
        {builtin && (
          <span style={{ marginLeft: 'auto', fontSize: 9, color: '#B0A26E' }}>Built-in</span>
        )}
        {!builtin && inUse && (
          <span style={{ marginLeft: 'auto', fontSize: 9, color: '#999' }}>In use</span>
        )}
      </div>
      {/* manage 选中角标 */}
      {manageMode && selectable && (
        <div
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: selected ? '#4A90D9' : 'rgba(255,255,255,0.9)',
            border: selected ? 'none' : '1px solid #CCC',
            color: '#FFFFFF',
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {selected ? '✓' : ''}
        </div>
      )}
    </div>
  );
}
