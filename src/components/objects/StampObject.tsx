import type { Item } from '../../store/types';
import { useAssetStore } from '../../store/useAssetStore';

interface StampObjectProps {
  item: Item;
}

/** Stamp 预设 → 默认颜色 */
const STAMP_DEFAULT_COLORS: Record<string, string> = {
  'blue-travel': '#3B82F6',
  'gray-compass': '#6B7280',
  'green-nature': '#22C55E',
  'red-passport': '#EF4444',
  'yellow-sunshine': '#EAB308',
};

/**
 * Stamp 渲染（v0.2 修订）。
 * - 透明背景矢量绘制（弃用白底 PNG）
 * - 颜色取 item.color（右键可改），缺省用预设色
 * - 默认不倾斜（rotation 由 item.rotation 决定）
 * - 支持用户上传素材（item.assetId → dataUrl）
 */
export function StampObject({ item }: StampObjectProps) {
  const assets = useAssetStore((s) => s.assets);

  // 用户上传的印章素材优先
  const userAsset = item.assetId ? assets.find((a) => a.id === item.assetId) : undefined;
  if (userAsset?.dataUrl) {
    return (
      <img
        src={userAsset.dataUrl}
        alt=""
        draggable={false}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          mixBlendMode: 'multiply',
          pointerEvents: 'none',
        }}
      />
    );
  }

  const normalizedId = item.stampId?.replace(/^stamp-/, '') ?? '';
  const color = item.color ?? STAMP_DEFAULT_COLORS[normalizedId] ?? '#6B7280';

  return (
    <svg
      viewBox="0 0 100 100"
      style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'none' }}
      fill="none"
    >
      <defs>
        {/* v0.5: 印章墨迹质感滤镜 — 边缘微扩散 + 透明墨迹斑点 */}
        <filter id={`ink-${normalizedId}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5" />
        </filter>
      </defs>
      <g stroke={color} opacity={0.9} filter={`url(#ink-${normalizedId})`}>
        {renderStampArt(normalizedId, color)}
      </g>
      {/* v0.5: 微透明墨迹斑点叠加 */}
      <circle cx={35} cy={40} r={1.5} fill={color} opacity={0.12} />
      <circle cx={62} cy={58} r={1} fill={color} opacity={0.1} />
      <circle cx={48} cy={72} r={0.8} fill={color} opacity={0.08} />
    </svg>
  );
}

/** 独立的印章图案组件（工具栏预览等复用） */
export function StampArt({ id, color, size = 44 }: { id: string; color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <g stroke={color} opacity={0.9}>
        {renderStampArt(id.replace(/^stamp-/, ''), color)}
      </g>
    </svg>
  );
}

/** 各预设的矢量图案（透明背景） */
function renderStampArt(id: string, color: string) {
  switch (id) {
    case 'blue-travel':
      // 双圈圆章 + 飞机
      return (
        <>
          <circle cx="50" cy="50" r="46" strokeWidth="3" strokeDasharray="6 3" />
          <circle cx="50" cy="50" r="36" strokeWidth="1.5" />
          <path
            d="M50 26 L55 44 L74 50 L55 54 L52 72 L50 60 L48 72 L45 54 L26 50 L45 44 Z"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <text x="50" y="18" textAnchor="middle" fontSize="9" fill={color} stroke="none" letterSpacing="2">
            TRAVEL
          </text>
        </>
      );
    case 'gray-compass':
      // 罗盘
      return (
        <>
          <circle cx="50" cy="50" r="46" strokeWidth="2.5" />
          <circle cx="50" cy="50" r="30" strokeWidth="1.2" strokeDasharray="3 4" />
          <path d="M50 14 L54 50 L50 86 L46 50 Z" strokeWidth="2" strokeLinejoin="round" />
          <path d="M14 50 L50 46 L86 50 L50 54 Z" strokeWidth="2" strokeLinejoin="round" />
          <circle cx="50" cy="50" r="4" strokeWidth="2" />
        </>
      );
    case 'green-nature':
      // 圆角方章 + 叶子
      return (
        <>
          <rect x="8" y="8" width="84" height="84" rx="12" strokeWidth="2.5" strokeDasharray="7 3" />
          <path
            d="M30 70 Q30 38 70 30 Q66 62 38 68 Q33 69 30 70 Z"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M34 66 Q48 52 62 38" strokeWidth="1.5" />
        </>
      );
    case 'red-passport':
      // 护照入境章（矩形 + 日期线）
      return (
        <>
          <rect x="6" y="20" width="88" height="60" rx="6" strokeWidth="2.5" />
          <text x="50" y="42" textAnchor="middle" fontSize="12" fill={color} stroke="none" letterSpacing="1.5">
            ARRIVED
          </text>
          <line x1="18" y1="54" x2="82" y2="54" strokeWidth="1.5" />
          <line x1="26" y1="66" x2="74" y2="66" strokeWidth="1.5" strokeDasharray="4 3" />
        </>
      );
    case 'yellow-sunshine':
      // 太阳
      return (
        <>
          <circle cx="50" cy="50" r="22" strokeWidth="2.5" />
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i * Math.PI) / 6;
            const x1 = 50 + Math.cos(a) * 30;
            const y1 = 50 + Math.sin(a) * 30;
            const x2 = 50 + Math.cos(a) * 44;
            const y2 = 50 + Math.sin(a) * 44;
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth="2.5" strokeLinecap="round" />;
          })}
          <circle cx="44" cy="46" r="1.8" fill={color} stroke="none" />
          <circle cx="56" cy="46" r="1.8" fill={color} stroke="none" />
          <path d="M43 56 Q50 62 57 56" strokeWidth="2" strokeLinecap="round" />
        </>
      );
    default:
      // 未知预设：简单圆章
      return (
        <>
          <circle cx="50" cy="50" r="44" strokeWidth="2.5" strokeDasharray="6 3" />
          <circle cx="50" cy="50" r="20" strokeWidth="1.5" />
        </>
      );
  }
}
