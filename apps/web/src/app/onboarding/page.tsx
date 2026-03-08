"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, KeyRound, ShieldCheck, UserCheck } from "lucide-react";
import { RecoveryShell } from "../../components/layout/recovery-shell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { DateInput } from "../../components/ui/date-input";
import { EmailInput } from "../../components/ui/email-input";
import { BackButton, SubmitButton } from "../../components/ui/form-buttons";
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
    toggleQuestion,
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
  const step2Validation = useMemo(
    () =>
      step2Schema.safeParse({
        firstName,
        lastName,
        gender,
        birthDate,
      }),
    [firstName, lastName, gender, birthDate],
  );
  const [step2Touched, setStep2Touched] = useState({
    firstName: false,
    lastName: false,
    gender: false,
    birthDate: false,
  });
  const step2FieldErrors = useMemo(() => {
    if (step2Validation.success) {
      return {
        firstName: null as string | null,
        lastName: null as string | null,
        gender: null as string | null,
        birthDate: null as string | null,
      };
    }
    return {
      firstName:
        step2Validation.error.issues.find(
          (issue) => issue.path[0] === "firstName",
        )?.message ?? null,
      lastName:
        step2Validation.error.issues.find((issue) => issue.path[0] === "lastName")
          ?.message ?? null,
      gender:
        step2Validation.error.issues.find((issue) => issue.path[0] === "gender")
          ?.message ?? null,
      birthDate:
        step2Validation.error.issues.find(
          (issue) => issue.path[0] === "birthDate",
        )?.message ?? null,
    };
  }, [step2Validation]);
  const [pinTouched, setPinTouched] = useState({
    newPin: false,
    confirmPin: false,
  });
  const pinValidation = useMemo(
    () =>
      step3PinSchema.safeParse({
        newPin,
        confirmPin,
      }),
    [newPin, confirmPin],
  );
  const pinFieldErrors = useMemo(() => {
    if (pinValidation.success) {
      return { newPin: null as string | null, confirmPin: null as string | null };
    }
    return {
      newPin:
        pinValidation.error.issues.find((issue) => issue.path[0] === "newPin")
          ?.message ?? null,
      confirmPin:
        pinValidation.error.issues.find(
          (issue) => issue.path[0] === "confirmPin",
        )?.message ?? null,
    };
  }, [pinValidation]);
  const canContinueCurrentStep = useMemo(() => {
    if (step === 1) {
      return isTokenFlow
        ? step1PhoneSchema.safeParse({ email, setupToken }).success
        : step1Schema.safeParse({
            email,
            temporaryPassword,
            newPassword,
            confirmPassword,
          }).success;
    }
    if (step === 2) {
      return step2Validation.success;
    }
    if (step === 3 && isTokenFlow) {
      return pinValidation.success;
    }
    if ((step === 3 && !isTokenFlow) || (step === 4 && isTokenFlow)) {
      return step4Schema.safeParse({
        selectedQuestions,
        answers,
        isParent,
        parentClassId: parentClassId || undefined,
        parentStudentId: parentStudentId || undefined,
      }).success;
    }
    return true;
  }, [
    step,
    isTokenFlow,
    email,
    setupToken,
    temporaryPassword,
    newPassword,
    confirmPassword,
    step2Validation.success,
    pinValidation.success,
    selectedQuestions,
    answers,
    isParent,
    parentClassId,
    parentStudentId,
  ]);

  function validateRecoveryStep() {
    const parsed = step4Schema.safeParse({
      selectedQuestions,
      answers,
      isParent,
      parentClassId: parentClassId || undefined,
      parentStudentId: parentStudentId || undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Etape de securite invalide.");
      return false;
    }
    return true;
  }

  function validateStep(target: StepKey): boolean {
    setError(null);

    if (target === 1) {
      const parsed = isTokenFlow
        ? step1PhoneSchema.safeParse({
            email,
            setupToken,
          })
        : step1Schema.safeParse({
            email,
            temporaryPassword,
            newPassword,
            confirmPassword,
          });
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Etape 1 invalide.");
        return false;
      }
      return true;
    }

    if (target === 2) {
      if (!step2Validation.success) {
        setError(step2Validation.error.issues[0]?.message ?? "Etape 2 invalide.");
        return false;
      }
      return true;
    }

    if (target === 3 && isTokenFlow) {
      if (!pinValidation.success) {
        setError(pinValidation.error.issues[0]?.message ?? "Etape 3 invalide.");
        return false;
      }
      return true;
    }

    if (!validateRecoveryStep()) {
      return false;
    }
    return true;
  }

  function nextStep() {
    if (step === 2) {
      setStep2Touched({
        firstName: true,
        lastName: true,
        gender: true,
        birthDate: true,
      });
    }
    if (step === 3 && isTokenFlow) {
      setPinTouched({
        newPin: true,
        confirmPin: true,
      });
    }
    if (!validateStep(step)) {
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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const requiredSteps = isTokenFlow ? [1, 2, 3, 4] : [1, 2, 3];
    const isFlowValid = requiredSteps.every((requiredStep) =>
      validateStep(requiredStep as StepKey),
    );
    if (!isFlowValid) {
      return;
    }

    const recoveryRows = buildRecoveryRows(selectedQuestions, answers);
    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/auth/onboarding/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isTokenFlow
            ? {
                setupToken,
                email: email.trim() || undefined,
                newPin,
              }
            : {
                email,
                temporaryPassword,
                newPassword,
              }),
          firstName,
          lastName,
          gender,
          birthDate,
          answers: recoveryRows,
          parentClassId: parentClassId || undefined,
          parentStudentId: parentStudentId || undefined,
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
          <form className="grid gap-3" onSubmit={onSubmit}>
            <div className="grid gap-1 text-sm">
              <span className="text-text-secondary">Compte concerne</span>
              <div className="rounded-card border border-border bg-background px-3 py-2 text-text-primary">
                {email || phoneFromQuery || "Compte en attente"}
              </div>
            </div>

            {step === 1 ? (
              <>
                {isTokenFlow ? (
                  <>
                    <FormField label="Email (optionnel)">
                      <EmailInput
                        value={email}
                        onChange={(event) =>
                          setField("email", event.target.value)
                        }
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
                    <FormField label="Mot de passe provisoire">
                      <PasswordInput
                        value={temporaryPassword}
                        onChange={(event) =>
                          setField("temporaryPassword", event.target.value)
                        }
                      />
                    </FormField>

                    <FormField label="Nouveau mot de passe">
                      <PasswordInput
                        value={newPassword}
                        onChange={(event) =>
                          setField("newPassword", event.target.value)
                        }
                      />
                    </FormField>
                    <PasswordRequirementsHint password={newPassword} />

                    <FormField label="Confirmation">
                      <PasswordInput
                        value={confirmPassword}
                        onChange={(event) =>
                          setField("confirmPassword", event.target.value)
                        }
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
                    error={step2Touched.firstName ? step2FieldErrors.firstName : null}
                  >
                    <input
                      value={firstName}
                      onChange={(event) =>
                        setField("firstName", event.target.value)
                      }
                      onBlur={() =>
                        setStep2Touched((state) => ({ ...state, firstName: true }))
                      }
                      className={`rounded-card border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary ${
                        step2Touched.firstName && step2FieldErrors.firstName
                          ? "border-notification"
                          : "border-border"
                      }`}
                    />
                  </FormField>

                  <FormField
                    label="Nom"
                    error={step2Touched.lastName ? step2FieldErrors.lastName : null}
                  >
                    <input
                      value={lastName}
                      onChange={(event) =>
                        setField("lastName", event.target.value)
                      }
                      onBlur={() =>
                        setStep2Touched((state) => ({ ...state, lastName: true }))
                      }
                      className={`rounded-card border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary ${
                        step2Touched.lastName && step2FieldErrors.lastName
                          ? "border-notification"
                          : "border-border"
                      }`}
                    />
                  </FormField>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <FormField
                    label="Genre"
                    error={step2Touched.gender ? step2FieldErrors.gender : null}
                  >
                    <select
                      value={gender}
                      onChange={(event) =>
                        setField(
                          "gender",
                          event.target.value as "M" | "F" | "OTHER",
                        )
                      }
                      onBlur={() =>
                        setStep2Touched((state) => ({ ...state, gender: true }))
                      }
                      className={`rounded-card border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary ${
                        step2Touched.gender && step2FieldErrors.gender
                          ? "border-notification"
                          : "border-border"
                      }`}
                    >
                      <option value="">Selectionner</option>
                      <option value="M">Masculin</option>
                      <option value="F">Feminin</option>
                      <option value="OTHER">Autre</option>
                    </select>
                  </FormField>

                  <FormField
                    label="Date de naissance"
                    error={
                      step2Touched.birthDate ? step2FieldErrors.birthDate : null
                    }
                  >
                    <DateInput
                      value={birthDate}
                      onChange={(event) =>
                        setField("birthDate", event.target.value)
                      }
                      onBlur={() =>
                        setStep2Touched((state) => ({ ...state, birthDate: true }))
                      }
                      className={`rounded-card border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary ${
                        step2Touched.birthDate && step2FieldErrors.birthDate
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
                      error={pinTouched.newPin ? pinFieldErrors.newPin : null}
                    >
                      <PinInput
                        value={newPin}
                        onChange={(event) =>
                          setField(
                            "newPin",
                            event.target.value.replace(/\D/g, "").slice(0, 6),
                          )
                        }
                        onBlur={() =>
                          setPinTouched((state) => ({ ...state, newPin: true }))
                        }
                        placeholder="654321"
                        className={`${
                          pinTouched.newPin && pinFieldErrors.newPin
                            ? "border-notification"
                            : "border-border"
                        }`}
                      />
                    </FormField>
                    <FormField
                      label="Confirmer PIN"
                      error={
                        pinTouched.confirmPin ? pinFieldErrors.confirmPin : null
                      }
                    >
                      <PinInput
                        value={confirmPin}
                        onChange={(event) =>
                          setField(
                            "confirmPin",
                            event.target.value.replace(/\D/g, "").slice(0, 6),
                          )
                        }
                        onBlur={() =>
                          setPinTouched((state) => ({
                            ...state,
                            confirmPin: true,
                          }))
                        }
                        placeholder="654321"
                        className={`${
                          pinTouched.confirmPin && pinFieldErrors.confirmPin
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
                      const checked = selectedQuestions.includes(question.key);
                      const canSelectMore =
                        checked || selectedQuestions.length < 3;
                      return (
                        <label
                          key={question.key}
                          className="grid gap-1 text-sm"
                        >
                          <span className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={!canSelectMore}
                              onChange={() => toggleQuestion(question.key)}
                            />
                            <span>{question.label}</span>
                          </span>
                          {checked ? (
                            <input
                              value={answers[question.key] ?? ""}
                              onChange={(event) =>
                                setAnswer(question.key, event.target.value)
                              }
                              placeholder="Votre reponse"
                              className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                            />
                          ) : null}
                        </label>
                      );
                    })}
                  </div>
                </div>

                {isParent ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="grid gap-1 text-sm">
                      <span className="text-text-secondary">
                        Classe de votre enfant
                      </span>
                      <select
                        value={parentClassId}
                        onChange={(event) =>
                          setField("parentClassId", event.target.value)
                        }
                        className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">Selectionner une classe</option>
                        {(options?.classes ?? []).map((entry) => (
                          <option key={entry.id} value={entry.id}>
                            {entry.name} ({entry.year})
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-1 text-sm">
                      <span className="text-text-secondary">
                        Nom de l&apos;enfant
                      </span>
                      <select
                        value={parentStudentId}
                        onChange={(event) =>
                          setField("parentStudentId", event.target.value)
                        }
                        className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">Selectionner un eleve</option>
                        {(options?.students ?? []).map((entry) => (
                          <option key={entry.id} value={entry.id}>
                            {entry.lastName} {entry.firstName}
                          </option>
                        ))}
                      </select>
                    </label>
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

            <div className="flex flex-wrap gap-2">
              {step > 1 ? (
                <BackButton onClick={previousStep} />
              ) : null}

              {step < totalSteps ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  disabled={!canContinueCurrentStep}
                >
                  Continuer
                </Button>
              ) : (
                <SubmitButton disabled={submitting}>
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
