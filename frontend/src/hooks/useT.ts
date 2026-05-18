import { useLanguageStore } from '@/stores/language.store';
import en from '@/locales/en.json';
import id from '@/locales/id.json';

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : string };
type Locale = typeof en;

const locales: Record<string, Locale> = { en, id };

/**
 * useT — Translation hook
 *
 * Usage:
 *   const { t, lang } = useT();
 *   t('settings.title')      → 'Settings' or 'Pengaturan'
 *   t('common.cancel')       → 'Cancel' or 'Batal'
 *
 * Nested keys use dot notation. Falls back to English if key not found.
 */
export function useT() {
  const lang = useLanguageStore((s) => s.lang);
  const locale = locales[lang] ?? locales.en;

  function t(key: string): string {
    const parts = key.split('.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let value: any = locale;
    for (const part of parts) {
      value = value?.[part];
      if (value === undefined) break;
    }
    // Fallback to English if key not found in current locale
    if (typeof value !== 'string') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let fallback: any = locales.en;
      for (const part of parts) {
        fallback = fallback?.[part];
        if (fallback === undefined) break;
      }
      return typeof fallback === 'string' ? fallback : key;
    }
    return value;
  }

  return { t, lang };
}
