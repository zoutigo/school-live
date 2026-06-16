"use client";

import { useEffect } from "react";
import { useLocaleStore } from "./locale-store";

/**
 * Keeps <html lang="..."> in sync with the persisted locale.
 * Mounted once in the root layout.
 */
export function LocaleHtmlSync() {
  const locale = useLocaleStore((state) => state.locale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
