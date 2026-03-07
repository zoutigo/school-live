import { PlatformCredentialsCompletionClient } from "./platform-credentials-completion-client";

type PageProps = {
  searchParams: Promise<{
    token?: string;
    email?: string;
    phone?: string;
    schoolSlug?: string;
    missing?: string;
  }>;
};

export default async function PlatformCredentialsCompletionPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  return (
    <PlatformCredentialsCompletionClient
      token={params.token}
      email={params.email}
      phone={params.phone}
      schoolSlug={params.schoolSlug}
      missing={params.missing}
    />
  );
}
