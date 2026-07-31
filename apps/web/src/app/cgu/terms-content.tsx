"use client";

import { LegalPageLayout } from "../../components/marketing/legal-page-layout";
import { useFixedTranslation } from "../../i18n/useTranslation";
import type { MarketingLocale } from "../../lib/seo";

export function TermsContent({ locale = "fr" }: { locale?: MarketingLocale }) {
  const { t } = useFixedTranslation(locale);

  const sections = [1, 2, 3, 4, 5, 6].map((n) => ({
    heading: t(`termsPage.section${n}.heading`),
    body: t(`termsPage.section${n}.body`),
  }));

  return (
    <LegalPageLayout
      title={t("termsPage.title")}
      updatedAt={t("legal.updatedDate")}
      intro={t("termsPage.intro")}
      sections={sections}
      locale={locale}
    />
  );
}
