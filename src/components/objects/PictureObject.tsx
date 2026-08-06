import type { Item } from '../../store/types';
import { useAssetStore } from '../../store/useAssetStore';

interface PictureObjectProps {
  item: Item;
}

/**
 * Picture 物件渲染。
 * 显示图片，object-fit: cover，无边框，无投影。
 * 支持：demo 素材（assetId → /demo-assets/xxx.jpg）、用户上传（asset dataUrl）
 */
export function PictureObject({ item }: PictureObjectProps) {
  const assets = useAssetStore((s) => s.assets);
  // 优先匹配用户上传的 asset（v0.2：dataUrl）
  const userAsset = item.assetId ? assets.find((a) => a.id === item.assetId) : undefined;
  const src = userAsset?.dataUrl
    ?? (item.assetId ? `/demo-assets/${item.assetId}.jpg` : '');

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
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
            objectFit: 'cover',
            display: 'block',
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
}
