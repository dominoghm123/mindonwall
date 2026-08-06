import type { UndoAction, Item, Rope } from './types';

/** 撤销栈最大深度 */
export const MAX_UNDO_DEPTH = 20;

/** 将动作压入撤销栈，超出深度时移除最旧记录 */
export function pushUndo(
  stack: UndoAction[],
  action: UndoAction,
): UndoAction[] {
  const next = [...stack, action];
  if (next.length > MAX_UNDO_DEPTH) {
    return next.slice(next.length - MAX_UNDO_DEPTH);
  }
  return next;
}

/** 从撤销栈弹出最近一条 */
export function popUndo(stack: UndoAction[]): { action: UndoAction; remaining: UndoAction[] } | null {
  if (stack.length === 0) return null;
  const action = stack[stack.length - 1];
  return { action, remaining: stack.slice(0, -1) };
}

/** 计算两 Pin 之间的欧几里得距离 */
export function pinDistance(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/** 从 Item 的 pinOffset 计算 Pin 世界坐标 */
export function getPinWorldPosition(item: Item): { x: number; y: number } {
  const offset = item.pinOffset ?? { x: 0.5, y: 0 };
  return {
    x: item.x + offset.x * item.width,
    y: item.y + offset.y * item.height,
  };
}

/** 创建添加 Item 的撤销记录 */
export function makeAddItemAction(item: Item): UndoAction {
  return {
    type: 'add',
    itemId: item.id,
    before: null,
    after: { ...item },
    timestamp: Date.now(),
  };
}

/** 创建删除 Item 的撤销记录 */
export function makeRemoveItemAction(item: Item): UndoAction {
  return {
    type: 'remove',
    itemId: item.id,
    before: { ...item },
    after: null,
    timestamp: Date.now(),
  };
}

/** 创建移动 Item 的撤销记录 */
export function makeMoveItemAction(itemId: string, before: Pick<Item, 'x' | 'y'>, after: Pick<Item, 'x' | 'y'>): UndoAction {
  return {
    type: 'move',
    itemId,
    before,
    after,
    timestamp: Date.now(),
  };
}

/** 创建缩放 Item 的撤销记录 */
export function makeResizeItemAction(itemId: string, before: Pick<Item, 'width' | 'height'>, after: Pick<Item, 'width' | 'height'>): UndoAction {
  return {
    type: 'resize',
    itemId,
    before,
    after,
    timestamp: Date.now(),
  };
}

/** 创建旋转 Item 的撤销记录 */
export function makeRotateItemAction(itemId: string, beforeRotation: number, afterRotation: number): UndoAction {
  return {
    type: 'rotate',
    itemId,
    before: { rotation: beforeRotation },
    after: { rotation: afterRotation },
    timestamp: Date.now(),
  };
}

/** 创建编辑 Item 的撤销记录 */
export function makeEditItemAction(itemId: string, before: Partial<Item>, after: Partial<Item>): UndoAction {
  return {
    type: 'edit',
    itemId,
    before,
    after,
    timestamp: Date.now(),
  };
}

/** 创建添加 Rope 的撤销记录 */
export function makeAddRopeAction(rope: Rope): UndoAction {
  return {
    type: 'addRope',
    ropeId: rope.id,
    before: null,
    after: { ...rope },
    timestamp: Date.now(),
  };
}

/** 创建删除 Rope 的撤销记录 */
export function makeRemoveRopeAction(rope: Rope): UndoAction {
  return {
    type: 'removeRope',
    ropeId: rope.id,
    before: { ...rope },
    after: null,
    timestamp: Date.now(),
  };
}

/** 创建编辑 Rope 的撤销记录 */
export function makeEditRopeAction(ropeId: string, before: Partial<Rope>, after: Partial<Rope>): UndoAction {
  return {
    type: 'editRope',
    ropeId,
    before,
    after,
    timestamp: Date.now(),
  };
}

/** 将撤销动作应用到 Item 列表（恢复 before 状态） */
export function applyUndoToItems(items: Item[], action: UndoAction): Item[] {
  if (action.type === 'add' || action.type === 'addRope') {
    // 撤销 add = 删除
    return items.filter((i) => i.id !== action.itemId);
  }
  if (action.type === 'remove') {
    // 撤销 remove = 恢复
    const restored = action.before as Partial<Item>;
    if (restored.id) {
      return [...items, restored as Item];
    }
    return items;
  }
  // move / resize / rotate / edit — 恢复 before 字段
  return items.map((item) => {
    if (item.id !== action.itemId) return item;
    const beforeData = action.before as Partial<Item>;
    return { ...item, ...beforeData };
  });
}

/** 将撤销动作应用到 Rope 列表（恢复 before 状态） */
export function applyUndoToRopes(ropes: Rope[], action: UndoAction): Rope[] {
  if (action.type === 'addRope') {
    return ropes.filter((r) => r.id !== action.ropeId);
  }
  if (action.type === 'removeRope') {
    const restored = action.before as Partial<Rope>;
    if (restored.id) {
      return [...ropes, restored as Rope];
    }
    return ropes;
  }
  if (action.type === 'editRope') {
    return ropes.map((rope) => {
      if (rope.id !== action.ropeId) return rope;
      const beforeData = action.before as Partial<Rope>;
      return { ...rope, ...beforeData };
    });
  }
  return ropes;
}

/** 将重做动作应用到 Item 列表 */
export function applyRedoToItems(items: Item[], action: UndoAction): Item[] {
  if (action.type === 'add') {
    const restored = action.after as Partial<Item>;
    if (restored.id) {
      return [...items, restored as Item];
    }
    return items;
  }
  if (action.type === 'remove') {
    return items.filter((i) => i.id !== action.itemId);
  }
  return items.map((item) => {
    if (item.id !== action.itemId) return item;
    const afterData = action.after as Partial<Item>;
    return { ...item, ...afterData };
  });
}

/** 将重做动作应用到 Rope 列表 */
export function applyRedoToRopes(ropes: Rope[], action: UndoAction): Rope[] {
  if (action.type === 'addRope') {
    const restored = action.after as Partial<Rope>;
    if (restored.id) {
      return [...ropes, restored as Rope];
    }
    return ropes;
  }
  if (action.type === 'removeRope') {
    return ropes.filter((r) => r.id !== action.ropeId);
  }
  if (action.type === 'editRope') {
    return ropes.map((rope) => {
      if (rope.id !== action.ropeId) return rope;
      const afterData = action.after as Partial<Rope>;
      return { ...rope, ...afterData };
    });
  }
  return ropes;
}
