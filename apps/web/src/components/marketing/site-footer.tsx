"use client";

import Link from "next/link";
import { useTranslation } from "../../i18n/useTranslation";

function useFooterColumns() {
  const { t } = useTranslation();

  return [
    {
      title: t("footer.product.title"),
      links: [
        { href: "/fonctionnalites", label: t("nav.features") },
        { href: "/tarifs", label: t("nav.pricing") },
        { href: "/login", label: t("landing.hero.loginCta") },
      ],
    },
    {
      title: t("footer.resources.title"),
      links: [
        { href: "/blog", label: t("nav.blog") },
        { href: "/contact", label: t("nav.contact") },
      ],
    },
    {
      title: t("footer.legal.title"),
      links: [
        { href: "/mentions-legales", label: t("footer.legalMentions") },
        { href: "/cgu", label: t("footer.terms") },
        { href: "/confidentialite", label: t("footer.privacy") },
      ],
    },
  ];
}

export function SiteFooter() {
  const { t } = useTranslation();
  const columns = useFooterColumns();

  return (
    <footer className="border-t border-border bg-surface">
      <div className="site-inline-gutter mx-auto grid w-full max-w-[1400px] gap-10 px-6 py-16 sm:grid-cols-2 lg:grid-cols-4 lg:px-16">
        <div className="sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-card bg-primary font-heading text-base font-bold text-surface">
              SL
            </span>
            <span className="font-heading text-lg font-bold text-text-primary">
              Scolive
            </span>
          </div>
          <p className="mt-4 max-w-xs text-sm text-text-secondary">
            {t("footer.tagline")}
          </p>
        </div>

        {columns.map((column) => (
          <div key={column.title}>
            <h3 className="font-heading text-sm font-semibold uppercase tracking-wide text-text-primary">
              {column.title}
            </h3>
            <ul className="mt-4 flex flex-col gap-3">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-text-secondary transition-colors hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-border">
        <div className="site-inline-gutter mx-auto w-full max-w-[1400px] px-6 py-6 text-sm text-text-secondary lg:px-16">
          © {new Date().getFullYear()} Scolive — {t("footer.rights")}
        </div>
      </div>
    </footer>
  );
}
