"use client";

import { useParams } from "next/navigation";
import { ChildModulePage } from "../../../../../../../components/family/child-module-page";
import { ChildHomeworkPanel } from "../../../../../../../components/homework/child-homework-panel";
import { useTranslation } from "../../../../../../../i18n/useTranslation";

export default function ChildCahierDeTextePage() {
  const { t } = useTranslation();
  const { schoolSlug, childId } = useParams<{
    schoolSlug: string;
    childId: string;
  }>();

  return (
    <ChildModulePage
      schoolSlug={schoolSlug}
      childId={childId}
      currentTab="cahier-de-texte"
      title={t("homework.cahierDeTexte.title")}
      subtitle={t("homework.cahierDeTexte.subtitle")}
      summary={t("homework.cahierDeTexte.summary")}
      bullets={[
        t("homework.cahierDeTexte.bullet1"),
        t("homework.cahierDeTexte.bullet2"),
        t("homework.cahierDeTexte.bullet3"),
      ]}
      hideModuleHeader
      hidePrimaryTabs
      hideSecondaryTabs
      content={({ child }) => {
        const childFullName = child
          ? `${child.lastName.toUpperCase()} ${child.firstName}`
          : t("homework.cahierDeTexte.subtitle");

        return (
          <ChildHomeworkPanel
            schoolSlug={schoolSlug}
            classId={child?.classId ?? null}
            studentId={childId}
            childFullName={childFullName}
            className={child?.className ?? null}
          />
        );
      }}
    />
  );
}
