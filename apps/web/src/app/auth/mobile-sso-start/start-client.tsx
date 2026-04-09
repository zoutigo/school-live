"use client";

import { useEffect, useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { Card } from "../../../components/ui/card";

type Props = {
  redirectUri?: string;
  schoolSlug?: string;
  webBaseUrl?: string;
};

function normalizeBaseUrl(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.replace(/\/$/, "") : undefined;
}

function buildCallbackUrl(
  webBaseUrl?: string,
  redirectUri?: string,
  schoolSlug?: string,
) {
  const params = new URLSearchParams();
  if (redirectUri?.trim()) {
    params.set("redirectUri", redirectUri.trim());
  }
  if (schoolSlug?.trim()) {
    params.set("schoolSlug", schoolSlug.trim());
  }
  const query = params.toString();
  const callbackPath = query
    ? `/auth/mobile-sso-callback?${query}`
    : "/auth/mobile-sso-callback";
  const baseUrl = normalizeBaseUrl(webBaseUrl);
  return baseUrl ? `${baseUrl}${callbackPath}` : callbackPath;
}

export function MobileSsoStartClient({
  redirectUri,
  schoolSlug,
  webBaseUrl,
}: Props) {
  const [error, setError] = useState<string | null>(null);

  const callbackUrl = useMemo(
    () => buildCallbackUrl(webBaseUrl, redirectUri, schoolSlug),
    [redirectUri, schoolSlug, webBaseUrl],
  );

  useEffect(() => {
    let cancelled = false;

    async function startGoogleSso() {
      try {
        await signIn("google", { callbackUrl });
      } catch {
        if (!cancelled) {
          setError("Impossible de lancer la connexion Google.");
        }
      }
    }

    void startGoogleSso();

    return () => {
      cancelled = true;
    };
  }, [callbackUrl]);

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-text-primary sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-xl">
        <Card title="Connexion Google" subtitle="Redirection en cours...">
          {error ? (
            <p className="text-sm text-notification">{error}</p>
          ) : (
            <p className="text-sm text-text-secondary">
              Nous vous redirigeons vers Google...
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}

export { buildCallbackUrl };
