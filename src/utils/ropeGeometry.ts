/**
 * 计算绳索在两点间的悬链线下垂量。
 *
 * @param distance   两点之间的直线距离
 * @param naturalLength  绳索自然长度（松弛时的总长）
 * @param k          松弛系数，默认 0.6（v0.3 调大，垂感更明显）
 * @returns          下垂量 sag（正值表示向下，指曲线中点的实际下垂距离）
 *
 * 公式：sag = max(k * (L - d), d * MIN_SAG_RATIO)
 * - 两点越近（d < L）→ sag 越大，绳子明显下垂
 * - 绷紧时仍保留基础垂感（v0.3：平均垂感增强，约 8% 距离）
 */
export function calculateSag(distance: number, naturalLength: number, k = 0.6): number {
  const diff = naturalLength - distance;
  const baseSag = diff > 0 ? k * diff : 0;
  // 即使绳子绷紧也保留约 8% 距离的自然垂感
  return Math.max(baseSag, distance * 0.08);
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

  // 控制点：二次贝塞尔曲线中点下垂量 = 控制点偏移的一半，故偏移取 2×sag
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2 + sag * 2;

  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}
