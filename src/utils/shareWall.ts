import LZString from 'lz-string';
import type { Item, Rope, WallpaperType, Asset } from '../store/types';

/**
 * v0.3: URL 编码分享（无后端）。
 * 墙数据 JSON → lz-string 压缩 → URL hash（#/s/<payload>）。
 * 接收方打开链接后导入为本地副本（只读演示，保存后归入自己的墙列表）。
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
