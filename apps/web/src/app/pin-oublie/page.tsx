"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { BackLinkButton } from "../../components/ui/back-link-button";
import { RecoveryShell } from "../../components/layout/recovery-shell";
import { Card } from "../../components/ui/card";
import { DateInput } from "../../components/ui/date-input";
import { EmailInput } from "../../components/ui/email-input";
import { SubmitButton } from "../../components/ui/form-buttons";
import {
  FormSubmitHint,
  FormTextInput,
} from "../../components/ui/form-controls";
import { FormField } from "../../components/ui/form-field";
import { PinInput } from "../../components/ui/pin-input";
import {
  buildVerifyPinRecoverySchema,
  completePinRecoverySchema,
  requestPinRecoverySchema,
  type RecoveryQuestion,
} from "./pin-recovery-schema";
import type { z } from "zod";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

function normalizePhoneInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("237") && digits.length >= 12) {
    return digits.slice(3, 12);
  }
  return digits.slice(0, 9);
}

type PinRecoveryOptionsResponse = {
  success: boolean;
  schoolSlug: string | null;
  principalHint: string;
  questions: RecoveryQuestion[];
};

type PinRecoveryVerifyResponse = {
  success: boolean;
  schoolSlug: string | null;
  recoveryToken: string;
};

function PinRecoveryPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [schoolSlug, setSchoolSlug] = useState(
    () => searchParams.get("schoolSlug") ?? "",
  );

  const [loadingOptions, setLoadingOptions] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [completing, setCompleting] = useState(false);

  const [options, setOptions] = useState<PinRecoveryOptionsResponse | null>(
    null,
  );
  const [recoveryToken, setRecoveryToken] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const requestForm = useForm<
    z.input<typeof requestPinRecoverySchema>,
    unknown,
    z.output<typeof requestPinRecoverySchema>
  >({
    resolver: zodResolver(requestPinRecoverySchema),
    mode: "onChange",
    defaultValues: {
      email: searchParams.get("email") ?? "",
      phone: searchParams.get("phone") ?? "",
    },
  });

  useEffect(() => {
    const querySchoolSlug = searchParams.get("schoolSlug") ?? "";
    if (querySchoolSlug) {
      setSchoolSlug(querySchoolSlug);
    }
  }, [searchParams]);

  const verifySchema = useMemo(
    () => buildVerifyPinRecoverySchema(options?.questions ?? []),
    [options?.questions],
  );
  const verifyForm = useForm<{
    birthDate: string;
    answers: Record<string, string>;
  }>({
    resolver: zodResolver(verifySchema),
    mode: "onChange",
    defaultValues: {
      birthDate: "",
      answers: {} as Record<string, string>,
    },
  });
  const completeForm = useForm<
    z.input<typeof completePinRecoverySchema>,
    unknown,
    z.output<typeof completePinRecoverySchema>
  >({
    resolver: zodResolver(completePinRecoverySchema),
    mode: "onChange",
    defaultValues: {
      recoveryToken: "",
      newPin: "",
      confirmPin: "",
    },
  });
  const email = requestForm.watch("email");
  const phone = requestForm.watch("phone");

  useEffect(() => {
    verifyForm.reset({
      birthDate: "",
      answers: Object.fromEntries(
        (options?.questions ?? []).map((question) => [question.key, ""]),
      ),
    });
  }, [options?.questions, verifyForm]);

  useEffect(() => {
    completeForm.reset({
      recoveryToken,
      newPin: "",
      confirmPin: "",
    });
  }, [completeForm, recoveryToken]);

  const loginHref = useMemo(() => {
    const targetSchoolSlug = options?.schoolSlug ?? schoolSlug;
    return targetSchoolSlug ? `/schools/${targetSchoolSlug}/login` : "/";
  }, [options?.schoolSlug, schoolSlug]);

  async function onLoadOptions(
    values: z.infer<typeof requestPinRecoverySchema>,
  ) {
    setError(null);
    setSuccess(null);

    setLoadingOptions(true);
    try {
      const response = await fetch(`${API_URL}/auth/forgot-pin/options`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.email || undefined,
          phone: values.phone || undefined,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | PinRecoveryOptionsResponse
        | { message?: string | string[] }
        | null;

      if (!response.ok) {
        const message =
          payload && "message" in payload
            ? Array.isArray(payload.message)
              ? payload.message.join(", ")
              : payload.message
            : "Impossible de charger les questions de recuperation.";
        setError(
          message ?? "Impossible de charger les questions de recuperation.",
        );
        return;
      }

      const validPayload = payload as PinRecoveryOptionsResponse;
      setOptions(validPayload);
      setSchoolSlug(validPayload.schoolSlug ?? schoolSlug);
      verifyForm.reset({
        birthDate: "",
        answers: Object.fromEntries(
          validPayload.questions.map((question) => [question.key, ""]),
        ),
      });
    } catch {
      setError("Erreur reseau.");
    } finally {
      setLoadingOptions(false);
    }
  }

  async function onVerify(values: {
    birthDate: string;
    answers: Record<string, string>;
  }) {
    setError(null);
    setSuccess(null);
    if (!options) {
      setError("Chargez d abord les questions de recuperation.");
      return;
    }

    setVerifying(true);
    try {
      const response = await fetch(`${API_URL}/auth/forgot-pin/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email || undefined,
          phone: phone || undefined,
          birthDate: values.birthDate,
          answers: options.questions.map((question) => ({
            questionKey: question.key,
            answer: values.answers[question.key] ?? "",
          })),
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | PinRecoveryVerifyResponse
        | { message?: string | string[] }
        | null;

      if (!response.ok) {
        const message =
          payload && "message" in payload
            ? Array.isArray(payload.message)
              ? payload.message.join(", ")
              : payload.message
            : "Informations de recuperation invalides.";
        setError(message ?? "Informations de recuperation invalides.");
        return;
      }

      const validPayload = payload as PinRecoveryVerifyResponse;
      setRecoveryToken(validPayload.recoveryToken);
      setSchoolSlug(validPayload.schoolSlug ?? schoolSlug);
      setSuccess("Verification reussie. Vous pouvez definir un nouveau PIN.");
    } catch {
      setError("Erreur reseau.");
    } finally {
      setVerifying(false);
    }
  }

  async function onComplete(values: z.infer<typeof completePinRecoverySchema>) {
    setError(null);
    setSuccess(null);

    setCompleting(true);
    try {
      const response = await fetch(`${API_URL}/auth/forgot-pin/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recoveryToken: values.recoveryToken,
          newPin: values.newPin,
        }),
      });

      const payload = (await response.json().catch(() => null)) as {
        success?: boolean;
        schoolSlug?: string | null;
        message?: string | string[];
      } | null;

      if (!response.ok) {
        const message =
          payload && typeof payload.message !== "undefined"
            ? Array.isArray(payload.message)
              ? payload.message.join(", ")
              : payload.message
            : "Reinitialisation du PIN impossible.";
        setError(message ?? "Reinitialisation du PIN impossible.");
        return;
      }

      router.replace("/");
      return;
    } catch {
      setError("Erreur reseau.");
    } finally {
      setCompleting(false);
    }
  }

  return (
    <RecoveryShell title="Recuperation de PIN">
      <div className="mx-auto w-full max-w-2xl">
        <Card
          title="PIN perdu"
          subtitle="Recuperez l acces avec vos questions de securite"
        >
          <div className="grid gap-5">
            {!options ? (
              <form
                className="grid gap-3"
                onSubmit={requestForm.handleSubmit(onLoadOptions)}
                noValidate
              >
                <FormField
                  label="Email (optionnel)"
                  error={requestForm.formState.errors.email?.message}
                >
                  <Controller
                    control={requestForm.control}
                    name="email"
                    render={({ field }) => (
                      <EmailInput
                        name={field.name}
                        invalid={!!requestForm.formState.errors.email}
                        value={field.value}
                        onChange={(event) => {
                          requestForm.setValue("email", event.target.value, {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                          });
                          void requestForm.trigger(["email", "phone"]);
                        }}
                        onBlur={field.onBlur}
                        placeholder="prenom.nom@gmail.com"
                      />
                    )}
                  />
                </FormField>

                <FormField
                  label="Telephone (optionnel)"
                  error={requestForm.formState.errors.phone?.message}
                >
                  <Controller
                    control={requestForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormTextInput
                        name={field.name}
                        ref={field.ref}
                        invalid={!!requestForm.formState.errors.phone}
                        value={field.value}
                        onChange={(event) => {
                          requestForm.setValue(
                            "phone",
                            normalizePhoneInput(event.target.value),
                            {
                              shouldDirty: true,
                              shouldTouch: true,
                              shouldValidate: true,
                            },
                          );
                          void requestForm.trigger(["email", "phone"]);
                        }}
                        onBlur={field.onBlur}
                        placeholder="6XXXXXXXX"
                      />
                    )}
                  />
                </FormField>
                <FormSubmitHint visible={!requestForm.formState.isValid} />

                <SubmitButton
                  disabled={loadingOptions || !requestForm.formState.isValid}
                >
                  {loadingOptions
                    ? "Chargement..."
                    : "Continuer vers les questions de recuperation"}
                </SubmitButton>
              </form>
            ) : null}

            {options && !recoveryToken ? (
              <form
                className="grid gap-3"
                onSubmit={verifyForm.handleSubmit(onVerify)}
                noValidate
              >
                <p className="text-sm text-text-secondary">
                  Compte detecte:{" "}
                  <span className="font-medium text-text-primary">
                    {options.principalHint}
                  </span>
                </p>
                <FormField
                  label="Date de naissance"
                  error={verifyForm.formState.errors.birthDate?.message}
                >
                  <Controller
                    control={verifyForm.control}
                    name="birthDate"
                    render={({ field }) => (
                      <DateInput
                        aria-label="Date de naissance"
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
                      defaultValue=""
                      render={({ field }) => (
                        <FormTextInput
                          aria-label={question.label}
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
                <FormSubmitHint visible={!verifyForm.formState.isValid} />
                <SubmitButton
                  disabled={verifying || !verifyForm.formState.isValid}
                >
                  {verifying ? "Verification..." : "Verifier mes reponses"}
                </SubmitButton>
              </form>
            ) : null}

            {recoveryToken ? (
              <form
                className="grid gap-3"
                onSubmit={completeForm.handleSubmit(onComplete)}
                noValidate
              >
                <FormField
                  label="Nouveau PIN (6 chiffres)"
                  error={completeForm.formState.errors.newPin?.message}
                >
                  <Controller
                    control={completeForm.control}
                    name="newPin"
                    render={({ field }) => (
                      <PinInput
                        aria-label="Nouveau PIN (6 chiffres)"
                        name={field.name}
                        aria-invalid={
                          completeForm.formState.errors.newPin
                            ? "true"
                            : "false"
                        }
                        value={field.value}
                        onChange={(event) =>
                          completeForm.setValue(
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
                        placeholder="123456"
                      />
                    )}
                  />
                </FormField>
                <FormField
                  label="Confirmer le PIN"
                  error={completeForm.formState.errors.confirmPin?.message}
                >
                  <Controller
                    control={completeForm.control}
                    name="confirmPin"
                    render={({ field }) => (
                      <PinInput
                        aria-label="Confirmer le PIN"
                        name={field.name}
                        aria-invalid={
                          completeForm.formState.errors.confirmPin
                            ? "true"
                            : "false"
                        }
                        value={field.value}
                        onChange={(event) =>
                          completeForm.setValue(
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
                        placeholder="123456"
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
                    : "Definir mon nouveau PIN"}
                </SubmitButton>
              </form>
            ) : null}

            {error ? (
              <p className="text-sm text-notification">{error}</p>
            ) : null}
            {success ? <p className="text-sm text-success">{success}</p> : null}

            <BackLinkButton href={loginHref}>
              Retour a la connexion
            </BackLinkButton>
          </div>
        </Card>
      </div>
    </RecoveryShell>
  );
}

export default function PinRecoveryPage() {
  return (
    <Suspense
      fallback={
        <RecoveryShell title="Recuperation de PIN">
          <div className="mx-auto w-full max-w-2xl">
            <Card title="PIN perdu" subtitle="Chargement...">
              <p className="text-sm text-text-secondary">Chargement...</p>
            </Card>
          </div>
        </RecoveryShell>
      }
    >
      <PinRecoveryPageContent />
    </Suspense>
  );
}
