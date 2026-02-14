import { ChildModulePage } from "../../../../../../../components/family/child-module-page";

export default async function ChildAccueilPage({
  params,
}: {
  params: Promise<{ schoolSlug: string; childId: string }>;
}) {
  const { schoolSlug, childId } = await params;

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
    />
  );
}
