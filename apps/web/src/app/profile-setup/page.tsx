"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type QuestionKey =
  | "MOTHER_MAIDEN_NAME"
  | "FATHER_FIRST_NAME"
  | "FAVORITE_SPORT"
  | "FAVORITE_TEACHER"
  | "BIRTH_CITY"
  | "CHILDHOOD_NICKNAME"
  | "FAVORITE_BOOK";

type SetupOptionsResponse = {
  schoolSlug: string | null;
  schoolRoles: string[];
  questions: Array<{ key: QuestionKey; label: string }>;
  classes: Array<{ id: string; name: string; year: string }>;
  students: Array<{ id: string; firstName: string; lastName: string }>;
};

const profileSetupSchema = z
  .object({
    email: z.string().trim().email("L'email est invalide."),
    password: z
      .string()
      .min(8, "Le mot de passe doit faire au moins 8 caracteres."),
    firstName: z.string().trim().min(1, "Le prenom est obligatoire."),
    lastName: z.string().trim().min(1, "Le nom est obligatoire."),
    birthDate: z.string().min(1, "La date de naissance est obligatoire."),
    answers: z
      .array(
        z.object({
          questionKey: z.enum([
            "MOTHER_MAIDEN_NAME",
            "FATHER_FIRST_NAME",
            "FAVORITE_SPORT",
            "FAVORITE_TEACHER",
            "BIRTH_CITY",
            "CHILDHOOD_NICKNAME",
            "FAVORITE_BOOK",
          ]),
          answer: z
            .string()
            .trim()
            .min(2, "Chaque reponse doit contenir au moins 2 caracteres."),
        }),
      )
      .length(3, "Choisissez 3 questions.")
      .refine(
        (rows) => new Set(rows.map((row) => row.questionKey)).size === 3,
        {
          message: "Les 3 questions doivent etre differentes.",
        },
      ),
    parentClassId: z.string().optional(),
    parentStudentId: z.string().optional(),
    isParent: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (value.isParent) {
      if (!value.parentClassId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["parentClassId"],
          message: "La classe de votre enfant est obligatoire.",
        });
      }
      if (!value.parentStudentId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["parentStudentId"],
          message: "Le nom de votre enfant est obligatoire.",
        });
      }
    }
  });

function ProfileSetupContent() {
  const router = useRouter();
  const params = useSearchParams();
  const emailFromQuery = params.get("email") ?? "";
  const schoolSlugFromQuery = params.get("schoolSlug");

  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [selectedQuestions, setSelectedQuestions] = useState<QuestionKey[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [parentClassId, setParentClassId] = useState("");
  const [parentStudentId, setParentStudentId] = useState("");
  const [options, setOptions] = useState<SetupOptionsResponse | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const normalizedEmail = emailFromQuery.trim();
    if (
      !normalizedEmail ||
      !z.string().email().safeParse(normalizedEmail).success
    ) {
      return;
    }

    const timeout = setTimeout(() => {
      void loadOptions(normalizedEmail);
    }, 250);

    return () => clearTimeout(timeout);
  }, [emailFromQuery]);

  async function loadOptions(currentEmail: string) {
    setLoadingOptions(true);
    try {
      const query = new URLSearchParams({ email: currentEmail });
      const response = await fetch(
        `${API_URL}/auth/profile-setup/options?${query.toString()}`,
      );
      if (!response.ok) {
        setError("Impossible de charger les options de profil.");
        return;
      }

      setOptions((await response.json()) as SetupOptionsResponse);
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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!emailFromQuery) {
      setError("Lien invalide: email manquant.");
      return;
    }

    const answerRows = selectedQuestions.map((questionKey) => ({
      questionKey,
      answer: answers[questionKey] ?? "",
    }));

    const parsed = profileSetupSchema.safeParse({
      email: emailFromQuery,
      password,
      firstName,
      lastName,
      birthDate,
      answers: answerRows,
      parentClassId: parentClassId || undefined,
      parentStudentId: parentStudentId || undefined,
      isParent,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Formulaire invalide.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/auth/profile-setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: parsed.data.email,
          password: parsed.data.password,
          firstName: parsed.data.firstName,
          lastName: parsed.data.lastName,
          birthDate: parsed.data.birthDate,
          answers: parsed.data.answers,
          parentClassId: parsed.data.parentClassId,
          parentStudentId: parsed.data.parentStudentId,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          payload?.message && Array.isArray(payload.message)
            ? payload.message.join(", ")
            : (payload?.message ?? "Impossible de finaliser le profil.");
        setError(String(message));
        return;
      }

      setSuccess("Profil complete. Vous pouvez maintenant vous connecter.");
      const fallbackSlug = options?.schoolSlug ?? schoolSlugFromQuery;
      router.push(fallbackSlug ? `/schools/${fallbackSlug}/login` : "/");
    } catch {
      setError("Erreur reseau.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1fr_1fr]">
        <Card
          title="Finaliser votre compte"
          subtitle="Renseignez votre profil et vos informations de recuperation"
        >
          <form className="grid gap-3" onSubmit={onSubmit}>
            <label className="grid gap-1 text-sm">
              <span className="text-text-secondary">Compte concerne</span>
              <div className="rounded-card border border-border bg-background px-3 py-2 text-text-primary">
                {emailFromQuery || "Email manquant"}
              </div>
            </label>

            <label className="grid gap-1 text-sm">
              <span className="text-text-secondary">Mot de passe actuel</span>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
              />
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="text-text-secondary">Prenom</span>
                <input
                  required
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                />
              </label>

              <label className="grid gap-1 text-sm">
                <span className="text-text-secondary">Nom</span>
                <input
                  required
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                />
              </label>
            </div>

            <label className="grid gap-1 text-sm">
              <span className="text-text-secondary">Date de naissance</span>
              <input
                type="date"
                required
                value={birthDate}
                onChange={(event) => setBirthDate(event.target.value)}
                className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
              />
            </label>

            <div className="rounded-card border border-border bg-background p-3">
              <p className="mb-2 text-sm text-text-secondary">
                Choisissez 3 questions de recuperation
              </p>
              <div className="grid gap-2">
                {(options?.questions ?? []).map((question) => {
                  const checked = selectedQuestions.includes(question.key);
                  const canSelectMore = checked || selectedQuestions.length < 3;
                  return (
                    <label key={question.key} className="grid gap-1 text-sm">
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!canSelectMore}
                          onChange={(event) => {
                            setSelectedQuestions((current) =>
                              event.target.checked
                                ? [...current, question.key]
                                : current.filter(
                                    (item) => item !== question.key,
                                  ),
                            );
                          }}
                        />
                        <span>{question.label}</span>
                      </span>
                      {checked ? (
                        <input
                          value={answers[question.key] ?? ""}
                          onChange={(event) =>
                            setAnswers((current) => ({
                              ...current,
                              [question.key]: event.target.value,
                            }))
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
                    onChange={(event) => setParentClassId(event.target.value)}
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
                    Nom de votre enfant
                  </span>
                  <select
                    value={parentStudentId}
                    onChange={(event) => setParentStudentId(event.target.value)}
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

            {loadingOptions ? (
              <p className="text-sm text-text-secondary">
                Chargement des options...
              </p>
            ) : null}
            {error ? (
              <p className="text-sm text-notification">{error}</p>
            ) : null}
            {success ? <p className="text-sm text-primary">{success}</p> : null}

            <Button type="submit" disabled={submitting}>
              {submitting ? "Validation..." : "Finaliser mon profil"}
            </Button>
          </form>
        </Card>

        <Card title="Activation de compte">
          <img
            src="/images/camer-school1.png"
            alt="Classe d eleves"
            className="h-[520px] w-full rounded-card border border-border object-cover object-center"
          />
        </Card>
      </div>
    </div>
  );
}

export default function ProfileSetupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background p-6 text-text-secondary">
          Chargement...
        </div>
      }
    >
      <ProfileSetupContent />
    </Suspense>
  );
}
