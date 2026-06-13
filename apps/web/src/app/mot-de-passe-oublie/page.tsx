"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { RecoveryShell } from "../../components/layout/recovery-shell";
import { BackLinkButton } from "../../components/ui/back-link-button";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { DateInput } from "../../components/ui/date-input";
import { EmailInput } from "../../components/ui/email-input";
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
  createForgotPasswordSchemas,
  type RecoveryQuestion,
} from "./forgot-password-schema";
import type { z } from "zod";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type RequestResetResponse = {
  success: boolean;
  message: string;
  resetToken?: string;
};

type ResetOptionsResponse = {
  success: boolean;
  emailHint: string;
  schoolSlug: string | null;
  questions: RecoveryQuestion[];
};

function ForgotPasswordPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale, t } = useTranslation();
  const schemas = useMemo(() => createForgotPasswordSchemas(t), [locale]);

  const [activeToken, setActiveToken] = useState(() => {
    return searchParams.get("token") ?? "";
  });
  const [schoolSlugFromQuery, setSchoolSlugFromQuery] = useState(() => {
    return searchParams.get("schoolSlug") ?? "";
  });
  const [requesting, setRequesting] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [requestMessage, setRequestMessage] = useState<string | null>(null);

  const [options, setOptions] = useState<ResetOptionsResponse | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [completing, setCompleting] = useState(false);

  const [verified, setVerified] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [redirectToast, setRedirectToast] = useState<{
    title: string;
    description: string;
  } | null>(null);
  const requestForm = useForm<
    z.input<typeof schemas.requestResetSchema>,
    unknown,
    z.output<typeof schemas.requestResetSchema>
  >({
    resolver: zodResolver(schemas.requestResetSchema),
    mode: "onChange",
    defaultValues: {
      email: searchParams.get("email") ?? "",
    },
  });

  useEffect(() => {
    const token = searchParams.get("token") ?? "";
    const schoolSlug = searchParams.get("schoolSlug") ?? "";
    const initialEmail = searchParams.get("email") ?? "";
    setActiveToken(token);
    setSchoolSlugFromQuery(schoolSlug);
    if (!requestForm.getValues("email") && initialEmail) {
      requestForm.setValue("email", initialEmail, { shouldValidate: true });
    }
  }, [requestForm, searchParams]);

  const verifySchema = useMemo(
    () => schemas.buildVerifyResetSchema(options?.questions ?? []),
    [options?.questions, schemas],
  );
  const verifyForm = useForm<{
    token: string;
    birthDate: string;
    answers: Record<string, string>;
  }>({
    resolver: zodResolver(verifySchema),
    mode: "onChange",
    defaultValues: {
      token: activeToken,
      birthDate: "",
      answers: {} as Record<string, string>,
    },
  });
  const completeForm = useForm<
    z.input<typeof schemas.completeResetSchema>,
    unknown,
    z.output<typeof schemas.completeResetSchema>
  >({
    resolver: zodResolver(schemas.completeResetSchema),
    mode: "onChange",
    defaultValues: {
      token: activeToken,
      newPassword: "",
      confirmPassword: "",
    },
  });
  const newPassword = completeForm.watch("newPassword");

  useEffect(() => {
    verifyForm.reset({
      token: activeToken,
      birthDate: "",
      answers: Object.fromEntries(
        (options?.questions ?? []).map((question) => [question.key, ""]),
      ),
    });
  }, [activeToken, options?.questions, verifyForm]);

  useEffect(() => {
    completeForm.reset({
      token: activeToken,
      newPassword: "",
      confirmPassword: "",
    });
  }, [activeToken, completeForm]);

  const verifyDefaultAnswers = useMemo(
    () =>
      Object.fromEntries(
        (options?.questions ?? []).map((question) => [question.key, ""]),
      ) as Record<string, string>,
    [options?.questions],
  );

  const loginHref = useMemo(() => {
    const schoolSlug = options?.schoolSlug ?? schoolSlugFromQuery;
    return schoolSlug ? `/schools/${schoolSlug}/login` : "/";
  }, [options?.schoolSlug, schoolSlugFromQuery]);

  const loadResetOptions = useCallback(
    async (token: string) => {
      setLoadingOptions(true);
      setError(null);
      setSuccess(null);

      try {
        const response = await fetch(
          `${API_URL}/auth/forgot-password/options`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
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
                t("recovery.password.errors.invalidOrExpiredLink"));
          setError(String(message));
          setOptions(null);
          return;
        }

        const payload = (await response.json()) as ResetOptionsResponse;
        setOptions(payload);
        verifyForm.reset({
          token,
          birthDate: "",
          answers: Object.fromEntries(
            payload.questions.map((question) => [question.key, ""]),
          ),
        });
        setVerified(false);
        setRequestSent(false);
        setRequestMessage(null);
      } catch {
        setError(t("recovery.password.errors.networkError"));
        setOptions(null);
      } finally {
        setLoadingOptions(false);
      }
    },
    [locale],
  );

  useEffect(() => {
    if (!activeToken) {
      return;
    }
    void loadResetOptions(activeToken);
  }, [activeToken, loadResetOptions]);

  async function onRequestReset(
    values: z.infer<typeof schemas.requestResetSchema>,
  ) {
    setError(null);
    setSuccess(null);

    setRequesting(true);
    try {
      const response = await fetch(`${API_URL}/auth/forgot-password/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const payload = (await response
        .json()
        .catch(() => null)) as RequestResetResponse | null;

      if (!response.ok) {
        setError(t("recovery.password.errors.requestFailed"));
        return;
      }

      setRequestSent(true);
      setRequestMessage(
        payload?.message ?? t("recovery.password.success.requestSentDefault"),
      );
      requestForm.reset({ email: "" });
      setError(null);
      setSuccess(null);
      setOptions(null);
      setVerified(false);
      verifyForm.reset({
        token: "",
        birthDate: "",
        answers: {},
      });
      completeForm.reset({
        token: "",
        newPassword: "",
        confirmPassword: "",
      });

      if (payload?.resetToken) {
        const params = new URLSearchParams({ token: payload.resetToken });
        if (schoolSlugFromQuery) {
          params.set("schoolSlug", schoolSlugFromQuery);
        }
        router.replace(`/mot-de-passe-oublie?${params.toString()}`);
        return;
      }

      setRedirectToast({
        title: t("recovery.password.toast.requestSent.title"),
        description: t("recovery.password.toast.requestSent.description"),
      });
    } catch {
      setError(t("recovery.password.errors.networkError"));
    } finally {
      setRequesting(false);
    }
  }

  async function onVerifyIdentity(values: {
    token: string;
    birthDate: string;
    answers: Record<string, string>;
  }) {
    setError(null);
    setSuccess(null);

    setVerifying(true);
    try {
      const payload = {
        token: values.token,
        birthDate: values.birthDate,
        answers: (options?.questions ?? []).map((question) => ({
          questionKey: question.key,
          answer: values.answers[question.key] ?? "",
        })),
      };

      const response = await fetch(`${API_URL}/auth/forgot-password/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          errorPayload?.message && Array.isArray(errorPayload.message)
            ? errorPayload.message.join(", ")
            : (errorPayload?.message ??
              t("recovery.password.errors.invalidRecoveryInfo"));
        setError(String(message));
        return;
      }

      setVerified(true);
      setSuccess(t("recovery.password.success.verified"));
    } catch {
      setError(t("recovery.password.errors.networkError"));
    } finally {
      setVerifying(false);
    }
  }

  async function onCompleteReset(
    values: z.infer<typeof schemas.completeResetSchema>,
  ) {
    setError(null);
    setSuccess(null);

    setCompleting(true);
    try {
      const response = await fetch(`${API_URL}/auth/forgot-password/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: values.token,
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

      completeForm.reset({
        token: "",
        newPassword: "",
        confirmPassword: "",
      });
      setVerified(false);
      setOptions(null);
      setActiveToken("");
      setSuccess(null);
      setRedirectToast({
        title: t("recovery.password.toast.passwordReset.title"),
        description: t("recovery.password.toast.passwordReset.description"),
      });
      return;
    } catch {
      setError(t("recovery.password.errors.networkError"));
    } finally {
      setCompleting(false);
    }
  }

  return (
    <RecoveryShell title={t("recovery.password.shell.title")}>
      <SuccessRedirectToast
        open={redirectToast !== null}
        title={redirectToast?.title ?? ""}
        description={redirectToast?.description ?? ""}
        onComplete={() => {
          setRedirectToast(null);
          router.replace(loginHref);
        }}
      />
      <div className="mx-auto w-full max-w-2xl">
        <Card
          title={t("recovery.password.cardTitle")}
          subtitle={
            options
              ? verified
                ? t("recovery.password.step3")
                : t("recovery.password.step2")
              : t("recovery.password.step1")
          }
          className="lg:mt-2"
        >
          {!activeToken ? (
            <form
              className="grid gap-3"
              onSubmit={requestForm.handleSubmit(onRequestReset)}
            >
              <FormField
                label={t("recovery.password.fields.email")}
                error={requestForm.formState.errors.email?.message}
              >
                <Controller
                  control={requestForm.control}
                  name="email"
                  render={({ field }) => (
                    <EmailInput
                      name={field.name}
                      required
                      invalid={!!requestForm.formState.errors.email}
                      value={field.value}
                      onChange={(event) =>
                        requestForm.setValue("email", event.target.value, {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        })
                      }
                      onBlur={field.onBlur}
                      placeholder="prenom.nom@gmail.com"
                    />
                  )}
                />
              </FormField>
              <FormSubmitHint visible={!requestForm.formState.isValid} />

              <SubmitButton
                disabled={requesting || !requestForm.formState.isValid}
              >
                {requesting
                  ? t("recovery.password.submit.sending")
                  : t("recovery.password.submit.send")}
              </SubmitButton>

              {requestSent && requestMessage ? (
                <p
                  role="status"
                  className="rounded-card border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary"
                >
                  {requestMessage}
                </p>
              ) : null}
            </form>
          ) : loadingOptions ? (
            <p className="text-sm text-text-secondary">
              {t("recovery.password.loadingLink")}
            </p>
          ) : options && !verified ? (
            <form
              className="grid gap-3"
              onSubmit={verifyForm.handleSubmit(onVerifyIdentity)}
            >
              <div className="rounded-card border border-border bg-background px-3 py-2 text-sm text-text-secondary">
                {t("recovery.password.accountDetected")}{" "}
                <span className="font-semibold">{options.emailHint}</span>
              </div>

              <FormField
                label={t("recovery.password.fields.birthDate")}
                error={verifyForm.formState.errors.birthDate?.message}
              >
                <Controller
                  control={verifyForm.control}
                  name="birthDate"
                  render={({ field }) => (
                    <DateInput
                      name={field.name}
                      invalid={!!verifyForm.formState.errors.birthDate}
                      value={field.value}
                      onChange={(event) =>
                        verifyForm.setValue("birthDate", event.target.value, {
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
                {options.questions.map((question) => (
                  <FormField
                    key={question.key}
                    label={question.label}
                    error={
                      verifyForm.formState.errors.answers?.[question.key]
                        ?.message
                    }
                  >
                    <Controller
                      control={verifyForm.control}
                      name={`answers.${question.key}`}
                      defaultValue={verifyDefaultAnswers[question.key] ?? ""}
                      render={({ field }) => (
                        <FormTextInput
                          name={field.name}
                          ref={field.ref}
                          invalid={
                            !!verifyForm.formState.errors.answers?.[
                              question.key
                            ]
                          }
                          value={field.value ?? ""}
                          onChange={(event) =>
                            verifyForm.setValue(
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
              <FormSubmitHint visible={!verifyForm.formState.isValid} />

              <SubmitButton
                disabled={verifying || !verifyForm.formState.isValid}
              >
                {verifying
                  ? t("recovery.password.submit.verifying")
                  : t("recovery.password.submit.verify")}
              </SubmitButton>
            </form>
          ) : options && verified ? (
            <form
              className="grid gap-3"
              onSubmit={completeForm.handleSubmit(onCompleteReset)}
            >
              <FormField
                label={t("recovery.password.fields.newPassword")}
                error={completeForm.formState.errors.newPassword?.message}
              >
                <Controller
                  control={completeForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <PasswordInput
                      aria-label={t("recovery.password.fields.newPassword")}
                      name={field.name}
                      aria-invalid={
                        completeForm.formState.errors.newPassword
                          ? "true"
                          : "false"
                      }
                      value={field.value}
                      onChange={(event) =>
                        completeForm.setValue(
                          "newPassword",
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

              <PasswordRequirementsHint password={newPassword} />

              <FormField
                label={t("recovery.password.fields.confirmation")}
                error={completeForm.formState.errors.confirmPassword?.message}
              >
                <Controller
                  control={completeForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <PasswordInput
                      aria-label={t("recovery.password.fields.confirmation")}
                      name={field.name}
                      value={field.value}
                      onChange={(event) =>
                        completeForm.setValue(
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
              <FormSubmitHint visible={!completeForm.formState.isValid} />

              <SubmitButton
                disabled={completing || !completeForm.formState.isValid}
              >
                {completing
                  ? t("recovery.password.submit.resetting")
                  : t("recovery.password.submit.reset")}
              </SubmitButton>
            </form>
          ) : (
            <div className="grid gap-3">
              <p className="text-sm text-text-secondary">
                {t("recovery.password.linkInvalid")}
              </p>
              <Button
                type="button"
                onClick={() => {
                  setActiveToken("");
                  setOptions(null);
                  setVerified(false);
                  setSuccess(null);
                  verifyForm.reset({
                    token: "",
                    birthDate: "",
                    answers: {},
                  });
                  completeForm.reset({
                    token: "",
                    newPassword: "",
                    confirmPassword: "",
                  });
                }}
              >
                {t("recovery.password.newRequest")}
              </Button>
            </div>
          )}

          {error ? (
            <p className="mt-3 text-sm text-notification">{error}</p>
          ) : null}
          {success ? (
            <p className="mt-3 text-sm text-primary">{success}</p>
          ) : null}

          <BackLinkButton href={loginHref} className="mt-4">
            {t("recovery.password.backToLogin")}
          </BackLinkButton>
        </Card>
      </div>
    </RecoveryShell>
  );
}

function ForgotPasswordFallback() {
  const { t } = useTranslation();
  return (
    <RecoveryShell title={t("recovery.password.shell.title")}>
      <div className="mx-auto w-full max-w-2xl">
        <Card
          title={t("recovery.password.cardTitle")}
          subtitle={t("recovery.password.loading")}
          className="lg:mt-2"
        >
          <p className="text-sm text-text-secondary">
            {t("recovery.password.loading")}
          </p>
        </Card>
      </div>
    </RecoveryShell>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<ForgotPasswordFallback />}>
      <ForgotPasswordPageContent />
    </Suspense>
  );
}
