"use client";

import { useParams } from "next/navigation";
import { ChildModulePage } from "../../../../../../../components/family/child-module-page";
import { useTranslation } from "../../../../../../../i18n/useTranslation";

export default function ChildManuelsRessourcesPage() {
  const { schoolSlug, childId } = useParams<{
    schoolSlug: string;
    childId: string;
  }>();
  const { t } = useTranslation();

  return (
    <ChildModulePage
      schoolSlug={schoolSlug}
      childId={childId}
      currentTab="manuels-ressources"
      title={t("childManuels.title")}
      subtitle={t("childManuels.subtitle")}
      summary={t("childManuels.summary")}
      bullets={[
        t("childManuels.bullet1"),
        t("childManuels.bullet2"),
        t("childManuels.bullet3"),
      ]}
    />
  );
}
