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
import { useTranslation } from "../../i18n/useTranslation";
import {
  createUsernameRecoverySchemas,
  type RecoveryQuestion,
} from "./username-recovery-schema";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type Step = 1 | 2 | 3;

export function UsernameRecoveryClient() {
  const router = useRouter();
  const { locale, t } = useTranslation();
  const schemas = useMemo(() => createUsernameRecoverySchemas(t), [locale]);

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

  const step1Form = useForm<z.infer<typeof schemas.step1Schema>>({
    resolver: zodResolver(schemas.step1Schema),
    mode: "onChange",
    defaultValues: { username: "" },
  });

  // ── Step 2 form ────────────────────────────────────────────────────────────

  const step2Schema = useMemo(
    () => schemas.buildStep2Schema(questions),
    [schemas, questions],
  );
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

  const step3Form = useForm<z.infer<typeof schemas.step3Schema>>({
    resolver: zodResolver(schemas.step3Schema),
    mode: "onChange",
    defaultValues: { newPassword: "", confirmPassword: "" },
  });
  const newPassword = step3Form.watch("newPassword");

  // ── Handlers ───────────────────────────────────────────────────────────────

  const onStep1Submit = useCallback(
    async (values: z.infer<typeof schemas.step1Schema>) => {
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
              : (payload?.message ??
                t("recovery.username.errors.usernameNotFound"));
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
        setError(t("recovery.password.errors.networkError"));
      }
    },
    [step2Form, t],
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
              : (payload?.message ??
                t("recovery.password.errors.invalidRecoveryInfo"));
          setError(String(message));
          return;
        }

        const payload = (await response.json()) as { recoveryToken: string };
        setRecoveryToken(payload.recoveryToken);
        step3Form.reset({ newPassword: "", confirmPassword: "" });
        setStep(3);
      } catch {
        setError(t("recovery.password.errors.networkError"));
      }
    },
    [username, questions, step3Form, t],
  );

  const onStep3Submit = useCallback(
    async (values: z.infer<typeof schemas.step3Schema>) => {
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
              : (payload?.message ?? t("recovery.password.errors.resetFailed"));
          setError(String(message));
          return;
        }

        step3Form.reset();
        setRedirectToast({
          title: t("recovery.password.toast.passwordReset.title"),
          description: t("recovery.password.toast.passwordReset.description"),
        });
      } catch {
        setError(t("recovery.password.errors.networkError"));
      }
    },
    [recoveryToken, step3Form, t],
  );

  // ── Subtitle ───────────────────────────────────────────────────────────────

  const subtitle =
    step === 1
      ? t("recovery.username.step1")
      : step === 2
        ? t("recovery.password.step2")
        : t("recovery.password.step3");

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
        title={t("recovery.username.cardTitle")}
        subtitle={subtitle}
        className="lg:mt-2"
      >
        {noQuestionsConfigured ? (
          <div className="grid gap-3">
            <p className="text-sm text-text-secondary">
              {t("recovery.username.noQuestionsConfigured")}
            </p>
            <BackLinkButton href="/" className="mt-2">
              {t("recovery.password.backToLogin")}
            </BackLinkButton>
          </div>
        ) : step === 1 ? (
          <form
            className="grid gap-3"
            onSubmit={step1Form.handleSubmit(onStep1Submit)}
          >
            <FormField
              label={t("recovery.username.fields.username")}
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
                    placeholder={t("recovery.username.usernamePlaceholder")}
                  />
                )}
              />
            </FormField>

            <FormSubmitHint visible={!step1Form.formState.isValid} />

            <SubmitButton disabled={step1Form.formState.isSubmitting}>
              {step1Form.formState.isSubmitting
                ? t("recovery.username.submit.searching")
                : t("recovery.username.submit.continue")}
            </SubmitButton>

            {error ? (
              <p className="text-sm text-notification">{error}</p>
            ) : null}

            <BackLinkButton href="/" className="mt-2">
              {t("recovery.password.backToLogin")}
            </BackLinkButton>
          </form>
        ) : step === 2 ? (
          <form
            className="grid gap-3"
            onSubmit={step2Form.handleSubmit(onStep2Submit)}
          >
            <div className="rounded-card border border-border bg-background px-3 py-2 text-sm text-text-secondary">
              {t("recovery.username.identifierLabel")}{" "}
              <span className="font-semibold">{username}</span>
            </div>

            <FormField
              label={t("recovery.password.fields.birthDate")}
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
                ? t("recovery.password.submit.verifying")
                : t("recovery.password.submit.verify")}
            </SubmitButton>

            {error ? (
              <p className="text-sm text-notification">{error}</p>
            ) : null}

            <BackLinkButton href="/" className="mt-2">
              {t("recovery.password.backToLogin")}
            </BackLinkButton>
          </form>
        ) : (
          <form
            className="grid gap-3"
            onSubmit={step3Form.handleSubmit(onStep3Submit)}
          >
            <FormField
              label={t("recovery.password.fields.newPassword")}
              error={step3Form.formState.errors.newPassword?.message}
            >
              <Controller
                control={step3Form.control}
                name="newPassword"
                render={({ field }) => (
                  <PasswordInput
                    aria-label={t("recovery.password.fields.newPassword")}
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
              label={t("recovery.password.fields.confirmation")}
              error={step3Form.formState.errors.confirmPassword?.message}
            >
              <Controller
                control={step3Form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <PasswordInput
                    aria-label={t("recovery.password.fields.confirmation")}
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
                ? t("recovery.password.submit.resetting")
                : t("recovery.password.submit.reset")}
            </SubmitButton>

            {error ? (
              <p className="text-sm text-notification">{error}</p>
            ) : null}

            <BackLinkButton href="/" className="mt-2">
              {t("recovery.password.backToLogin")}
            </BackLinkButton>
          </form>
        )}
      </Card>
    </>
  );
}
