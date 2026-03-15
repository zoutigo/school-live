"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Card } from "../../../components/ui/card";
import { FormField } from "../../../components/ui/form-field";
import { SubmitButton } from "../../../components/ui/form-buttons";
import { PasswordInput } from "../../../components/ui/password-input";
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

type Props = {
  token?: string;
  email?: string;
  phone?: string;
  schoolSlug?: string;
  missing?: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

const setupSchema = z
  .object({
    token: z.string().min(16, "Session invalide."),
    requiresPassword: z.boolean(),
    requiresPhonePin: z.boolean(),
    newPassword: z.string().optional(),
    confirmPassword: z.string().optional(),
    phone: z.string().optional(),
    confirmPhone: z.string().optional(),
    newPin: z.string().optional(),
    confirmPin: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.requiresPassword) {
      if (
        !value.newPassword ||
        !PASSWORD_COMPLEXITY_REGEX.test(value.newPassword)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["newPassword"],
          message:
            "Le mot de passe doit contenir au moins 8 caracteres avec majuscules, minuscules et chiffres.",
        });
      }
      if (
        !value.confirmPassword ||
        value.confirmPassword !== value.newPassword
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["confirmPassword"],
          message: "La confirmation du mot de passe ne correspond pas.",
        });
      }
    }

    if (value.requiresPhonePin) {
      if (!value.phone || !/^\d{9}$/.test(value.phone)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["phone"],
          message: "Numero invalide (9 chiffres attendus).",
        });
      }
      if (!value.confirmPhone || value.confirmPhone !== value.phone) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["confirmPhone"],
          message: "La confirmation du telephone ne correspond pas.",
        });
      }
      if (!value.newPin || !/^\d{6}$/.test(value.newPin)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["newPin"],
          message: "Le PIN doit contenir exactement 6 chiffres.",
        });
      }
      if (!value.confirmPin || value.confirmPin !== value.newPin) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["confirmPin"],
          message: "La confirmation du PIN ne correspond pas.",
        });
      }
    }
  });

function normalizePhoneInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("237") && digits.length >= 12) {
    return digits.slice(3, 12);
  }
  return digits.slice(0, 9);
}

export function PlatformCredentialsCompletionClient({
  token,
  email,
  phone,
  schoolSlug,
  missing,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const missingFields = useMemo(
    () =>
      (missing ?? "")
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean),
    [missing],
  );
  const requiresPassword = missingFields.includes("PASSWORD");
  const requiresPhonePin = missingFields.includes("PHONE_PIN");
  const form = useForm<
    z.input<typeof setupSchema>,
    unknown,
    z.output<typeof setupSchema>
  >({
    resolver: zodResolver(setupSchema),
    mode: "onChange",
    defaultValues: {
      token: token ?? "",
      requiresPassword,
      requiresPhonePin,
      newPassword: "",
      confirmPassword: "",
      phone: normalizePhoneInput(phone ?? ""),
      confirmPhone: "",
      newPin: "",
      confirmPin: "",
    },
  });

  useEffect(() => {
    form.setValue("token", token ?? "", {
      shouldDirty: false,
      shouldValidate: true,
    });
    form.setValue("requiresPassword", requiresPassword, {
      shouldDirty: false,
      shouldValidate: true,
    });
    form.setValue("requiresPhonePin", requiresPhonePin, {
      shouldDirty: false,
      shouldValidate: true,
    });
  }, [form, requiresPassword, requiresPhonePin, token]);

  async function redirectAfterCompletion() {
    const meResponse = await fetch(`${API_URL}/me`, {
      credentials: "include",
    });
    if (!meResponse.ok) {
      router.replace("/");
      return;
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

    if (me.schoolSlug) {
      router.replace(`/schools/${me.schoolSlug}/dashboard`);
      return;
    }

    router.replace(schoolSlug ? `/schools/${schoolSlug}/dashboard` : "/");
  }

  async function onSubmit(values: z.output<typeof setupSchema>) {
    setError(null);

    setSaving(true);
    try {
      const response = await fetch(
        `${API_URL}/auth/platform-credentials/complete`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: values.token,
            newPassword: requiresPassword ? values.newPassword : undefined,
            phone: requiresPhonePin ? values.phone : undefined,
            newPin: requiresPhonePin ? values.newPin : undefined,
          }),
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          payload?.message && Array.isArray(payload.message)
            ? payload.message.join(", ")
            : (payload?.message ?? "Configuration impossible.");
        setError(String(message));
        return;
      }

      await redirectAfterCompletion();
    } catch {
      setError("Erreur reseau.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-text-primary sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-xl">
        <Card
          title="Completer vos identifiants"
          subtitle="Pour securiser votre acces, renseignez les informations manquantes."
        >
          <form
            className="grid gap-3"
            onSubmit={form.handleSubmit(onSubmit)}
            noValidate
          >
            {email ? (
              <p className="text-xs text-text-secondary">Compte: {email}</p>
            ) : null}

            {requiresPassword ? (
              <>
                <FormField
                  label="Nouveau mot de passe"
                  error={form.formState.errors.newPassword?.message}
                >
                  <Controller
                    control={form.control}
                    name="newPassword"
                    render={({ field }) => (
                      <PasswordInput
                        name={field.name}
                        value={field.value ?? ""}
                        onChange={(event) =>
                          form.setValue("newPassword", event.target.value, {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                          })
                        }
                        onBlur={field.onBlur}
                      />
                    )}
                  />
                </FormField>
                <FormField
                  label="Confirmer le mot de passe"
                  error={form.formState.errors.confirmPassword?.message}
                >
                  <Controller
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <PasswordInput
                        name={field.name}
                        value={field.value ?? ""}
                        onChange={(event) =>
                          form.setValue("confirmPassword", event.target.value, {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                          })
                        }
                        onBlur={field.onBlur}
                      />
                    )}
                  />
                </FormField>
              </>
            ) : null}

            {requiresPhonePin ? (
              <>
                <FormField
                  label="Telephone"
                  error={form.formState.errors.phone?.message}
                >
                  <Controller
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <input
                        name={field.name}
                        ref={field.ref}
                        type="text"
                        value={field.value ?? ""}
                        onChange={(event) =>
                          form.setValue(
                            "phone",
                            normalizePhoneInput(event.target.value),
                            {
                              shouldDirty: true,
                              shouldTouch: true,
                              shouldValidate: true,
                            },
                          )
                        }
                        onBlur={field.onBlur}
                        placeholder="6XXXXXXXX"
                        className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                      />
                    )}
                  />
                </FormField>
                <FormField
                  label="Confirmer le telephone"
                  error={form.formState.errors.confirmPhone?.message}
                >
                  <Controller
                    control={form.control}
                    name="confirmPhone"
                    render={({ field }) => (
                      <input
                        name={field.name}
                        ref={field.ref}
                        type="text"
                        value={field.value ?? ""}
                        onChange={(event) =>
                          form.setValue(
                            "confirmPhone",
                            normalizePhoneInput(event.target.value),
                            {
                              shouldDirty: true,
                              shouldTouch: true,
                              shouldValidate: true,
                            },
                          )
                        }
                        onBlur={field.onBlur}
                        placeholder="6XXXXXXXX"
                        className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                      />
                    )}
                  />
                </FormField>
                <FormField
                  label="Nouveau PIN (6 chiffres)"
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
                          form.setValue(
                            "newPin",
                            event.target.value.replace(/\D/g, "").slice(0, 6),
                            {
                              shouldDirty: true,
                              shouldTouch: true,
                              shouldValidate: true,
                            },
                          )
                        }
                        onBlur={field.onBlur}
                        maxLength={6}
                      />
                    )}
                  />
                </FormField>
                <FormField
                  label="Confirmer le PIN"
                  error={form.formState.errors.confirmPin?.message}
                >
                  <Controller
                    control={form.control}
                    name="confirmPin"
                    render={({ field }) => (
                      <PinInput
                        name={field.name}
                        value={field.value ?? ""}
                        onChange={(event) =>
                          form.setValue(
                            "confirmPin",
                            event.target.value.replace(/\D/g, "").slice(0, 6),
                            {
                              shouldDirty: true,
                              shouldTouch: true,
                              shouldValidate: true,
                            },
                          )
                        }
                        onBlur={field.onBlur}
                        maxLength={6}
                      />
                    )}
                  />
                </FormField>
              </>
            ) : null}

            {error ? (
              <p className="text-sm text-notification">{error}</p>
            ) : null}

            <SubmitButton disabled={saving || !form.formState.isValid}>
              {saving ? "Validation..." : "Valider"}
            </SubmitButton>
          </form>
        </Card>
      </div>
    </div>
  );
}
