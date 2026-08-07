import LZString from 'lz-string';
import type { Item, Rope, WallpaperType, Asset } from '../store/types';

/**
 * v0.3: URL 编码分享（无后端）。
 * v0.4: 新增服务端短链分享（/api/share），旧方式保留为降级。
 */

export interface SharedWallPayload {
  app: string;
  v: string;
  name: string;
  wallpaper: WallpaperType;
  items: Item[];
  ropes: Rope[];
  /** 用户上传素材（dataUrl 体积受限时附带，超出则省略） */
  assets?: Asset[];
}

const HASH_PREFIX = '#/s/';
/** 附带素材 dataUrl 的总体积上限（压缩前，base64 字符数） */
const MAX_ASSET_CHARS = 400_000;

export function buildShareUrl(data: {
  name: string;
  wallpaper: WallpaperType;
  items: Item[];
  ropes: Rope[];
  assets?: Asset[];
}): string {
  // 控制体积：按序附带用户上传素材，超限则停止
  const includedAssets: Asset[] = [];
  let budget = MAX_ASSET_CHARS;
  for (const a of data.assets ?? []) {
    if (!a.dataUrl) continue;
    if (a.dataUrl.length > budget) break;
    budget -= a.dataUrl.length;
    includedAssets.push(a);
  }

  const payload: SharedWallPayload = {
    app: 'mindonwall',
    v: '0.3',
    name: data.name,
    wallpaper: data.wallpaper,
    items: data.items,
    ropes: data.ropes,
    assets: includedAssets.length > 0 ? includedAssets : undefined,
  };

  const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(payload));
  return `${window.location.origin}${window.location.pathname}${HASH_PREFIX}${compressed}`;
}

/** 解析当前 URL hash 中的分享数据；无效返回 null */
export function parseShareHash(): SharedWallPayload | null {
  const hash = window.location.hash;
  if (!hash.startsWith(HASH_PREFIX)) return null;
  try {
    const json = LZString.decompressFromEncodedURIComponent(hash.slice(HASH_PREFIX.length));
    if (!json) return null;
    const payload = JSON.parse(json) as SharedWallPayload;
    if (payload.app !== 'mindonwall' || !Array.isArray(payload.items)) return null;
    return payload;
  } catch {
    return null;
  }
}

/** 清除地址栏中的分享 hash（导入完成/关闭横幅后调用） */
export function clearShareHash() {
  if (window.location.hash.startsWith(HASH_PREFIX)) {
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}

export async function copyShareUrl(url: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    // clipboard API 不可用时降级
    const ta = document.createElement('textarea');
    ta.value = url;
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  }
}

/* ================================================================
 * v0.4: Server-side short-link sharing
 * ================================================================ */

/**
 * Create a server-side share link via POST /api/share.
 * Returns the full short URL (e.g. https://mindonwall.com/s/abc123).
 * Throws on network/server error — caller should fallback to buildShareUrl().
 */
export async function shareWallServer(data: {
  name: string;
  wallpaper: WallpaperType;
  items: Item[];
  ropes: Rope[];
  assets?: Asset[];
}): Promise<string> {
  // Build payload with asset budget (same as URL-hash version)
  const includedAssets: Asset[] = [];
  let budget = MAX_ASSET_CHARS;
  for (const a of data.assets ?? []) {
    if (!a.dataUrl) continue;
    if (a.dataUrl.length > budget) break;
    budget -= a.dataUrl.length;
    includedAssets.push(a);
  }

  const payload: SharedWallPayload = {
    app: 'mindonwall',
    v: '0.4',
    name: data.name,
    wallpaper: data.wallpaper,
    items: data.items,
    ropes: data.ropes,
    assets: includedAssets.length > 0 ? includedAssets : undefined,
  };

  const res = await fetch('/api/share', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Share API ${res.status}`);
  const { id } = (await res.json()) as { id: string; url: string };
  return `${window.location.origin}/s/${id}`;
}

/**
 * Fetch shared wall data by short-link ID (GET /api/share?id=xxx).
 * Returns the payload or null if not found / expired.
 */
export async function fetchSharedWall(id: string): Promise<SharedWallPayload | null> {
  try {
    const res = await fetch(`/api/share?id=${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    const payload = (await res.json()) as SharedWallPayload;
    if (payload.app !== 'mindonwall' || !Array.isArray(payload.items)) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Detect /s/:id in the current URL path.
 * Returns the share ID or null.
 */
export function parseSharePath(): string | null {
  const match = window.location.pathname.match(/\/s\/([A-Za-z0-9_-]{6})\/?$/);
  return match ? match[1] : null;
}

/**
 * Clean /s/:id from the URL path after import (replace to root).
 */
export function clearSharePath() {
  if (window.location.pathname.startsWith('/s/')) {
    history.replaceState(null, '', '/');
  }
}
