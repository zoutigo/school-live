"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Card } from "../../../components/ui/card";
import {
  FormSubmitHint,
  FormTextInput,
} from "../../../components/ui/form-controls";
import { FormField } from "../../../components/ui/form-field";
import { SubmitButton } from "../../../components/ui/form-buttons";
import { PasswordInput } from "../../../components/ui/password-input";
import { PinInput } from "../../../components/ui/pin-input";
import { useTranslation } from "../../../i18n/useTranslation";

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

function createSetupSchema(t: (key: string) => string) {
  return z
    .object({
      token: z.string().min(16, t("platformCredentials.errors.invalidSession")),
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
            message: t("recovery.password.errors.passwordComplexity"),
          });
        }
        if (
          !value.confirmPassword ||
          value.confirmPassword !== value.newPassword
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["confirmPassword"],
            message: t("platformCredentials.errors.confirmPasswordMismatch"),
          });
        }
      }

      if (value.requiresPhonePin) {
        if (!value.phone || !/^\d{9}$/.test(value.phone)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["phone"],
            message: t("recovery.pin.errors.invalidPhone"),
          });
        }
        if (!value.confirmPhone || value.confirmPhone !== value.phone) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["confirmPhone"],
            message: t("platformCredentials.errors.confirmPhoneMismatch"),
          });
        }
        if (!value.newPin || !/^\d{6}$/.test(value.newPin)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["newPin"],
            message: t("recovery.pin.errors.pinFormat"),
          });
        }
        if (!value.confirmPin || value.confirmPin !== value.newPin) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["confirmPin"],
            message: t("platformCredentials.errors.confirmPinMismatch"),
          });
        }
      }
    });
}

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
  const { locale, t } = useTranslation();
  const setupSchema = useMemo(() => createSetupSchema(t), [locale]);
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
            : (payload?.message ??
              t("platformCredentials.errors.configFailed"));
        setError(String(message));
        return;
      }

      await redirectAfterCompletion();
    } catch {
      setError(t("recovery.password.errors.networkError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-text-primary sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-xl">
        <Card
          title={t("platformCredentials.cardTitle")}
          subtitle={t("platformCredentials.cardSubtitle")}
        >
          <form
            className="grid gap-3"
            onSubmit={form.handleSubmit(onSubmit)}
            noValidate
          >
            {email ? (
              <p className="text-xs text-text-secondary">
                {t("platformCredentials.accountLabel")} {email}
              </p>
            ) : null}

            {requiresPassword ? (
              <>
                <FormField
                  label={t("platformCredentials.fields.newPassword")}
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
                  label={t("platformCredentials.fields.confirmPassword")}
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
                  label={t("platformCredentials.fields.phone")}
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
                      />
                    )}
                  />
                </FormField>
                <FormField
                  label={t("platformCredentials.fields.confirmPhone")}
                  error={form.formState.errors.confirmPhone?.message}
                >
                  <Controller
                    control={form.control}
                    name="confirmPhone"
                    render={({ field }) => (
                      <FormTextInput
                        name={field.name}
                        ref={field.ref}
                        invalid={!!form.formState.errors.confirmPhone}
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
                      />
                    )}
                  />
                </FormField>
                <FormField
                  label={t("platformCredentials.fields.newPin")}
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
                  label={t("platformCredentials.fields.confirmPin")}
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

            <FormSubmitHint visible={!form.formState.isValid} />

            <SubmitButton disabled={saving || !form.formState.isValid}>
              {saving
                ? t("platformCredentials.submit.validating")
                : t("platformCredentials.submit.validate")}
            </SubmitButton>
          </form>
        </Card>
      </div>
    </div>
  );
}
