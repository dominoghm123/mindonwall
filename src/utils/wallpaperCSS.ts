import type { CSSProperties } from 'react';
import type { WallpaperType } from '../store/types';

/**
 * 根据墙纸类型返回对应的 React CSS 样式对象。
 * 所有墙纸均为纯 CSS 实现，不依赖外部图片。
 */
export function getWallpaperStyle(type: WallpaperType): CSSProperties {
  switch (type) {
    case 'cream':
      // v0.3 默认：米白（温暖纸感，极淡纤维纹理）
      return {
        backgroundColor: '#F7F3EA',
        backgroundImage: [
          'radial-gradient(ellipse at 25% 15%, rgba(214,196,161,0.06) 0%, transparent 55%)',
          'radial-gradient(ellipse at 75% 85%, rgba(206,188,152,0.05) 0%, transparent 50%)',
        ].join(', '),
      };

    case 'none':
      return { background: '#FAFAF8' };

    case 'white':
      return {
        backgroundColor: '#FFFFFF',
        backgroundImage: [
          'linear-gradient(to right, rgba(0,0,0,0.03) 1px, transparent 1px)',
          'linear-gradient(to bottom, rgba(0,0,0,0.03) 1px, transparent 1px)',
        ].join(', '),
        backgroundSize: '20px 20px',
      };

    case 'beige':
      return {
        backgroundColor: '#F5F0E8',
        backgroundImage: [
          'radial-gradient(ellipse at 30% 20%, rgba(210,180,140,0.08) 0%, transparent 60%)',
          'radial-gradient(ellipse at 70% 80%, rgba(200,170,130,0.06) 0%, transparent 50%)',
        ].join(', '),
      };

    case 'textured':
      return {
        backgroundColor: '#F0EBE3',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E")`,
      };

    case 'watercolor':
      return {
        backgroundColor: '#F2EDE4',
        backgroundImage: [
          'radial-gradient(ellipse at 15% 25%, rgba(180,160,130,0.12) 0%, transparent 50%)',
          'radial-gradient(ellipse at 85% 15%, rgba(160,180,150,0.10) 0%, transparent 45%)',
          'radial-gradient(ellipse at 50% 75%, rgba(170,150,140,0.09) 0%, transparent 55%)',
          'radial-gradient(ellipse at 75% 60%, rgba(190,170,140,0.08) 0%, transparent 40%)',
          'radial-gradient(ellipse at 25% 80%, rgba(150,170,160,0.07) 0%, transparent 50%)',
        ].join(', '),
      };

    case 'kraft':
      return {
        backgroundColor: '#D4B896',
        backgroundImage: [
          'repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(139,115,85,0.06) 2px, rgba(139,115,85,0.06) 3px)',
          'repeating-linear-gradient(0deg, transparent, transparent 4px, rgba(139,115,85,0.04) 4px, rgba(139,115,85,0.04) 5px)',
        ].join(', '),
      };

    default:
      return { background: '#FAFAF8' };
  }
}

/**
 * 兼容旧接口：返回 CSS 字符串（用于非 React 场景）。
 * @deprecated 优先使用 getWallpaperStyle
 */
export function getWallpaperCSS(type: WallpaperType): string {
  const style = getWallpaperStyle(type);
  // 简易序列化（仅供兼容，实际应使用 getWallpaperStyle）
  return Object.entries(style)
    .map(([key, value]) => {
      const cssKey = key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
      return `${cssKey}: ${value};`;
    })
    .join(' ');
}
