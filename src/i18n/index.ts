/**
 * v0.3 r4: i18n 入口。
 * 轻量字典方案：10 种语言扁平字典 + t(key, vars) 变量替换，回退英文。
 */
import { en } from './en';
import type { TKey } from './en';
import { zhCN } from './langs/zh-CN';
import { zhTW } from './langs/zh-TW';
import { ja } from './langs/ja';
import { ko } from './langs/ko';
import { es } from './langs/es';
import { fr } from './langs/fr';
import { de } from './langs/de';
import { pt } from './langs/pt';
import { ru } from './langs/ru';

export type Lang = 'en' | 'zh-CN' | 'zh-TW' | 'ja' | 'ko' | 'es' | 'fr' | 'de' | 'pt' | 'ru';

/** Settings 页语言选择列表（label 保持各语言原文） */
export const LANGUAGES: { code: Lang; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'zh-CN', label: '简体中文' },
  { code: 'zh-TW', label: '繁體中文' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'pt', label: 'Português' },
  { code: 'ru', label: 'Русский' },
];

const DICTS: Record<Lang, Record<TKey, string>> = {
  en,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  ja,
  ko,
  es,
  fr,
  de,
  pt,
  ru,
};

export type TFunc = (key: TKey, vars?: Record<string, string | number>) => string;

/** 构造指定语言的翻译函数；缺失 key 回退英文 */
export function getT(lang: Lang): TFunc {
  const dict = DICTS[lang] ?? en;
  return (key, vars) => {
    let s: string = dict[key] ?? en[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        s = s.split(`{${k}}`).join(String(v));
      }
    }
    return s;
  };
}
