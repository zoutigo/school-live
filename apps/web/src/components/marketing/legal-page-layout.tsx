"use client";

import { FileText } from "lucide-react";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { useFixedTranslation } from "../../i18n/useTranslation";
import type { MarketingLocale } from "../../lib/seo";

export function LegalPageLayout({
  title,
  updatedAt,
  bodyHtml,
  locale = "fr",
  publisherName,
}: {
  title: string;
  updatedAt: string;
  bodyHtml: string;
  locale?: MarketingLocale;
  /** Legal representative's full name, shown only when non-empty (mentions légales only). */
  publisherName?: string;
}) {
  const { t } = useFixedTranslation(locale);

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <SiteHeader locale={locale} />

      <main>
        <section className="relative overflow-hidden bg-warm-ivory py-16">
          <div className="relative mx-auto w-full max-w-[800px] px-6 text-center lg:px-16">
            <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-warm-accent/15 text-warm-accent-dark">
              <FileText className="h-6 w-6" />
            </span>
            <h1 className="mt-5 font-heading text-3xl font-bold text-text-primary md:text-4xl">
              {title}
            </h1>
            <p className="mt-3 text-sm font-medium text-text-secondary">
              {t("legal.lastUpdated")} {updatedAt}
            </p>
          </div>
        </section>

        <section className="bg-surface py-16">
          <div className="mx-auto w-full max-w-[800px] px-6 lg:px-16">
            <div
              className="legal-content flex flex-col gap-4 text-sm text-text-secondary md:text-base [&_h2]:font-heading [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-text-primary [&_p]:leading-relaxed"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />

            {publisherName ? (
              <p
                className="mt-6 border-t border-border pt-4 text-sm text-text-secondary"
                data-testid="legal-publisher-name"
              >
                {t("legal.publisherLabel")} {publisherName}
              </p>
            ) : null}

            <div className="mt-8 rounded-[16px] border border-warm-border bg-warm-surface p-5 text-sm text-text-secondary">
              {t("legal.placeholderNotice")}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter locale={locale} />
    </div>
  );
}
