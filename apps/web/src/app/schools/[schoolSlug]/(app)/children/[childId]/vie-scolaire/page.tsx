import { ChildModulePage } from "../../../../../../../components/family/child-module-page";

export default async function ChildVieScolairePage({
  params,
}: {
  params: Promise<{ schoolSlug: string; childId: string }>;
}) {
  const { schoolSlug, childId } = await params;

  return (
    <ChildModulePage
      schoolSlug={schoolSlug}
      childId={childId}
      currentTab="vie-scolaire"
      title="Vie scolaire"
      subtitle="Suivi administratif et comportement"
      summary="Suivez les informations de vie scolaire de votre enfant."
      bullets={[
        "Absences, retards et incidents de discipline.",
        "Informations administratives utiles aux parents.",
        "Historique des evenements et notifications officielles.",
      ]}
    />
  );
}
