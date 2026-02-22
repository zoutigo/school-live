"use client";

import { useParams } from "next/navigation";
import { ChildModulePage } from "../../../../../../../components/family/child-module-page";
import { FamilyFeedPage } from "../../../../../../../components/feed/family-feed-page";

export default function ChildAccueilPage() {
  const { schoolSlug, childId } = useParams<{
    schoolSlug: string;
    childId: string;
  }>();

  return (
    <ChildModulePage
      schoolSlug={schoolSlug}
      childId={childId}
      currentTab="accueil"
      title="Accueil enfant"
      subtitle="Synthese quotidienne"
      summary="Vue generale de la journee scolaire de votre enfant."
      bullets={[
        "Rappels importants de la journee et prochaines echeances.",
        "Acces rapide vers notes, messagerie et cahier de texte.",
        "Points de vigilance a suivre avec l'etablissement.",
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
            hideSectionLabel
          />
        );
      }}
    />
  );
}
