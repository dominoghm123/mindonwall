import { useUIStore } from '../../store/useUIStore';
import { useOverviewStore } from '../../store/useOverviewStore';
import { clearShareHash } from '../../utils/shareWall';

/**
 * v0.3: 分享链接导入横幅。
 * 用户通过分享 URL 打开应用时显示：提示只读来源，可保存为本地墙或忽略。
 * 视觉规范：纯白实色 + 1px border，无阴影。
 */
export function SharedWallBanner() {
  const sharedImport = useUIStore((s) => s.sharedImport);
  const setSharedImport = useUIStore((s) => s.setSharedImport);
  const showToast = useUIStore((s) => s.showToast);

  if (!sharedImport) return null;

  const dismiss = () => {
    clearShareHash();
    setSharedImport(null);
  };

  const handleSave = () => {
    const newId = useOverviewStore.getState().importSharedWall(sharedImport);
    showToast('Wall saved to your library', 'success');
    dismiss();
    void newId;
  };

  return (
    <div
      data-toolbar-ui
      style={{
        position: 'fixed',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: '#FFFFFF',
        border: '1px solid #E0E0E0',
        borderRadius: 10,
        padding: '10px 16px',
        zIndex: 10001,
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#333' }}>
          Shared wall: “{sharedImport.name || 'Untitled'}”
        </span>
        <span style={{ fontSize: 11, color: '#999' }}>
          {sharedImport.items.length} items · {sharedImport.ropes.length} ropes · read-only preview
        </span>
      </div>
      <button
        onClick={handleSave}
        style={{
          height: 28,
          padding: '0 12px',
          fontSize: 12,
          color: '#FFFFFF',
          background: '#333',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        Save to my walls
      </button>
      <button
        onClick={dismiss}
        style={{
          height: 28,
          padding: '0 12px',
          fontSize: 12,
          color: '#666',
          background: '#FFFFFF',
          border: '1px solid #D0D0D0',
          borderRadius: 6,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        Dismiss
      </button>
    </div>
  );
}
