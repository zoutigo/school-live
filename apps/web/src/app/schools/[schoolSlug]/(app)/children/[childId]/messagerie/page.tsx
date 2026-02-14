import { ChildModulePage } from "../../../../../../../components/family/child-module-page";

export default async function ChildMessageriePage({
  params,
}: {
  params: Promise<{ schoolSlug: string; childId: string }>;
}) {
  const { schoolSlug, childId } = await params;

  return (
    <ChildModulePage
      schoolSlug={schoolSlug}
      childId={childId}
      currentTab="messagerie"
      title="Messagerie"
      subtitle="Echanges parents-etablissement"
      summary="Centralisez vos communications liees a votre enfant."
      bullets={[
        "Messages recus de la direction et des enseignants.",
        "Historique des echanges autour de votre enfant.",
        "Suivi des informations importantes transmises a la famille.",
      ]}
    />
  );
}
