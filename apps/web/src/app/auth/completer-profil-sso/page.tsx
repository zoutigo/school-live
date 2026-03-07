import { SsoProfileCompletionClient } from "./sso-profile-completion-client";
import { RecoveryShell } from "../../../components/layout/recovery-shell";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CompleteSsoProfilePage({
  searchParams,
}: PageProps) {
  const params = (await searchParams) ?? {};
  const schoolSlugParam = params.schoolSlug;
  const schoolSlug = Array.isArray(schoolSlugParam)
    ? schoolSlugParam[0]
    : schoolSlugParam;

  return (
    <RecoveryShell title="Recuperation du profil SSO">
      <SsoProfileCompletionClient schoolSlug={schoolSlug} />
    </RecoveryShell>
  );
}
