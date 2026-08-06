import { useRef, useCallback, useState } from 'react';

interface UseRotateOptions {
  rotation: number;
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  /** 旋转结束回调，返回新角度和起始角度（用于 undo） */
  onRotateEnd?: (newRotation: number, startRotation: number) => void;
}

/**
 * 物件旋转 hook。
 * - 360° 自由旋转，无角度吸附
 * - 通过顶部旋转手柄拖拽触发
 */
export function useRotate({ rotation, wrapperRef, onRotateEnd }: UseRotateOptions) {
  const [currentRotation, setCurrentRotation] = useState(rotation);
  const rotateRef = useRef<{
    startAngle: number;
    itemRotation: number;
  } | null>(null);
  const onRotateEndRef = useRef(onRotateEnd);
  onRotateEndRef.current = onRotateEnd;

  // 同步外部 prop
  const prevRotation = useRef(rotation);
  if (prevRotation.current !== rotation) {
    prevRotation.current = rotation;
    if (!rotateRef.current) setCurrentRotation(rotation);
  }

  const handleRotateStart = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      if (!wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const startAngle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI) + 90;
      rotateRef.current = { startAngle, itemRotation: currentRotation };
      (e.target as Element).setPointerCapture(e.pointerId);
    },
    [currentRotation, wrapperRef],
  );

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const r = rotateRef.current;
    if (!r || !wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const angle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI) + 90;
    const delta = angle - r.startAngle;
    setCurrentRotation(r.itemRotation + delta);
  }, [wrapperRef]);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const r = rotateRef.current;
      rotateRef.current = null;
      (e.target as Element).releasePointerCapture(e.pointerId);
      if (r) {
        onRotateEndRef.current?.(currentRotation, r.itemRotation);
      }
    },
    [currentRotation],
  );

  return {
    currentRotation,
    handleRotateStart,
    handlePointerMove,
    handlePointerUp,
    isRotating: rotateRef.current !== null,
  };
}
