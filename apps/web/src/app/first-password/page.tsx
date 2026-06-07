import { redirect } from "next/navigation";
import { Suspense } from "react";
import { RecoveryShell } from "../../components/layout/recovery-shell";
import { FirstPasswordClient } from "./first-password-client";

type FirstPasswordPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getStringParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = params[key];
  return typeof value === "string" ? value : undefined;
}

function buildOnboardingUrl(
  params: Record<string, string | string[] | undefined>,
): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      query.set(key, value);
    } else if (Array.isArray(value)) {
      for (const entry of value) {
        query.append(key, entry);
      }
    }
  }
  const serialized = query.toString();
  return serialized ? `/onboarding?${serialized}` : "/onboarding";
}

export default async function FirstPasswordPage({
  searchParams,
}: FirstPasswordPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};

  const username = getStringParam(resolvedSearchParams, "username");
  const schoolSlug = getStringParam(resolvedSearchParams, "schoolSlug");

  if (!username) {
    redirect(buildOnboardingUrl(resolvedSearchParams));
  }

  return (
    <RecoveryShell title="Premiere connexion">
      <div className="mx-auto w-full max-w-xl">
        <Suspense
          fallback={
            <div className="text-sm text-text-secondary">Chargement...</div>
          }
        >
          <FirstPasswordClient username={username} schoolSlug={schoolSlug} />
        </Suspense>
      </div>
    </RecoveryShell>
  );
}
