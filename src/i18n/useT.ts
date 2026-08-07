/** v0.3 r4: 组件用翻译 hook，语言随 useOverviewStore 持久化 */
import { useOverviewStore } from '../store/useOverviewStore';
import { getT } from './index';
import type { TFunc } from './index';

export function useT(): TFunc {
  const lang = useOverviewStore((s) => s.language);
  return getT(lang);
}
