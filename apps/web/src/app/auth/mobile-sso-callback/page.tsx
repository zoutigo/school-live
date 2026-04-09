import { MobileSsoCallbackClient } from "./callback-client";

type Props = {
  searchParams?: Promise<{
    redirectUri?: string;
    schoolSlug?: string;
  }>;
};

export default async function MobileSsoCallbackPage({ searchParams }: Props) {
  const resolved = searchParams ? await searchParams : undefined;

  return (
    <MobileSsoCallbackClient
      redirectUri={resolved?.redirectUri}
      schoolSlug={resolved?.schoolSlug}
    />
  );
}
