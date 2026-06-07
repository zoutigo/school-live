"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import type { z } from "zod";
import { BackLinkButton } from "../../components/ui/back-link-button";
import { Card } from "../../components/ui/card";
import { DateInput } from "../../components/ui/date-input";
import { SubmitButton } from "../../components/ui/form-buttons";
import {
  FormSubmitHint,
  FormTextInput,
} from "../../components/ui/form-controls";
import { FormField } from "../../components/ui/form-field";
import { PasswordInput } from "../../components/ui/password-input";
import { PasswordRequirementsHint } from "../../components/ui/password-requirements-hint";
import { SuccessRedirectToast } from "../../components/ui/success-redirect-toast";
import {
  buildStep2Schema,
  step1Schema,
  step3Schema,
  type RecoveryQuestion,
} from "./username-recovery-schema";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type Step = 1 | 2 | 3;

export function UsernameRecoveryClient() {
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [username, setUsername] = useState("");
  const [questions, setQuestions] = useState<RecoveryQuestion[]>([]);
  const [recoveryToken, setRecoveryToken] = useState("");
  const [noQuestionsConfigured, setNoQuestionsConfigured] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redirectToast, setRedirectToast] = useState<{
    title: string;
    description: string;
  } | null>(null);

  // ── Step 1 form ────────────────────────────────────────────────────────────

  const step1Form = useForm<z.infer<typeof step1Schema>>({
    resolver: zodResolver(step1Schema),
    mode: "onChange",
    defaultValues: { username: "" },
  });

  // ── Step 2 form ────────────────────────────────────────────────────────────

  const step2Schema = useMemo(() => buildStep2Schema(questions), [questions]);
  const step2Form = useForm<{
    birthDate: string;
    answers: Record<string, string>;
  }>({
    resolver: zodResolver(step2Schema),
    mode: "onChange",
    defaultValues: {
      birthDate: "",
      answers: {} as Record<string, string>,
    },
  });
  const step2DefaultAnswers = useMemo(
    () =>
      Object.fromEntries(questions.map((q) => [q.key, ""])) as Record<
        string,
        string
      >,
    [questions],
  );

  // ── Step 3 form ────────────────────────────────────────────────────────────

  const step3Form = useForm<z.infer<typeof step3Schema>>({
    resolver: zodResolver(step3Schema),
    mode: "onChange",
    defaultValues: { newPassword: "", confirmPassword: "" },
  });
  const newPassword = step3Form.watch("newPassword");

  // ── Handlers ───────────────────────────────────────────────────────────────

  const onStep1Submit = useCallback(
    async (values: z.infer<typeof step1Schema>) => {
      setError(null);
      try {
        const response = await fetch(`${API_URL}/auth/recover/username/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: values.username }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as {
            message?: string | string[];
          } | null;
          const message =
            payload?.message && Array.isArray(payload.message)
              ? payload.message.join(", ")
              : (payload?.message ?? "Identifiant introuvable.");
          setError(String(message));
          return;
        }

        const payload = (await response.json()) as {
          questions: RecoveryQuestion[];
        };

        if (!payload.questions || payload.questions.length === 0) {
          setNoQuestionsConfigured(true);
          return;
        }

        setUsername(values.username);
        setQuestions(payload.questions);
        step2Form.reset({
          birthDate: "",
          answers: Object.fromEntries(
            payload.questions.map((q) => [q.key, ""]),
          ),
        });
        setStep(2);
      } catch {
        setError("Erreur reseau.");
      }
    },
    [step2Form],
  );

  const onStep2Submit = useCallback(
    async (values: { birthDate: string; answers: Record<string, string> }) => {
      setError(null);
      try {
        const response = await fetch(
          `${API_URL}/auth/recover/username/verify`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username,
              birthDate: values.birthDate,
              answers: questions.map((q) => ({
                questionKey: q.key,
                answer: values.answers[q.key] ?? "",
              })),
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
              : (payload?.message ?? "Informations de recuperation invalides.");
          setError(String(message));
          return;
        }

        const payload = (await response.json()) as { recoveryToken: string };
        setRecoveryToken(payload.recoveryToken);
        step3Form.reset({ newPassword: "", confirmPassword: "" });
        setStep(3);
      } catch {
        setError("Erreur reseau.");
      }
    },
    [username, questions, step3Form],
  );

  const onStep3Submit = useCallback(
    async (values: z.infer<typeof step3Schema>) => {
      setError(null);
      try {
        const response = await fetch(`${API_URL}/auth/recover/username/reset`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recoveryToken,
            newPassword: values.newPassword,
          }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as {
            message?: string | string[];
          } | null;
          const message =
            payload?.message && Array.isArray(payload.message)
              ? payload.message.join(", ")
              : (payload?.message ?? "Reinitialisation impossible.");
          setError(String(message));
          return;
        }

        step3Form.reset();
        setRedirectToast({
          title: "Mot de passe reinitialise",
          description:
            "Votre nouveau mot de passe a bien ete enregistre. Vous allez etre redirige vers la connexion.",
        });
      } catch {
        setError("Erreur reseau.");
      }
    },
    [recoveryToken, step3Form],
  );

  // ── Subtitle ───────────────────────────────────────────────────────────────

  const subtitle =
    step === 1
      ? "Etape 1/3: saisir votre identifiant"
      : step === 2
        ? "Etape 2/3: verification"
        : "Etape 3/3: nouveau mot de passe";

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <SuccessRedirectToast
        open={redirectToast !== null}
        title={redirectToast?.title ?? ""}
        description={redirectToast?.description ?? ""}
        onComplete={() => {
          setRedirectToast(null);
          router.replace("/");
        }}
      />

      <Card
        title="Mot de passe oublie (identifiant)"
        subtitle={subtitle}
        className="lg:mt-2"
      >
        {noQuestionsConfigured ? (
          <div className="grid gap-3">
            <p className="text-sm text-text-secondary">
              Aucune question de recuperation n&apos;est configuree pour ce
              compte. Contactez votre administration scolaire.
            </p>
            <BackLinkButton href="/" className="mt-2">
              Retour a la connexion
            </BackLinkButton>
          </div>
        ) : step === 1 ? (
          <form
            className="grid gap-3"
            onSubmit={step1Form.handleSubmit(onStep1Submit)}
          >
            <FormField
              label="Identifiant"
              error={step1Form.formState.errors.username?.message}
            >
              <Controller
                control={step1Form.control}
                name="username"
                render={({ field }) => (
                  <FormTextInput
                    name={field.name}
                    ref={field.ref}
                    invalid={!!step1Form.formState.errors.username}
                    value={field.value}
                    onChange={(event) =>
                      step1Form.setValue("username", event.target.value, {
                        shouldDirty: true,
                        shouldTouch: true,
                        shouldValidate: true,
                      })
                    }
                    onBlur={field.onBlur}
                    placeholder="PrenomNOM"
                  />
                )}
              />
            </FormField>

            <FormSubmitHint visible={!step1Form.formState.isValid} />

            <SubmitButton disabled={step1Form.formState.isSubmitting}>
              {step1Form.formState.isSubmitting ? "Recherche..." : "Continuer"}
            </SubmitButton>

            {error ? (
              <p className="text-sm text-notification">{error}</p>
            ) : null}

            <BackLinkButton href="/" className="mt-2">
              Retour a la connexion
            </BackLinkButton>
          </form>
        ) : step === 2 ? (
          <form
            className="grid gap-3"
            onSubmit={step2Form.handleSubmit(onStep2Submit)}
          >
            <div className="rounded-card border border-border bg-background px-3 py-2 text-sm text-text-secondary">
              Identifiant: <span className="font-semibold">{username}</span>
            </div>

            <FormField
              label="Date de naissance"
              error={step2Form.formState.errors.birthDate?.message}
            >
              <Controller
                control={step2Form.control}
                name="birthDate"
                render={({ field }) => (
                  <DateInput
                    name={field.name}
                    invalid={!!step2Form.formState.errors.birthDate}
                    value={field.value}
                    onChange={(event) =>
                      step2Form.setValue("birthDate", event.target.value, {
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

            <div className="grid gap-3">
              {questions.map((question) => (
                <FormField
                  key={question.key}
                  label={question.label}
                  error={
                    step2Form.formState.errors.answers?.[question.key]?.message
                  }
                >
                  <Controller
                    control={step2Form.control}
                    name={`answers.${question.key}`}
                    defaultValue={step2DefaultAnswers[question.key] ?? ""}
                    render={({ field }) => (
                      <FormTextInput
                        name={field.name}
                        ref={field.ref}
                        invalid={
                          !!step2Form.formState.errors.answers?.[question.key]
                        }
                        value={field.value ?? ""}
                        onChange={(event) =>
                          step2Form.setValue(
                            `answers.${question.key}`,
                            event.target.value,
                            {
                              shouldDirty: true,
                              shouldTouch: true,
                              shouldValidate: true,
                            },
                          )
                        }
                        onBlur={field.onBlur}
                      />
                    )}
                  />
                </FormField>
              ))}
            </div>

            <FormSubmitHint visible={!step2Form.formState.isValid} />

            <SubmitButton disabled={step2Form.formState.isSubmitting}>
              {step2Form.formState.isSubmitting
                ? "Verification..."
                : "Verifier mon identite"}
            </SubmitButton>

            {error ? (
              <p className="text-sm text-notification">{error}</p>
            ) : null}

            <BackLinkButton href="/" className="mt-2">
              Retour a la connexion
            </BackLinkButton>
          </form>
        ) : (
          <form
            className="grid gap-3"
            onSubmit={step3Form.handleSubmit(onStep3Submit)}
          >
            <FormField
              label="Nouveau mot de passe"
              error={step3Form.formState.errors.newPassword?.message}
            >
              <Controller
                control={step3Form.control}
                name="newPassword"
                render={({ field }) => (
                  <PasswordInput
                    aria-label="Nouveau mot de passe"
                    name={field.name}
                    aria-invalid={
                      step3Form.formState.errors.newPassword ? "true" : "false"
                    }
                    value={field.value}
                    onChange={(event) =>
                      step3Form.setValue("newPassword", event.target.value, {
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
              label="Confirmation"
              error={step3Form.formState.errors.confirmPassword?.message}
            >
              <Controller
                control={step3Form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <PasswordInput
                    aria-label="Confirmation"
                    name={field.name}
                    value={field.value}
                    onChange={(event) =>
                      step3Form.setValue(
                        "confirmPassword",
                        event.target.value,
                        {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        },
                      )
                    }
                    onBlur={field.onBlur}
                  />
                )}
              />
            </FormField>

            <FormSubmitHint visible={!step3Form.formState.isValid} />

            <SubmitButton disabled={step3Form.formState.isSubmitting}>
              {step3Form.formState.isSubmitting
                ? "Reinitialisation..."
                : "Reinitialiser mon mot de passe"}
            </SubmitButton>

            {error ? (
              <p className="text-sm text-notification">{error}</p>
            ) : null}

            <BackLinkButton href="/" className="mt-2">
              Retour a la connexion
            </BackLinkButton>
          </form>
        )}
      </Card>
    </>
  );
}
