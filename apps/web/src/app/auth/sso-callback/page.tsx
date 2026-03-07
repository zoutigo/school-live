import { SsoCallbackClient } from "./sso-callback-client";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SsoCallbackPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const schoolSlugParam = params.schoolSlug;
  const schoolSlug = Array.isArray(schoolSlugParam)
    ? schoolSlugParam[0]
    : schoolSlugParam;

  return <SsoCallbackClient schoolSlug={schoolSlug} />;
}
