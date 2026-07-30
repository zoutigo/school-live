"use client";

import { LegalPageLayout } from "../../components/marketing/legal-page-layout";
import { useTranslation } from "../../i18n/useTranslation";

export function TermsContent() {
  const { t } = useTranslation();

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
    />
  );
}
