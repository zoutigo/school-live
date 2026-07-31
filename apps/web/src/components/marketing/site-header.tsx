"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "../ui/button";
import { useFixedTranslation } from "../../i18n/useTranslation";
import { localizedPath, type MarketingLocale } from "../../lib/seo";

type Variant = "transparent" | "solid";

const NAV_ITEMS: { href: string; key: string }[] = [
  { href: "/fonctionnalites", key: "nav.features" },
  { href: "/tarifs", key: "nav.pricing" },
  { href: "/blog", key: "nav.blog" },
  { href: "/contact", key: "nav.contact" },
];

/** Strips a leading /en so a pathname can be re-localized to either locale. */
function toBasePath(pathname: string | null): string {
  if (!pathname || pathname === "/en") return "/";
  if (pathname.startsWith("/en/")) return pathname.slice(3);
  return pathname;
}

function NavLink({
  href,
  label,
  active,
  transparent,
  onClick,
}: {
  href: string;
  label: string;
  active: boolean;
  transparent: boolean;
  onClick?: () => void;
}) {
  const base = "text-sm font-semibold transition-colors";
  const tone = transparent
    ? active
      ? "text-surface"
      : "text-surface/80 hover:text-surface"
    : active
      ? "text-primary"
      : "text-text-secondary hover:text-primary";

  return (
    <Link href={href} onClick={onClick} className={`${base} ${tone}`}>
      {label}
    </Link>
  );
}

function LanguageSwitchLink({
  locale,
  transparent,
  pathname,
  onClick,
}: {
  locale: MarketingLocale;
  transparent: boolean;
  pathname: string | null;
  onClick?: () => void;
}) {
  const basePath = toBasePath(pathname);
  const tone = transparent
    ? "border-surface/40 text-surface/90 hover:bg-surface/10"
    : "border-border text-text-secondary hover:bg-warm-highlight/40";

  return (
    <div
      className={`inline-flex overflow-hidden rounded-full border text-xs font-semibold uppercase tracking-wide ${tone}`}
    >
      {(["fr", "en"] as const).map((option) => (
        <Link
          key={option}
          href={localizedPath(option, basePath)}
          onClick={onClick}
          aria-current={option === locale ? "true" : undefined}
          className={`px-2.5 py-1 transition-colors ${
            option === locale
              ? transparent
                ? "bg-surface/20 text-surface"
                : "bg-warm-highlight/70 text-primary"
              : ""
          }`}
        >
          {option.toUpperCase()}
        </Link>
      ))}
    </div>
  );
}

export function SiteHeader({
  variant = "solid",
  locale = "fr",
}: {
  variant?: Variant;
  locale?: MarketingLocale;
}) {
  const { t } = useFixedTranslation(locale);
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const transparent = variant === "transparent";

  const close = () => setOpen(false);

  return (
    <header
      className={
        transparent
          ? "absolute inset-x-0 top-0 z-20 w-full"
          : "sticky top-0 z-20 w-full border-b border-border bg-surface/95 backdrop-blur-sm"
      }
    >
      <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between px-6 py-5 lg:px-16">
        <Link
          href={localizedPath(locale, "/")}
          className="flex items-center gap-3"
          onClick={close}
        >
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-card bg-surface font-heading text-base font-bold text-primary shadow-card">
            SL
          </span>
          <span
            className={`font-heading text-xl font-bold tracking-tight ${
              transparent ? "text-surface drop-shadow-sm" : "text-text-primary"
            }`}
          >
            Scolive
          </span>
        </Link>

        <nav
          aria-label={t("nav.ariaLabel")}
          className="hidden items-center gap-8 md:flex"
        >
          {NAV_ITEMS.map((item) => {
            const href = localizedPath(locale, item.href);
            return (
              <NavLink
                key={item.href}
                href={href}
                label={t(item.key)}
                active={pathname === href}
                transparent={transparent}
              />
            );
          })}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          <LanguageSwitchLink
            locale={locale}
            transparent={transparent}
            pathname={pathname}
          />
          <Link href="/login">
            <Button>{t("landing.hero.loginCta")}</Button>
          </Link>
        </div>

        <button
          type="button"
          aria-label={open ? t("header.closeMenu") : t("header.openMenu")}
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
          className={`inline-flex h-10 w-10 items-center justify-center rounded-card border md:hidden ${
            transparent
              ? "border-surface/40 bg-surface/10 text-surface"
              : "border-border bg-surface text-text-primary"
          }`}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <nav
          aria-label={t("nav.ariaLabel")}
          className="site-inline-gutter mx-auto flex w-full max-w-[1400px] flex-col gap-1 border-t border-border bg-surface px-6 pb-6 pt-4 shadow-card md:hidden"
        >
          {NAV_ITEMS.map((item) => {
            const href = localizedPath(locale, item.href);
            return (
              <Link
                key={item.href}
                href={href}
                onClick={close}
                className={`rounded-card px-3 py-3 text-base font-semibold ${
                  pathname === href
                    ? "bg-warm-highlight/60 text-primary"
                    : "text-text-primary hover:bg-warm-highlight/40"
                }`}
              >
                {t(item.key)}
              </Link>
            );
          })}
          <div className="mt-2 px-3">
            <LanguageSwitchLink
              locale={locale}
              transparent={false}
              pathname={pathname}
              onClick={close}
            />
          </div>
          <Link href="/login" onClick={close} className="mt-3">
            <Button className="w-full">{t("landing.hero.loginCta")}</Button>
          </Link>
        </nav>
      ) : null}
    </header>
  );
}
