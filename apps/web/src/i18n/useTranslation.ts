"use client";

import { useCallback } from "react";
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

  const t = useCallback((key: string) => translate(locale, key), [locale]);

  return {
    locale,
    setLocale,
    t,
  };
}

/**
 * Same shape as useTranslation(), but bound to a fixed locale instead of the
 * client-only locale store. Used by the public marketing pages, whose locale
 * comes from the URL (/en/...) so it must be deterministic during SSR.
 */
export function useFixedTranslation(locale: Locale) {
  const t = useCallback((key: string) => translate(locale, key), [locale]);

  return { locale, t };
}
