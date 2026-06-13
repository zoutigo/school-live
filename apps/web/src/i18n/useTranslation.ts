"use client";

import { useLocaleStore } from "./locale-store";
import { DEFAULT_LOCALE, translations, type Locale } from "./translations";

export type TranslateFn = (key: string) => string;

export function translate(locale: Locale, key: string): string {
  return (
    translations[locale]?.[key] ?? translations[DEFAULT_LOCALE]?.[key] ?? key
  );
}

export function useTranslation() {
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);

  return {
    locale,
    setLocale,
    t: (key: string) => translate(locale, key),
  };
}
