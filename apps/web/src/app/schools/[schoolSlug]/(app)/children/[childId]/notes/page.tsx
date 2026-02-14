import { ChildModulePage } from "../../../../../../../components/family/child-module-page";

export default async function ChildNotesPage({
  params,
}: {
  params: Promise<{ schoolSlug: string; childId: string }>;
}) {
  const { schoolSlug, childId } = await params;

  return (
    <ChildModulePage
      schoolSlug={schoolSlug}
      childId={childId}
      currentTab="notes"
      title="Notes"
      subtitle="Resultats et evaluations"
      summary="Suivez les notes et evaluations de votre enfant par matiere."
      bullets={[
        "Resultats recents et evolution des performances.",
        "Lecture des notes par periode et par discipline.",
        "Aide au suivi pedagogique parent-eleve.",
      ]}
    />
  );
}
