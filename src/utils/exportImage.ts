import { toPng } from 'html-to-image';

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
