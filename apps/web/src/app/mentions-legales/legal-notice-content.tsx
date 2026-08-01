"use client";

import { LegalPageLayout } from "../../components/marketing/legal-page-layout";
import { useFixedTranslation } from "../../i18n/useTranslation";
import type { MarketingLocale } from "../../lib/seo";

export function LegalNoticeContent({
  locale = "fr",
}: {
  locale?: MarketingLocale;
}) {
  const { t } = useFixedTranslation(locale);

  const sections = [1, 2, 3, 4, 5].map((n) => ({
    heading: t(`legalNoticePage.section${n}.heading`),
    body: t(`legalNoticePage.section${n}.body`),
  }));

  return (
    <LegalPageLayout
      title={t("legalNoticePage.title")}
      updatedAt={t("legal.updatedDate")}
      intro={t("legalNoticePage.intro")}
      sections={sections}
      locale={locale}
    />
  );
}
