"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { getSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Card } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import {
  FormSelect,
  FormSubmitHint,
  FormTextInput,
} from "../../../components/ui/form-controls";
import { FormField } from "../../../components/ui/form-field";
import { PinInput } from "../../../components/ui/pin-input";

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
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const form = useForm<
    z.input<typeof ssoCompletionSchema>,
    unknown,
    z.output<typeof ssoCompletionSchema>
  >({
    resolver: zodResolver(ssoCompletionSchema),
    mode: "onChange",
    defaultValues: {
      firstName: "",
      lastName: "",
      gender: "M",
      phone: "",
      newPin: "",
    },
  });
  const resetForm = form.reset;

  const cleanSchoolSlug = useMemo(() => {
    if (!schoolSlug) {
      return undefined;
    }
    const trimmed = schoolSlug.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }, [schoolSlug]);

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
        firstName: form.getValues("firstName"),
        lastName: form.getValues("lastName"),
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
          resetForm({
            firstName: options.firstName ?? "",
            lastName: options.lastName ?? "",
            gender: options.gender ?? "M",
            phone: toLocalPhoneDisplay(options.phone),
            newPin: "",
          });
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
  }, [cleanSchoolSlug, resetForm, router]);

  async function onSubmit(values: z.output<typeof ssoCompletionSchema>) {
    setError(null);

    if (!provider || !providerAccountId || !email) {
      setError("Session SSO invalide.");
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
          firstName: values.firstName,
          lastName: values.lastName,
          gender: values.gender,
          phone: values.phone,
          schoolSlug: cleanSchoolSlug,
          newPin: values.newPin,
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
        <form
          className="grid gap-3"
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
        >
          <div className="rounded-card border border-border bg-background px-3 py-2 text-xs text-text-secondary">
            Finalisez votre profil SSO pour securiser l acces a votre compte.
          </div>

          <FormField
            label="Prenom"
            error={form.formState.errors.firstName?.message}
          >
            <Controller
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormTextInput
                  name={field.name}
                  ref={field.ref}
                  invalid={!!form.formState.errors.firstName}
                  value={field.value ?? ""}
                  onChange={(event) => field.onChange(event.target.value)}
                  onBlur={field.onBlur}
                />
              )}
            />
          </FormField>

          <FormField
            label="Nom"
            error={form.formState.errors.lastName?.message}
          >
            <Controller
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormTextInput
                  name={field.name}
                  ref={field.ref}
                  invalid={!!form.formState.errors.lastName}
                  value={field.value ?? ""}
                  onChange={(event) => field.onChange(event.target.value)}
                  onBlur={field.onBlur}
                />
              )}
            />
          </FormField>

          <FormField
            label="Genre"
            error={form.formState.errors.gender?.message}
          >
            <Controller
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormSelect
                  name={field.name}
                  ref={field.ref}
                  invalid={!!form.formState.errors.gender}
                  value={field.value ?? "M"}
                  onChange={(event) =>
                    field.onChange(event.target.value as "M" | "F" | "OTHER")
                  }
                  onBlur={field.onBlur}
                >
                  <option value="M">Masculin</option>
                  <option value="F">Feminin</option>
                  <option value="OTHER">Autre</option>
                </FormSelect>
              )}
            />
          </FormField>

          <FormField
            label="Telephone"
            error={form.formState.errors.phone?.message}
          >
            <Controller
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormTextInput
                  name={field.name}
                  ref={field.ref}
                  invalid={!!form.formState.errors.phone}
                  value={field.value ?? ""}
                  onChange={(event) =>
                    field.onChange(normalizePhoneInput(event.target.value))
                  }
                  onBlur={field.onBlur}
                  placeholder="6XXXXXXXX"
                />
              )}
            />
          </FormField>

          <FormField
            label="PIN (6 chiffres)"
            error={form.formState.errors.newPin?.message}
          >
            <Controller
              control={form.control}
              name="newPin"
              render={({ field }) => (
                <PinInput
                  name={field.name}
                  value={field.value ?? ""}
                  onChange={(event) =>
                    field.onChange(
                      event.target.value.replace(/\D/g, "").slice(0, 6),
                    )
                  }
                  onBlur={field.onBlur}
                  placeholder="123456"
                />
              )}
            />
          </FormField>

          {missingFields.length > 0 ? (
            <p className="text-xs text-text-secondary">
              Champs manquants detectes: {missingFields.join(", ")}
            </p>
          ) : null}

          {error ? <p className="text-sm text-notification">{error}</p> : null}
          <FormSubmitHint visible={!form.formState.isValid} />

          <Button type="submit" disabled={saving || !form.formState.isValid}>
            {saving ? "Enregistrement..." : "Finaliser mon profil"}
          </Button>
        </form>
      )}
    </Card>
  );
}
