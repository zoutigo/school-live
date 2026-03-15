"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, KeyRound, ShieldCheck, UserCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { RecoveryShell } from "../../components/layout/recovery-shell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { DateInput } from "../../components/ui/date-input";
import { EmailInput } from "../../components/ui/email-input";
import { BackButton, SubmitButton } from "../../components/ui/form-buttons";
import {
  FormCheckbox,
  FormSelect,
  FormSubmitHint,
  FormTextInput,
} from "../../components/ui/form-controls";
import { FormField } from "../../components/ui/form-field";
import { PasswordInput } from "../../components/ui/password-input";
import { PasswordRequirementsHint } from "../../components/ui/password-requirements-hint";
import { PinInput } from "../../components/ui/pin-input";
import {
  buildRecoveryRows,
  step1PhoneSchema,
  step1Schema,
  step2Schema,
  step3PinSchema,
  step4Schema,
} from "./onboarding-schema";
import { type QuestionKey, useOnboardingStore } from "./onboarding-store";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type SetupOptionsResponse = {
  schoolSlug: string | null;
  schoolRoles: string[];
  questions: Array<{ key: QuestionKey; label: string }>;
  classes: Array<{ id: string; name: string; year: string }>;
  students: Array<{ id: string; firstName: string; lastName: string }>;
};

type StepKey = 1 | 2 | 3 | 4;

function OnboardingContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [step, setStep] = useState<StepKey>(1);
  const [options, setOptions] = useState<SetupOptionsResponse | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupToken, setSetupToken] = useState("");

  const {
    email,
    schoolSlug,
    temporaryPassword,
    newPassword,
    confirmPassword,
    newPin,
    confirmPin,
    firstName,
    lastName,
    gender,
    birthDate,
    parentClassId,
    parentStudentId,
    selectedQuestions,
    answers,
    setField,
    setAnswer,
    reset,
  } = useOnboardingStore();

  useEffect(() => {
    const emailFromQuery = params.get("email") ?? "";
    const schoolSlugFromQuery = params.get("schoolSlug") ?? "";
    const tokenFromQuery = params.get("token") ?? "";

    if (emailFromQuery && emailFromQuery !== email) {
      setField("email", emailFromQuery);
    }
    if (schoolSlugFromQuery && schoolSlugFromQuery !== schoolSlug) {
      setField("schoolSlug", schoolSlugFromQuery);
    }
    if (tokenFromQuery && tokenFromQuery !== setupToken) {
      setSetupToken(tokenFromQuery);
    }
  }, [params, setField, email, schoolSlug, setupToken]);

  useEffect(() => {
    if (!email && !setupToken) {
      return;
    }

    const timeout = setTimeout(() => {
      void loadOptions();
    }, 150);

    return () => clearTimeout(timeout);
  }, [email, setupToken]);

  async function loadOptions() {
    setLoadingOptions(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (setupToken) {
        query.set("setupToken", setupToken);
      } else {
        query.set("email", email);
      }
      const response = await fetch(
        `${API_URL}/auth/onboarding/options?${query.toString()}`,
      );

      if (!response.ok) {
        setError("Impossible de charger les options d'activation.");
        return;
      }

      const payload = (await response.json()) as SetupOptionsResponse;
      setOptions(payload);
      if (payload.schoolSlug && !schoolSlug) {
        setField("schoolSlug", payload.schoolSlug);
      }
    } catch {
      setError("Erreur de connexion.");
    } finally {
      setLoadingOptions(false);
    }
  }

  const isParent = useMemo(
    () => (options?.schoolRoles ?? []).includes("PARENT"),
    [options?.schoolRoles],
  );
  const isTokenFlow = setupToken.length > 0;
  const totalSteps = isTokenFlow ? 4 : 3;
  const phoneFromQuery = params.get("phone") ?? "";
  const passwordStepForm = useForm<
    z.input<typeof step1Schema>,
    unknown,
    z.output<typeof step1Schema>
  >({
    resolver: zodResolver(step1Schema),
    mode: "onChange",
    defaultValues: {
      email,
      temporaryPassword,
      newPassword,
      confirmPassword,
    },
  });
  const tokenStepForm = useForm<
    z.input<typeof step1PhoneSchema>,
    unknown,
    z.output<typeof step1PhoneSchema>
  >({
    resolver: zodResolver(step1PhoneSchema),
    mode: "onChange",
    defaultValues: {
      email,
      setupToken,
    },
  });
  const profileStepForm = useForm<
    z.input<typeof step2Schema>,
    unknown,
    z.output<typeof step2Schema>
  >({
    resolver: zodResolver(step2Schema),
    mode: "onChange",
    defaultValues: {
      firstName,
      lastName,
      gender: gender || undefined,
      birthDate,
    },
  });
  const pinStepForm = useForm<
    z.input<typeof step3PinSchema>,
    unknown,
    z.output<typeof step3PinSchema>
  >({
    resolver: zodResolver(step3PinSchema),
    mode: "onChange",
    defaultValues: {
      newPin,
      confirmPin,
    },
  });
  const recoveryStepForm = useForm<
    z.input<typeof step4Schema>,
    unknown,
    z.output<typeof step4Schema>
  >({
    resolver: zodResolver(step4Schema),
    mode: "onChange",
    defaultValues: {
      selectedQuestions,
      answers,
      isParent,
      parentClassId,
      parentStudentId,
    },
  });
  const passwordStepValues = passwordStepForm.watch();
  const tokenStepValues = tokenStepForm.watch();
  const profileStepValues = profileStepForm.watch();
  const pinStepValues = pinStepForm.watch();
  const recoveryStepValues = recoveryStepForm.watch();
  const canContinueCurrentStep = useMemo(() => {
    if (step === 1) {
      return isTokenFlow
        ? tokenStepForm.formState.isValid
        : passwordStepForm.formState.isValid;
    }
    if (step === 2) {
      return profileStepForm.formState.isValid;
    }
    if (step === 3 && isTokenFlow) {
      return pinStepForm.formState.isValid;
    }
    if ((step === 3 && !isTokenFlow) || (step === 4 && isTokenFlow)) {
      return recoveryStepForm.formState.isValid;
    }
    return true;
  }, [
    step,
    isTokenFlow,
    tokenStepForm.formState.isValid,
    passwordStepForm.formState.isValid,
    profileStepForm.formState.isValid,
    pinStepForm.formState.isValid,
    recoveryStepForm.formState.isValid,
  ]);

  useEffect(() => {
    setField("email", passwordStepValues.email ?? "");
    setField("temporaryPassword", passwordStepValues.temporaryPassword ?? "");
    setField("newPassword", passwordStepValues.newPassword ?? "");
    setField("confirmPassword", passwordStepValues.confirmPassword ?? "");
  }, [
    passwordStepValues.email,
    passwordStepValues.temporaryPassword,
    passwordStepValues.newPassword,
    passwordStepValues.confirmPassword,
    setField,
  ]);

  useEffect(() => {
    setField("email", tokenStepValues.email ?? "");
  }, [tokenStepValues.email, setField]);

  useEffect(() => {
    setField("firstName", profileStepValues.firstName ?? "");
    setField("lastName", profileStepValues.lastName ?? "");
    setField("gender", (profileStepValues.gender ?? "") as "M" | "F" | "OTHER");
    setField("birthDate", profileStepValues.birthDate ?? "");
  }, [
    profileStepValues.firstName,
    profileStepValues.lastName,
    profileStepValues.gender,
    profileStepValues.birthDate,
    setField,
  ]);

  useEffect(() => {
    setField("newPin", pinStepValues.newPin ?? "");
    setField("confirmPin", pinStepValues.confirmPin ?? "");
  }, [pinStepValues.newPin, pinStepValues.confirmPin, setField]);

  useEffect(() => {
    const nextSelectedQuestions = recoveryStepValues.selectedQuestions ?? [];
    const nextAnswers = recoveryStepValues.answers ?? {};
    const nextParentClassId = recoveryStepValues.parentClassId ?? "";
    const nextParentStudentId = recoveryStepValues.parentStudentId ?? "";

    if (
      JSON.stringify(nextSelectedQuestions) !==
      JSON.stringify(selectedQuestions)
    ) {
      setField("selectedQuestions", nextSelectedQuestions);
    }
    if (JSON.stringify(nextAnswers) !== JSON.stringify(answers)) {
      for (const questionKey of Object.keys(nextAnswers)) {
        setAnswer(questionKey as QuestionKey, nextAnswers[questionKey] ?? "");
      }
    }
    if (parentClassId !== nextParentClassId) {
      setField("parentClassId", nextParentClassId);
    }
    if (parentStudentId !== nextParentStudentId) {
      setField("parentStudentId", nextParentStudentId);
    }
  }, [
    recoveryStepValues.selectedQuestions,
    recoveryStepValues.answers,
    recoveryStepValues.parentClassId,
    recoveryStepValues.parentStudentId,
    selectedQuestions,
    answers,
    parentClassId,
    parentStudentId,
    setField,
    setAnswer,
  ]);

  useEffect(() => {
    tokenStepForm.setValue("setupToken", setupToken, {
      shouldValidate: true,
    });
  }, [setupToken, tokenStepForm]);

  useEffect(() => {
    recoveryStepForm.setValue("isParent", isParent, {
      shouldValidate: true,
    });
  }, [isParent, recoveryStepForm]);

  async function nextStep() {
    setError(null);
    const isCurrentStepValid =
      step === 1
        ? isTokenFlow
          ? await tokenStepForm.trigger()
          : await passwordStepForm.trigger()
        : step === 2
          ? await profileStepForm.trigger()
          : step === 3 && isTokenFlow
            ? await pinStepForm.trigger()
            : await recoveryStepForm.trigger();
    if (!isCurrentStepValid) {
      return;
    }
    if (step < totalSteps) {
      setStep((value) => (value + 1) as StepKey);
    }
  }

  function previousStep() {
    setError(null);
    if (step > 1) {
      setStep((value) => (value - 1) as StepKey);
    }
  }

  async function onSubmit() {
    setError(null);

    const isPasswordStepValid = isTokenFlow
      ? true
      : await passwordStepForm.trigger();
    const isTokenStepValid = isTokenFlow ? await tokenStepForm.trigger() : true;
    const isProfileStepValid = await profileStepForm.trigger();
    const isPinStepValid = isTokenFlow ? await pinStepForm.trigger() : true;
    const isRecoveryStepValid = await recoveryStepForm.trigger();
    if (
      !isPasswordStepValid ||
      !isTokenStepValid ||
      !isProfileStepValid ||
      !isPinStepValid ||
      !isRecoveryStepValid
    ) {
      return;
    }

    const recoveryRows = buildRecoveryRows(
      recoveryStepValues.selectedQuestions ?? [],
      recoveryStepValues.answers ?? {},
    );
    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/auth/onboarding/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isTokenFlow
            ? {
                setupToken,
                email: (tokenStepValues.email ?? "").trim() || undefined,
                newPin: pinStepValues.newPin ?? "",
              }
            : {
                email: passwordStepValues.email ?? "",
                temporaryPassword: passwordStepValues.temporaryPassword ?? "",
                newPassword: passwordStepValues.newPassword ?? "",
              }),
          firstName: profileStepValues.firstName ?? "",
          lastName: profileStepValues.lastName ?? "",
          gender: profileStepValues.gender ?? "",
          birthDate: profileStepValues.birthDate ?? "",
          answers: recoveryRows,
          parentClassId: recoveryStepValues.parentClassId || undefined,
          parentStudentId: recoveryStepValues.parentStudentId || undefined,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          payload?.message && Array.isArray(payload.message)
            ? payload.message.join(", ")
            : (payload?.message ?? "Activation impossible.");
        setError(String(message));
        return;
      }

      await response.json();
      reset();
      router.push("/");
    } catch {
      setError("Erreur reseau.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <RecoveryShell
      title="Activation de compte"
      contentMaxWidthClassName="max-w-7xl"
      centerContent={false}
    >
      <div className="grid w-full grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <section className="order-2 rounded-card border border-border bg-surface p-6 shadow-card lg:p-8 xl:order-1">
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold uppercase tracking-wide text-text-secondary">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Onboarding securise
          </p>

          <h1 className="mt-4 font-heading text-3xl font-bold leading-tight md:text-4xl">
            Activez votre compte en une seule sequence
          </h1>

          <p className="mt-4 max-w-xl text-base text-text-secondary">
            Renseignez les informations d&apos;activation, votre profil et vos
            questions de recuperation. A la fin, vous retournez directement a la
            connexion.
          </p>

          <div className="mt-6 grid gap-3 text-sm">
            <div className="flex items-start gap-3 rounded-card border border-border bg-background p-3">
              <KeyRound className="mt-0.5 h-4 w-4 text-primary" />
              <p className="text-text-secondary">
                {isTokenFlow
                  ? "Etape 1: email optionnel."
                  : "Etape 1: mot de passe provisoire et nouveau mot de passe."}
              </p>
            </div>
            <div className="flex items-start gap-3 rounded-card border border-border bg-background p-3">
              <UserCheck className="mt-0.5 h-4 w-4 text-primary" />
              <p className="text-text-secondary">
                Etape 2: informations personnelles (nom, prenom, genre, date de
                naissance).
              </p>
            </div>
            <div className="flex items-start gap-3 rounded-card border border-border bg-background p-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
              <p className="text-text-secondary">
                {isTokenFlow
                  ? "Etape 3: changement du PIN de connexion."
                  : "Etape 3: questions de recuperation puis validation finale."}
              </p>
            </div>
            {isTokenFlow ? (
              <div className="flex items-start gap-3 rounded-card border border-border bg-background p-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                <p className="text-text-secondary">
                  Etape 4: questions de recuperation puis validation finale.
                </p>
              </div>
            ) : null}
          </div>

          <img
            src="/images/camer-school1.png"
            alt="Scene de classe"
            className="mt-6 hidden h-56 w-full rounded-card border border-border object-cover object-center md:h-64 lg:block"
          />
        </section>

        <Card
          title="Finaliser l'activation"
          subtitle={`Etape ${step} / ${totalSteps}`}
          className="order-1 self-start xl:order-2 xl:sticky xl:top-6"
        >
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void onSubmit();
            }}
          >
            <div className="grid gap-1 text-sm">
              <span className="text-text-secondary">Compte concerne</span>
              <div className="rounded-card border border-border bg-background px-3 py-2 text-text-primary">
                {passwordStepValues.email ||
                  tokenStepValues.email ||
                  phoneFromQuery ||
                  "Compte en attente"}
              </div>
            </div>

            {step === 1 ? (
              <>
                {isTokenFlow ? (
                  <>
                    <FormField
                      label="Email (optionnel)"
                      error={tokenStepForm.formState.errors.email?.message}
                    >
                      <EmailInput
                        value={tokenStepValues.email ?? ""}
                        onChange={(event) => {
                          tokenStepForm.setValue("email", event.target.value, {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                          });
                        }}
                        placeholder="prenom.nom@gmail.com"
                      />
                    </FormField>
                    <p className="text-xs text-text-secondary">
                      Vous pouvez continuer sans email et le renseigner plus
                      tard dans votre compte.
                    </p>
                  </>
                ) : (
                  <>
                    <FormField
                      label="Mot de passe provisoire"
                      error={
                        passwordStepForm.formState.errors.temporaryPassword
                          ?.message
                      }
                    >
                      <PasswordInput
                        value={passwordStepValues.temporaryPassword ?? ""}
                        onChange={(event) => {
                          passwordStepForm.setValue(
                            "temporaryPassword",
                            event.target.value,
                            {
                              shouldDirty: true,
                              shouldTouch: true,
                              shouldValidate: true,
                            },
                          );
                        }}
                      />
                    </FormField>

                    <FormField
                      label="Nouveau mot de passe"
                      error={
                        passwordStepForm.formState.errors.newPassword?.message
                      }
                    >
                      <PasswordInput
                        value={passwordStepValues.newPassword ?? ""}
                        onChange={(event) => {
                          passwordStepForm.setValue(
                            "newPassword",
                            event.target.value,
                            {
                              shouldDirty: true,
                              shouldTouch: true,
                              shouldValidate: true,
                            },
                          );
                        }}
                      />
                    </FormField>
                    <PasswordRequirementsHint
                      password={passwordStepValues.newPassword ?? ""}
                    />

                    <FormField
                      label="Confirmation"
                      error={
                        passwordStepForm.formState.errors.confirmPassword
                          ?.message
                      }
                    >
                      <PasswordInput
                        value={passwordStepValues.confirmPassword ?? ""}
                        onChange={(event) => {
                          passwordStepForm.setValue(
                            "confirmPassword",
                            event.target.value,
                            {
                              shouldDirty: true,
                              shouldTouch: true,
                              shouldValidate: true,
                            },
                          );
                        }}
                      />
                    </FormField>
                  </>
                )}
              </>
            ) : null}

            {step === 2 ? (
              <>
                <div className="grid gap-3 md:grid-cols-2">
                  <FormField
                    label="Prenom"
                    error={profileStepForm.formState.errors.firstName?.message}
                  >
                    <FormTextInput
                      aria-label="Prenom"
                      invalid={!!profileStepForm.formState.errors.firstName}
                      value={profileStepValues.firstName ?? ""}
                      onChange={(event) => {
                        profileStepForm.setValue(
                          "firstName",
                          event.target.value,
                          {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                          },
                        );
                      }}
                    />
                  </FormField>

                  <FormField
                    label="Nom"
                    error={profileStepForm.formState.errors.lastName?.message}
                  >
                    <FormTextInput
                      aria-label="Nom"
                      invalid={!!profileStepForm.formState.errors.lastName}
                      value={profileStepValues.lastName ?? ""}
                      onChange={(event) => {
                        profileStepForm.setValue(
                          "lastName",
                          event.target.value,
                          {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                          },
                        );
                      }}
                    />
                  </FormField>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <FormField
                    label="Genre"
                    error={profileStepForm.formState.errors.gender?.message}
                  >
                    <FormSelect
                      aria-label="Genre"
                      invalid={!!profileStepForm.formState.errors.gender}
                      value={profileStepValues.gender ?? ""}
                      onChange={(event) => {
                        profileStepForm.setValue(
                          "gender",
                          event.target.value as "M" | "F" | "OTHER",
                          {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                          },
                        );
                      }}
                    >
                      <option value="">Selectionner</option>
                      <option value="M">Masculin</option>
                      <option value="F">Feminin</option>
                      <option value="OTHER">Autre</option>
                    </FormSelect>
                  </FormField>

                  <FormField
                    label="Date de naissance"
                    error={profileStepForm.formState.errors.birthDate?.message}
                  >
                    <DateInput
                      value={profileStepValues.birthDate ?? ""}
                      onChange={(event) => {
                        profileStepForm.setValue(
                          "birthDate",
                          event.target.value,
                          {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                          },
                        );
                      }}
                      className={`rounded-card border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary ${
                        profileStepForm.formState.errors.birthDate
                          ? "border-notification"
                          : "border-border"
                      }`}
                    />
                  </FormField>
                </div>
              </>
            ) : null}

            {step === 3 && isTokenFlow ? (
              <>
                <div className="rounded-card border border-border bg-background p-3">
                  <p className="mb-2 text-sm text-text-secondary">
                    Modifiez votre PIN de connexion
                  </p>
                  <div className="grid gap-3">
                    <FormField
                      label="Nouveau PIN"
                      error={pinStepForm.formState.errors.newPin?.message}
                    >
                      <PinInput
                        value={pinStepValues.newPin ?? ""}
                        onChange={(event) => {
                          pinStepForm.setValue(
                            "newPin",
                            event.target.value.replace(/\D/g, "").slice(0, 6),
                            {
                              shouldDirty: true,
                              shouldTouch: true,
                              shouldValidate: true,
                            },
                          );
                        }}
                        placeholder="654321"
                        className={`${
                          pinStepForm.formState.errors.newPin
                            ? "border-notification"
                            : "border-border"
                        }`}
                      />
                    </FormField>
                    <FormField
                      label="Confirmer PIN"
                      error={pinStepForm.formState.errors.confirmPin?.message}
                    >
                      <PinInput
                        value={pinStepValues.confirmPin ?? ""}
                        onChange={(event) => {
                          pinStepForm.setValue(
                            "confirmPin",
                            event.target.value.replace(/\D/g, "").slice(0, 6),
                            {
                              shouldDirty: true,
                              shouldTouch: true,
                              shouldValidate: true,
                            },
                          );
                        }}
                        placeholder="654321"
                        className={`${
                          pinStepForm.formState.errors.confirmPin
                            ? "border-notification"
                            : "border-border"
                        }`}
                      />
                    </FormField>
                  </div>
                </div>
              </>
            ) : null}

            {(step === 3 && !isTokenFlow) || (step === 4 && isTokenFlow) ? (
              <>
                <div className="rounded-card border border-border bg-background p-3">
                  <p className="mb-2 text-sm text-text-secondary">
                    Choisissez 3 questions de recuperation
                  </p>
                  <div className="grid gap-2">
                    {(options?.questions ?? []).map((question) => {
                      const checked = (
                        recoveryStepValues.selectedQuestions ?? []
                      ).includes(question.key);
                      const canSelectMore =
                        checked ||
                        (recoveryStepValues.selectedQuestions ?? []).length < 3;
                      return (
                        <label
                          key={question.key}
                          className="grid gap-1 text-sm"
                        >
                          <span className="flex items-center gap-2">
                            <FormCheckbox
                              checked={checked}
                              disabled={!canSelectMore}
                              onChange={() => {
                                const currentQuestions =
                                  recoveryStepValues.selectedQuestions ?? [];
                                const nextQuestions = checked
                                  ? currentQuestions.filter(
                                      (entry) => entry !== question.key,
                                    )
                                  : [...currentQuestions, question.key];
                                recoveryStepForm.setValue(
                                  "selectedQuestions",
                                  nextQuestions,
                                  {
                                    shouldDirty: true,
                                    shouldTouch: true,
                                    shouldValidate: true,
                                  },
                                );
                              }}
                            />
                            <span>{question.label}</span>
                          </span>
                          {checked ? (
                            <FormField
                              label="Votre reponse"
                              className="pl-6"
                              error={
                                recoveryStepForm.formState.errors.answers?.[
                                  question.key
                                ]?.message
                              }
                            >
                              <FormTextInput
                                aria-label={question.label}
                                invalid={
                                  !!recoveryStepForm.formState.errors.answers?.[
                                    question.key
                                  ]
                                }
                                value={
                                  recoveryStepValues.answers?.[question.key] ??
                                  ""
                                }
                                onChange={(event) => {
                                  recoveryStepForm.setValue(
                                    `answers.${question.key}`,
                                    event.target.value,
                                    {
                                      shouldDirty: true,
                                      shouldTouch: true,
                                      shouldValidate: true,
                                    },
                                  );
                                }}
                                placeholder="Votre reponse"
                              />
                            </FormField>
                          ) : null}
                        </label>
                      );
                    })}
                  </div>
                </div>

                {isParent ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <FormField
                      label="Classe de votre enfant"
                      error={
                        recoveryStepForm.formState.errors.parentClassId?.message
                      }
                    >
                      <FormSelect
                        invalid={
                          !!recoveryStepForm.formState.errors.parentClassId
                        }
                        value={recoveryStepValues.parentClassId ?? ""}
                        onChange={(event) => {
                          recoveryStepForm.setValue(
                            "parentClassId",
                            event.target.value,
                            {
                              shouldDirty: true,
                              shouldTouch: true,
                              shouldValidate: true,
                            },
                          );
                        }}
                      >
                        <option value="">Selectionner une classe</option>
                        {(options?.classes ?? []).map((entry) => (
                          <option key={entry.id} value={entry.id}>
                            {entry.name} ({entry.year})
                          </option>
                        ))}
                      </FormSelect>
                    </FormField>

                    <FormField
                      label="Nom de l'enfant"
                      error={
                        recoveryStepForm.formState.errors.parentStudentId
                          ?.message
                      }
                    >
                      <FormSelect
                        invalid={
                          !!recoveryStepForm.formState.errors.parentStudentId
                        }
                        value={recoveryStepValues.parentStudentId ?? ""}
                        onChange={(event) => {
                          recoveryStepForm.setValue(
                            "parentStudentId",
                            event.target.value,
                            {
                              shouldDirty: true,
                              shouldTouch: true,
                              shouldValidate: true,
                            },
                          );
                        }}
                      >
                        <option value="">Selectionner un eleve</option>
                        {(options?.students ?? []).map((entry) => (
                          <option key={entry.id} value={entry.id}>
                            {entry.lastName} {entry.firstName}
                          </option>
                        ))}
                      </FormSelect>
                    </FormField>
                  </div>
                ) : null}
              </>
            ) : null}

            {loadingOptions ? (
              <p className="text-sm text-text-secondary">
                Chargement des options...
              </p>
            ) : null}
            {error ? (
              <p className="text-sm text-notification">{error}</p>
            ) : null}
            <FormSubmitHint visible={!canContinueCurrentStep} />

            <div className="flex flex-wrap gap-2">
              {step > 1 ? <BackButton onClick={previousStep} /> : null}

              {step < totalSteps ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  disabled={!canContinueCurrentStep}
                >
                  Continuer
                </Button>
              ) : (
                <SubmitButton disabled={submitting || !canContinueCurrentStep}>
                  {submitting ? "Validation..." : "Finaliser l'activation"}
                </SubmitButton>
              )}
            </div>
          </form>
        </Card>
      </div>
    </RecoveryShell>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background p-6 text-text-secondary">
          Chargement...
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
