"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { getSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Card } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { PasswordField } from "../../../components/ui/password-field";

type Role =
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

type MeResponse = {
  role: Role;
  schoolSlug: string | null;
};

type SsoOptionsResponse = {
  success: boolean;
  firstName: string;
  lastName: string;
  gender: "M" | "F" | "OTHER" | null;
  phone: string | null;
  schoolSlug: string | null;
  missingFields: string[];
  needsProfileCompletion: boolean;
};

type Props = {
  schoolSlug?: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
const ssoCompletionSchema = z.object({
  firstName: z.string().trim().min(1, "Prenom requis."),
  lastName: z.string().trim().min(1, "Nom requis."),
  gender: z.enum(["M", "F", "OTHER"]),
  phone: z.string().regex(/^\d{9}$/, "Numero invalide (9 chiffres attendus)."),
  newPin: z
    .string()
    .regex(/^\d{6}$/, "Le PIN doit contenir exactement 6 chiffres."),
});

function normalizePhoneInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("237") && digits.length >= 12) {
    return digits.slice(3, 12);
  }
  return digits.slice(0, 9);
}

function toLocalPhoneDisplay(value: string | null | undefined) {
  if (!value) {
    return "";
  }
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("237") && digits.length >= 12) {
    return digits.slice(3, 12);
  }
  return digits.slice(0, 9);
}

export function SsoProfileCompletionClient({ schoolSlug }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [provider, setProvider] = useState<"GOOGLE" | "APPLE" | null>(null);
  const [providerAccountId, setProviderAccountId] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState<"M" | "F" | "OTHER">("M");
  const [phone, setPhone] = useState("");
  const [newPin, setNewPin] = useState("");
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [firstNameTouched, setFirstNameTouched] = useState(false);
  const [lastNameTouched, setLastNameTouched] = useState(false);
  const [genderTouched, setGenderTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [newPinTouched, setNewPinTouched] = useState(false);

  const cleanSchoolSlug = useMemo(() => {
    if (!schoolSlug) {
      return undefined;
    }
    const trimmed = schoolSlug.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }, [schoolSlug]);
  const completionValidation = useMemo(
    () =>
      ssoCompletionSchema.safeParse({
        firstName,
        lastName,
        gender,
        phone,
        newPin,
      }),
    [firstName, lastName, gender, phone, newPin],
  );
  const completionDirty =
    firstName.length > 0 ||
    lastName.length > 0 ||
    phone.length > 0 ||
    newPin.length > 0;
  const completionErrors = useMemo(() => {
    if (completionValidation.success) {
      return {} as Partial<
        Record<"firstName" | "lastName" | "gender" | "phone" | "newPin", string>
      >;
    }
    return completionValidation.error.issues.reduce(
      (accumulator, issue) => {
        const key = issue.path[0];
        if (
          (key === "firstName" ||
            key === "lastName" ||
            key === "gender" ||
            key === "phone" ||
            key === "newPin") &&
          !accumulator[key]
        ) {
          accumulator[key] = issue.message;
        }
        return accumulator;
      },
      {} as Partial<
        Record<"firstName" | "lastName" | "gender" | "phone" | "newPin", string>
      >,
    );
  }, [completionValidation]);

  async function finalizeAppSession(input: {
    provider: "GOOGLE" | "APPLE";
    providerAccountId: string;
    email: string;
  }) {
    const response = await fetch(`${API_URL}/auth/sso/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: input.provider,
        providerAccountId: input.providerAccountId,
        email: input.email,
        firstName,
        lastName,
        schoolSlug: cleanSchoolSlug,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
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
      } | null;
      const messageObj =
        payload && typeof payload.message === "object" ? payload.message : null;
      const code = payload?.code ?? messageObj?.code ?? null;
      const forcedSchoolSlug =
        payload?.schoolSlug ??
        messageObj?.schoolSlug ??
        cleanSchoolSlug ??
        null;
      const setupToken =
        payload?.setupToken ??
        (messageObj as { setupToken?: string } | null)?.setupToken ??
        null;
      const missingFields =
        payload?.missingFields ??
        (messageObj as { missingFields?: string[] } | null)?.missingFields ??
        [];

      if (code === "ACCOUNT_VALIDATION_REQUIRED") {
        const params = new URLSearchParams({ email: input.email });
        if (forcedSchoolSlug) {
          params.set("schoolSlug", forcedSchoolSlug);
        }
        await signOut({ redirect: false });
        router.replace(`/compte-en-attente?${params.toString()}`);
        return;
      }

      if (code === "PLATFORM_CREDENTIAL_SETUP_REQUIRED") {
        const params = new URLSearchParams({ email: input.email });
        if (forcedSchoolSlug) {
          params.set("schoolSlug", forcedSchoolSlug);
        }
        if (setupToken) {
          params.set("token", setupToken);
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

      throw new Error("Connexion SSO impossible apres completion du profil.");
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
  }

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const session = await getSession();
        const user = session?.user as
          | {
              email?: string | null;
              provider?: string | null;
              providerAccountId?: string | null;
            }
          | undefined;

        if (!user?.email || !user.provider || !user.providerAccountId) {
          throw new Error("Session SSO incomplete");
        }

        const normalizedProvider = user.provider as "GOOGLE" | "APPLE";

        if (!cancelled) {
          setEmail(user.email);
          setProvider(normalizedProvider);
          setProviderAccountId(user.providerAccountId);
        }

        const optionsResponse = await fetch(
          `${API_URL}/auth/sso/profile/options`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              provider: normalizedProvider,
              providerAccountId: user.providerAccountId,
              email: user.email,
            }),
          },
        );

        if (!optionsResponse.ok) {
          throw new Error(
            "Impossible de charger les informations de profil SSO",
          );
        }

        const options = (await optionsResponse.json()) as SsoOptionsResponse;

        if (!cancelled) {
          setFirstName(options.firstName ?? "");
          setLastName(options.lastName ?? "");
          setGender(options.gender ?? "M");
          setPhone(toLocalPhoneDisplay(options.phone));
          setMissingFields(options.missingFields ?? []);
        }

        if (!options.needsProfileCompletion) {
          await finalizeAppSession({
            provider: normalizedProvider,
            providerAccountId: user.providerAccountId,
            email: user.email,
          });
          return;
        }
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Erreur");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [cleanSchoolSlug, router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!provider || !providerAccountId || !email) {
      setError("Session SSO invalide.");
      return;
    }

    const parsed = ssoCompletionSchema.safeParse({
      firstName,
      lastName,
      gender,
      phone,
      newPin,
    });
    if (!parsed.success) {
      setFirstNameTouched(true);
      setLastNameTouched(true);
      setGenderTouched(true);
      setPhoneTouched(true);
      setNewPinTouched(true);
      setError(parsed.error.issues[0]?.message ?? "Formulaire invalide.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/auth/sso/profile/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          providerAccountId,
          email,
          firstName: parsed.data.firstName,
          lastName: parsed.data.lastName,
          gender: parsed.data.gender,
          phone: parsed.data.phone,
          schoolSlug: cleanSchoolSlug,
          newPin: parsed.data.newPin,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          payload?.message && Array.isArray(payload.message)
            ? payload.message.join(", ")
            : (payload?.message ?? "Completion du profil impossible.");
        throw new Error(String(message));
      }

      await finalizeAppSession({ provider, providerAccountId, email });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card
      title="Completer votre profil"
      subtitle="Certaines informations sont requises avant la premiere connexion"
      className="mx-auto max-w-2xl"
    >
      {loading ? (
        <p className="text-sm text-text-secondary">Chargement...</p>
      ) : (
        <form className="grid gap-3" onSubmit={onSubmit} noValidate>
          <div className="rounded-card border border-border bg-background px-3 py-2 text-xs text-text-secondary">
            Finalisez votre profil SSO pour securiser l acces a votre compte.
          </div>

          <label className="grid gap-1 text-sm">
            <span className="text-text-secondary">Prenom</span>
            <input
              value={firstName}
              onChange={(event) => {
                setFirstName(event.target.value);
                setFirstNameTouched(true);
              }}
              className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
            />
            {firstNameTouched && completionErrors.firstName ? (
              <span className="text-xs text-notification">
                {completionErrors.firstName}
              </span>
            ) : null}
          </label>

          <label className="grid gap-1 text-sm">
            <span className="text-text-secondary">Nom</span>
            <input
              value={lastName}
              onChange={(event) => {
                setLastName(event.target.value);
                setLastNameTouched(true);
              }}
              className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
            />
            {lastNameTouched && completionErrors.lastName ? (
              <span className="text-xs text-notification">
                {completionErrors.lastName}
              </span>
            ) : null}
          </label>

          <label className="grid gap-1 text-sm">
            <span className="text-text-secondary">Genre</span>
            <select
              value={gender}
              onChange={(event) => {
                setGender(event.target.value as "M" | "F" | "OTHER");
                setGenderTouched(true);
              }}
              className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="M">Masculin</option>
              <option value="F">Feminin</option>
              <option value="OTHER">Autre</option>
            </select>
            {genderTouched && completionErrors.gender ? (
              <span className="text-xs text-notification">
                {completionErrors.gender}
              </span>
            ) : null}
          </label>

          <label className="grid gap-1 text-sm">
            <span className="text-text-secondary">Telephone</span>
            <input
              value={phone}
              onChange={(event) => {
                setPhone(normalizePhoneInput(event.target.value));
                setPhoneTouched(true);
              }}
              placeholder="6XXXXXXXX"
              className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
            />
            {phoneTouched && completionErrors.phone ? (
              <span className="text-xs text-notification">
                {completionErrors.phone}
              </span>
            ) : null}
          </label>

          <label className="grid gap-1 text-sm">
            <span className="text-text-secondary">PIN (6 chiffres)</span>
            <PasswordField
              value={newPin}
              onChange={(event) => {
                setNewPin(event.target.value);
                setNewPinTouched(true);
              }}
              placeholder="123456"
              className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
            />
            {newPinTouched && completionErrors.newPin ? (
              <span className="text-xs text-notification">
                {completionErrors.newPin}
              </span>
            ) : null}
          </label>

          {missingFields.length > 0 ? (
            <p className="text-xs text-text-secondary">
              Champs manquants detectes: {missingFields.join(", ")}
            </p>
          ) : null}

          {error ? <p className="text-sm text-notification">{error}</p> : null}

          <Button
            type="submit"
            disabled={saving || !completionDirty || !completionValidation.success}
          >
            {saving ? "Enregistrement..." : "Finaliser mon profil"}
          </Button>
        </form>
      )}
    </Card>
  );
}
