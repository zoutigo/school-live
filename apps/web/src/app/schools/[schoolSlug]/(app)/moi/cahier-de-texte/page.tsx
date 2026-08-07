"use client";

import { useParams } from "next/navigation";
import { ChildModulePage } from "../../../../../../components/family/child-module-page";
import { useTranslation } from "../../../../../../i18n/useTranslation";

export default function MyCahierDeTextePage() {
  const { t } = useTranslation();
  const { schoolSlug } = useParams<{ schoolSlug: string }>();

  return (
    <ChildModulePage
      schoolSlug={schoolSlug}
      currentTab="cahier-de-texte"
      title={t("homework.cahierDeTexte.title")}
      subtitle={t("homework.cahierDeTexte.subtitle")}
      summary={t("homework.cahierDeTexte.summary")}
      bullets={[
        t("homework.cahierDeTexte.bullet1"),
        t("homework.cahierDeTexte.bullet2"),
        t("homework.cahierDeTexte.bullet3"),
      ]}
    />
  );
}
