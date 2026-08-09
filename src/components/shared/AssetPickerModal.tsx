import { useCallback } from 'react';
import { useUIStore } from '../../store/useUIStore';
import { useWallStore } from '../../store/useWallStore';
import { useAssetStore } from '../../store/useAssetStore';
import { useT } from '../../i18n/useT';

/** 样例素材图片（来自 manifest.json） */
const DEMO_ASSETS = [
  { id: 'north-01-wat-chedi-luang', src: '/demo-assets/north-01-wat-chedi-luang.jpg', title: '契迪龙寺', kind: 'image' as const },
  { id: 'north-02-khao-soi', src: '/demo-assets/north-02-khao-soi.jpg', title: '泰北咖喱面', kind: 'image' as const },
  { id: 'north-03-white-temple', src: '/demo-assets/north-03-white-temple.jpg', title: '清莱白庙', kind: 'image' as const },
  { id: 'bangkok-01', src: '/demo-assets/bangkok-01.jpg', title: '曼谷街景', kind: 'image' as const },
  { id: 'bangkok-02', src: '/demo-assets/bangkok-02.jpg', title: '曼谷文化', kind: 'image' as const },
  { id: 'bangkok-03', src: '/demo-assets/bangkok-03.jpg', title: '曼谷商业', kind: 'image' as const },
];

/** v0.7: 样例音频素材 */
const DEMO_AUDIO = [
  { id: 'sample-piano', src: '/demo-assets/sample-piano.wav', title: 'Piano C4', kind: 'audio' as const },
];

/**
 * 素材库弹窗。
 * "Replace Image" 触发，居中弹窗 400×300px，纯白背景，1px 边框，border-radius 12px，无投影。
 */
export function AssetPickerModal() {
  const assetPickerOpen = useUIStore((s) => s.assetPickerOpen);
  const closeAssetPicker = useUIStore((s) => s.closeAssetPicker);
  const updateItem = useWallStore((s) => s.updateItem);
  const userAssets = useAssetStore((s) => s.assets);
  const t = useT();

  const handleSelect = useCallback((assetId: string) => {
    if (!assetPickerOpen) return;
    updateItem(assetPickerOpen, { assetId });
    closeAssetPicker();
  }, [assetPickerOpen, updateItem, closeAssetPicker]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeAssetPicker();
    }
  }, [closeAssetPicker]);

  if (!assetPickerOpen) return null;

  return (
    <div
      data-menu-layer
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
    >
      <div
        style={{
          width: 400,
          maxHeight: '80vh',
          background: '#FFFFFF',
          border: '1px solid #E0E0E0',
          borderRadius: 12,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* 标题栏 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid #EEE',
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 600, color: '#333' }}>{t('ctx.replaceImage')}</span>
          <button
            onClick={closeAssetPicker}
            style={{
              width: 24,
              height: 24,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 16,
              color: '#999',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 4,
            }}
          >
            ✕
          </button>
        </div>

        {/* 素材网格 */}
        <div style={{ padding: 16, overflowY: 'auto', flex: 1 }}>
          {/* 样例图片素材 */}
          <div style={{ fontSize: 11, color: '#999', marginBottom: 8 }}>{t('pk.sample')}</div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 10,
              marginBottom: 16,
            }}
          >
            {DEMO_ASSETS.filter((a) => a.kind === 'image').map((asset) => (
              <div
                key={asset.id}
                onClick={() => handleSelect(asset.id)}
                style={{
                  width: '100%',
                  aspectRatio: '1',
                  borderRadius: 6,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: '1px solid #E8E8E8',
                }}
                title={asset.title}
              >
                <img
                  src={asset.src}
                  alt={asset.title}
                  draggable={false}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
              </div>
            ))}
          </div>

          {/* v0.7: 样例音频素材 */}
          {DEMO_AUDIO.length > 0 && (
            <>
              <div style={{ fontSize: 11, color: '#999', marginBottom: 8 }}>🎵 {t('pk.audio') || 'Audio'}</div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                {DEMO_AUDIO.map((asset) => (
                  <div
                    key={asset.id}
                    onClick={() => handleSelect(asset.id)}
                    style={{
                      width: '100%',
                      aspectRatio: '1',
                      borderRadius: 6,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      border: '1px solid #E8E8E8',
                      background: '#F8F8F8',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                    }}
                    title={asset.title}
                  >
                    <span style={{ fontSize: 24 }}>🎵</span>
                    <span style={{ fontSize: 10, color: '#666' }}>{asset.title}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* 用户上传素材 */}
          {userAssets.length > 0 && (
            <>
              <div style={{ fontSize: 11, color: '#999', marginBottom: 8 }}>{t('pk.uploaded')}</div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 10,
                }}
              >
                {userAssets.map((asset) => (
                  <div
                    key={asset.id}
                    onClick={() => handleSelect(asset.id)}
                    style={{
                      width: '100%',
                      aspectRatio: '1',
                      borderRadius: 6,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      border: '1px solid #E8E8E8',
                    }}
                  >
                    <img
                      src={asset.dataUrl ?? `/api/assets/${asset.storageKey}`}
                      alt=""
                      draggable={false}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
