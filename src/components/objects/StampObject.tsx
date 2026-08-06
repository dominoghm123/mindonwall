import { useMemo } from 'react';
import type { Item } from '../../store/types';

interface StampObjectProps {
  item: Item;
}

/** Stamp 预设列表 */
const STAMP_MAP: Record<string, string> = {
  'blue-travel': '/demo-assets/stamps/stamp-blue-travel.png',
  'gray-compass': '/demo-assets/stamps/stamp-gray-compass.png',
  'green-nature': '/demo-assets/stamps/stamp-green-nature.png',
  'red-passport': '/demo-assets/stamps/stamp-red-passport.png',
  'yellow-sunshine': '/demo-assets/stamps/stamp-yellow-sunshine.png',
};

/**
 * Stamp 渲染。
 * mix-blend-mode: multiply，随机旋转 -15° ~ +15°，无 Pin。
 */
export function StampObject({ item }: StampObjectProps) {
  // 基于 id 生成确定性的伪随机旋转角度（-15 到 +15）
  const randomRotation = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < item.id.length; i++) {
      hash = (hash << 5) - hash + item.id.charCodeAt(i);
      hash |= 0;
    }
    return ((Math.abs(hash) % 300) - 150) / 10; // -15.0 ~ +15.0
  }, [item.id]);

  const src = item.stampId ? STAMP_MAP[item.stampId] ?? `/demo-assets/stamps/${item.stampId}` : '';

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: `rotate(${randomRotation}deg)`,
      }}
    >
      {src && (
        <img
          src={src}
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
      )}
    </div>
  );
}
