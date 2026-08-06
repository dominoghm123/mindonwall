import { useCallback } from 'react';
import { useOverviewStore } from '../../store/useOverviewStore';
import { useUIStore } from '../../store/useUIStore';
import { getWallpaperStyle } from '../../utils/wallpaperCSS';
import type { WallSummary } from '../../store/types';

/**
 * 总览页，显示所有墙面卡片。
 * 顶部 40px 栏 + 3 列卡片网格。
 * 纯白卡片，1px border #E8E8E8，无阴影。
 */
export function OverviewPage() {
  const walls = useOverviewStore((s) => s.walls);
  const addWall = useOverviewStore((s) => s.addWall);
  const setViewMode = useUIStore((s) => s.setViewMode);

  const handleNewWall = useCallback(() => {
    const id = `wall-${Date.now()}`;
    const name = `Wall ${walls.length + 1}`;
    addWall(id, name);
  }, [walls.length, addWall]);

  const handleCardClick = useCallback(
    (wall: WallSummary) => {
      // For MVP 0.1: just switch to wall mode. The wallStore already has persisted data.
      // In future versions, loadWall will fetch from backend/cloud sync.
      setViewMode('wall');
    },
    [setViewMode],
  );

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#FAFAF8',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* 顶部栏 */}
      <div
        style={{
          height: 40,
          minHeight: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          borderBottom: '1px solid #E8E8E8',
          background: '#FFFFFF',
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700, color: '#333' }}>
          Mind on Wall
        </span>
        <button
          onClick={handleNewWall}
          style={{
            height: 28,
            padding: '0 12px',
            fontSize: 12,
            color: '#333',
            background: '#FFFFFF',
            border: '1px solid #D0D0D0',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          + New Wall
        </button>
      </div>

      {/* 卡片网格 */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: 24,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 280px)',
          gap: 20,
          justifyContent: 'center',
          alignContent: 'start',
        }}
      >
        {walls.map((wall) => (
          <WallCard key={wall.id} wall={wall} onClick={() => handleCardClick(wall)} />
        ))}
      </div>
    </div>
  );
}

function WallCard({ wall, onClick }: { wall: WallSummary; onClick: () => void }) {
  const wallpaperStyle = getWallpaperStyle(wall.wallpaper);

  return (
    <div
      onClick={onClick}
      style={{
        width: 280,
        height: 200,
        background: '#FFFFFF',
        border: '1px solid #E8E8E8',
        borderRadius: 8,
        overflow: 'hidden',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 上部 70% = 墙纸色块预览 */}
      <div
        style={{
          height: '70%',
          ...wallpaperStyle,
        }}
      />
      {/* 下部 30% = 白色信息区 */}
      <div
        style={{
          height: '30%',
          background: '#FFFFFF',
          padding: '8px 12px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: '#333' }}>
          {wall.name}
        </span>
        <span style={{ fontSize: 10, color: '#BBB', marginTop: 2 }}>
          {wall.itemCount} {wall.itemCount === 1 ? 'item' : 'items'}
        </span>
      </div>
    </div>
  );
}
