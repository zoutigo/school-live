"use client";

import { SUPPORTED_LOCALES } from "./translations";
import { useTranslation } from "./useTranslation";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useTranslation();

  return (
    <div
      className="grid gap-2"
      role="group"
      aria-label={t("settings.language.title")}
    >
      {SUPPORTED_LOCALES.map((option) => {
        const selected = locale === option;
        return (
          <label
            key={option}
            className={`flex cursor-pointer items-center justify-between rounded-card border px-3 py-2 text-sm ${
              selected
                ? "border-primary bg-primary/5"
                : "border-border bg-surface"
            }`}
          >
            <span className="font-medium text-text-primary">
              {t(`settings.language.${option}`)}
            </span>
            <input
              type="radio"
              name="locale"
              value={option}
              checked={selected}
              onChange={() => setLocale(option)}
              aria-label={t(`settings.language.${option}`)}
            />
          </label>
        );
      })}
    </div>
  );
}
