"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { AppShell } from "../../components/layout/app-shell";
import { ActionIconButton } from "../../components/ui/action-icon-button";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { DateInput } from "../../components/ui/date-input";
import {
  FormCheckbox,
  FormSelect,
  FormSubmitHint,
  FormTextInput,
} from "../../components/ui/form-controls";
import { FormField } from "../../components/ui/form-field";
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

const createPasswordSchema = z
  .object({
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

const addEmailSchema = z.object({
  email: z.string().email("Adresse email invalide."),
});

const addPhoneCredentialSchema = z
  .object({
    phone: z
      .string()
      .regex(/^\d{9}$/, "Numero invalide (9 chiffres attendus)."),
    pin: z
      .string()
      .regex(/^\d{6}$/, "Le PIN doit contenir exactement 6 chiffres."),
    confirmPin: z.string(),
  })
  .refine((v) => v.pin === v.confirmPin, {
    message: "Les PINs ne correspondent pas.",
    path: ["confirmPin"],
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
  hasPassword: boolean;
  hasPhoneCredential: boolean;
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
  const [personalError, setPersonalError] = useState<string | null>(null);
  const [personalSuccess, setPersonalSuccess] = useState<string | null>(null);
  const [updatingPersonal, setUpdatingPersonal] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState<string | null>(null);
  const [updatingPin, setUpdatingPin] = useState(false);
  const [addEmailError, setAddEmailError] = useState<string | null>(null);
  const [addEmailSuccess, setAddEmailSuccess] = useState<string | null>(null);
  const [addingEmail, setAddingEmail] = useState(false);
  const [createPasswordError, setCreatePasswordError] = useState<string | null>(
    null,
  );
  const [createPasswordSuccess, setCreatePasswordSuccess] = useState<
    string | null
  >(null);
  const [creatingPassword, setCreatingPassword] = useState(false);
  const [addPhoneError, setAddPhoneError] = useState<string | null>(null);
  const [addPhoneSuccess, setAddPhoneSuccess] = useState<string | null>(null);
  const [addingPhone, setAddingPhone] = useState(false);
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
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoverySuccess, setRecoverySuccess] = useState<string | null>(null);
  const [updatingRecovery, setUpdatingRecovery] = useState(false);
  const [openSecuritySection, setOpenSecuritySection] = useState<
    "password" | "create-password" | "pin" | "add-phone" | "recovery" | null
  >(null);
  const personalForm = useForm<
    z.input<typeof personalProfileSchema>,
    unknown,
    z.output<typeof personalProfileSchema>
  >({
    resolver: zodResolver(personalProfileSchema),
    mode: "onChange",
    defaultValues: {
      firstName: "",
      lastName: "",
      gender: "M",
      phone: "",
    },
  });
  const passwordForm = useForm<
    z.input<typeof changePasswordSchema>,
    unknown,
    z.output<typeof changePasswordSchema>
  >({
    resolver: zodResolver(changePasswordSchema),
    mode: "onChange",
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });
  const createPasswordForm = useForm<
    z.input<typeof createPasswordSchema>,
    unknown,
    z.output<typeof createPasswordSchema>
  >({
    resolver: zodResolver(createPasswordSchema),
    mode: "onChange",
    defaultValues: { newPassword: "", confirmNewPassword: "" },
  });
  const addEmailForm = useForm<
    z.input<typeof addEmailSchema>,
    unknown,
    z.output<typeof addEmailSchema>
  >({
    resolver: zodResolver(addEmailSchema),
    mode: "onChange",
    defaultValues: { email: "" },
  });
  const addPhoneForm = useForm<
    z.input<typeof addPhoneCredentialSchema>,
    unknown,
    z.output<typeof addPhoneCredentialSchema>
  >({
    resolver: zodResolver(addPhoneCredentialSchema),
    mode: "onChange",
    defaultValues: { phone: "", pin: "", confirmPin: "" },
  });
  const pinForm = useForm<
    z.input<typeof changePinSchema>,
    unknown,
    z.output<typeof changePinSchema>
  >({
    resolver: zodResolver(changePinSchema),
    mode: "onChange",
    defaultValues: {
      currentPin: "",
      newPin: "",
      confirmNewPin: "",
    },
  });
  const recoveryForm = useForm<
    z.input<typeof recoverySchema>,
    unknown,
    z.output<typeof recoverySchema>
  >({
    resolver: zodResolver(recoverySchema),
    mode: "onChange",
    defaultValues: {
      birthDate: "",
      selectedQuestions: [],
      answers: {},
      isParent: false,
      parentClassId: "",
      parentStudentId: "",
    },
  });
  const passwordValues = passwordForm.watch();
  const recoveryValues = recoveryForm.watch();

  useEffect(() => {
    void loadMe();
  }, []);

  useEffect(() => {
    if (tab !== "security" || recoveryReady || loadingRecovery) {
      return;
    }
    void loadRecoveryOptions();
  }, [tab, recoveryReady, loadingRecovery]);

  useEffect(() => {
    if (!editingPersonal) {
      return;
    }
    void personalForm.trigger();
  }, [editingPersonal, personalForm]);

  useEffect(() => {
    if (openSecuritySection === "password") {
      void passwordForm.trigger();
      return;
    }
    if (openSecuritySection === "pin") {
      void pinForm.trigger();
      return;
    }
    if (openSecuritySection === "recovery" && recoveryReady) {
      void recoveryForm.trigger();
    }
  }, [openSecuritySection, passwordForm, pinForm, recoveryForm, recoveryReady]);

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
    personalForm.reset({
      firstName: payload.firstName ?? "",
      lastName: payload.lastName ?? "",
      gender: payload.gender ?? "M",
      phone: toLocalPhoneDisplay(payload.phone),
    });
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

  async function onUpdatePersonal(
    values: z.output<typeof personalProfileSchema>,
  ) {
    setPersonalError(null);
    setPersonalSuccess(null);

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
          firstName: values.firstName,
          lastName: values.lastName,
          gender: values.gender,
          phone: values.phone,
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
      personalForm.reset({
        firstName: updatedMe.firstName ?? "",
        lastName: updatedMe.lastName ?? "",
        gender: updatedMe.gender ?? "M",
        phone: toLocalPhoneDisplay(updatedMe.phone),
      });
      setPersonalSuccess("Informations personnelles mises a jour.");
      setEditingPersonal(false);
    } catch {
      setPersonalError("Erreur reseau.");
    } finally {
      setUpdatingPersonal(false);
    }
  }

  async function onAddEmail(values: z.output<typeof addEmailSchema>) {
    setAddEmailError(null);
    setAddEmailSuccess(null);
    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setAddEmailError("Session CSRF invalide. Reconnectez-vous.");
      router.replace("/");
      return;
    }
    setAddingEmail(true);
    try {
      const response = await fetch(`${API_URL}/auth/add-email`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({ email: values.email }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message = Array.isArray(payload?.message)
          ? payload.message.join(", ")
          : (payload?.message ?? "Impossible d'ajouter l'email.");
        setAddEmailError(String(message));
        return;
      }
      setAddEmailSuccess(
        "Un lien de verification a ete envoye. Verifiez votre boite mail.",
      );
      addEmailForm.reset();
    } catch {
      setAddEmailError("Erreur reseau.");
    } finally {
      setAddingEmail(false);
    }
  }

  async function onCreatePassword(
    values: z.output<typeof createPasswordSchema>,
  ) {
    setCreatePasswordError(null);
    setCreatePasswordSuccess(null);
    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setCreatePasswordError("Session CSRF invalide. Reconnectez-vous.");
      router.replace("/");
      return;
    }
    setCreatingPassword(true);
    try {
      const response = await fetch(`${API_URL}/auth/create-password`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({ newPassword: values.newPassword }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message = Array.isArray(payload?.message)
          ? payload.message.join(", ")
          : (payload?.message ?? "Impossible de creer le mot de passe.");
        setCreatePasswordError(String(message));
        return;
      }
      setCreatePasswordSuccess("Mot de passe cree avec succes.");
      createPasswordForm.reset();
      setOpenSecuritySection(null);
      setMe((current) =>
        current ? { ...current, hasPassword: true } : current,
      );
    } catch {
      setCreatePasswordError("Erreur reseau.");
    } finally {
      setCreatingPassword(false);
    }
  }

  async function onAddPhone(values: z.output<typeof addPhoneCredentialSchema>) {
    setAddPhoneError(null);
    setAddPhoneSuccess(null);
    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setAddPhoneError("Session CSRF invalide. Reconnectez-vous.");
      router.replace("/");
      return;
    }
    setAddingPhone(true);
    try {
      const response = await fetch(`${API_URL}/auth/add-phone-credential`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({ phone: values.phone, pin: values.pin }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message = Array.isArray(payload?.message)
          ? payload.message.join(", ")
          : (payload?.message ?? "Impossible d'ajouter le telephone.");
        setAddPhoneError(String(message));
        return;
      }
      setAddPhoneSuccess("Telephone et PIN configures avec succes.");
      addPhoneForm.reset();
      setOpenSecuritySection(null);
      setMe((current) =>
        current ? { ...current, hasPhoneCredential: true } : current,
      );
      await loadMe();
    } catch {
      setAddPhoneError("Erreur reseau.");
    } finally {
      setAddingPhone(false);
    }
  }

  async function onChangePassword(
    values: z.output<typeof changePasswordSchema>,
  ) {
    setPasswordError(null);
    setPasswordSuccess(null);

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
          currentPassword: values.currentPassword,
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
            : (payload?.message ?? "Changement de mot de passe impossible.");
        setPasswordError(String(message));
        return;
      }

      setPasswordSuccess("Mot de passe mis a jour avec succes.");
      passwordForm.reset();
    } catch {
      setPasswordError("Erreur reseau.");
    } finally {
      setUpdatingPassword(false);
    }
  }

  async function onChangePin(values: z.output<typeof changePinSchema>) {
    setPinError(null);
    setPinSuccess(null);

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
          currentPin: values.currentPin,
          newPin: values.newPin,
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
      pinForm.reset();
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
      recoveryForm.reset({
        birthDate: data.birthDate ?? "",
        selectedQuestions: data.selectedQuestions ?? [],
        parentClassId: data.parentClassId ?? "",
        parentStudentId: data.parentStudentId ?? "",
        isParent: (data.schoolRoles ?? []).includes("PARENT"),
        answers: (data.selectedQuestions ?? []).reduce<Record<string, string>>(
          (accumulator, questionKey) => ({
            ...accumulator,
            [questionKey]: "",
          }),
          {},
        ),
      });
      setRecoveryReady(true);
    } catch {
      setRecoveryError("Erreur reseau.");
    } finally {
      setLoadingRecovery(false);
    }
  }

  function toggleRecoveryQuestion(question: QuestionKey) {
    const current = recoveryForm.getValues("selectedQuestions") ?? [];
    const currentAnswers = recoveryForm.getValues("answers") ?? {};
    if (current.includes(question)) {
      const next = current.filter((entry) => entry !== question);
      const clone = { ...currentAnswers };
      delete clone[question];
      recoveryForm.setValue("selectedQuestions", next, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
      recoveryForm.setValue("answers", clone, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
      return;
    }

    if (current.length >= 3) {
      return;
    }

    recoveryForm.setValue("selectedQuestions", [...current, question], {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  }

  function setRecoveryAnswer(question: QuestionKey, value: string) {
    recoveryForm.setValue(`answers.${question}`, value, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  }

  async function onUpdateRecovery(values: z.output<typeof recoverySchema>) {
    setRecoveryError(null);
    setRecoverySuccess(null);

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
          birthDate: values.birthDate,
          answers: values.selectedQuestions.map((questionKey) => ({
            questionKey,
            answer: values.answers[questionKey] ?? "",
          })),
          parentClassId: values.parentClassId,
          parentStudentId: values.parentStudentId,
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
      recoveryForm.setValue(
        "answers",
        Object.keys(values.answers).reduce<Record<string, string>>(
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
                      if (!editingPersonal && me) {
                        personalForm.reset({
                          firstName: me.firstName ?? "",
                          lastName: me.lastName ?? "",
                          gender: me.gender ?? "M",
                          phone: toLocalPhoneDisplay(me.phone),
                        });
                      }
                    }}
                  >
                    {editingPersonal ? "Annuler" : "Modifier"}
                  </Button>
                </div>

                {editingPersonal ? (
                  <form
                    className="grid max-w-xl gap-3"
                    onSubmit={personalForm.handleSubmit(onUpdatePersonal)}
                    noValidate
                  >
                    <FormField
                      label="Prenom"
                      error={personalForm.formState.errors.firstName?.message}
                    >
                      <Controller
                        control={personalForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormTextInput
                            name={field.name}
                            ref={field.ref}
                            type="text"
                            value={field.value}
                            onChange={(event) =>
                              personalForm.setValue(
                                "firstName",
                                event.target.value,
                                {
                                  shouldDirty: true,
                                  shouldTouch: true,
                                  shouldValidate: true,
                                },
                              )
                            }
                            onBlur={field.onBlur}
                            invalid={
                              Boolean(
                                personalForm.formState.errors.firstName,
                              ) || !String(field.value ?? "").trim()
                            }
                          />
                        )}
                      />
                    </FormField>

                    <FormField
                      label="Nom"
                      error={personalForm.formState.errors.lastName?.message}
                    >
                      <Controller
                        control={personalForm.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormTextInput
                            name={field.name}
                            ref={field.ref}
                            type="text"
                            value={field.value}
                            onChange={(event) =>
                              personalForm.setValue(
                                "lastName",
                                event.target.value,
                                {
                                  shouldDirty: true,
                                  shouldTouch: true,
                                  shouldValidate: true,
                                },
                              )
                            }
                            onBlur={field.onBlur}
                            invalid={
                              Boolean(personalForm.formState.errors.lastName) ||
                              !String(field.value ?? "").trim()
                            }
                          />
                        )}
                      />
                    </FormField>

                    <FormField
                      label="Genre"
                      error={personalForm.formState.errors.gender?.message}
                    >
                      <Controller
                        control={personalForm.control}
                        name="gender"
                        render={({ field }) => (
                          <FormSelect
                            name={field.name}
                            ref={field.ref}
                            value={field.value}
                            onChange={(event) =>
                              personalForm.setValue(
                                "gender",
                                event.target.value as "M" | "F" | "OTHER",
                                {
                                  shouldDirty: true,
                                  shouldTouch: true,
                                  shouldValidate: true,
                                },
                              )
                            }
                            onBlur={field.onBlur}
                            invalid={Boolean(
                              personalForm.formState.errors.gender,
                            )}
                          >
                            <option value="M">Masculin</option>
                            <option value="F">Feminin</option>
                            <option value="OTHER">Autre</option>
                          </FormSelect>
                        )}
                      />
                    </FormField>

                    <FormField
                      label="Telephone"
                      error={personalForm.formState.errors.phone?.message}
                    >
                      <Controller
                        control={personalForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormTextInput
                            name={field.name}
                            ref={field.ref}
                            type="text"
                            value={field.value}
                            onChange={(event) =>
                              personalForm.setValue(
                                "phone",
                                normalizePhoneInput(event.target.value),
                                {
                                  shouldDirty: true,
                                  shouldTouch: true,
                                  shouldValidate: true,
                                },
                              )
                            }
                            onBlur={field.onBlur}
                            placeholder="6XXXXXXXX"
                            invalid={
                              Boolean(personalForm.formState.errors.phone) ||
                              !String(field.value ?? "").trim()
                            }
                          />
                        )}
                      />
                    </FormField>

                    {personalError ? (
                      <p className="text-sm text-notification">
                        {personalError}
                      </p>
                    ) : null}
                    {personalSuccess ? (
                      <p className="text-sm text-primary">{personalSuccess}</p>
                    ) : null}
                    <FormSubmitHint visible={!personalForm.formState.isValid} />

                    <SubmitButton
                      disabled={
                        updatingPersonal || !personalForm.formState.isValid
                      }
                    >
                      {updatingPersonal ? "Mise a jour..." : "Enregistrer"}
                    </SubmitButton>
                  </form>
                ) : null}

                <div className="grid gap-4 md:grid-cols-2">
                  <InfoBlock label="Prenom" value={me?.firstName ?? "-"} />
                  <InfoBlock label="Nom" value={me?.lastName ?? "-"} />
                  {me?.email ? (
                    <InfoBlock label="Email" value={me.email} />
                  ) : (
                    <div className="rounded-card border border-border bg-background px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-text-secondary">
                        Email
                      </p>
                      <p className="mt-1 text-sm text-text-secondary italic">
                        Non renseigne
                      </p>
                      <form
                        className="mt-2 grid gap-2"
                        onSubmit={addEmailForm.handleSubmit(onAddEmail)}
                        noValidate
                      >
                        <Controller
                          control={addEmailForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormTextInput
                              name={field.name}
                              ref={field.ref}
                              type="email"
                              value={field.value}
                              onChange={(event) =>
                                addEmailForm.setValue(
                                  "email",
                                  event.target.value,
                                  {
                                    shouldDirty: true,
                                    shouldTouch: true,
                                    shouldValidate: true,
                                  },
                                )
                              }
                              onBlur={field.onBlur}
                              placeholder="votre@email.com"
                              invalid={Boolean(
                                addEmailForm.formState.errors.email,
                              )}
                            />
                          )}
                        />
                        {addEmailForm.formState.errors.email ? (
                          <p className="text-xs text-notification">
                            {addEmailForm.formState.errors.email.message}
                          </p>
                        ) : null}
                        {addEmailError ? (
                          <p className="text-xs text-notification">
                            {addEmailError}
                          </p>
                        ) : null}
                        {addEmailSuccess ? (
                          <p className="text-xs text-primary">
                            {addEmailSuccess}
                          </p>
                        ) : null}
                        <SubmitButton
                          disabled={
                            addingEmail || !addEmailForm.formState.isValid
                          }
                        >
                          {addingEmail ? "Envoi..." : "Ajouter l'email"}
                        </SubmitButton>
                      </form>
                    </div>
                  )}
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
                    {me && !me.hasPassword ? (
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                        Non configure
                      </span>
                    ) : null}
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    className="hidden lg:inline-flex"
                    onClick={() => {
                      const target =
                        me && !me.hasPassword ? "create-password" : "password";
                      setOpenSecuritySection((current) =>
                        current === target ? null : target,
                      );
                    }}
                  >
                    {openSecuritySection === "password" ||
                    openSecuritySection === "create-password"
                      ? "Fermer"
                      : me && !me.hasPassword
                        ? "Creer"
                        : "Modifier"}
                  </Button>
                  <ActionIconButton
                    icon={
                      openSecuritySection === "password" ||
                      openSecuritySection === "create-password"
                        ? X
                        : Pencil
                    }
                    label={
                      openSecuritySection === "password" ||
                      openSecuritySection === "create-password"
                        ? "Fermer la section mot de passe"
                        : me && !me.hasPassword
                          ? "Creer un mot de passe"
                          : "Modifier le mot de passe"
                    }
                    className="lg:hidden"
                    onClick={() => {
                      const target =
                        me && !me.hasPassword ? "create-password" : "password";
                      setOpenSecuritySection((current) =>
                        current === target ? null : target,
                      );
                    }}
                  />
                </div>

                {openSecuritySection === "create-password" ? (
                  <form
                    className="grid gap-3 p-4"
                    onSubmit={createPasswordForm.handleSubmit(onCreatePassword)}
                    noValidate
                  >
                    <p className="text-xs text-text-secondary">
                      Votre compte n&apos;a pas encore de mot de passe.
                      Definissez-en un pour pouvoir vous connecter avec votre
                      email.
                    </p>
                    <FormField
                      label="Nouveau mot de passe"
                      error={
                        createPasswordForm.formState.errors.newPassword?.message
                      }
                    >
                      <Controller
                        control={createPasswordForm.control}
                        name="newPassword"
                        render={({ field }) => (
                          <PasswordInput
                            aria-label="Nouveau mot de passe"
                            name={field.name}
                            value={field.value}
                            aria-invalid={
                              createPasswordForm.formState.errors.newPassword
                                ? "true"
                                : "false"
                            }
                            onChange={(event) =>
                              createPasswordForm.setValue(
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
                    <PasswordRequirementsHint
                      password={createPasswordForm.watch("newPassword") ?? ""}
                    />
                    <FormField
                      label="Confirmer le mot de passe"
                      error={
                        createPasswordForm.formState.errors.confirmNewPassword
                          ?.message
                      }
                    >
                      <Controller
                        control={createPasswordForm.control}
                        name="confirmNewPassword"
                        render={({ field }) => (
                          <PasswordInput
                            aria-label="Confirmer le mot de passe"
                            name={field.name}
                            value={field.value}
                            aria-invalid={
                              createPasswordForm.formState.errors
                                .confirmNewPassword
                                ? "true"
                                : "false"
                            }
                            onChange={(event) =>
                              createPasswordForm.setValue(
                                "confirmNewPassword",
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
                    {createPasswordError ? (
                      <p className="text-sm text-notification">
                        {createPasswordError}
                      </p>
                    ) : null}
                    {createPasswordSuccess ? (
                      <p className="text-sm text-primary">
                        {createPasswordSuccess}
                      </p>
                    ) : null}
                    <FormSubmitHint
                      visible={!createPasswordForm.formState.isValid}
                    />
                    <SubmitButton
                      disabled={
                        creatingPassword ||
                        !createPasswordForm.formState.isValid
                      }
                    >
                      {creatingPassword
                        ? "Creation..."
                        : "Creer le mot de passe"}
                    </SubmitButton>
                  </form>
                ) : null}

                {openSecuritySection === "password" ? (
                  <form
                    className="grid gap-3 p-4"
                    onSubmit={passwordForm.handleSubmit(onChangePassword)}
                    noValidate
                  >
                    <FormField
                      label="Ancien mot de passe"
                      error={
                        passwordForm.formState.errors.currentPassword?.message
                      }
                    >
                      <Controller
                        control={passwordForm.control}
                        name="currentPassword"
                        render={({ field }) => (
                          <PasswordInput
                            aria-label="Ancien mot de passe"
                            name={field.name}
                            value={field.value}
                            aria-invalid={
                              passwordForm.formState.errors.currentPassword
                                ? "true"
                                : "false"
                            }
                            onChange={(event) =>
                              passwordForm.setValue(
                                "currentPassword",
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

                    <FormField
                      label="Nouveau mot de passe"
                      error={passwordForm.formState.errors.newPassword?.message}
                    >
                      <Controller
                        control={passwordForm.control}
                        name="newPassword"
                        render={({ field }) => (
                          <PasswordInput
                            aria-label="Nouveau mot de passe"
                            name={field.name}
                            value={field.value}
                            aria-invalid={
                              passwordForm.formState.errors.newPassword
                                ? "true"
                                : "false"
                            }
                            onChange={(event) =>
                              passwordForm.setValue(
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
                    <PasswordRequirementsHint
                      password={passwordValues.newPassword ?? ""}
                    />

                    <FormField
                      label="Confirmer le nouveau mot de passe"
                      error={
                        passwordForm.formState.errors.confirmNewPassword
                          ?.message
                      }
                    >
                      <Controller
                        control={passwordForm.control}
                        name="confirmNewPassword"
                        render={({ field }) => (
                          <PasswordInput
                            aria-label="Confirmer le nouveau mot de passe"
                            name={field.name}
                            value={field.value}
                            aria-invalid={
                              passwordForm.formState.errors.confirmNewPassword
                                ? "true"
                                : "false"
                            }
                            onChange={(event) =>
                              passwordForm.setValue(
                                "confirmNewPassword",
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

                    {passwordError ? (
                      <p className="text-sm text-notification">
                        {passwordError}
                      </p>
                    ) : null}
                    {passwordSuccess ? (
                      <p className="text-sm text-primary">{passwordSuccess}</p>
                    ) : null}
                    <FormSubmitHint visible={!passwordForm.formState.isValid} />

                    <SubmitButton
                      disabled={
                        updatingPassword || !passwordForm.formState.isValid
                      }
                    >
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
                    {me && !me.hasPhoneCredential ? (
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                        Non configure
                      </span>
                    ) : null}
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    className="hidden lg:inline-flex"
                    onClick={() => {
                      const target =
                        me && !me.hasPhoneCredential ? "add-phone" : "pin";
                      setOpenSecuritySection((current) =>
                        current === target ? null : target,
                      );
                    }}
                  >
                    {openSecuritySection === "pin" ||
                    openSecuritySection === "add-phone"
                      ? "Fermer"
                      : me && !me.hasPhoneCredential
                        ? "Configurer"
                        : "Modifier"}
                  </Button>
                  <ActionIconButton
                    icon={
                      openSecuritySection === "pin" ||
                      openSecuritySection === "add-phone"
                        ? X
                        : Pencil
                    }
                    label={
                      openSecuritySection === "pin" ||
                      openSecuritySection === "add-phone"
                        ? "Fermer la section PIN"
                        : me && !me.hasPhoneCredential
                          ? "Configurer telephone et PIN"
                          : "Modifier le PIN"
                    }
                    className="lg:hidden"
                    onClick={() => {
                      const target =
                        me && !me.hasPhoneCredential ? "add-phone" : "pin";
                      setOpenSecuritySection((current) =>
                        current === target ? null : target,
                      );
                    }}
                  />
                </div>

                {openSecuritySection === "add-phone" ? (
                  <form
                    className="grid gap-3 p-4"
                    onSubmit={addPhoneForm.handleSubmit(onAddPhone)}
                    noValidate
                  >
                    <p className="text-xs text-text-secondary">
                      Ajoutez un numero de telephone et un code PIN pour vous
                      connecter depuis le mobile.
                    </p>
                    <FormField
                      label="Telephone (9 chiffres)"
                      error={addPhoneForm.formState.errors.phone?.message}
                    >
                      <Controller
                        control={addPhoneForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormTextInput
                            name={field.name}
                            ref={field.ref}
                            type="text"
                            value={field.value}
                            onChange={(event) =>
                              addPhoneForm.setValue(
                                "phone",
                                normalizePhoneInput(event.target.value),
                                {
                                  shouldDirty: true,
                                  shouldTouch: true,
                                  shouldValidate: true,
                                },
                              )
                            }
                            onBlur={field.onBlur}
                            placeholder="6XXXXXXXX"
                            invalid={Boolean(
                              addPhoneForm.formState.errors.phone,
                            )}
                          />
                        )}
                      />
                    </FormField>
                    <FormField
                      label="Code PIN (6 chiffres)"
                      error={addPhoneForm.formState.errors.pin?.message}
                    >
                      <Controller
                        control={addPhoneForm.control}
                        name="pin"
                        render={({ field }) => (
                          <PinInput
                            aria-label="Code PIN (6 chiffres)"
                            name={field.name}
                            value={field.value}
                            aria-invalid={
                              addPhoneForm.formState.errors.pin
                                ? "true"
                                : "false"
                            }
                            onChange={(event) =>
                              addPhoneForm.setValue(
                                "pin",
                                event.target.value
                                  .replace(/\D/g, "")
                                  .slice(0, 6),
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
                      error={addPhoneForm.formState.errors.confirmPin?.message}
                    >
                      <Controller
                        control={addPhoneForm.control}
                        name="confirmPin"
                        render={({ field }) => (
                          <PinInput
                            aria-label="Confirmer le PIN"
                            name={field.name}
                            value={field.value}
                            aria-invalid={
                              addPhoneForm.formState.errors.confirmPin
                                ? "true"
                                : "false"
                            }
                            onChange={(event) =>
                              addPhoneForm.setValue(
                                "confirmPin",
                                event.target.value
                                  .replace(/\D/g, "")
                                  .slice(0, 6),
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
                    {addPhoneError ? (
                      <p className="text-sm text-notification">
                        {addPhoneError}
                      </p>
                    ) : null}
                    {addPhoneSuccess ? (
                      <p className="text-sm text-primary">{addPhoneSuccess}</p>
                    ) : null}
                    <FormSubmitHint visible={!addPhoneForm.formState.isValid} />
                    <SubmitButton
                      disabled={addingPhone || !addPhoneForm.formState.isValid}
                    >
                      {addingPhone ? "Configuration..." : "Configurer"}
                    </SubmitButton>
                  </form>
                ) : null}

                {openSecuritySection === "pin" ? (
                  <form
                    className="grid gap-3 p-4"
                    onSubmit={pinForm.handleSubmit(onChangePin)}
                    noValidate
                  >
                    <FormField
                      label="PIN actuel"
                      error={pinForm.formState.errors.currentPin?.message}
                    >
                      <Controller
                        control={pinForm.control}
                        name="currentPin"
                        render={({ field }) => (
                          <PinInput
                            aria-label="PIN actuel"
                            name={field.name}
                            value={field.value}
                            aria-invalid={
                              pinForm.formState.errors.currentPin
                                ? "true"
                                : "false"
                            }
                            onChange={(event) =>
                              pinForm.setValue(
                                "currentPin",
                                event.target.value
                                  .replace(/\D/g, "")
                                  .slice(0, 6),
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
                      label="Nouveau PIN (6 chiffres)"
                      error={pinForm.formState.errors.newPin?.message}
                    >
                      <Controller
                        control={pinForm.control}
                        name="newPin"
                        render={({ field }) => (
                          <PinInput
                            aria-label="Nouveau PIN (6 chiffres)"
                            name={field.name}
                            value={field.value}
                            aria-invalid={
                              pinForm.formState.errors.newPin ? "true" : "false"
                            }
                            onChange={(event) =>
                              pinForm.setValue(
                                "newPin",
                                event.target.value
                                  .replace(/\D/g, "")
                                  .slice(0, 6),
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
                      label="Confirmation PIN"
                      error={pinForm.formState.errors.confirmNewPin?.message}
                    >
                      <Controller
                        control={pinForm.control}
                        name="confirmNewPin"
                        render={({ field }) => (
                          <PinInput
                            aria-label="Confirmation PIN"
                            name={field.name}
                            value={field.value}
                            aria-invalid={
                              pinForm.formState.errors.confirmNewPin
                                ? "true"
                                : "false"
                            }
                            onChange={(event) =>
                              pinForm.setValue(
                                "confirmNewPin",
                                event.target.value
                                  .replace(/\D/g, "")
                                  .slice(0, 6),
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

                    {pinError ? (
                      <p className="text-sm text-notification">{pinError}</p>
                    ) : null}
                    {pinSuccess ? (
                      <p className="text-sm text-primary">{pinSuccess}</p>
                    ) : null}
                    <FormSubmitHint visible={!pinForm.formState.isValid} />

                    <SubmitButton
                      disabled={updatingPin || !pinForm.formState.isValid}
                    >
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
                  <form
                    className="grid gap-3 p-4"
                    onSubmit={recoveryForm.handleSubmit(onUpdateRecovery)}
                    noValidate
                  >
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
                        <FormField
                          label="Date de naissance"
                          error={
                            recoveryForm.formState.errors.birthDate?.message
                          }
                        >
                          <Controller
                            control={recoveryForm.control}
                            name="birthDate"
                            render={({ field }) => (
                              <DateInput
                                name={field.name}
                                value={field.value}
                                invalid={
                                  Boolean(
                                    recoveryForm.formState.errors.birthDate,
                                  ) || !String(field.value ?? "").trim()
                                }
                                onChange={(event) =>
                                  recoveryForm.setValue(
                                    "birthDate",
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

                        {recoveryIsParent ? (
                          <>
                            <FormField
                              label="Classe de votre enfant"
                              error={
                                recoveryForm.formState.errors.parentClassId
                                  ?.message
                              }
                            >
                              <Controller
                                control={recoveryForm.control}
                                name="parentClassId"
                                render={({ field }) => (
                                  <FormSelect
                                    name={field.name}
                                    ref={field.ref}
                                    value={field.value}
                                    onChange={(event) =>
                                      recoveryForm.setValue(
                                        "parentClassId",
                                        event.target.value,
                                        {
                                          shouldDirty: true,
                                          shouldTouch: true,
                                          shouldValidate: true,
                                        },
                                      )
                                    }
                                    onBlur={field.onBlur}
                                    invalid={
                                      Boolean(
                                        recoveryForm.formState.errors
                                          .parentClassId,
                                      ) || !(field.value ?? "")
                                    }
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
                                  </FormSelect>
                                )}
                              />
                            </FormField>

                            <FormField
                              label="Nom de votre enfant"
                              error={
                                recoveryForm.formState.errors.parentStudentId
                                  ?.message
                              }
                            >
                              <Controller
                                control={recoveryForm.control}
                                name="parentStudentId"
                                render={({ field }) => (
                                  <FormSelect
                                    name={field.name}
                                    ref={field.ref}
                                    value={field.value}
                                    onChange={(event) =>
                                      recoveryForm.setValue(
                                        "parentStudentId",
                                        event.target.value,
                                        {
                                          shouldDirty: true,
                                          shouldTouch: true,
                                          shouldValidate: true,
                                        },
                                      )
                                    }
                                    onBlur={field.onBlur}
                                    invalid={
                                      Boolean(
                                        recoveryForm.formState.errors
                                          .parentStudentId,
                                      ) || !(field.value ?? "")
                                    }
                                  >
                                    <option value="">
                                      Selectionner un eleve
                                    </option>
                                    {recoveryStudents.map((student) => (
                                      <option
                                        key={student.id}
                                        value={student.id}
                                      >
                                        {student.lastName} {student.firstName}
                                      </option>
                                    ))}
                                  </FormSelect>
                                )}
                              />
                            </FormField>
                          </>
                        ) : null}

                        <div className="grid gap-2">
                          <p className="text-xs text-text-secondary">
                            Choisissez exactement 3 questions
                          </p>
                          {recoveryForm.formState.errors.selectedQuestions
                            ?.message ? (
                            <p className="text-xs text-notification">
                              {
                                recoveryForm.formState.errors.selectedQuestions
                                  .message
                              }
                            </p>
                          ) : null}
                          {recoveryQuestions.map((question) => {
                            const checked = (
                              recoveryValues.selectedQuestions ?? []
                            ).includes(question.key);

                            return (
                              <label
                                key={question.key}
                                className="grid gap-1 rounded-card border border-border px-3 py-2 text-sm"
                              >
                                <span className="inline-flex items-center gap-2">
                                  <FormCheckbox
                                    checked={checked}
                                    onChange={() =>
                                      toggleRecoveryQuestion(question.key)
                                    }
                                    invalid={
                                      Boolean(
                                        recoveryForm.formState.errors
                                          .selectedQuestions,
                                      ) && !checked
                                    }
                                  />
                                  <span>{question.label}</span>
                                </span>
                                {checked ? (
                                  <>
                                    <FormTextInput
                                      type="text"
                                      value={
                                        recoveryValues.answers?.[
                                          question.key
                                        ] ?? ""
                                      }
                                      onChange={(event) =>
                                        setRecoveryAnswer(
                                          question.key,
                                          event.target.value,
                                        )
                                      }
                                      placeholder="Votre reponse"
                                      invalid={
                                        Boolean(
                                          recoveryForm.formState.errors
                                            .answers?.[question.key],
                                        ) ||
                                        !String(
                                          recoveryValues.answers?.[
                                            question.key
                                          ] ?? "",
                                        ).trim()
                                      }
                                    />
                                    {recoveryForm.formState.errors.answers?.[
                                      question.key
                                    ]?.message ? (
                                      <span className="text-xs text-notification">
                                        {
                                          recoveryForm.formState.errors
                                            .answers?.[question.key]?.message
                                        }
                                      </span>
                                    ) : null}
                                  </>
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
                    <FormSubmitHint
                      visible={
                        !loadingRecovery && !recoveryForm.formState.isValid
                      }
                    />

                    <SubmitButton
                      disabled={
                        updatingRecovery ||
                        loadingRecovery ||
                        !recoveryForm.formState.isValid
                      }
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
