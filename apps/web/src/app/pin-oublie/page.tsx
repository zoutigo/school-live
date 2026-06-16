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
import { SuccessRedirectToast } from "../../components/ui/success-redirect-toast";
import { useTranslation } from "../../i18n/useTranslation";
import {
  createPinRecoverySchemas,
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
  const { locale, t } = useTranslation();
  const schemas = useMemo(() => createPinRecoverySchemas(t), [locale]);
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
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const requestForm = useForm<
    z.input<typeof schemas.requestPinRecoverySchema>,
    unknown,
    z.output<typeof schemas.requestPinRecoverySchema>
  >({
    resolver: zodResolver(schemas.requestPinRecoverySchema),
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
    () => schemas.buildVerifyPinRecoverySchema(options?.questions ?? []),
    [schemas, options?.questions],
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
    z.input<typeof schemas.completePinRecoverySchema>,
    unknown,
    z.output<typeof schemas.completePinRecoverySchema>
  >({
    resolver: zodResolver(schemas.completePinRecoverySchema),
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
    values: z.infer<typeof schemas.requestPinRecoverySchema>,
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
            : t("recovery.pin.errors.loadOptionsFailed");
        setError(message ?? t("recovery.pin.errors.loadOptionsFailed"));
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
      setError(t("recovery.password.errors.networkError"));
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
      setError(t("recovery.pin.errors.questionsNotLoaded"));
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
            : t("recovery.password.errors.invalidRecoveryInfo");
        setError(message ?? t("recovery.password.errors.invalidRecoveryInfo"));
        return;
      }

      const validPayload = payload as PinRecoveryVerifyResponse;
      setRecoveryToken(validPayload.recoveryToken);
      setSchoolSlug(validPayload.schoolSlug ?? schoolSlug);
      setSuccess(t("recovery.pin.success.verified"));
    } catch {
      setError(t("recovery.password.errors.networkError"));
    } finally {
      setVerifying(false);
    }
  }

  async function onComplete(
    values: z.infer<typeof schemas.completePinRecoverySchema>,
  ) {
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
            : t("recovery.pin.errors.resetFailed");
        setError(message ?? t("recovery.pin.errors.resetFailed"));
        return;
      }

      completeForm.reset({
        recoveryToken: "",
        newPin: "",
        confirmPin: "",
      });
      setError(null);
      setSuccess(null);
      setOptions(null);
      setRecoveryToken("");
      verifyForm.reset({
        birthDate: "",
        answers: {},
      });
      setShowSuccessToast(true);
      return;
    } catch {
      setError(t("recovery.password.errors.networkError"));
    } finally {
      setCompleting(false);
    }
  }

  return (
    <RecoveryShell title={t("recovery.pin.shell.title")}>
      <SuccessRedirectToast
        open={showSuccessToast}
        title={t("recovery.pin.toast.title")}
        description={t("recovery.pin.toast.description")}
        onComplete={() => {
          setShowSuccessToast(false);
          router.replace(loginHref);
        }}
      />
      <div className="mx-auto w-full max-w-2xl">
        <Card
          title={t("recovery.pin.cardTitle")}
          subtitle={t("recovery.pin.cardSubtitle")}
        >
          <div className="grid gap-5">
            {!options ? (
              <form
                className="grid gap-3"
                onSubmit={requestForm.handleSubmit(onLoadOptions)}
                noValidate
              >
                <FormField
                  label={t("recovery.pin.fields.emailOptional")}
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
                        placeholder={t("recovery.pin.emailPlaceholder")}
                      />
                    )}
                  />
                </FormField>

                <FormField
                  label={t("recovery.pin.fields.phoneOptional")}
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
                        placeholder={t("recovery.pin.phonePlaceholder")}
                      />
                    )}
                  />
                </FormField>
                <FormSubmitHint visible={!requestForm.formState.isValid} />

                <SubmitButton
                  disabled={loadingOptions || !requestForm.formState.isValid}
                >
                  {loadingOptions
                    ? t("recovery.pin.submit.loadingOptions")
                    : t("recovery.pin.submit.continueToQuestions")}
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
                  {t("recovery.password.accountDetected")}{" "}
                  <span className="font-medium text-text-primary">
                    {options.principalHint}
                  </span>
                </p>
                <FormField
                  label={t("recovery.password.fields.birthDate")}
                  error={verifyForm.formState.errors.birthDate?.message}
                >
                  <Controller
                    control={verifyForm.control}
                    name="birthDate"
                    render={({ field }) => (
                      <DateInput
                        aria-label={t("recovery.password.fields.birthDate")}
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
                  {verifying
                    ? t("recovery.pin.submit.verifying")
                    : t("recovery.pin.submit.verify")}
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
                  label={t("recovery.pin.fields.newPin")}
                  error={completeForm.formState.errors.newPin?.message}
                >
                  <Controller
                    control={completeForm.control}
                    name="newPin"
                    render={({ field }) => (
                      <PinInput
                        aria-label={t("recovery.pin.fields.newPin")}
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
                        placeholder={t("recovery.pin.pinPlaceholder")}
                      />
                    )}
                  />
                </FormField>
                <FormField
                  label={t("recovery.pin.fields.confirmPin")}
                  error={completeForm.formState.errors.confirmPin?.message}
                >
                  <Controller
                    control={completeForm.control}
                    name="confirmPin"
                    render={({ field }) => (
                      <PinInput
                        aria-label={t("recovery.pin.fields.confirmPin")}
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
                        placeholder={t("recovery.pin.pinPlaceholder")}
                      />
                    )}
                  />
                </FormField>
                <FormSubmitHint visible={!completeForm.formState.isValid} />
                <SubmitButton
                  disabled={completing || !completeForm.formState.isValid}
                >
                  {completing
                    ? t("recovery.pin.submit.resetting")
                    : t("recovery.pin.submit.reset")}
                </SubmitButton>
              </form>
            ) : null}

            {error ? (
              <p className="text-sm text-notification">{error}</p>
            ) : null}
            {success ? <p className="text-sm text-success">{success}</p> : null}

            <BackLinkButton href={loginHref}>
              {t("recovery.password.backToLogin")}
            </BackLinkButton>
          </div>
        </Card>
      </div>
    </RecoveryShell>
  );
}

function PinRecoveryFallback() {
  const { t } = useTranslation();
  return (
    <RecoveryShell title={t("recovery.pin.shell.title")}>
      <div className="mx-auto w-full max-w-2xl">
        <Card
          title={t("recovery.pin.cardTitle")}
          subtitle={t("common.loading")}
        >
          <p className="text-sm text-text-secondary">{t("common.loading")}</p>
        </Card>
      </div>
    </RecoveryShell>
  );
}

export default function PinRecoveryPage() {
  return (
    <Suspense fallback={<PinRecoveryFallback />}>
      <PinRecoveryPageContent />
    </Suspense>
  );
}
