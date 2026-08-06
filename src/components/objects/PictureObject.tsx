import type { Item } from '../../store/types';

interface PictureObjectProps {
  item: Item;
}

/**
 * Picture 物件渲染。
 * 显示图片，object-fit: cover，无边框，无投影。
 */
export function PictureObject({ item }: PictureObjectProps) {
  // assetId 作为图片 URL 的占位（后续由资源层替换为真实 URL）
  const src = item.assetId ? `/demo-assets/${item.assetId}.jpg` : '';

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
