import { ChildModulePage } from "../../../../../../../components/family/child-module-page";

export default async function ChildVieDeClassePage({
  params,
}: {
  params: Promise<{ schoolSlug: string; childId: string }>;
}) {
  const { schoolSlug, childId } = await params;

  return (
    <ChildModulePage
      schoolSlug={schoolSlug}
      childId={childId}
      currentTab="vie-de-classe"
      title="Vie de classe"
      subtitle="Actualites et dynamique de classe"
      summary="Consultez les informations liees a la classe de votre enfant."
      bullets={[
        "Actualites transmises par l'equipe pedagogique.",
        "Evenements de classe et informations pratiques.",
        "Suivi du fonctionnement collectif de la classe.",
      ]}
    />
  );
}
