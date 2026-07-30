"use client";

import { LegalPageLayout } from "../../components/marketing/legal-page-layout";
import { useTranslation } from "../../i18n/useTranslation";

export function PrivacyContent() {
  const { t } = useTranslation();

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
    />
  );
}
