"use client";

import { useParams } from "next/navigation";
import { FamilyFeedPage } from "../../../../../../../components/feed/family-feed-page";
import { ChildModulePage } from "../../../../../../../components/family/child-module-page";

export default function ChildVieDeClassePage() {
  const { schoolSlug, childId } = useParams<{
    schoolSlug: string;
    childId: string;
  }>();

  return (
    <ChildModulePage
      schoolSlug={schoolSlug}
      childId={childId}
      currentTab="vie-de-classe"
      title="Vie de classe"
      subtitle="Actualites et dynamique de classe"
      summary="Consultez le fil collectif de la classe et les informations partagees par l'equipe pedagogique."
      bullets={[
        "Actualites et rappels de classe.",
        "Informations collectives diffusees aux familles.",
        "Evenements et dynamique de groupe.",
      ]}
      hideModuleHeader
      hidePrimaryTabs
      hideSecondaryTabs
      content={({ child }) => {
        const studentLabel = child
          ? `${child.lastName.toUpperCase()} ${child.firstName}`
          : "votre enfant";
        const classLabel = child?.className?.trim();
        const headingTitle = classLabel
          ? `Fil d'actualite de la classe de ${classLabel} de ${studentLabel}`
          : `Fil d'actualite de ${studentLabel}`;

        return (
          <FamilyFeedPage
            schoolSlug={schoolSlug}
            childFullName={studentLabel}
            scopeLabel="la vie de classe"
            headingTitle={headingTitle}
            viewScope="CLASS"
            currentClassId={child?.classId ?? undefined}
            hideSectionLabel
            useDemoSeed={false}
          />
        );
      }}
    />
  );
}
