import { useState, useCallback, useRef, useEffect } from 'react';
import { useWallStore } from '../../store/useWallStore';
import { useUIStore } from '../../store/useUIStore';
import { useOverviewStore } from '../../store/useOverviewStore';
import { AvatarMenu } from '../shared/AvatarMenu';

/**
 * 40px 高顶部栏，默认隐藏，鼠标触顶滑入。
 * 纯白背景 #FFFFFF，1px bottom border #E8E8E8，无阴影。
 */
export function TopBar({ zoom }: { zoom?: number }) {
  void zoom;
  const name = useWallStore((s) => s.name);
  const renameWall = useWallStore((s) => s.renameWall);
  const setViewMode = useUIStore((s) => s.setViewMode);
  const showToast = useUIStore((s) => s.showToast);

  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  // 鼠标触顶滑入
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (e.clientY <= 8) {
        setVisible(true);
      }
    };
    const handleMouseLeave = (e: MouseEvent) => {
      // 当鼠标离开顶部栏区域（向下移出）时隐藏
      const el = document.getElementById('top-bar');
      if (el) {
        const rect = el.getBoundingClientRect();
        if (e.clientY > rect.bottom + 4) {
          setVisible(false);
          setEditing(false);
        }
      }
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  // 点击外部退出编辑
  useEffect(() => {
    if (!editing) return;
    const handle = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setEditing(false);
        renameWall(editValue.trim() || name);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [editing, editValue, name, renameWall]);

  const handleNameClick = useCallback(() => {
    setEditValue(name);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [name]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        setEditing(false);
        renameWall(editValue.trim() || name);
      }
      if (e.key === 'Escape') {
        setEditing(false);
        setEditValue(name);
      }
    },
    [editValue, name, renameWall],
  );

  const handleBack = useCallback(() => {
    // 返回总览前快照当前墙数据（v0.2 多墙切换）
    useOverviewStore.getState().captureCurrentWall();
    setViewMode('overview');
  }, [setViewMode]);

  return (
    <div
      id="top-bar"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 40,
        background: '#FFFFFF',
        borderBottom: '1px solid #E8E8E8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        zIndex: 1000,
        transform: visible ? 'translateY(0)' : 'translateY(-100%)',
        transition: 'transform 0.2s ease',
        userSelect: 'none',
      }}
      onMouseLeave={() => setVisible(false)}
    >
      {/* 左区 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* 返回箭头 */}
        <button
          onClick={handleBack}
          style={{
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 20,
            color: '#333',
            padding: 0,
          }}
          title="Back"
        >
          ←
        </button>
        {/* 墙名 */}
        {editing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => {
              setEditing(false);
              renameWall(editValue.trim() || name);
            }}
            onKeyDown={handleKeyDown}
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: '#333',
              border: '1px solid #D0D0D0',
              borderRadius: 4,
              padding: '2px 6px',
              outline: 'none',
              background: '#FFFFFF',
              width: 140,
            }}
          />
        ) : (
          <span
            onClick={handleNameClick}
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: '#333',
              cursor: 'pointer',
            }}
          >
            {name}
          </span>
        )}
      </div>

      {/* 右区（v0.2：Saved + Share + 头像） */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Saved 指示 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#4CAF50',
            }}
          />
          <span style={{ fontSize: 10, color: '#999' }}>Saved</span>
        </div>

        {/* Share 按钮（outlined） */}
        <button
          onClick={() => showToast('Share link copied', 'success')}
          style={{
            height: 28,
            padding: '0 12px',
            fontSize: 12,
            color: '#333',
            background: '#FFFFFF',
            border: '1px solid #D0D0D0',
            borderRadius: 6,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Share
        </button>

        {/* 用户头像入口（v0.2：下拉 Profile / Materials / Settings） */}
        <AvatarMenu />
      </div>
    </div>
  );
}
