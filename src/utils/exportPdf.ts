import { jsPDF } from 'jspdf';

/**
 * v0.3: 将 PNG data URL 导出为单页 PDF（图片等比铺满页面，留白边）。
 */
export async function exportPdfFromDataUrl(
  dataUrl: string,
  filename: string,
  orientation: 'landscape' | 'portrait' | 'auto' = 'auto',
) {
  // 读取图片真实尺寸
  const img = await loadImage(dataUrl);
  const isLandscape =
    orientation === 'auto' ? img.width >= img.height : orientation === 'landscape';

  const pdf = new jsPDF({ orientation: isLandscape ? 'landscape' : 'portrait', unit: 'mm' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 8;

  const maxW = pageW - margin * 2;
  const maxH = pageH - margin * 2;
  const scale = Math.min(maxW / img.width, maxH / img.height);
  const w = img.width * scale;
  const h = img.height * scale;

  pdf.addImage(dataUrl, 'PNG', (pageW - w) / 2, (pageH - h) / 2, w, h);
  pdf.save(filename);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image for PDF'));
    img.src = src;
  });
}
