"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { BackLinkButton } from "../../components/ui/back-link-button";
import { Card } from "../../components/ui/card";
import { EmailInput } from "../../components/ui/email-input";
import {
  FormSubmitHint,
  FormTextInput,
} from "../../components/ui/form-controls";
import { FormField } from "../../components/ui/form-field";
import { PinInput } from "../../components/ui/pin-input";
import { Button } from "../../components/ui/button";
import { useTranslation } from "../../i18n/useTranslation";

type ActivationStartResponse = {
  success: boolean;
  activationRequired?: boolean;
  schoolSlug?: string | null;
  maskedEmail?: string;
  hasPhoneCredential?: boolean;
  methods?: string[];
  hasPendingActivationCode?: boolean;
};

type Props = {
  initialEmail?: string;
  initialPhone?: string;
  initialSchoolSlug?: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

function createActivationFormSchema(t: (key: string) => string) {
  return z
    .object({
      email: z.string().trim().optional().default(""),
      phone: z.string().trim().optional().default(""),
      schoolSlug: z.string().trim().optional().default(""),
      confirmedPhone: z
        .string()
        .regex(/^\d{9}$/, t("recovery.pin.errors.invalidPhone")),
      newPin: z
        .string()
        .regex(/^\d{6}$/, t("pendingAccount.errors.newPinFormat")),
      activationCode: z.string().trim().optional().default(""),
      initialPin: z.string().trim().optional().default(""),
    })
    .superRefine((value, ctx) => {
      if (!value.activationCode && !value.initialPin) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["activationCode"],
          message: t("pendingAccount.errors.activationMethodRequired"),
        });
      }
      if (value.email && !z.string().email().safeParse(value.email).success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["email"],
          message: t("recovery.password.errors.invalidEmail"),
        });
      }
      if (value.phone && !/^\d{9}$/.test(value.phone)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["phone"],
          message: t("recovery.pin.errors.invalidPhone"),
        });
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

export function PendingAccountClient({
  initialEmail,
  initialPhone,
  initialSchoolSlug,
}: Props) {
  const router = useRouter();
  const { locale, t } = useTranslation();
  const activationFormSchema = useMemo(
    () => createActivationFormSchema(t),
    [locale],
  );
  const [context, setContext] = useState<ActivationStartResponse | null>(null);
  const [loadingContext, setLoadingContext] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const form = useForm<
    z.input<typeof activationFormSchema>,
    unknown,
    z.output<typeof activationFormSchema>
  >({
    resolver: zodResolver(activationFormSchema),
    mode: "onChange",
    defaultValues: {
      email: initialEmail ?? "",
      phone: initialPhone ?? "",
      schoolSlug: initialSchoolSlug ?? "",
      confirmedPhone: initialPhone ?? "",
      newPin: "",
      activationCode: "",
      initialPin: "",
    },
  });
  const email = form.watch("email");
  const phone = form.watch("phone");
  const schoolSlug = form.watch("schoolSlug");
  const activationCode = form.watch("activationCode");
  const initialPin = form.watch("initialPin");

  const canLoadContext = useMemo(
    () => (email ?? "").trim().length > 0 || (phone ?? "").trim().length > 0,
    [email, phone],
  );
  const { errors, isValid, touchedFields, submitCount } = form.formState;
  const activationMethodError =
    touchedFields.activationCode || touchedFields.initialPin || submitCount > 0
      ? (errors.activationCode?.message ??
        (!activationCode && !initialPin
          ? t("pendingAccount.errors.activationMethodRequired")
          : null))
      : null;
  useEffect(() => {
    if (!canLoadContext) {
      setLoadingContext(false);
      return;
    }

    let cancelled = false;

    async function loadContext() {
      setLoadingContext(true);
      setError(null);
      try {
        const response = await fetch(`${API_URL}/auth/activation/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email || undefined,
            phone: phone || undefined,
            schoolSlug: schoolSlug || undefined,
          }),
        });

        if (!response.ok) {
          throw new Error(t("pendingAccount.errors.loadOptionsFailed"));
        }

        const payload = (await response.json()) as ActivationStartResponse;
        if (!cancelled) {
          setContext(payload);
          if (payload.schoolSlug && !schoolSlug) {
            form.setValue("schoolSlug", payload.schoolSlug, {
              shouldValidate: true,
            });
          }
        }
      } catch (cause) {
        if (!cancelled) {
          setError(
            cause instanceof Error
              ? cause.message
              : t("pendingAccount.errors.loadError"),
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingContext(false);
        }
      }
    }

    void loadContext();

    return () => {
      cancelled = true;
    };
  }, [canLoadContext, email, form, phone, schoolSlug]);

  async function onSubmit(values: z.infer<typeof activationFormSchema>) {
    setError(null);
    setSuccess(null);

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/auth/activation/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.email || undefined,
          phone: values.phone || undefined,
          schoolSlug: values.schoolSlug || undefined,
          confirmedPhone: values.confirmedPhone,
          newPin: values.newPin,
          activationCode: values.activationCode || undefined,
          initialPin: values.initialPin || undefined,
        }),
      });

      const payload = (await response.json().catch(() => null)) as {
        schoolSlug?: string | null;
        message?: string;
      } | null;

      if (!response.ok) {
        const fallbackMessage = t("pendingAccount.errors.activationFailed");
        setError(payload?.message ?? fallbackMessage);
        return;
      }

      setSuccess(t("pendingAccount.success.activated"));
      const targetSchoolSlug = payload?.schoolSlug ?? (schoolSlug || null);
      const target = targetSchoolSlug
        ? `/schools/${targetSchoolSlug}/login`
        : "/";
      window.setTimeout(() => {
        router.replace(target);
      }, 1200);
    } catch {
      setError(t("recovery.password.errors.networkError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background px-4 py-8 text-text-primary sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute -left-24 -top-12 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 right-0 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />

      <div className="relative mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card
          title={t("pendingAccount.cardLeft.title")}
          subtitle={t("pendingAccount.cardLeft.subtitle")}
        >
          <p className="text-sm text-text-secondary">
            {t("pendingAccount.cardLeft.description")}
          </p>

          <div className="mt-4 grid gap-2 rounded-card border border-border bg-background p-3 text-sm">
            <p>
              <span className="text-text-secondary">
                {t("pendingAccount.info.account")}
              </span>{" "}
              <span className="font-semibold">
                {context?.maskedEmail ?? (email || "-")}
              </span>
            </p>
            <p>
              <span className="text-text-secondary">
                {t("pendingAccount.info.school")}
              </span>{" "}
              <span className="font-semibold">
                {schoolSlug || context?.schoolSlug || "-"}
              </span>
            </p>
            <p>
              <span className="text-text-secondary">
                {t("pendingAccount.info.methods")}
              </span>{" "}
              <span className="font-semibold">
                {t("pendingAccount.info.methodsValue")}
              </span>
            </p>
          </div>

          <BackLinkButton
            href={schoolSlug ? `/schools/${schoolSlug}/login` : "/"}
            className="mt-4"
          >
            {t("recovery.password.backToLogin")}
          </BackLinkButton>
        </Card>

        <Card
          title={t("pendingAccount.cardRight.title")}
          subtitle={t("pendingAccount.cardRight.subtitle")}
        >
          {loadingContext ? (
            <p className="text-sm text-text-secondary">{t("common.loading")}</p>
          ) : (
            <form className="grid gap-3" onSubmit={form.handleSubmit(onSubmit)}>
              <FormField
                label={t("pendingAccount.fields.email")}
                error={
                  touchedFields.email || submitCount > 0
                    ? (errors.email?.message ?? null)
                    : null
                }
              >
                <Controller
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <EmailInput
                      name={field.name}
                      value={field.value}
                      onChange={(event) =>
                        form.setValue("email", event.target.value, {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        })
                      }
                      onBlur={field.onBlur}
                      placeholder={t("pendingAccount.placeholders.email")}
                    />
                  )}
                />
              </FormField>

              <FormField
                label={t("pendingAccount.fields.accountPhone")}
                error={
                  touchedFields.phone || submitCount > 0
                    ? (errors.phone?.message ?? null)
                    : null
                }
              >
                <Controller
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormTextInput
                      name={field.name}
                      ref={field.ref}
                      invalid={
                        !!errors.phone &&
                        (touchedFields.phone || submitCount > 0)
                      }
                      value={field.value}
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
                      placeholder={t("pendingAccount.placeholders.phone")}
                    />
                  )}
                />
              </FormField>

              <FormField
                label={t("pendingAccount.fields.confirmedPhone")}
                error={
                  touchedFields.confirmedPhone || submitCount > 0
                    ? (errors.confirmedPhone?.message ?? null)
                    : null
                }
              >
                <Controller
                  control={form.control}
                  name="confirmedPhone"
                  render={({ field }) => (
                    <FormTextInput
                      name={field.name}
                      ref={field.ref}
                      invalid={
                        !!errors.confirmedPhone &&
                        (touchedFields.confirmedPhone || submitCount > 0)
                      }
                      required
                      value={field.value}
                      onChange={(event) =>
                        form.setValue(
                          "confirmedPhone",
                          normalizePhoneInput(event.target.value),
                          {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                          },
                        )
                      }
                      onBlur={field.onBlur}
                      placeholder={t("pendingAccount.placeholders.phone")}
                    />
                  )}
                />
              </FormField>

              <FormField
                label={t("pendingAccount.fields.activationCode")}
                error={activationMethodError}
              >
                <Controller
                  control={form.control}
                  name="activationCode"
                  render={({ field }) => (
                    <FormTextInput
                      name={field.name}
                      ref={field.ref}
                      invalid={!!activationMethodError}
                      value={field.value}
                      onChange={(event) => {
                        form.setValue("activationCode", event.target.value, {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        });
                        void form.trigger();
                      }}
                      onBlur={field.onBlur}
                      placeholder={t(
                        "pendingAccount.placeholders.activationCode",
                      )}
                    />
                  )}
                />
              </FormField>

              <FormField
                label={t("pendingAccount.fields.initialPin")}
                error={activationMethodError}
              >
                <Controller
                  control={form.control}
                  name="initialPin"
                  render={({ field }) => (
                    <PinInput
                      aria-label={t("pendingAccount.fields.initialPin")}
                      name={field.name}
                      value={field.value}
                      onChange={(event) => {
                        form.setValue(
                          "initialPin",
                          event.target.value.replace(/\D/g, "").slice(0, 6),
                          {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                          },
                        );
                        void form.trigger();
                      }}
                      onBlur={field.onBlur}
                      placeholder={t("pendingAccount.placeholders.initialPin")}
                    />
                  )}
                />
              </FormField>

              <FormField
                label={t("pendingAccount.fields.newPin")}
                error={
                  touchedFields.newPin || submitCount > 0
                    ? (errors.newPin?.message ?? null)
                    : null
                }
              >
                <Controller
                  control={form.control}
                  name="newPin"
                  render={({ field }) => (
                    <PinInput
                      aria-label={t("pendingAccount.fields.newPin")}
                      name={field.name}
                      required
                      value={field.value}
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
                      placeholder={t("pendingAccount.placeholders.newPin")}
                    />
                  )}
                />
              </FormField>

              <FormSubmitHint visible={!isValid} />

              <Button type="submit" disabled={submitting || !isValid}>
                {submitting
                  ? t("pendingAccount.submit.activating")
                  : t("pendingAccount.submit.activate")}
              </Button>
            </form>
          )}

          {error ? (
            <p className="mt-3 text-sm text-notification">{error}</p>
          ) : null}
          {success ? (
            <p className="mt-3 text-sm text-primary">{success}</p>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
