"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Pencil, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { AppShell } from "../../components/layout/app-shell";
import { ActionIconButton } from "../../components/ui/action-icon-button";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { DateInput } from "../../components/ui/date-input";
import { SubmitButton } from "../../components/ui/form-buttons";
import { PasswordInput } from "../../components/ui/password-input";
import { ModuleHelpTab } from "../../components/ui/module-help-tab";
import { PasswordRequirementsHint } from "../../components/ui/password-requirements-hint";
import { PinInput } from "../../components/ui/pin-input";
import { getCsrfTokenCookie } from "../../lib/auth-cookies";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(8, "Le mot de passe actuel est obligatoire."),
    newPassword: z
      .string()
      .regex(
        PASSWORD_COMPLEXITY_REGEX,
        "Le mot de passe doit contenir au moins 8 caracteres avec majuscules, minuscules et chiffres.",
      ),
    confirmNewPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmNewPassword, {
    message: "La confirmation du nouveau mot de passe ne correspond pas.",
    path: ["confirmNewPassword"],
  });

const changePinSchema = z
  .object({
    currentPin: z
      .string()
      .regex(/^\d{6}$/, "Le PIN actuel doit contenir 6 chiffres."),
    newPin: z
      .string()
      .regex(/^\d{6}$/, "Le nouveau PIN doit contenir 6 chiffres."),
    confirmNewPin: z.string(),
  })
  .refine((value) => value.newPin === value.confirmNewPin, {
    message: "La confirmation du nouveau PIN ne correspond pas.",
    path: ["confirmNewPin"],
  });

const personalProfileSchema = z.object({
  firstName: z.string().trim().min(1, "Le prenom est obligatoire."),
  lastName: z.string().trim().min(1, "Le nom est obligatoire."),
  gender: z.enum(["M", "F", "OTHER"], {
    message: "Le genre est obligatoire.",
  }),
  phone: z.string().regex(/^\d{9}$/, "Numero invalide (9 chiffres attendus)."),
});

const recoverySchema = z
  .object({
    birthDate: z.string().min(1, "La date de naissance est obligatoire."),
    selectedQuestions: z
      .array(
        z.enum([
          "MOTHER_MAIDEN_NAME",
          "FATHER_FIRST_NAME",
          "FAVORITE_SPORT",
          "FAVORITE_TEACHER",
          "BIRTH_CITY",
          "CHILDHOOD_NICKNAME",
          "FAVORITE_BOOK",
        ]),
      )
      .length(3, "Choisissez exactement 3 questions.")
      .refine((value) => new Set(value).size === 3, {
        message: "Les 3 questions doivent etre differentes.",
      }),
    answers: z.record(z.string(), z.string().trim().min(2)),
    isParent: z.boolean(),
    parentClassId: z.string().optional(),
    parentStudentId: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    for (const questionKey of value.selectedQuestions) {
      const answer = value.answers[questionKey];
      if (!answer || answer.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["answers", questionKey],
          message: "Chaque reponse doit contenir au moins 2 caracteres.",
        });
      }
    }

    if (value.isParent && !value.parentClassId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["parentClassId"],
        message: "La classe de votre enfant est obligatoire.",
      });
    }

    if (value.isParent && !value.parentStudentId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["parentStudentId"],
        message: "Le nom de votre enfant est obligatoire.",
      });
    }
  });

type Role =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "SALES"
  | "SUPPORT"
  | "SCHOOL_ADMIN"
  | "SCHOOL_MANAGER"
  | "SUPERVISOR"
  | "SCHOOL_ACCOUNTANT"
  | "SCHOOL_STAFF"
  | "TEACHER"
  | "PARENT"
  | "STUDENT";
type Tab = "personal" | "security" | "help";
type QuestionKey =
  | "MOTHER_MAIDEN_NAME"
  | "FATHER_FIRST_NAME"
  | "FAVORITE_SPORT"
  | "FAVORITE_TEACHER"
  | "BIRTH_CITY"
  | "CHILDHOOD_NICKNAME"
  | "FAVORITE_BOOK";

type MeResponse = {
  firstName: string;
  lastName: string;
  gender?: "M" | "F" | "OTHER" | null;
  email?: string | null;
  phone?: string | null;
  role: Role;
  schoolSlug: string | null;
};

type RecoveryOption = {
  key: QuestionKey;
  label: string;
};

type RecoveryOptionsResponse = {
  schoolRoles: Role[];
  questions: RecoveryOption[];
  classes: Array<{ id: string; name: string; schoolYearLabel: string }>;
  students: Array<{ id: string; firstName: string; lastName: string }>;
  selectedQuestions: QuestionKey[];
  birthDate: string;
  parentClassId: string | null;
  parentStudentId: string | null;
};

function toLocalPhoneDisplay(value: string | null | undefined) {
  if (!value) {
    return "";
  }
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("237") && digits.length >= 12) {
    return digits.slice(3, 12);
  }
  return digits.slice(0, 9);
}

function normalizePhoneInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("237") && digits.length >= 12) {
    return digits.slice(3, 12);
  }
  return digits.slice(0, 9);
}

export default function AccountPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("personal");
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [editingPersonal, setEditingPersonal] = useState(false);
  const [personalFirstName, setPersonalFirstName] = useState("");
  const [personalLastName, setPersonalLastName] = useState("");
  const [personalGender, setPersonalGender] = useState<"M" | "F" | "OTHER">(
    "M",
  );
  const [personalPhone, setPersonalPhone] = useState("");
  const [personalError, setPersonalError] = useState<string | null>(null);
  const [personalSuccess, setPersonalSuccess] = useState<string | null>(null);
  const [updatingPersonal, setUpdatingPersonal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmNewPin, setConfirmNewPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState<string | null>(null);
  const [updatingPin, setUpdatingPin] = useState(false);
  const [loadingRecovery, setLoadingRecovery] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [recoveryQuestions, setRecoveryQuestions] = useState<RecoveryOption[]>(
    [],
  );
  const [recoveryClasses, setRecoveryClasses] = useState<
    Array<{ id: string; name: string; schoolYearLabel: string }>
  >([]);
  const [recoveryStudents, setRecoveryStudents] = useState<
    Array<{ id: string; firstName: string; lastName: string }>
  >([]);
  const [recoveryIsParent, setRecoveryIsParent] = useState(false);
  const [recoveryBirthDate, setRecoveryBirthDate] = useState("");
  const [recoverySelectedQuestions, setRecoverySelectedQuestions] = useState<
    QuestionKey[]
  >([]);
  const [recoveryAnswers, setRecoveryAnswers] = useState<
    Record<string, string>
  >({});
  const [recoveryParentClassId, setRecoveryParentClassId] = useState("");
  const [recoveryParentStudentId, setRecoveryParentStudentId] = useState("");
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoverySuccess, setRecoverySuccess] = useState<string | null>(null);
  const [updatingRecovery, setUpdatingRecovery] = useState(false);
  const [openSecuritySection, setOpenSecuritySection] = useState<
    "password" | "pin" | "recovery" | null
  >(null);

  useEffect(() => {
    void loadMe();
  }, []);

  useEffect(() => {
    if (tab !== "security" || recoveryReady || loadingRecovery) {
      return;
    }
    void loadRecoveryOptions();
  }, [tab, recoveryReady, loadingRecovery]);

  async function loadMe() {
    const response = await fetch(`${API_URL}/me`, {
      credentials: "include",
    });

    if (!response.ok) {
      router.replace("/");
      return;
    }

    const payload = (await response.json()) as MeResponse;
    setMe(payload);
    setPersonalFirstName(payload.firstName ?? "");
    setPersonalLastName(payload.lastName ?? "");
    setPersonalGender(payload.gender ?? "M");
    setPersonalPhone(toLocalPhoneDisplay(payload.phone));
    setLoading(false);
  }

  const schoolName = useMemo(() => {
    if (!me) {
      return "Scolive";
    }

    if (me.role === "SUPER_ADMIN" || me.role === "ADMIN") {
      return "Scolive Platform";
    }

    return me.schoolSlug
      ? `Etablissement (${me.schoolSlug})`
      : "Espace Scolive";
  }, [me]);

  async function onUpdatePersonal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPersonalError(null);
    setPersonalSuccess(null);

    const parsed = personalProfileSchema.safeParse({
      firstName: personalFirstName,
      lastName: personalLastName,
      gender: personalGender,
      phone: personalPhone,
    });
    if (!parsed.success) {
      setPersonalError(
        parsed.error.issues[0]?.message ?? "Formulaire invalide.",
      );
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setPersonalError("Session CSRF invalide. Reconnectez-vous.");
      router.replace("/");
      return;
    }

    setUpdatingPersonal(true);
    try {
      const response = await fetch(`${API_URL}/me/profile`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          firstName: parsed.data.firstName,
          lastName: parsed.data.lastName,
          gender: parsed.data.gender,
          phone: parsed.data.phone,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          payload?.message && Array.isArray(payload.message)
            ? payload.message.join(", ")
            : (payload?.message ?? "Mise a jour du profil impossible.");
        setPersonalError(String(message));
        return;
      }

      const updatedMe = (await response.json()) as MeResponse;
      setMe(updatedMe);
      setPersonalFirstName(updatedMe.firstName ?? "");
      setPersonalLastName(updatedMe.lastName ?? "");
      setPersonalGender(updatedMe.gender ?? "M");
      setPersonalPhone(toLocalPhoneDisplay(updatedMe.phone));
      setPersonalSuccess("Informations personnelles mises a jour.");
      setEditingPersonal(false);
    } catch {
      setPersonalError("Erreur reseau.");
    } finally {
      setUpdatingPersonal(false);
    }
  }

  async function onChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    const parsed = changePasswordSchema.safeParse({
      currentPassword,
      newPassword,
      confirmNewPassword,
    });

    if (!parsed.success) {
      setPasswordError(
        parsed.error.issues[0]?.message ?? "Formulaire invalide.",
      );
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setPasswordError("Session CSRF invalide. Reconnectez-vous.");
      router.replace("/");
      return;
    }

    setUpdatingPassword(true);
    try {
      const response = await fetch(`${API_URL}/auth/change-password`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          currentPassword: parsed.data.currentPassword,
          newPassword: parsed.data.newPassword,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          payload?.message && Array.isArray(payload.message)
            ? payload.message.join(", ")
            : (payload?.message ?? "Changement de mot de passe impossible.");
        setPasswordError(String(message));
        return;
      }

      setPasswordSuccess("Mot de passe mis a jour avec succes.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch {
      setPasswordError("Erreur reseau.");
    } finally {
      setUpdatingPassword(false);
    }
  }

  async function onChangePin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPinError(null);
    setPinSuccess(null);

    const parsed = changePinSchema.safeParse({
      currentPin,
      newPin,
      confirmNewPin,
    });

    if (!parsed.success) {
      setPinError(
        parsed.error.issues[0]?.message ?? "Formulaire PIN invalide.",
      );
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setPinError("Session CSRF invalide. Reconnectez-vous.");
      router.replace("/");
      return;
    }

    setUpdatingPin(true);
    try {
      const response = await fetch(`${API_URL}/auth/change-pin`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          currentPin: parsed.data.currentPin,
          newPin: parsed.data.newPin,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          payload?.message && Array.isArray(payload.message)
            ? payload.message.join(", ")
            : (payload?.message ?? "Changement de PIN impossible.");
        setPinError(String(message));
        return;
      }

      setPinSuccess("PIN mis a jour avec succes.");
      setCurrentPin("");
      setNewPin("");
      setConfirmNewPin("");
    } catch {
      setPinError("Erreur reseau.");
    } finally {
      setUpdatingPin(false);
    }
  }

  async function loadRecoveryOptions() {
    setLoadingRecovery(true);
    setRecoveryError(null);
    try {
      const response = await fetch(`${API_URL}/auth/recovery/options`, {
        credentials: "include",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          payload?.message && Array.isArray(payload.message)
            ? payload.message.join(", ")
            : (payload?.message ??
              "Chargement des options de recuperation impossible.");
        setRecoveryError(String(message));
        return;
      }

      const data = (await response.json()) as RecoveryOptionsResponse;
      setRecoveryQuestions(data.questions ?? []);
      setRecoveryClasses(data.classes ?? []);
      setRecoveryStudents(data.students ?? []);
      setRecoveryIsParent((data.schoolRoles ?? []).includes("PARENT"));
      setRecoveryBirthDate(data.birthDate ?? "");
      setRecoverySelectedQuestions(data.selectedQuestions ?? []);
      setRecoveryParentClassId(data.parentClassId ?? "");
      setRecoveryParentStudentId(data.parentStudentId ?? "");
      setRecoveryAnswers(
        (data.selectedQuestions ?? []).reduce<Record<string, string>>(
          (accumulator, questionKey) => ({
            ...accumulator,
            [questionKey]: "",
          }),
          {},
        ),
      );
      setRecoveryReady(true);
    } catch {
      setRecoveryError("Erreur reseau.");
    } finally {
      setLoadingRecovery(false);
    }
  }

  function toggleRecoveryQuestion(question: QuestionKey) {
    setRecoverySelectedQuestions((current) => {
      const exists = current.includes(question);
      if (exists) {
        const next = current.filter((entry) => entry !== question);
        setRecoveryAnswers((answers) => {
          const clone = { ...answers };
          delete clone[question];
          return clone;
        });
        return next;
      }

      if (current.length >= 3) {
        return current;
      }

      return [...current, question];
    });
  }

  function setRecoveryAnswer(question: QuestionKey, value: string) {
    setRecoveryAnswers((current) => ({
      ...current,
      [question]: value,
    }));
  }

  async function onUpdateRecovery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRecoveryError(null);
    setRecoverySuccess(null);

    const parsed = recoverySchema.safeParse({
      birthDate: recoveryBirthDate,
      selectedQuestions: recoverySelectedQuestions,
      answers: recoveryAnswers,
      isParent: recoveryIsParent,
      parentClassId: recoveryParentClassId || undefined,
      parentStudentId: recoveryParentStudentId || undefined,
    });

    if (!parsed.success) {
      setRecoveryError(
        parsed.error.issues[0]?.message ?? "Formulaire invalide.",
      );
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setRecoveryError("Session CSRF invalide. Reconnectez-vous.");
      router.replace("/");
      return;
    }

    setUpdatingRecovery(true);
    try {
      const response = await fetch(`${API_URL}/auth/recovery/update`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          birthDate: parsed.data.birthDate,
          answers: parsed.data.selectedQuestions.map((questionKey) => ({
            questionKey,
            answer: parsed.data.answers[questionKey] ?? "",
          })),
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
            : (payload?.message ??
              "Mise a jour des informations de recuperation impossible.");
        setRecoveryError(String(message));
        return;
      }

      setRecoverySuccess("Questions de recuperation mises a jour.");
      setRecoveryAnswers((current) =>
        Object.keys(current).reduce<Record<string, string>>(
          (accumulator, key) => ({
            ...accumulator,
            [key]: "",
          }),
          {},
        ),
      );
    } catch {
      setRecoveryError("Erreur reseau.");
    } finally {
      setUpdatingRecovery(false);
    }
  }

  return (
    <AppShell schoolSlug={me?.schoolSlug ?? null} schoolName={schoolName}>
      <div className="grid gap-4">
        <Card title="Mon compte" subtitle="Gestion de votre profil utilisateur">
          <div className="mb-4 flex items-end gap-2 border-b border-border">
            <button
              type="button"
              onClick={() => setTab("personal")}
              className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                tab === "personal"
                  ? "border border-border border-b-surface bg-surface text-primary"
                  : "text-text-secondary"
              }`}
            >
              Informations personnelles
            </button>
            <button
              type="button"
              onClick={() => setTab("security")}
              className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                tab === "security"
                  ? "border border-border border-b-surface bg-surface text-primary"
                  : "text-text-secondary"
              }`}
            >
              Securite
            </button>
            <button
              type="button"
              onClick={() => setTab("help")}
              className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                tab === "help"
                  ? "border border-border border-b-surface bg-surface text-primary"
                  : "text-text-secondary"
              }`}
            >
              Aide
            </button>
          </div>

          {tab === "personal" ? (
            loading ? (
              <p className="text-sm text-text-secondary">Chargement...</p>
            ) : (
              <div className="grid gap-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-text-secondary">
                    Mettez a jour vos informations personnelles.
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setEditingPersonal((value) => !value);
                      setPersonalError(null);
                      setPersonalSuccess(null);
                    }}
                  >
                    {editingPersonal ? "Annuler" : "Modifier"}
                  </Button>
                </div>

                {editingPersonal ? (
                  <form
                    className="grid max-w-xl gap-3"
                    onSubmit={onUpdatePersonal}
                    noValidate
                  >
                    <label className="grid gap-1 text-sm">
                      <span className="text-text-secondary">Prenom</span>
                      <input
                        type="text"
                        value={personalFirstName}
                        onChange={(event) =>
                          setPersonalFirstName(event.target.value)
                        }
                        className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                      />
                    </label>

                    <label className="grid gap-1 text-sm">
                      <span className="text-text-secondary">Nom</span>
                      <input
                        type="text"
                        value={personalLastName}
                        onChange={(event) =>
                          setPersonalLastName(event.target.value)
                        }
                        className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                      />
                    </label>

                    <label className="grid gap-1 text-sm">
                      <span className="text-text-secondary">Genre</span>
                      <select
                        value={personalGender}
                        onChange={(event) =>
                          setPersonalGender(
                            event.target.value as "M" | "F" | "OTHER",
                          )
                        }
                        className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="M">Masculin</option>
                        <option value="F">Feminin</option>
                        <option value="OTHER">Autre</option>
                      </select>
                    </label>

                    <label className="grid gap-1 text-sm">
                      <span className="text-text-secondary">Telephone</span>
                      <input
                        type="text"
                        value={personalPhone}
                        onChange={(event) =>
                          setPersonalPhone(
                            normalizePhoneInput(event.target.value),
                          )
                        }
                        placeholder="6XXXXXXXX"
                        className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                      />
                    </label>

                    {personalError ? (
                      <p className="text-sm text-notification">
                        {personalError}
                      </p>
                    ) : null}
                    {personalSuccess ? (
                      <p className="text-sm text-primary">{personalSuccess}</p>
                    ) : null}

                    <SubmitButton disabled={updatingPersonal}>
                      {updatingPersonal ? "Mise a jour..." : "Enregistrer"}
                    </SubmitButton>
                  </form>
                ) : null}

                <div className="grid gap-4 md:grid-cols-2">
                  <InfoBlock label="Prenom" value={me?.firstName ?? "-"} />
                  <InfoBlock label="Nom" value={me?.lastName ?? "-"} />
                  <InfoBlock label="Email" value={me?.email ?? "-"} />
                  <InfoBlock
                    label="Telephone"
                    value={toLocalPhoneDisplay(me?.phone) || "-"}
                  />
                  <InfoBlock
                    label="Genre"
                    value={
                      me?.gender === "M"
                        ? "Masculin"
                        : me?.gender === "F"
                          ? "Feminin"
                          : me?.gender === "OTHER"
                            ? "Autre"
                            : "-"
                    }
                  />
                  <InfoBlock label="Role" value={me?.role ?? "-"} />
                  <InfoBlock
                    label="Ecole"
                    value={me?.schoolSlug ?? "Plateforme"}
                  />
                </div>
              </div>
            )
          ) : tab === "security" ? (
            <div className="grid gap-6">
              <section className="max-w-xl rounded-card border border-border bg-background">
                <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                  <p className="text-sm font-semibold text-text-primary">
                    Mot de passe
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    className="hidden lg:inline-flex"
                    onClick={() =>
                      setOpenSecuritySection((current) =>
                        current === "password" ? null : "password",
                      )
                    }
                  >
                    {openSecuritySection === "password" ? "Fermer" : "Modifier"}
                  </Button>
                  <ActionIconButton
                    icon={openSecuritySection === "password" ? X : Pencil}
                    label={
                      openSecuritySection === "password"
                        ? "Fermer la section mot de passe"
                        : "Modifier le mot de passe"
                    }
                    className="lg:hidden"
                    onClick={() =>
                      setOpenSecuritySection((current) =>
                        current === "password" ? null : "password",
                      )
                    }
                  />
                </div>

                {openSecuritySection === "password" ? (
                  <form className="grid gap-3 p-4" onSubmit={onChangePassword}>
                    <label className="grid gap-1 text-sm">
                      <span className="text-text-secondary">
                        Ancien mot de passe
                      </span>
                      <PasswordInput
                        required
                        minLength={8}
                        value={currentPassword}
                        onChange={(event) =>
                          setCurrentPassword(event.target.value)
                        }
                      />
                    </label>

                    <label className="grid gap-1 text-sm">
                      <span className="text-text-secondary">
                        Nouveau mot de passe
                      </span>
                      <PasswordInput
                        required
                        minLength={8}
                        pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}"
                        title="8 caracteres minimum avec au moins une majuscule, une minuscule et un chiffre."
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                      />
                    </label>
                    <PasswordRequirementsHint password={newPassword} />

                    <label className="grid gap-1 text-sm">
                      <span className="text-text-secondary">
                        Confirmer le nouveau mot de passe
                      </span>
                      <PasswordInput
                        required
                        minLength={8}
                        pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}"
                        title="8 caracteres minimum avec au moins une majuscule, une minuscule et un chiffre."
                        value={confirmNewPassword}
                        onChange={(event) =>
                          setConfirmNewPassword(event.target.value)
                        }
                      />
                    </label>

                    {passwordError ? (
                      <p className="text-sm text-notification">
                        {passwordError}
                      </p>
                    ) : null}
                    {passwordSuccess ? (
                      <p className="text-sm text-primary">{passwordSuccess}</p>
                    ) : null}

                    <SubmitButton disabled={updatingPassword}>
                      {updatingPassword
                        ? "Mise a jour..."
                        : "Changer le mot de passe"}
                    </SubmitButton>
                  </form>
                ) : null}
              </section>

              <section className="max-w-xl rounded-card border border-border bg-background">
                <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                  <p className="text-sm font-semibold text-text-primary">
                    PIN de connexion
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    className="hidden lg:inline-flex"
                    onClick={() =>
                      setOpenSecuritySection((current) =>
                        current === "pin" ? null : "pin",
                      )
                    }
                  >
                    {openSecuritySection === "pin" ? "Fermer" : "Modifier"}
                  </Button>
                  <ActionIconButton
                    icon={openSecuritySection === "pin" ? X : Pencil}
                    label={
                      openSecuritySection === "pin"
                        ? "Fermer la section PIN"
                        : "Modifier le PIN"
                    }
                    className="lg:hidden"
                    onClick={() =>
                      setOpenSecuritySection((current) =>
                        current === "pin" ? null : "pin",
                      )
                    }
                  />
                </div>

                {openSecuritySection === "pin" ? (
                  <form className="grid gap-3 p-4" onSubmit={onChangePin}>
                    <label className="grid gap-1 text-sm">
                      <span className="text-text-secondary">PIN actuel</span>
                      <PinInput
                        required
                        value={currentPin}
                        onChange={(event) =>
                          setCurrentPin(
                            event.target.value.replace(/\D/g, "").slice(0, 6),
                          )
                        }
                        placeholder="123456"
                      />
                    </label>

                    <label className="grid gap-1 text-sm">
                      <span className="text-text-secondary">
                        Nouveau PIN (6 chiffres)
                      </span>
                      <PinInput
                        required
                        value={newPin}
                        onChange={(event) =>
                          setNewPin(
                            event.target.value.replace(/\D/g, "").slice(0, 6),
                          )
                        }
                        placeholder="123456"
                      />
                    </label>

                    <label className="grid gap-1 text-sm">
                      <span className="text-text-secondary">
                        Confirmation PIN
                      </span>
                      <PinInput
                        required
                        value={confirmNewPin}
                        onChange={(event) =>
                          setConfirmNewPin(
                            event.target.value.replace(/\D/g, "").slice(0, 6),
                          )
                        }
                        placeholder="123456"
                      />
                    </label>

                    {pinError ? (
                      <p className="text-sm text-notification">{pinError}</p>
                    ) : null}
                    {pinSuccess ? (
                      <p className="text-sm text-primary">{pinSuccess}</p>
                    ) : null}

                    <SubmitButton disabled={updatingPin}>
                      {updatingPin ? "Mise a jour PIN..." : "Changer le PIN"}
                    </SubmitButton>
                  </form>
                ) : null}
              </section>

              <section className="max-w-xl rounded-card border border-border bg-background">
                <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                  <p className="text-sm font-semibold text-text-primary">
                    Questions de recuperation
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    className="hidden lg:inline-flex"
                    onClick={() =>
                      setOpenSecuritySection((current) =>
                        current === "recovery" ? null : "recovery",
                      )
                    }
                  >
                    {openSecuritySection === "recovery" ? "Fermer" : "Modifier"}
                  </Button>
                  <ActionIconButton
                    icon={openSecuritySection === "recovery" ? X : Pencil}
                    label={
                      openSecuritySection === "recovery"
                        ? "Fermer la section questions de recuperation"
                        : "Modifier les questions de recuperation"
                    }
                    className="lg:hidden"
                    onClick={() =>
                      setOpenSecuritySection((current) =>
                        current === "recovery" ? null : "recovery",
                      )
                    }
                  />
                </div>

                {openSecuritySection === "recovery" ? (
                  <form className="grid gap-3 p-4" onSubmit={onUpdateRecovery}>
                    <p className="text-xs text-text-secondary">
                      Mettez a jour votre date de naissance et vos 3 questions
                      de recuperation.
                    </p>
                    {loadingRecovery ? (
                      <p className="text-sm text-text-secondary">
                        Chargement...
                      </p>
                    ) : (
                      <>
                        <label className="grid gap-1 text-sm">
                          <span className="text-text-secondary">
                            Date de naissance
                          </span>
                          <DateInput
                            value={recoveryBirthDate}
                            onChange={(event) =>
                              setRecoveryBirthDate(event.target.value)
                            }
                          />
                        </label>

                        {recoveryIsParent ? (
                          <>
                            <label className="grid gap-1 text-sm">
                              <span className="text-text-secondary">
                                Classe de votre enfant
                              </span>
                              <select
                                value={recoveryParentClassId}
                                onChange={(event) =>
                                  setRecoveryParentClassId(event.target.value)
                                }
                                className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                              >
                                <option value="">
                                  Selectionner une classe
                                </option>
                                {recoveryClasses.map((classroom) => (
                                  <option
                                    key={classroom.id}
                                    value={classroom.id}
                                  >
                                    {classroom.name} (
                                    {classroom.schoolYearLabel})
                                  </option>
                                ))}
                              </select>
                            </label>

                            <label className="grid gap-1 text-sm">
                              <span className="text-text-secondary">
                                Nom de votre enfant
                              </span>
                              <select
                                value={recoveryParentStudentId}
                                onChange={(event) =>
                                  setRecoveryParentStudentId(event.target.value)
                                }
                                className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                              >
                                <option value="">Selectionner un eleve</option>
                                {recoveryStudents.map((student) => (
                                  <option key={student.id} value={student.id}>
                                    {student.lastName} {student.firstName}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </>
                        ) : null}

                        <div className="grid gap-2">
                          <p className="text-xs text-text-secondary">
                            Choisissez exactement 3 questions
                          </p>
                          {recoveryQuestions.map((question) => {
                            const checked = recoverySelectedQuestions.includes(
                              question.key,
                            );

                            return (
                              <label
                                key={question.key}
                                className="grid gap-1 rounded-card border border-border px-3 py-2 text-sm"
                              >
                                <span className="inline-flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() =>
                                      toggleRecoveryQuestion(question.key)
                                    }
                                  />
                                  <span>{question.label}</span>
                                </span>
                                {checked ? (
                                  <input
                                    type="text"
                                    value={recoveryAnswers[question.key] ?? ""}
                                    onChange={(event) =>
                                      setRecoveryAnswer(
                                        question.key,
                                        event.target.value,
                                      )
                                    }
                                    placeholder="Votre reponse"
                                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                                  />
                                ) : null}
                              </label>
                            );
                          })}
                        </div>
                      </>
                    )}

                    {recoveryError ? (
                      <p className="text-sm text-notification">
                        {recoveryError}
                      </p>
                    ) : null}
                    {recoverySuccess ? (
                      <p className="text-sm text-primary">{recoverySuccess}</p>
                    ) : null}

                    <SubmitButton
                      disabled={updatingRecovery || loadingRecovery}
                    >
                      {updatingRecovery
                        ? "Mise a jour recovery..."
                        : "Mettre a jour la recuperation"}
                    </SubmitButton>
                  </form>
                ) : null}
              </section>
            </div>
          ) : (
            <ModuleHelpTab
              moduleName="Mon compte"
              moduleSummary="ce module centralise vos informations personnelles et la securite de votre acces."
              actions={[
                {
                  name: "Consulter",
                  purpose:
                    "verifier rapidement vos informations de profil et votre role actif.",
                  howTo: "utiliser l'onglet Informations personnelles.",
                  moduleImpact: "aucune modification, simple verification.",
                  crossModuleImpact:
                    "permet de confirmer votre perimetre d'action dans les autres modules.",
                },
                {
                  name: "Modifier mot de passe",
                  purpose:
                    "renforcer la securite de votre compte ou repondre a une politique interne.",
                  howTo:
                    "renseigner l'ancien mot de passe puis le nouveau dans l'onglet Securite.",
                  moduleImpact:
                    "votre secret d'authentification est remplace immediatement.",
                  crossModuleImpact:
                    "les futures connexions sur tous les modules utilisent ce nouveau mot de passe.",
                },
              ]}
              tips={[
                "Quand vous reprenez le projet, cet onglet aide a verifier tout de suite votre contexte utilisateur.",
              ]}
            />
          )}
        </Card>
      </div>
    </AppShell>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-border bg-background px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-text-secondary">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-text-primary">{value}</p>
    </div>
  );
}
