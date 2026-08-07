import type { Item } from '../../store/types';
import { useAssetStore } from '../../store/useAssetStore';
import { AttachedStamps } from './AttachedStamps';

interface PictureObjectProps {
  item: Item;
  /** 画布缩放，用于附着 Stamp 拖拽的坐标换算 */
  zoom?: number;
}

/**
 * Picture 物件渲染。
 * 显示图片，object-fit: cover，无边框，无投影。
 * 支持：demo 素材（assetId → /demo-assets/xxx.jpg）、用户上传（asset dataUrl）
 * v0.2：Stamp 可附着在 Picture 上（跟随移动/缩放，右键可 detach）
 */
export function PictureObject({ item, zoom = 1 }: PictureObjectProps) {
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
        position: 'relative',
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
      {/* 附着的 Stamp（v0.2） */}
      <AttachedStamps host={item} zoom={zoom} />
    </div>
  );
}
