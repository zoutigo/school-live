"use client";

import { useCallback, useState } from "react";
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

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

const firstPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, "Le mot de passe doit faire au moins 8 caracteres.")
      .regex(
        PASSWORD_COMPLEXITY_REGEX,
        "Le mot de passe doit contenir au moins 8 caracteres avec majuscules, minuscules et chiffres.",
      ),
    confirmPassword: z.string().min(1, "Confirmez le mot de passe."),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "La confirmation ne correspond pas au nouveau mot de passe.",
  });

type FirstPasswordClientProps = {
  username: string;
  schoolSlug?: string;
};

export function FirstPasswordClient({
  username,
  schoolSlug,
}: FirstPasswordClientProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm<z.infer<typeof firstPasswordSchema>>({
    resolver: zodResolver(firstPasswordSchema),
    mode: "onChange",
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const newPassword = form.watch("newPassword");

  const onSubmit = useCallback(
    async (values: z.infer<typeof firstPasswordSchema>) => {
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
              : (payload?.message ?? "Changement de mot de passe impossible.");
          setError(String(message));
          return;
        }

        setSuccess(true);
        setTimeout(() => {
          const href = schoolSlug ? `/schools/${schoolSlug}/login` : "/";
          router.replace(href);
        }, 2000);
      } catch {
        setError("Erreur reseau.");
      }
    },
    [username, schoolSlug, router],
  );

  if (success) {
    return (
      <Card title="Mot de passe defini" subtitle="Redirection en cours...">
        <p className="text-sm text-text-secondary">
          Votre mot de passe a ete defini avec succes. Vous allez etre redirige
          vers la connexion.
        </p>
      </Card>
    );
  }

  return (
    <Card
      title="Definir mon mot de passe"
      subtitle="Premiere connexion — choisissez un mot de passe securise"
    >
      <div className="mb-3 rounded-card border border-border bg-background px-3 py-2 text-sm text-text-secondary">
        Identifiant :{" "}
        <span className="font-semibold text-text-primary">{username}</span>
      </div>

      <form className="grid gap-3" onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          label="Nouveau mot de passe"
          error={form.formState.errors.newPassword?.message}
        >
          <Controller
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <PasswordInput
                aria-label="Nouveau mot de passe"
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
          label="Confirmer le mot de passe"
          error={form.formState.errors.confirmPassword?.message}
        >
          <Controller
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <PasswordInput
                aria-label="Confirmer le mot de passe"
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
            ? "Enregistrement..."
            : "Definir mon mot de passe"}
        </SubmitButton>

        {error ? <p className="text-sm text-notification">{error}</p> : null}

        <BackLinkButton href="/" className="mt-2">
          Retour a la connexion
        </BackLinkButton>
      </form>
    </Card>
  );
}
