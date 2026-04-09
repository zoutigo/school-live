"use client";

import { useEffect, useState } from "react";
import { getSession, signOut } from "next-auth/react";
import { Card } from "../../../components/ui/card";

type Props = {
  redirectUri?: string;
  schoolSlug?: string;
};

function normalize(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function buildMobileCallbackRedirect(input: {
  redirectUri?: string;
  schoolSlug?: string;
  provider?: string | null;
  providerAccountId?: string | null;
  email?: string | null;
  name?: string | null;
  image?: string | null;
}) {
  const base = normalize(input.redirectUri) ?? "scolive://auth/callback";
  const url = new URL(base);

  const fullName = normalize(input.name);
  const [firstName, ...rest] = fullName ? fullName.split(" ") : [];
  const lastName = rest.join(" ").trim();

  if (normalize(input.provider)) {
    url.searchParams.set("provider", normalize(input.provider)!);
  }
  if (normalize(input.providerAccountId)) {
    url.searchParams.set(
      "providerAccountId",
      normalize(input.providerAccountId)!,
    );
  }
  if (normalize(input.email)) {
    url.searchParams.set("email", normalize(input.email)!);
  }
  if (normalize(firstName)) {
    url.searchParams.set("firstName", normalize(firstName)!);
  }
  if (normalize(lastName)) {
    url.searchParams.set("lastName", normalize(lastName)!);
  }
  if (normalize(input.image)) {
    url.searchParams.set("avatarUrl", normalize(input.image)!);
  }
  if (normalize(input.schoolSlug)) {
    url.searchParams.set("schoolSlug", normalize(input.schoolSlug)!);
  }

  return url.toString();
}

function buildErrorRedirect(input: { redirectUri?: string; message: string }) {
  const base = normalize(input.redirectUri) ?? "scolive://auth/callback";
  const url = new URL(base);
  url.searchParams.set("error", "GOOGLE_SSO_CALLBACK_FAILED");
  url.searchParams.set("message", input.message);
  return url.toString();
}

export function MobileSsoCallbackClient({ redirectUri, schoolSlug }: Props) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function completeMobileSso() {
      try {
        const session = await getSession();
        const user = session?.user as
          | {
              email?: string | null;
              name?: string | null;
              image?: string | null;
              provider?: string | null;
              providerAccountId?: string | null;
            }
          | undefined;

        if (!user?.email || !user.provider || !user.providerAccountId) {
          throw new Error("Session SSO incomplete");
        }

        const targetUrl = buildMobileCallbackRedirect({
          redirectUri,
          schoolSlug,
          provider: user.provider,
          providerAccountId: user.providerAccountId,
          email: user.email,
          name: user.name,
          image: user.image,
        });

        await signOut({ redirect: false });
        window.location.replace(targetUrl);
      } catch (cause) {
        const message =
          cause instanceof Error
            ? cause.message
            : "Connexion Google interrompue.";

        if (!cancelled) {
          setError(message);
          window.location.replace(
            buildErrorRedirect({
              redirectUri,
              message,
            }),
          );
        }
      }
    }

    void completeMobileSso();

    return () => {
      cancelled = true;
    };
  }, [redirectUri, schoolSlug]);

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-text-primary sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-xl">
        <Card title="Connexion Google" subtitle="Retour vers l'application...">
          {error ? (
            <p className="text-sm text-notification">{error}</p>
          ) : (
            <p className="text-sm text-text-secondary">
              Nous finalisons votre connexion mobile...
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
