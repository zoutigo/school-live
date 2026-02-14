import { ChildModulePage } from "../../../../../../../components/family/child-module-page";

export default async function ChildManuelsRessourcesPage({
  params,
}: {
  params: Promise<{ schoolSlug: string; childId: string }>;
}) {
  const { schoolSlug, childId } = await params;

  return (
    <ChildModulePage
      schoolSlug={schoolSlug}
      childId={childId}
      currentTab="manuels-ressources"
      title="Manuels & resources"
      subtitle="Supports pedagogiques"
      summary="Accedez aux ressources pedagogiques utiles pour votre enfant."
      bullets={[
        "Liste des manuels et references recommandees.",
        "Documents et ressources partages par les enseignants.",
        "Aide a l'accompagnement des apprentissages a la maison.",
      ]}
    />
  );
}
