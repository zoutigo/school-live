"use client";

import { LegalPageLayout } from "../../components/marketing/legal-page-layout";
import { useFixedTranslation } from "../../i18n/useTranslation";
import type { MarketingLocale } from "../../lib/seo";

export function PrivacyContent({
  locale = "fr",
}: {
  locale?: MarketingLocale;
}) {
  const { t } = useFixedTranslation(locale);

  const sections = [1, 2, 3, 4, 5, 6].map((n) => ({
    heading: t(`privacyPage.section${n}.heading`),
    body: t(`privacyPage.section${n}.body`),
  }));

  return (
    <LegalPageLayout
      title={t("privacyPage.title")}
      updatedAt={t("legal.updatedDate")}
      intro={t("privacyPage.intro")}
      sections={sections}
      locale={locale}
    />
  );
}
