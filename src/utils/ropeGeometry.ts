/**
 * 计算绳索在两点间的悬链线下垂量。
 *
 * @param distance   两点之间的直线距离
 * @param naturalLength  绳索自然长度（松弛时的总长）
 * @param k          松弛系数，默认 0.3
 * @returns          下垂量 sag（正值表示向下）
 *
 * 公式：sag = k * (L - d)
 * - 两点越近（d < L）→ sag 越大，绳子明显下垂
 * - 两点越远（d >= L）→ sag 趋近 0，绳子绷紧
 */
export function calculateSag(distance: number, naturalLength: number, k = 0.3): number {
  const diff = naturalLength - distance;
  if (diff <= 0) return 0; // 绳子绷紧或刚好拉直
  return k * diff;
}

/**
 * 计算绳索的 SVG 二次贝塞尔曲线路径。
 *
 * @param x1, y1     起点坐标
 * @param x2, y2     终点坐标
 * @param naturalLength  绳索自然长度
 * @returns          SVG path 字符串：`M x1 y1 Q cx cy x2 y2`
 */
export function calculateRopePath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  naturalLength: number,
): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distance = Math.sqrt(dx * dx + dy * dy);

  const sag = calculateSag(distance, naturalLength);

  // 控制点：中点 + 下垂偏移
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2 + sag;

  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}
