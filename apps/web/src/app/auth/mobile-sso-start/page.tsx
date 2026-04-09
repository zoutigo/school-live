import { MobileSsoStartClient } from "./start-client";

type Props = {
  searchParams?: Promise<{
    redirectUri?: string;
    schoolSlug?: string;
    webBaseUrl?: string;
  }>;
};

export default async function MobileSsoStartPage({ searchParams }: Props) {
  const resolved = searchParams ? await searchParams : undefined;

  return (
    <MobileSsoStartClient
      redirectUri={resolved?.redirectUri}
      schoolSlug={resolved?.schoolSlug}
      webBaseUrl={resolved?.webBaseUrl}
    />
  );
}
