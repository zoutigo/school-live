import { ChildModulePage } from "../../../../../../../components/family/child-module-page";

export default async function ChildCahierDeTextePage({
  params,
}: {
  params: Promise<{ schoolSlug: string; childId: string }>;
}) {
  const { schoolSlug, childId } = await params;

  return (
    <ChildModulePage
      schoolSlug={schoolSlug}
      childId={childId}
      currentTab="cahier-de-texte"
      title="Cahier de texte"
      subtitle="Travail a faire"
      summary="Consultez les devoirs et consignes de travail de votre enfant."
      bullets={[
        "Devoirs du jour et travaux a rendre.",
        "Consignes partagees par les enseignants.",
        "Preparation de la semaine avec votre enfant.",
      ]}
    />
  );
}
