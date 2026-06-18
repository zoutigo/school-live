"use client";

import { useParams } from "next/navigation";
import { ChildModulePage } from "../../../../../../../components/family/child-module-page";
import { useTranslation } from "../../../../../../../i18n/useTranslation";

export default function ChildFormulairesSondagesPage() {
  const { schoolSlug, childId } = useParams<{
    schoolSlug: string;
    childId: string;
  }>();
  const { t } = useTranslation();

  return (
    <ChildModulePage
      schoolSlug={schoolSlug}
      childId={childId}
      currentTab="formulaires-sondages"
      title={t("childFormulaires.title")}
      subtitle={t("childFormulaires.subtitle")}
      summary={t("childFormulaires.summary")}
      bullets={[
        t("childFormulaires.bullet1"),
        t("childFormulaires.bullet2"),
        t("childFormulaires.bullet3"),
      ]}
    />
  );
}
