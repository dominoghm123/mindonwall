import { useRef, useCallback, useState } from 'react';

/** 长按激活旋转的等待时间（ms） */
const LONG_PRESS_MS = 500;
/** 长按期间允许的最大移动量（px），超过则取消旋转 */
const MOVE_CANCEL_THRESHOLD = 6;
/** 整角吸附：进入吸附的角度阈值（°） */
const SNAP_ENTER = 6;
/** 整角吸附：脱离吸附需超过的角度阈值（°，磁滞） */
const SNAP_RELEASE = 14;

interface UseRotateOptions {
  rotation: number;
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  /** 旋转结束回调，返回新角度和起始角度（用于 undo） */
  onRotateEnd?: (newRotation: number, startRotation: number) => void;
}

/**
 * 物件旋转 hook。
 * - 长按旋转手柄/选中框顶部 ~500ms 后激活，再拖拽旋转；长按期间移动超过阈值则取消
 * - 接近 0°/90°/180°/270°/360° 时磁性吸附（带磁滞），产生明显停顿感
 */
export function useRotate({ rotation, wrapperRef, onRotateEnd }: UseRotateOptions) {
  const [currentRotation, setCurrentRotation] = useState(rotation);
  const [armed, setArmed] = useState(false); // 长按已激活，可旋转
  const [snapped, setSnapped] = useState(false); // 当前是否吸附在整角
  const rotRef = useRef(rotation); // 最新角度（供 pointerup 读取，避免 stale state）
  const snapRef = useRef<number | null>(null); // 当前吸附的整角
  const rotateRef = useRef<{
    startAngle: number;
    itemRotation: number;
  } | null>(null);
  // 长按等待状态
  const pendingRef = useRef<{
    timer: number;
    startX: number;
    startY: number;
    pointerId: number;
    target: Element;
  } | null>(null);
  const onRotateEndRef = useRef(onRotateEnd);
  onRotateEndRef.current = onRotateEnd;

  // 同步外部 prop
  const prevRotation = useRef(rotation);
  if (prevRotation.current !== rotation) {
    prevRotation.current = rotation;
    if (!rotateRef.current) {
      setCurrentRotation(rotation);
      rotRef.current = rotation;
    }
  }

  const cancelPending = useCallback(() => {
    if (pendingRef.current) {
      clearTimeout(pendingRef.current.timer);
      pendingRef.current = null;
    }
    setArmed(false);
  }, []);

  /** 长按激活后开始旋转 */
  const beginRotation = useCallback(
    (clientX: number, clientY: number) => {
      if (!wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const startAngle = Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI) + 90;
      rotateRef.current = { startAngle, itemRotation: currentRotation };
      snapRef.current = null;
      setSnapped(false);
      setArmed(true);
    },
    [currentRotation, wrapperRef],
  );

  const handleRotateStart = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      const startX = e.clientX;
      const startY = e.clientY;
      const timer = window.setTimeout(() => {
        const p = pendingRef.current;
        if (!p) return;
        pendingRef.current = null;
        beginRotation(startX, startY);
        // 激活后将指针捕获到手柄，后续 move/up 稳定分发
        try {
          p.target.setPointerCapture(p.pointerId);
        } catch {
          /* ignore */
        }
      }, LONG_PRESS_MS);
      pendingRef.current = { timer, startX, startY, pointerId: e.pointerId, target: e.target as Element };
    },
    [beginRotation],
  );

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    // 长按等待期：移动超过阈值则取消旋转意图
    const p = pendingRef.current;
    if (p) {
      if (Math.abs(e.clientX - p.startX) > MOVE_CANCEL_THRESHOLD || Math.abs(e.clientY - p.startY) > MOVE_CANCEL_THRESHOLD) {
        cancelPending();
      }
      return;
    }
    const r = rotateRef.current;
    if (!r || !wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const angle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI) + 90;
    const delta = angle - r.startAngle;
    const raw = r.itemRotation + delta;
    // 整角磁性吸附（带磁滞，产生停顿感）
    const nearest = Math.round(raw / 90) * 90;
    let result = raw;
    if (snapRef.current !== null && Math.abs(raw - snapRef.current) <= SNAP_RELEASE) {
      result = snapRef.current;
    } else if (Math.abs(raw - nearest) <= SNAP_ENTER) {
      result = nearest;
      snapRef.current = nearest;
    } else {
      snapRef.current = null;
    }
    setSnapped(snapRef.current !== null);
    rotRef.current = result;
    setCurrentRotation(result);
  }, [wrapperRef, cancelPending]);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (pendingRef.current) {
        cancelPending();
        return;
      }
      const r = rotateRef.current;
      rotateRef.current = null;
      snapRef.current = null;
      setArmed(false);
      setSnapped(false);
      try {
        (e.target as Element).releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      if (r) {
        onRotateEndRef.current?.(rotRef.current, r.itemRotation);
      }
    },
    [cancelPending],
  );

  return {
    currentRotation,
    handleRotateStart,
    handlePointerMove,
    handlePointerUp,
    cancelPending,
    isRotating: rotateRef.current !== null,
    /** 长按已激活（可显示反馈） */
    isArmed: armed,
    /** 当前吸附在整角（0/90/180/270/360） */
    isSnapped: snapped,
  };
}
