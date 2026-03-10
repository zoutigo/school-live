"use client";

import { useEffect, useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "../ui/button";

type Props = {
  schoolSlug?: string | null;
};

const APPLE_SSO_ENABLED = false;

function GoogleLogo() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      focusable="false"
    >
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.4c-.2 1.3-1.5 3.9-5.4 3.9-3.2 0-5.9-2.7-5.9-6s2.6-6 5.9-6c1.8 0 3 .8 3.7 1.4l2.5-2.4C16.7 3.6 14.6 2.8 12 2.8A9.2 9.2 0 0 0 2.8 12 9.2 9.2 0 0 0 12 21.2c5.3 0 8.8-3.7 8.8-8.9 0-.6-.1-1.1-.2-1.6H12Z"
      />
      <path
        fill="#34A853"
        d="M2.8 7.2l3.2 2.3A6 6 0 0 1 12 6c1.8 0 3 .8 3.7 1.4l2.5-2.4C16.7 3.6 14.6 2.8 12 2.8a9.2 9.2 0 0 0-9.2 4.4Z"
      />
      <path
        fill="#FBBC05"
        d="M12 21.2c2.5 0 4.6-.8 6.2-2.3l-2.9-2.2c-.8.6-1.8 1.1-3.3 1.1A6 6 0 0 1 6 14l-3.2 2.5a9.2 9.2 0 0 0 9.2 4.7Z"
      />
      <path
        fill="#4285F4"
        d="M20.8 12.3c0-.6-.1-1.1-.2-1.6H12v3.9h5.4c-.3 1.2-1 2.1-2.1 2.8l2.9 2.2c1.7-1.6 2.6-4 2.6-7.3Z"
      />
    </svg>
  );
}

function AppleLogo() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M16.7 12.7c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.2-2.8.8-3.5.8-.7 0-1.7-.8-2.9-.8-1.5 0-2.9.9-3.7 2.2-1.6 2.7-.4 6.8 1.1 9 0.7 1.1 1.6 2.3 2.7 2.2 1.1 0 1.5-.7 2.8-.7s1.7.7 2.8.7c1.2 0 1.9-1 2.6-2.1.8-1.2 1.1-2.4 1.1-2.5 0-.1-2.1-.8-2.1-3.5Zm-2.3-6.8c.6-.8 1-1.9.8-3-.9 0-2.1.6-2.7 1.4-.6.7-1.1 1.9-1 3 1 .1 2.1-.5 2.9-1.4Z"
      />
    </svg>
  );
}

export function SsoButtons({ schoolSlug }: Props) {
  const [loadingProvider, setLoadingProvider] = useState<
    "google" | "apple" | null
  >(null);
  const [providers, setProviders] = useState<{
    google: boolean;
    apple: boolean;
  }>({
    google: true,
    apple: false,
  });
  const [providersLoaded, setProvidersLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callbackUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (schoolSlug) {
      params.set("schoolSlug", schoolSlug);
    }
    const query = params.toString();
    return query ? `/auth/sso-callback?${query}` : "/auth/sso-callback";
  }, [schoolSlug]);

  useEffect(() => {
    let cancelled = false;

    async function loadProviders() {
      try {
        const response = await fetch("/api/auth/providers", {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error("providers probe failed");
        }
        const payload = (await response.json()) as Record<string, unknown>;

        if (!cancelled) {
          setProviders({
            google: Boolean(payload.google),
            apple: Boolean(payload.apple),
          });
          setProvidersLoaded(true);
        }
      } catch {
        if (!cancelled) {
          // Keep Google button usable on transient probe failures.
          setProviders((current) => ({ ...current, google: true }));
          setProvidersLoaded(true);
        }
      }
    }

    void loadProviders();

    return () => {
      cancelled = true;
    };
  }, []);

  async function onProviderSignIn(provider: "google" | "apple") {
    if (provider === "apple" && !providers.apple) {
      setError("Connexion Apple indisponible: configuration manquante.");
      return;
    }
    setError(null);
    setLoadingProvider(provider);
    try {
      await signIn(provider, { callbackUrl });
    } finally {
      setLoadingProvider(null);
    }
  }

  const appleEnabled = providersLoaded && providers.apple && APPLE_SSO_ENABLED;

  return (
    <div className="grid gap-2">
      <Button
        type="button"
        variant="secondary"
        disabled={loadingProvider !== null}
        onClick={() => void onProviderSignIn("google")}
      >
        <span className="inline-flex items-center gap-2">
          <GoogleLogo />
          {loadingProvider === "google"
            ? "Connexion Google..."
            : "Continuer avec Google"}
        </span>
      </Button>
      <Button
        type="button"
        variant="secondary"
        disabled={!appleEnabled || loadingProvider !== null}
        onClick={() =>
          APPLE_SSO_ENABLED ? void onProviderSignIn("apple") : undefined
        }
        title={
          appleEnabled
            ? undefined
            : APPLE_SSO_ENABLED
              ? "Connexion Apple desactivee: provider non configure"
              : "Connexion Apple desactivee temporairement"
        }
      >
        <span className="inline-flex items-center gap-2">
          <AppleLogo />
          {loadingProvider === "apple"
            ? "Connexion Apple..."
            : "Continuer avec Apple"}
        </span>
      </Button>
      {error ? <p className="text-xs text-notification">{error}</p> : null}
    </div>
  );
}
