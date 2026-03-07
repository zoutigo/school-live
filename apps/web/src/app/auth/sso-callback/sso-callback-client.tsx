"use client";

import { useEffect, useMemo, useState } from "react";
import { getSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card } from "../../../components/ui/card";

type ApiErrorPayload = {
  code?: string;
  schoolSlug?: string | null;
  setupToken?: string;
  missingFields?: string[];
  message?:
    | string
    | {
        code?: string;
        schoolSlug?: string | null;
        setupToken?: string;
        missingFields?: string[];
      };
};

type MeResponse = {
  role:
    | "SUPER_ADMIN"
    | "ADMIN"
    | "SALES"
    | "SUPPORT"
    | "SCHOOL_ADMIN"
    | "SCHOOL_MANAGER"
    | "SUPERVISOR"
    | "SCHOOL_ACCOUNTANT"
    | "TEACHER"
    | "PARENT"
    | "STUDENT";
  schoolSlug: string | null;
};

type Props = {
  schoolSlug?: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export function SsoCallbackClient({ schoolSlug }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const cleanSchoolSlug = useMemo(() => {
    if (!schoolSlug) {
      return undefined;
    }
    const trimmed = schoolSlug.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }, [schoolSlug]);

  useEffect(() => {
    let cancelled = false;

    async function completeSsoLogin() {
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

        const response = await fetch(`${API_URL}/auth/sso/login`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: user.provider,
            providerAccountId: user.providerAccountId,
            email: user.email,
            firstName: user.name?.split(" ")[0] ?? undefined,
            lastName: user.name?.split(" ").slice(1).join(" ") || undefined,
            avatarUrl: user.image ?? undefined,
            schoolSlug: cleanSchoolSlug,
          }),
        });

        if (!response.ok) {
          if (response.status === 403) {
            const payload = (await response.json()) as ApiErrorPayload;
            const messageObject =
              typeof payload.message === "object" && payload.message
                ? payload.message
                : null;
            const code = payload.code ?? messageObject?.code ?? null;
            const forcedSchoolSlug =
              payload.schoolSlug ??
              messageObject?.schoolSlug ??
              cleanSchoolSlug ??
              null;
            const setupToken =
              payload.setupToken ?? messageObject?.setupToken ?? null;
            const missingFields =
              payload.missingFields ?? messageObject?.missingFields ?? [];

            if (code === "ACCOUNT_VALIDATION_REQUIRED") {
              const params = new URLSearchParams({ email: user.email });
              if (forcedSchoolSlug) {
                params.set("schoolSlug", forcedSchoolSlug);
              }
              await signOut({ redirect: false });
              router.replace(`/compte-en-attente?${params.toString()}`);
              return;
            }

            if (code === "SSO_PROFILE_COMPLETION_REQUIRED") {
              const params = new URLSearchParams({
                email: user.email,
                provider: user.provider,
                providerAccountId: user.providerAccountId,
              });
              if (forcedSchoolSlug) {
                params.set("schoolSlug", forcedSchoolSlug);
              }
              router.replace(`/auth/completer-profil-sso?${params.toString()}`);
              return;
            }

            if (code === "PLATFORM_CREDENTIAL_SETUP_REQUIRED") {
              const params = new URLSearchParams({ email: user.email });
              if (setupToken) {
                params.set("token", setupToken);
              }
              if (forcedSchoolSlug) {
                params.set("schoolSlug", forcedSchoolSlug);
              }
              if (missingFields.length > 0) {
                params.set("missing", missingFields.join(","));
              }
              await signOut({ redirect: false });
              router.replace(
                `/auth/completer-identifiants-platform?${params.toString()}`,
              );
              return;
            }
          }

          throw new Error("Connexion SSO refusee");
        }

        await signOut({ redirect: false });

        const meResponse = await fetch(`${API_URL}/me`, {
          credentials: "include",
        });
        if (!meResponse.ok) {
          throw new Error("Session invalide apres connexion SSO");
        }

        const me = (await meResponse.json()) as MeResponse;
        if (
          me.role === "SUPER_ADMIN" ||
          me.role === "ADMIN" ||
          me.role === "SALES" ||
          me.role === "SUPPORT"
        ) {
          router.replace("/acceuil");
          return;
        }

        if (!me.schoolSlug) {
          throw new Error("Aucune ecole associee a ce compte");
        }

        router.replace(`/schools/${me.schoolSlug}/dashboard`);
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Erreur SSO");
        }
      }
    }

    void completeSsoLogin();

    return () => {
      cancelled = true;
    };
  }, [cleanSchoolSlug, router]);

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-text-primary sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-xl">
        <Card title="Connexion SSO" subtitle="Finalisation en cours...">
          {error ? (
            <p className="text-sm text-notification">{error}</p>
          ) : (
            <p className="text-sm text-text-secondary">
              Nous finalisons votre connexion, veuillez patienter...
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
