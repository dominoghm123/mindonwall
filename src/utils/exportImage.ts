import { toPng } from 'html-to-image';
import type { Item } from '../store/types';

/**
 * v0.3 统一 DOM 截图工具。
 * - skipFonts: 外链 Google Fonts 会导致 html-to-image 内联 CSS 时挂起（CORS/网络），必须跳过
 * - 超时兜底：15s 未 resolve 视为失败，避免导出按钮永久卡死
 */

const EXPORT_TIMEOUT_MS = 15000;

export async function captureNodePng(
  node: HTMLElement,
  options: { backgroundColor?: string; pixelRatio?: number } = {},
): Promise<string> {
  const capture = toPng(node, {
    backgroundColor: options.backgroundColor ?? '#FFFFFF',
    pixelRatio: options.pixelRatio ?? 2,
    skipFonts: true,
  });

  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Export timed out')), EXPORT_TIMEOUT_MS);
  });

  return Promise.race([capture, timeout]);
}

/** 触发浏览器下载 data URL */
export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

/**
 * 捕获当前白墙全图（Journal Spread）：
 * 克隆画布的墙纸层与变换层 DOM 到离屏容器，重置为物件包围盒视角（zoom=1）后截图。
 * 导出规则（PRD）：范围 = 所有物件包围盒 + 留白；内容含墙纸 + 物件 + Pin + Rope。
 */
export async function captureWallSpreadPng(items: Item[]): Promise<string> {
  const canvasRoot = document.getElementById('canvas-root');
  if (!canvasRoot) throw new Error('Canvas not found');

  // 顶层物件包围盒（附着子物件用比例坐标，不计入）
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const item of items) {
    if (item.parentId) continue;
    minX = Math.min(minX, item.x);
    minY = Math.min(minY, item.y);
    maxX = Math.max(maxX, item.x + item.width);
    maxY = Math.max(maxY, item.y + item.height);
  }
  if (!isFinite(minX)) throw new Error('Nothing to export');

  const PAD = 60;
  const w = maxX - minX + PAD * 2;
  const h = maxY - minY + PAD * 2;

  // 离屏 holder：只负责把舞台移出可视区。
  // 注意：被截图的 stage 自身绝不能带负偏移/position:fixed 样式，
  // html-to-image 克隆节点时会保留这些样式，导致内容绘出 SVG 视口 → 导出空白（v0.3 修复）
  const holder = document.createElement('div');
  holder.style.cssText = 'position:absolute;left:-100000px;top:0;pointer-events:none;';

  const stage = document.createElement('div');
  stage.style.cssText = `position:relative;width:${w}px;height:${h}px;overflow:hidden;`;
  holder.appendChild(stage);

  const wallpaperLayer = canvasRoot.querySelector('[data-canvas-bg]');
  const transformLayer = canvasRoot.querySelector('[data-transform-layer]');
  if (!wallpaperLayer || !transformLayer) throw new Error('Canvas layers not found');

  const wpClone = wallpaperLayer.cloneNode(true) as HTMLElement;
  stage.appendChild(wpClone);

  const tfClone = transformLayer.cloneNode(true) as HTMLElement;
  tfClone.style.transformOrigin = '0 0';
  tfClone.style.transform = `translate(${-minX + PAD}px, ${-minY + PAD}px) scale(1)`;
  stage.appendChild(tfClone);

  document.body.appendChild(holder);
  try {
    return await captureNodePng(stage, { pixelRatio: 2 });
  } finally {
    document.body.removeChild(holder);
  }
}
