"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import {
  buildVerifyResetSchema,
  completeResetSchema,
  requestResetSchema,
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
  const requestRedirectTimeoutRef = useRef<number | null>(null);

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
  const requestForm = useForm<
    z.input<typeof requestResetSchema>,
    unknown,
    z.output<typeof requestResetSchema>
  >({
    resolver: zodResolver(requestResetSchema),
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
    () => buildVerifyResetSchema(options?.questions ?? []),
    [options?.questions],
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
    z.input<typeof completeResetSchema>,
    unknown,
    z.output<typeof completeResetSchema>
  >({
    resolver: zodResolver(completeResetSchema),
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

  useEffect(() => {
    return () => {
      if (requestRedirectTimeoutRef.current) {
        window.clearTimeout(requestRedirectTimeoutRef.current);
      }
    };
  }, []);

  const loadResetOptions = useCallback(async (token: string) => {
    setLoadingOptions(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${API_URL}/auth/forgot-password/options`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          payload?.message && Array.isArray(payload.message)
            ? payload.message.join(", ")
            : (payload?.message ??
              "Lien de reinitialisation invalide ou expire.");
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
      setError("Erreur reseau.");
      setOptions(null);
    } finally {
      setLoadingOptions(false);
    }
  }, []);

  useEffect(() => {
    if (!activeToken) {
      return;
    }
    void loadResetOptions(activeToken);
  }, [activeToken, loadResetOptions]);

  async function onRequestReset(values: z.infer<typeof requestResetSchema>) {
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
        setError("Demande impossible. Veuillez reessayer.");
        return;
      }

      setRequestSent(true);
      setRequestMessage(
        payload?.message ??
          "Si ce compte existe, un lien de reinitialisation a ete envoye.",
      );
      requestForm.reset({ email: "" });

      if (payload?.resetToken) {
        const params = new URLSearchParams({ token: payload.resetToken });
        if (schoolSlugFromQuery) {
          params.set("schoolSlug", schoolSlugFromQuery);
        }
        router.replace(`/mot-de-passe-oublie?${params.toString()}`);
        return;
      }

      if (requestRedirectTimeoutRef.current) {
        window.clearTimeout(requestRedirectTimeoutRef.current);
      }
      requestRedirectTimeoutRef.current = window.setTimeout(() => {
        router.replace("/");
      }, 5000);
    } catch {
      setError("Erreur reseau.");
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
              "Informations de recuperation invalides.");
        setError(String(message));
        return;
      }

      setVerified(true);
      setSuccess(
        "Verification validee. Definissez votre nouveau mot de passe.",
      );
    } catch {
      setError("Erreur reseau.");
    } finally {
      setVerifying(false);
    }
  }

  async function onCompleteReset(values: z.infer<typeof completeResetSchema>) {
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
            : (payload?.message ?? "Reinitialisation impossible.");
        setError(String(message));
        return;
      }

      router.replace(loginHref);
      return;
    } catch {
      setError("Erreur reseau.");
    } finally {
      setCompleting(false);
    }
  }

  return (
    <RecoveryShell title="Recuperation de mot de passe">
      <div className="mx-auto w-full max-w-2xl">
        <Card
          title="Mot de passe oublie"
          subtitle={
            options
              ? verified
                ? "Etape 3/3: nouveau mot de passe"
                : "Etape 2/3: verification"
              : "Etape 1/3: demande de lien"
          }
          className="lg:mt-2"
        >
          {!activeToken ? (
            <form
              className="grid gap-3"
              onSubmit={requestForm.handleSubmit(onRequestReset)}
            >
              <FormField
                label="Email du compte"
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
                {requesting ? "Envoi en cours..." : "Envoyer le lien"}
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
            <p className="text-sm text-text-secondary">Chargement du lien...</p>
          ) : options && !verified ? (
            <form
              className="grid gap-3"
              onSubmit={verifyForm.handleSubmit(onVerifyIdentity)}
            >
              <div className="rounded-card border border-border bg-background px-3 py-2 text-sm text-text-secondary">
                Compte detecte:{" "}
                <span className="font-semibold">{options.emailHint}</span>
              </div>

              <FormField
                label="Date de naissance"
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
                {verifying ? "Verification..." : "Verifier mon identite"}
              </SubmitButton>
            </form>
          ) : options && verified ? (
            <form
              className="grid gap-3"
              onSubmit={completeForm.handleSubmit(onCompleteReset)}
            >
              <FormField
                label="Nouveau mot de passe"
                error={completeForm.formState.errors.newPassword?.message}
              >
                <Controller
                  control={completeForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <PasswordInput
                      aria-label="Nouveau mot de passe"
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
                label="Confirmation"
                error={completeForm.formState.errors.confirmPassword?.message}
              >
                <Controller
                  control={completeForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <PasswordInput
                      aria-label="Confirmation"
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
                  ? "Reinitialisation..."
                  : "Reinitialiser mon mot de passe"}
              </SubmitButton>
            </form>
          ) : (
            <div className="grid gap-3">
              <p className="text-sm text-text-secondary">
                Ce lien n&apos;est plus valide. Demandez un nouveau lien de
                reinitialisation.
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
                Nouvelle demande
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
            Retour a la connexion
          </BackLinkButton>
        </Card>
      </div>
    </RecoveryShell>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <RecoveryShell title="Recuperation de mot de passe">
          <div className="mx-auto w-full max-w-2xl">
            <Card
              title="Mot de passe oublie"
              subtitle="Chargement..."
              className="lg:mt-2"
            >
              <p className="text-sm text-text-secondary">Chargement...</p>
            </Card>
          </div>
        </RecoveryShell>
      }
    >
      <ForgotPasswordPageContent />
    </Suspense>
  );
}
