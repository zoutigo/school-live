"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, KeyRound, ShieldCheck, UserCheck } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import {
  buildRecoveryRows,
  step1Schema,
  step2Schema,
  step3Schema,
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

type StepKey = 1 | 2 | 3;

function OnboardingContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [step, setStep] = useState<StepKey>(1);
  const [options, setOptions] = useState<SetupOptionsResponse | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    email,
    schoolSlug,
    temporaryPassword,
    newPassword,
    confirmPassword,
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

    if (emailFromQuery && emailFromQuery !== email) {
      setField("email", emailFromQuery);
    }
    if (schoolSlugFromQuery && schoolSlugFromQuery !== schoolSlug) {
      setField("schoolSlug", schoolSlugFromQuery);
    }
  }, [params, setField, email, schoolSlug]);

  useEffect(() => {
    if (!email) {
      return;
    }

    const timeout = setTimeout(() => {
      void loadOptions(email);
    }, 150);

    return () => clearTimeout(timeout);
  }, [email]);

  async function loadOptions(currentEmail: string) {
    setLoadingOptions(true);
    setError(null);
    try {
      const query = new URLSearchParams({ email: currentEmail });
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

  function validateStep(target: StepKey): boolean {
    setError(null);

    if (target === 1) {
      const parsed = step1Schema.safeParse({
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
      const parsed = step2Schema.safeParse({
        firstName,
        lastName,
        gender,
        birthDate,
      });
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Etape 2 invalide.");
        return false;
      }
      return true;
    }

    const parsed = step3Schema.safeParse({
      selectedQuestions,
      answers,
      isParent,
      parentClassId: parentClassId || undefined,
      parentStudentId: parentStudentId || undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Etape 3 invalide.");
      return false;
    }
    return true;
  }

  function nextStep() {
    if (!validateStep(step)) {
      return;
    }
    if (step < 3) {
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

    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      return;
    }

    const recoveryRows = buildRecoveryRows(selectedQuestions, answers);
    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/auth/onboarding/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          temporaryPassword,
          newPassword,
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

      const payload = (await response.json()) as { schoolSlug?: string | null };
      const targetSchoolSlug = payload.schoolSlug ?? schoolSlug ?? "";
      reset();
      router.push(
        targetSchoolSlug ? `/schools/${targetSchoolSlug}/login` : "/",
      );
    } catch {
      setError("Erreur reseau.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-text-primary">
      <div className="pointer-events-none absolute -left-28 -top-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-0 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />

      <header className="relative z-10 border-b border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3 text-text-primary">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-card bg-primary font-heading text-base font-bold text-surface">
              SL
            </span>
            <span className="font-heading text-lg font-semibold">
              School-Live
            </span>
          </Link>
          <Link
            href={schoolSlug ? `/schools/${schoolSlug}/login` : "/"}
            className="text-sm text-text-secondary hover:text-primary"
          >
            Retour connexion
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid w-full max-w-6xl gap-6 px-6 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:py-14">
        <section className="rounded-card border border-border bg-surface p-6 shadow-card lg:p-8">
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
            connexion avec votre nouveau mot de passe.
          </p>

          <div className="mt-6 grid gap-3 text-sm">
            <div className="flex items-start gap-3 rounded-card border border-border bg-background p-3">
              <KeyRound className="mt-0.5 h-4 w-4 text-primary" />
              <p className="text-text-secondary">
                Etape 1: mot de passe provisoire et nouveau mot de passe.
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
                Etape 3: questions de recuperation puis validation finale.
              </p>
            </div>
          </div>

          <img
            src="/images/camer-school1.png"
            alt="Scene de classe"
            className="mt-6 h-56 w-full rounded-card border border-border object-cover object-center md:h-64"
          />
        </section>

        <Card
          title="Finaliser l'activation"
          subtitle={`Etape ${step} / 3`}
          className="lg:mt-2"
        >
          <form className="grid gap-3" onSubmit={onSubmit}>
            <div className="grid gap-1 text-sm">
              <span className="text-text-secondary">Compte concerne</span>
              <div className="rounded-card border border-border bg-background px-3 py-2 text-text-primary">
                {email || "Email manquant"}
              </div>
            </div>

            {step === 1 ? (
              <>
                <label className="grid gap-1 text-sm">
                  <span className="text-text-secondary">
                    Mot de passe provisoire
                  </span>
                  <input
                    type="password"
                    value={temporaryPassword}
                    onChange={(event) =>
                      setField("temporaryPassword", event.target.value)
                    }
                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  />
                </label>

                <label className="grid gap-1 text-sm">
                  <span className="text-text-secondary">
                    Nouveau mot de passe
                  </span>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) =>
                      setField("newPassword", event.target.value)
                    }
                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  />
                </label>

                <label className="grid gap-1 text-sm">
                  <span className="text-text-secondary">Confirmation</span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) =>
                      setField("confirmPassword", event.target.value)
                    }
                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  />
                </label>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-1 text-sm">
                    <span className="text-text-secondary">Prenom</span>
                    <input
                      value={firstName}
                      onChange={(event) =>
                        setField("firstName", event.target.value)
                      }
                      className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                    />
                  </label>

                  <label className="grid gap-1 text-sm">
                    <span className="text-text-secondary">Nom</span>
                    <input
                      value={lastName}
                      onChange={(event) =>
                        setField("lastName", event.target.value)
                      }
                      className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                    />
                  </label>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-1 text-sm">
                    <span className="text-text-secondary">Genre</span>
                    <select
                      value={gender}
                      onChange={(event) =>
                        setField(
                          "gender",
                          event.target.value as "M" | "F" | "OTHER",
                        )
                      }
                      className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Selectionner</option>
                      <option value="M">Masculin</option>
                      <option value="F">Feminin</option>
                      <option value="OTHER">Autre</option>
                    </select>
                  </label>

                  <label className="grid gap-1 text-sm">
                    <span className="text-text-secondary">
                      Date de naissance
                    </span>
                    <input
                      type="date"
                      value={birthDate}
                      onChange={(event) =>
                        setField("birthDate", event.target.value)
                      }
                      className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                    />
                  </label>
                </div>
              </>
            ) : null}

            {step === 3 ? (
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
                <Button
                  type="button"
                  variant="secondary"
                  onClick={previousStep}
                >
                  Retour
                </Button>
              ) : null}

              {step < 3 ? (
                <Button type="button" onClick={nextStep}>
                  Continuer
                </Button>
              ) : (
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Validation..." : "Finaliser l'activation"}
                </Button>
              )}
            </div>
          </form>
        </Card>
      </main>
    </div>
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
