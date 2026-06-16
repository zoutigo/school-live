"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { BackLinkButton } from "../../components/ui/back-link-button";
import { Card } from "../../components/ui/card";
import { SubmitButton } from "../../components/ui/form-buttons";
import { FormSubmitHint } from "../../components/ui/form-controls";
import { FormField } from "../../components/ui/form-field";
import { PasswordInput } from "../../components/ui/password-input";
import { PasswordRequirementsHint } from "../../components/ui/password-requirements-hint";
import { RecoveryShell } from "../../components/layout/recovery-shell";
import { useTranslation } from "../../i18n/useTranslation";
import type { ReactNode } from "react";

export function FirstPasswordShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <RecoveryShell title={t("firstPassword.shell.title")}>
      {children}
    </RecoveryShell>
  );
}

export function FirstPasswordFallback() {
  const { t } = useTranslation();
  return (
    <div className="text-sm text-text-secondary">{t("common.loading")}</div>
  );
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

function createFirstPasswordSchema(t: (key: string) => string) {
  return z
    .object({
      newPassword: z
        .string()
        .min(8, t("recovery.password.errors.passwordMinLength"))
        .regex(
          PASSWORD_COMPLEXITY_REGEX,
          t("recovery.password.errors.passwordComplexity"),
        ),
      confirmPassword: z
        .string()
        .min(1, t("recovery.password.errors.confirmPasswordRequired")),
    })
    .refine((value) => value.newPassword === value.confirmPassword, {
      path: ["confirmPassword"],
      message: t("recovery.password.errors.passwordConfirmMismatch"),
    });
}

type FirstPasswordClientProps = {
  username: string;
  schoolSlug?: string;
};

export function FirstPasswordClient({
  username,
  schoolSlug,
}: FirstPasswordClientProps) {
  const router = useRouter();
  const { locale, t } = useTranslation();
  const schema = useMemo(() => createFirstPasswordSchema(t), [locale]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const newPassword = form.watch("newPassword");

  const onSubmit = useCallback(
    async (values: z.infer<typeof schema>) => {
      setError(null);
      try {
        const response = await fetch(
          `${API_URL}/auth/first-password-change/username`,
          {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username,
              newPassword: values.newPassword,
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
              : (payload?.message ?? t("firstPassword.errors.changeFailed"));
          setError(String(message));
          return;
        }

        setSuccess(true);
        setTimeout(() => {
          const href = schoolSlug ? `/schools/${schoolSlug}/login` : "/";
          router.replace(href);
        }, 2000);
      } catch {
        setError(t("recovery.password.errors.networkError"));
      }
    },
    [username, schoolSlug, router, t],
  );

  if (success) {
    return (
      <Card
        title={t("firstPassword.success.title")}
        subtitle={t("firstPassword.success.subtitle")}
      >
        <p className="text-sm text-text-secondary">
          {t("firstPassword.success.message")}
        </p>
      </Card>
    );
  }

  return (
    <Card
      title={t("firstPassword.cardTitle")}
      subtitle={t("firstPassword.cardSubtitle")}
    >
      <div className="mb-3 rounded-card border border-border bg-background px-3 py-2 text-sm text-text-secondary">
        {t("firstPassword.identifierLabel")}{" "}
        <span className="font-semibold text-text-primary">{username}</span>
      </div>

      <form className="grid gap-3" onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          label={t("recovery.password.fields.newPassword")}
          error={form.formState.errors.newPassword?.message}
        >
          <Controller
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <PasswordInput
                aria-label={t("recovery.password.fields.newPassword")}
                name={field.name}
                aria-invalid={
                  form.formState.errors.newPassword ? "true" : "false"
                }
                value={field.value}
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

        <PasswordRequirementsHint password={newPassword} />

        <FormField
          label={t("firstPassword.fields.confirmPassword")}
          error={form.formState.errors.confirmPassword?.message}
        >
          <Controller
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <PasswordInput
                aria-label={t("firstPassword.fields.confirmPassword")}
                name={field.name}
                aria-invalid={
                  form.formState.errors.confirmPassword ? "true" : "false"
                }
                value={field.value}
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

        <FormSubmitHint visible={!form.formState.isValid} />

        <SubmitButton
          disabled={form.formState.isSubmitting || !form.formState.isValid}
        >
          {form.formState.isSubmitting
            ? t("firstPassword.submit.saving")
            : t("firstPassword.submit.submit")}
        </SubmitButton>

        {error ? <p className="text-sm text-notification">{error}</p> : null}

        <BackLinkButton href="/" className="mt-2">
          {t("recovery.password.backToLogin")}
        </BackLinkButton>
      </form>
    </Card>
  );
}
