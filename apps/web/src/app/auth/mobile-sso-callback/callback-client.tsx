"use client";

import { useEffect, useRef, useState } from "react";
import { getSession, signOut } from "next-auth/react";
import { Card } from "../../../components/ui/card";
import { useTranslation } from "../../../i18n/useTranslation";

const MANUAL_FALLBACK_DELAY_MS = 1200;

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
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [manualUrl, setManualUrl] = useState<string | null>(null);
  const manualLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    let cancelled = false;
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;

    function attemptRedirect(targetUrl: string) {
      if (cancelled) return;
      window.location.replace(targetUrl);
      // Recent Chrome versions silently drop a script-initiated navigation
      // to a non-http(s) scheme once the OAuth round-trip has consumed the
      // original tap's "user activation" window. When that happens the tab
      // just sits here forever, so we surface a real tappable link (a
      // genuine click always carries fresh user activation) as a fallback.
      fallbackTimer = setTimeout(() => {
        if (!cancelled) setManualUrl(targetUrl);
      }, MANUAL_FALLBACK_DELAY_MS);
    }

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
        if (cancelled) return;
        attemptRedirect(targetUrl);
      } catch (cause) {
        const message =
          cause instanceof Error
            ? cause.message
            : "Connexion Google interrompue.";

        if (!cancelled) {
          setError(message);
          attemptRedirect(
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
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, [redirectUri, schoolSlug]);

  useEffect(() => {
    if (manualUrl) {
      manualLinkRef.current?.focus();
    }
  }, [manualUrl]);

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-text-primary sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-xl">
        <Card
          title={t("sso.mobileCallback.title")}
          subtitle={t("sso.mobileCallback.loading")}
        >
          {error ? (
            <p className="text-sm text-notification">{error}</p>
          ) : (
            <p className="text-sm text-text-secondary">
              {t("sso.mobileCallback.finalizing")}
            </p>
          )}
          {manualUrl ? (
            <div className="mt-4 flex flex-col items-start gap-2">
              <p className="text-sm text-text-secondary">
                {t("sso.mobileCallback.manualPrompt")}
              </p>
              <a
                ref={manualLinkRef}
                href={manualUrl}
                className="inline-flex items-center justify-center rounded-card bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-dark"
              >
                {t("sso.mobileCallback.manualAction")}
              </a>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
