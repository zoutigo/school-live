"use client";

import { LegalPageLayout } from "../../components/marketing/legal-page-layout";
import type { MarketingLocale } from "../../lib/seo";

export function PrivacyContent({
  locale = "fr",
  title,
  bodyHtml,
  updatedAt,
}: {
  locale?: MarketingLocale;
  title: string;
  bodyHtml: string;
  updatedAt: string;
}) {
  return (
    <LegalPageLayout
      title={title}
      updatedAt={updatedAt}
      bodyHtml={bodyHtml}
      locale={locale}
    />
  );
}
