"use client";

import { LegalPageLayout } from "../../components/marketing/legal-page-layout";
import { useTranslation } from "../../i18n/useTranslation";

export function LegalNoticeContent() {
  const { t } = useTranslation();

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
    />
  );
}
