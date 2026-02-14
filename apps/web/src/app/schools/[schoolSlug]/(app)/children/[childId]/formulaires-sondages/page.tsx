import { ChildModulePage } from "../../../../../../../components/family/child-module-page";

export default async function ChildFormulairesSondagesPage({
  params,
}: {
  params: Promise<{ schoolSlug: string; childId: string }>;
}) {
  const { schoolSlug, childId } = await params;

  return (
    <ChildModulePage
      schoolSlug={schoolSlug}
      childId={childId}
      currentTab="formulaires-sondages"
      title="Formulaires & sondages"
      subtitle="Demarches et consultations"
      summary="Suivez et repondez aux formulaires et sondages concernant votre enfant."
      bullets={[
        "Formulaires administratifs a completer.",
        "Sondages et consultations de l'etablissement.",
        "Tracabilite des reponses transmises par la famille.",
      ]}
    />
  );
}
