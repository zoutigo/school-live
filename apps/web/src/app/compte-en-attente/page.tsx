import { PendingAccountClient } from "./pending-account-client";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PendingAccountPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const emailParam = params.email;
  const phoneParam = params.phone;
  const schoolSlugParam = params.schoolSlug;

  const initialEmail = Array.isArray(emailParam) ? emailParam[0] : emailParam;
  const initialPhone = Array.isArray(phoneParam) ? phoneParam[0] : phoneParam;
  const initialSchoolSlug = Array.isArray(schoolSlugParam)
    ? schoolSlugParam[0]
    : schoolSlugParam;

  return (
    <PendingAccountClient
      initialEmail={initialEmail}
      initialPhone={initialPhone}
      initialSchoolSlug={initialSchoolSlug}
    />
  );
}
