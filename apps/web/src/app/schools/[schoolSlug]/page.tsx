import Link from "next/link";
import { BackLinkButton } from "../../../components/ui/back-link-button";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { getSchoolBranding } from "./school-api";

export default async function SchoolPortalPage({
  params,
}: {
  params: Promise<{ schoolSlug: string }>;
}) {
  const { schoolSlug } = await params;
  const branding = await getSchoolBranding(schoolSlug);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto grid w-full max-w-4xl gap-6">
        <Card title={branding.name} subtitle="Portail etablissement Scolive">
          <p className="text-text-secondary">
            Accedez a votre espace personnel pour suivre la vie scolaire.
          </p>
          <div className="mt-4 flex gap-3">
            <Link href={`/schools/${schoolSlug}/login`}>
              <Button>Se connecter</Button>
            </Link>
            <BackLinkButton href="/">Retour accueil</BackLinkButton>
          </div>
        </Card>
      </div>
    </div>
  );
}
