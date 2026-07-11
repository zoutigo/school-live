"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Fragment, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AppShell } from "../../components/layout/app-shell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { EmailInput } from "../../components/ui/email-input";
import {
  FormSubmitHint,
  FormTextInput,
} from "../../components/ui/form-controls";
import { FormField } from "../../components/ui/form-field";
import { BackButton, SubmitButton } from "../../components/ui/form-buttons";
import { ImageUploadField } from "../../components/ui/image-upload-field";
import { ModuleHelpTab } from "../../components/ui/module-help-tab";
import { getCsrfTokenCookie } from "../../lib/auth-cookies";
import { useTranslation } from "../../i18n/useTranslation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
const API_ORIGIN = API_URL.replace(/\/api\/?$/, "");

type Role =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "SALES"
  | "SUPPORT"
  | "SCHOOL_ADMIN"
  | "SCHOOL_MANAGER"
  | "SUPERVISOR"
  | "SCHOOL_ACCOUNTANT"
  | "TEACHER"
  | "PARENT"
  | "STUDENT";
type Tab = "list" | "create" | "details" | "help";

type MeResponse = {
  role: Role;
  schoolSlug: string | null;
};

type SchoolCycle = "PRIMARY" | "SECONDARY";
type SchoolLanguageSystem = "FRANCOPHONE" | "ANGLOPHONE" | "BILINGUAL";

type SchoolRow = {
  id: string;
  slug: string;
  name: string;
  country: string | null;
  region: string | null;
  city: string | null;
  cycle: SchoolCycle | null;
  languageSystem: SchoolLanguageSystem | null;
  logoUrl: string | null;
  createdAt: string;
  updatedAt: string;
  usersCount: number;
  classesCount: number;
  studentsCount: number;
};

type SchoolDetails = {
  id: string;
  slug: string;
  name: string;
  country: string | null;
  region: string | null;
  city: string | null;
  cycle: SchoolCycle | null;
  languageSystem: SchoolLanguageSystem | null;
  logoUrl: string | null;
  createdAt: string;
  updatedAt: string;
  stats: {
    usersCount: number;
    classesCount: number;
    studentsCount: number;
    teachersCount: number;
    gradesCount: number;
  };
  schoolAdmins: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    mustChangePassword: boolean;
    profileCompleted: boolean;
    canResendInvite: boolean;
  }>;
};

type SlugPreviewState = {
  loading: boolean;
  baseSlug: string | null;
  suggestedSlug: string | null;
  baseExists: boolean;
  error: string | null;
};

type EmailCheckState =
  | "idle"
  | "checking"
  | "exists"
  | "not_found"
  | "invalid"
  | "error";

const createSchoolSchema = z.object({
  name: z.string().trim().min(1, "Le nom de l ecole est obligatoire."),
  country: z
    .union([z.string().trim(), z.literal(""), z.null()])
    .optional()
    .transform((value) => {
      if (value === "" || value === null) {
        return undefined;
      }
      return value;
    }),
  region: z
    .union([z.string().trim(), z.literal(""), z.null()])
    .optional()
    .transform((value) => {
      if (value === "" || value === null) {
        return undefined;
      }
      return value;
    }),
  city: z
    .union([z.string().trim(), z.literal(""), z.null()])
    .optional()
    .transform((value) => {
      if (value === "" || value === null) {
        return undefined;
      }
      return value;
    }),
  cycle: z
    .union([z.enum(["PRIMARY", "SECONDARY"]), z.literal(""), z.null()])
    .optional()
    .transform((value) => (value ? value : undefined)),
  languageSystem: z
    .union([
      z.enum(["FRANCOPHONE", "ANGLOPHONE", "BILINGUAL"]),
      z.literal(""),
      z.null(),
    ])
    .optional()
    .transform((value) => (value ? value : undefined)),
  schoolAdminEmail: z
    .string()
    .trim()
    .email("L'email du school admin est invalide."),
  logoUrl: z
    .union([z.string().trim().url(), z.literal(""), z.undefined()])
    .optional()
    .transform((value) => {
      if (!value) {
        return undefined;
      }
      return value;
    }),
});

const updateSchoolSchema = z.object({
  name: z.string().trim().min(1, "Le nom de l ecole est obligatoire."),
  country: z.string().trim().nullable().optional(),
  region: z.string().trim().nullable().optional(),
  city: z.string().trim().nullable().optional(),
  cycle: z
    .union([z.enum(["PRIMARY", "SECONDARY"]), z.literal(""), z.null()])
    .optional()
    .transform((value) => (value ? value : null)),
  languageSystem: z
    .union([
      z.enum(["FRANCOPHONE", "ANGLOPHONE", "BILINGUAL"]),
      z.literal(""),
      z.null(),
    ])
    .optional()
    .transform((value) => (value ? value : null)),
  logoUrl: z
    .union([z.string().trim().url(), z.literal(""), z.null(), z.undefined()])
    .optional()
    .transform((value) => {
      if (!value) {
        return undefined;
      }
      return value;
    }),
});

function toFileUrl(fileUrl: string | null) {
  if (!fileUrl) {
    return null;
  }

  if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
    return fileUrl;
  }

  return `${API_ORIGIN}${fileUrl}`;
}

export default function SchoolsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("list");
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const [slugPreview, setSlugPreview] = useState<SlugPreviewState>({
    loading: false,
    baseSlug: null,
    suggestedSlug: null,
    baseExists: false,
    error: null,
  });
  const [emailCheckState, setEmailCheckState] =
    useState<EmailCheckState>("idle");
  const [emailCheckName, setEmailCheckName] = useState<string | null>(null);
  const [openActionsSchoolId, setOpenActionsSchoolId] = useState<string | null>(
    null,
  );
  const [editingSchoolId, setEditingSchoolId] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<SchoolDetails | null>(
    null,
  );
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [deletingSchoolId, setDeletingSchoolId] = useState<string | null>(null);
  const [sendingInviteAdminId, setSendingInviteAdminId] = useState<
    string | null
  >(null);
  const createSchoolForm = useForm<z.input<typeof createSchoolSchema>>({
    resolver: zodResolver(createSchoolSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      country: "",
      region: "",
      city: "",
      cycle: "",
      languageSystem: "",
      schoolAdminEmail: "",
      logoUrl: "",
    },
  });
  const editSchoolForm = useForm<z.input<typeof updateSchoolSchema>>({
    resolver: zodResolver(updateSchoolSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      country: "",
      region: "",
      city: "",
      cycle: "",
      languageSystem: "",
      logoUrl: "",
    },
  });
  const createSchoolValues = createSchoolForm.watch();
  const editSchoolValues = editSchoolForm.watch();

  useEffect(() => {
    void bootstrap();
  }, []);

  useEffect(() => {
    const value = (createSchoolValues.name ?? "").trim();
    if (!value) {
      setSlugPreview({
        loading: false,
        baseSlug: null,
        suggestedSlug: null,
        baseExists: false,
        error: null,
      });
      return;
    }

    const timeout = setTimeout(() => {
      void previewSlug(value);
    }, 350);

    return () => clearTimeout(timeout);
  }, [createSchoolValues.name]);

  useEffect(() => {
    const email = (createSchoolValues.schoolAdminEmail ?? "").trim();
    if (!email) {
      setEmailCheckState("idle");
      setEmailCheckName(null);
      return;
    }

    if (!z.string().email().safeParse(email).success) {
      setEmailCheckState("invalid");
      setEmailCheckName(null);
      return;
    }

    const timeout = setTimeout(() => {
      void checkAdminEmail(email);
    }, 350);

    return () => clearTimeout(timeout);
  }, [createSchoolValues.schoolAdminEmail]);

  useEffect(() => {
    if (tab !== "create") {
      return;
    }
    void createSchoolForm.trigger();
  }, [createSchoolForm, tab]);

  async function bootstrap() {
    const meResponse = await fetch(`${API_URL}/me`, {
      credentials: "include",
    });

    if (!meResponse.ok) {
      router.replace("/");
      return;
    }

    const me = (await meResponse.json()) as MeResponse;

    if (me.role !== "SUPER_ADMIN" && me.role !== "ADMIN") {
      router.replace(
        me.schoolSlug ? `/schools/${me.schoolSlug}/dashboard` : "/",
      );
      return;
    }

    await loadSchools();
    setLoading(false);
  }

  async function loadSchools() {
    const schoolsResponse = await fetch(`${API_URL}/system/schools`, {
      credentials: "include",
    });

    if (!schoolsResponse.ok) {
      router.replace("/");
      return;
    }

    setSchools((await schoolsResponse.json()) as SchoolRow[]);
  }

  async function openSchoolDetails(schoolId: string) {
    setSubmitError(null);
    setLoadingDetails(true);
    try {
      const response = await fetch(`${API_URL}/system/schools/${schoolId}`, {
        credentials: "include",
      });

      if (!response.ok) {
        setSubmitError(t("schools.error.loadDetails"));
        return;
      }

      setSelectedSchool((await response.json()) as SchoolDetails);
      setTab("details");
    } catch {
      setSubmitError(t("schools.error.network"));
    } finally {
      setLoadingDetails(false);
    }
  }

  async function checkAdminEmail(email: string) {
    setEmailCheckState("checking");
    try {
      const params = new URLSearchParams({ email });
      const response = await fetch(
        `${API_URL}/system/users/exists?${params.toString()}`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        setEmailCheckState("error");
        setEmailCheckName(null);
        return;
      }

      const payload = (await response.json()) as {
        exists: boolean;
        user?: {
          firstName: string;
          lastName: string;
          mustChangePassword: boolean;
        };
      };

      if (payload.exists && payload.user) {
        setEmailCheckState("exists");
        setEmailCheckName(`${payload.user.firstName} ${payload.user.lastName}`);
      } else {
        setEmailCheckState("not_found");
        setEmailCheckName(null);
      }
    } catch {
      setEmailCheckState("error");
      setEmailCheckName(null);
    }
  }

  async function previewSlug(schoolName: string) {
    setSlugPreview((current) => ({
      ...current,
      loading: true,
      error: null,
    }));

    try {
      const params = new URLSearchParams({ name: schoolName });
      const response = await fetch(
        `${API_URL}/system/schools/slug-preview?${params.toString()}`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        setSlugPreview({
          loading: false,
          baseSlug: null,
          suggestedSlug: null,
          baseExists: false,
          error: t("schools.slug.error"),
        });
        return;
      }

      const payload = (await response.json()) as {
        baseSlug: string;
        suggestedSlug: string;
        baseExists: boolean;
      };

      setSlugPreview({
        loading: false,
        baseSlug: payload.baseSlug,
        suggestedSlug: payload.suggestedSlug,
        baseExists: payload.baseExists,
        error: null,
      });
    } catch {
      setSlugPreview({
        loading: false,
        baseSlug: null,
        suggestedSlug: null,
        baseExists: false,
        error: t("schools.slug.error"),
      });
    }
  }

  async function onCreateSchool(values: z.input<typeof createSchoolSchema>) {
    setSubmitError(null);
    setSubmitSuccess(null);

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setSubmitError(t("schools.error.csrf"));
      router.replace("/");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/system/schools`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify(createSchoolSchema.parse(values)),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          payload?.message && Array.isArray(payload.message)
            ? payload.message.join(", ")
            : (payload?.message ?? t("schools.error.createFallback"));
        setSubmitError(String(message));
        return;
      }

      const payload = (await response.json()) as {
        userExisted: boolean;
        setupCompleted: boolean;
      };

      if (payload.userExisted) {
        setSubmitSuccess(
          payload.setupCompleted
            ? t("schools.success.createExisting")
            : t("schools.success.createExistingPending"),
        );
      } else {
        setSubmitSuccess(t("schools.success.createNew"));
      }

      createSchoolForm.reset({
        name: "",
        country: "",
        region: "",
        city: "",
        cycle: "",
        languageSystem: "",
        schoolAdminEmail: "",
        logoUrl: "",
      });
      setSlugPreview({
        loading: false,
        baseSlug: null,
        suggestedSlug: null,
        baseExists: false,
        error: null,
      });
      setEmailCheckState("idle");
      setEmailCheckName(null);
      await loadSchools();
      setTab("list");
    } catch {
      setSubmitError(t("schools.error.network"));
    } finally {
      setSubmitting(false);
    }
  }

  function startEditSchool(school: SchoolRow) {
    setEditError(null);
    setOpenActionsSchoolId(null);
    setEditingSchoolId(school.id);
    editSchoolForm.reset({
      name: school.name,
      country: school.country ?? "",
      region: school.region ?? "",
      city: school.city ?? "",
      cycle: school.cycle ?? "",
      languageSystem: school.languageSystem ?? "",
      logoUrl: school.logoUrl ?? "",
    });
    void editSchoolForm.trigger();
  }

  async function onSaveSchool(
    schoolId: string,
    values: z.input<typeof updateSchoolSchema>,
  ) {
    setEditError(null);

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setEditError(t("schools.error.csrf"));
      router.replace("/");
      return;
    }

    setSavingEdit(true);
    try {
      const response = await fetch(`${API_URL}/system/schools/${schoolId}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          name: values.name,
          country: values.country ?? null,
          region: values.region ?? null,
          city: values.city ?? null,
          cycle: values.cycle ?? null,
          languageSystem: values.languageSystem ?? null,
          logoUrl: values.logoUrl ?? null,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          payload?.message && Array.isArray(payload.message)
            ? payload.message.join(", ")
            : (payload?.message ?? t("schools.error.editFallback"));
        setEditError(String(message));
        return;
      }

      setEditingSchoolId(null);
      await loadSchools();
      if (selectedSchool?.id === schoolId) {
        await openSchoolDetails(schoolId);
      }
    } catch {
      setEditError(t("schools.error.network"));
    } finally {
      setSavingEdit(false);
    }
  }

  function requestDeleteSchool(school: SchoolRow) {
    setDeleteTarget({
      id: school.id,
      label: school.name,
    });
    setOpenActionsSchoolId(null);
  }

  async function onDeleteSchool(schoolId: string) {
    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setSubmitError(t("schools.error.csrf"));
      router.replace("/");
      return;
    }

    setDeletingSchoolId(schoolId);
    try {
      const response = await fetch(`${API_URL}/system/schools/${schoolId}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "X-CSRF-Token": csrfToken,
        },
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          payload?.message && Array.isArray(payload.message)
            ? payload.message.join(", ")
            : (payload?.message ?? t("schools.error.deleteFallback"));
        setSubmitError(String(message));
        return;
      }

      if (selectedSchool?.id === schoolId) {
        setSelectedSchool(null);
        setTab("list");
      }
      if (editingSchoolId === schoolId) {
        setEditingSchoolId(null);
      }

      await loadSchools();
    } catch {
      setSubmitError(t("schools.error.network"));
    } finally {
      setDeletingSchoolId(null);
      setDeleteTarget(null);
    }
  }

  async function onResendSchoolAdminInvite(adminUserId: string) {
    if (!selectedSchool) {
      return;
    }

    setSubmitError(null);
    setSubmitSuccess(null);
    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setSubmitError(t("schools.error.csrf"));
      router.replace("/");
      return;
    }

    setSendingInviteAdminId(adminUserId);
    try {
      const response = await fetch(
        `${API_URL}/system/schools/${selectedSchool.id}/admins/${adminUserId}/resend-invite`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "X-CSRF-Token": csrfToken,
          },
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          payload?.message && Array.isArray(payload.message)
            ? payload.message.join(", ")
            : (payload?.message ?? t("schools.error.inviteFallback"));
        setSubmitError(String(message));
        return;
      }

      const payload = (await response.json()) as { email: string };
      setSubmitSuccess(
        t("schools.success.inviteSent").replace("{email}", payload.email),
      );
      await openSchoolDetails(selectedSchool.id);
    } catch {
      setSubmitError(t("schools.error.network"));
    } finally {
      setSendingInviteAdminId(null);
    }
  }

  const orderedSchools = useMemo(
    () => [...schools].sort((a, b) => a.name.localeCompare(b.name)),
    [schools],
  );

  return (
    <AppShell schoolName="Scolive Platform">
      <div className="grid gap-4">
        <Card title={t("schools.title")} subtitle={t("schools.subtitle")}>
          <div className="mb-4 flex items-end gap-2 border-b border-border">
            <button
              type="button"
              onClick={() => setTab("list")}
              className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                tab === "list"
                  ? "border border-border border-b-surface bg-surface text-primary"
                  : "text-text-secondary"
              }`}
            >
              {t("schools.tab.list")}
            </button>
            <button
              type="button"
              onClick={() => setTab("create")}
              className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                tab === "create"
                  ? "border border-border border-b-surface bg-surface text-primary"
                  : "text-text-secondary"
              }`}
            >
              {t("schools.tab.create")}
            </button>
            {selectedSchool ? (
              <button
                type="button"
                onClick={() => setTab("details")}
                className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                  tab === "details"
                    ? "border border-border border-b-surface bg-surface text-primary"
                    : "text-text-secondary"
                }`}
              >
                {t("schools.tab.details")}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setTab("help")}
              className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                tab === "help"
                  ? "border border-border border-b-surface bg-surface text-primary"
                  : "text-text-secondary"
              }`}
            >
              {t("schools.tab.help")}
            </button>
          </div>

          {tab === "list" ? (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-text-secondary">
                    <th className="px-3 py-2 font-medium">
                      {t("schools.table.name")}
                    </th>
                    <th className="px-3 py-2 font-medium">
                      {t("schools.table.slug")}
                    </th>
                    <th className="px-3 py-2 font-medium">
                      {t("schools.table.location")}
                    </th>
                    <th className="px-3 py-2 font-medium">
                      {t("schools.table.users")}
                    </th>
                    <th className="px-3 py-2 font-medium">
                      {t("schools.table.classes")}
                    </th>
                    <th className="px-3 py-2 font-medium">
                      {t("schools.table.students")}
                    </th>
                    <th className="px-3 py-2 font-medium">
                      {t("schools.table.createdAt")}
                    </th>
                    <th className="px-3 py-2 font-medium text-right">
                      {t("schools.table.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td className="px-3 py-6 text-text-secondary" colSpan={8}>
                        {t("schools.table.loading")}
                      </td>
                    </tr>
                  ) : null}

                  {!loading &&
                    orderedSchools.map((school) => (
                      <Fragment key={school.id}>
                        <tr className="border-b border-border text-text-primary">
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              className="inline-flex items-center gap-2 text-left text-primary hover:underline"
                              onClick={() => {
                                void openSchoolDetails(school.id);
                              }}
                            >
                              {school.logoUrl ? (
                                <img
                                  src={toFileUrl(school.logoUrl) ?? ""}
                                  alt={school.name}
                                  className="h-7 w-7 rounded-card border border-border object-cover"
                                />
                              ) : null}
                              <span>{school.name}</span>
                            </button>
                          </td>
                          <td className="px-3 py-2">{school.slug}</td>
                          <td className="px-3 py-2">
                            {[school.city, school.region, school.country]
                              .filter(Boolean)
                              .join(", ") || "-"}
                          </td>
                          <td className="px-3 py-2">{school.usersCount}</td>
                          <td className="px-3 py-2">{school.classesCount}</td>
                          <td className="px-3 py-2">{school.studentsCount}</td>
                          <td className="px-3 py-2">
                            {new Date(school.createdAt).toLocaleDateString(
                              "fr-FR",
                            )}
                          </td>
                          <td className="relative px-3 py-2 text-right">
                            <button
                              type="button"
                              aria-label={t("schools.action.actionsAria")}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-card border border-border bg-surface text-text-primary hover:bg-background"
                              onClick={() =>
                                setOpenActionsSchoolId((current) =>
                                  current === school.id ? null : school.id,
                                )
                              }
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                            {openActionsSchoolId === school.id ? (
                              <div className="absolute right-3 top-11 z-10 w-36 rounded-card border border-border bg-surface p-1 shadow-soft">
                                <button
                                  type="button"
                                  className="w-full rounded-card px-3 py-2 text-left text-sm text-text-primary hover:bg-background"
                                  onClick={() => startEditSchool(school)}
                                >
                                  {t("schools.action.edit")}
                                </button>
                                <button
                                  type="button"
                                  className="w-full rounded-card px-3 py-2 text-left text-sm text-notification hover:bg-background"
                                  onClick={() => {
                                    requestDeleteSchool(school);
                                  }}
                                >
                                  {t("schools.action.delete")}
                                </button>
                              </div>
                            ) : null}
                          </td>
                        </tr>

                        {editingSchoolId === school.id ? (
                          <tr className="border-b border-border bg-background">
                            <td className="px-3 py-3" colSpan={8}>
                              <div className="grid gap-3 md:grid-cols-2">
                                <FormField
                                  label={t("schools.form.fieldName")}
                                  error={
                                    editSchoolForm.formState.errors.name
                                      ?.message
                                  }
                                >
                                  <FormTextInput
                                    aria-label={t("schools.form.fieldName")}
                                    value={editSchoolValues.name ?? ""}
                                    onChange={(event) => {
                                      editSchoolForm.setValue(
                                        "name",
                                        event.target.value,
                                        {
                                          shouldDirty: true,
                                          shouldTouch: true,
                                          shouldValidate: true,
                                        },
                                      );
                                    }}
                                    invalid={
                                      Boolean(
                                        editSchoolForm.formState.errors.name,
                                      ) ||
                                      !String(
                                        editSchoolValues.name ?? "",
                                      ).trim()
                                    }
                                  />
                                </FormField>
                                <FormField
                                  label={t("schools.form.fieldCountry")}
                                >
                                  <FormTextInput
                                    aria-label={t("schools.form.fieldCountry")}
                                    value={editSchoolValues.country ?? ""}
                                    onChange={(event) => {
                                      editSchoolForm.setValue(
                                        "country",
                                        event.target.value,
                                        {
                                          shouldDirty: true,
                                          shouldTouch: true,
                                          shouldValidate: true,
                                        },
                                      );
                                    }}
                                    invalid={Boolean(
                                      editSchoolForm.formState.errors.country,
                                    )}
                                  />
                                </FormField>
                                <FormField
                                  label={t("schools.form.fieldRegion")}
                                >
                                  <FormTextInput
                                    aria-label={t("schools.form.fieldRegion")}
                                    value={editSchoolValues.region ?? ""}
                                    onChange={(event) => {
                                      editSchoolForm.setValue(
                                        "region",
                                        event.target.value,
                                        {
                                          shouldDirty: true,
                                          shouldTouch: true,
                                          shouldValidate: true,
                                        },
                                      );
                                    }}
                                    invalid={Boolean(
                                      editSchoolForm.formState.errors.region,
                                    )}
                                  />
                                </FormField>
                                <FormField label={t("schools.form.fieldCity")}>
                                  <FormTextInput
                                    aria-label={t("schools.form.fieldCity")}
                                    value={editSchoolValues.city ?? ""}
                                    onChange={(event) => {
                                      editSchoolForm.setValue(
                                        "city",
                                        event.target.value,
                                        {
                                          shouldDirty: true,
                                          shouldTouch: true,
                                          shouldValidate: true,
                                        },
                                      );
                                    }}
                                    invalid={Boolean(
                                      editSchoolForm.formState.errors.city,
                                    )}
                                  />
                                </FormField>
                                <FormField
                                  label={t("schools.form.fieldCycleOpt")}
                                >
                                  <select
                                    aria-label={t("schools.form.fieldCycleOpt")}
                                    className="w-full rounded-card border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                                    value={editSchoolValues.cycle ?? ""}
                                    onChange={(event) => {
                                      editSchoolForm.setValue(
                                        "cycle",
                                        event.target.value as
                                          | ""
                                          | "PRIMARY"
                                          | "SECONDARY",
                                        {
                                          shouldDirty: true,
                                          shouldTouch: true,
                                          shouldValidate: true,
                                        },
                                      );
                                    }}
                                  >
                                    <option value="">
                                      {t("schools.form.cyclePlaceholder")}
                                    </option>
                                    <option value="PRIMARY">
                                      {t("schools.form.cyclePrimary")}
                                    </option>
                                    <option value="SECONDARY">
                                      {t("schools.form.cycleSecondary")}
                                    </option>
                                  </select>
                                </FormField>
                                <FormField
                                  label={t(
                                    "schools.form.fieldLanguageSystemOpt",
                                  )}
                                >
                                  <select
                                    aria-label={t(
                                      "schools.form.fieldLanguageSystemOpt",
                                    )}
                                    className="w-full rounded-card border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                                    value={
                                      editSchoolValues.languageSystem ?? ""
                                    }
                                    onChange={(event) => {
                                      editSchoolForm.setValue(
                                        "languageSystem",
                                        event.target.value as
                                          | ""
                                          | "FRANCOPHONE"
                                          | "ANGLOPHONE"
                                          | "BILINGUAL",
                                        {
                                          shouldDirty: true,
                                          shouldTouch: true,
                                          shouldValidate: true,
                                        },
                                      );
                                    }}
                                  >
                                    <option value="">
                                      {t(
                                        "schools.form.languageSystemPlaceholder",
                                      )}
                                    </option>
                                    <option value="FRANCOPHONE">
                                      {t(
                                        "schools.form.languageSystemFrancophone",
                                      )}
                                    </option>
                                    <option value="ANGLOPHONE">
                                      {t(
                                        "schools.form.languageSystemAnglophone",
                                      )}
                                    </option>
                                    <option value="BILINGUAL">
                                      {t(
                                        "schools.form.languageSystemBilingual",
                                      )}
                                    </option>
                                  </select>
                                </FormField>

                                <ImageUploadField
                                  kind="school-logo"
                                  label={t("schools.form.fieldLogo")}
                                  helperText={t("schools.form.logoHelper")}
                                  value={editSchoolValues.logoUrl ?? null}
                                  onChange={(value) => {
                                    editSchoolForm.setValue(
                                      "logoUrl",
                                      value ?? "",
                                      {
                                        shouldDirty: true,
                                        shouldTouch: true,
                                        shouldValidate: true,
                                      },
                                    );
                                  }}
                                />
                              </div>
                              {editError ? (
                                <p className="mt-2 text-sm text-notification">
                                  {editError}
                                </p>
                              ) : null}
                              <FormSubmitHint
                                visible={!editSchoolForm.formState.isValid}
                                className="mt-2"
                              />
                              <div className="mt-3 flex gap-2">
                                <Button
                                  type="button"
                                  disabled={
                                    savingEdit ||
                                    !editSchoolForm.formState.isValid
                                  }
                                  onClick={() => {
                                    void editSchoolForm.handleSubmit((values) =>
                                      onSaveSchool(school.id, values),
                                    )();
                                  }}
                                >
                                  {savingEdit
                                    ? t("schools.action.saving")
                                    : t("schools.action.save")}
                                </Button>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  onClick={() => {
                                    setEditingSchoolId(null);
                                    setEditError(null);
                                    editSchoolForm.reset();
                                  }}
                                >
                                  {t("schools.action.cancel")}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    ))}

                  {!loading && orderedSchools.length === 0 ? (
                    <tr>
                      <td className="px-3 py-6 text-text-secondary" colSpan={8}>
                        {t("schools.table.empty")}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          ) : null}

          {tab === "details" ? (
            <div className="grid gap-4">
              {loadingDetails ? (
                <p className="text-sm text-text-secondary">
                  {t("schools.details.loading")}
                </p>
              ) : null}
              {!loadingDetails && selectedSchool ? (
                <>
                  <div className="grid gap-3 md:grid-cols-[220px_1fr]">
                    <div className="rounded-card border border-border bg-background p-3">
                      {selectedSchool.logoUrl ? (
                        <img
                          src={toFileUrl(selectedSchool.logoUrl) ?? ""}
                          alt={selectedSchool.name}
                          className="h-36 w-full rounded-card border border-border object-cover"
                        />
                      ) : (
                        <div className="flex h-36 items-center justify-center rounded-card border border-border text-sm text-text-secondary">
                          {t("schools.details.noLogo")}
                        </div>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <InfoLine
                        label={t("schools.details.labelName")}
                        value={selectedSchool.name}
                      />
                      <InfoLine
                        label={t("schools.details.labelSlug")}
                        value={selectedSchool.slug}
                      />
                      <InfoLine
                        label={t("schools.details.labelCountry")}
                        value={selectedSchool.country ?? "-"}
                      />
                      <InfoLine
                        label={t("schools.details.labelRegion")}
                        value={selectedSchool.region ?? "-"}
                      />
                      <InfoLine
                        label={t("schools.details.labelCity")}
                        value={selectedSchool.city ?? "-"}
                      />
                      <InfoLine
                        label={t("schools.details.labelCycle")}
                        value={
                          selectedSchool.cycle
                            ? t(
                                selectedSchool.cycle === "PRIMARY"
                                  ? "schools.form.cyclePrimary"
                                  : "schools.form.cycleSecondary",
                              )
                            : "-"
                        }
                      />
                      <InfoLine
                        label={t("schools.details.labelLanguageSystem")}
                        value={
                          selectedSchool.languageSystem
                            ? t(
                                {
                                  FRANCOPHONE:
                                    "schools.form.languageSystemFrancophone",
                                  ANGLOPHONE:
                                    "schools.form.languageSystemAnglophone",
                                  BILINGUAL:
                                    "schools.form.languageSystemBilingual",
                                }[selectedSchool.languageSystem],
                              )
                            : "-"
                        }
                      />
                      <InfoLine
                        label={t("schools.details.labelCreated")}
                        value={new Date(
                          selectedSchool.createdAt,
                        ).toLocaleString("fr-FR")}
                      />
                      <InfoLine
                        label={t("schools.details.labelUpdated")}
                        value={new Date(
                          selectedSchool.updatedAt,
                        ).toLocaleString("fr-FR")}
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-5">
                    <StatBox
                      label={t("schools.details.statUsers")}
                      value={selectedSchool.stats.usersCount}
                    />
                    <StatBox
                      label={t("schools.details.statClasses")}
                      value={selectedSchool.stats.classesCount}
                    />
                    <StatBox
                      label={t("schools.details.statStudents")}
                      value={selectedSchool.stats.studentsCount}
                    />
                    <StatBox
                      label={t("schools.details.statTeachers")}
                      value={selectedSchool.stats.teachersCount}
                    />
                    <StatBox
                      label={t("schools.details.statGrades")}
                      value={selectedSchool.stats.gradesCount}
                    />
                  </div>

                  <div className="rounded-card border border-border bg-background p-3">
                    <p className="mb-2 text-sm font-medium text-text-primary">
                      {t("schools.details.adminsTitle")}
                    </p>
                    {selectedSchool.schoolAdmins.length === 0 ? (
                      <p className="text-sm text-text-secondary">
                        {t("schools.details.adminsEmpty")}
                      </p>
                    ) : (
                      <ul className="grid gap-1 text-sm text-text-primary">
                        {selectedSchool.schoolAdmins.map((admin) => (
                          <li
                            key={admin.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-border bg-surface px-3 py-2"
                          >
                            <span>
                              {admin.firstName} {admin.lastName} - {admin.email}
                            </span>
                            {admin.canResendInvite ? (
                              <Button
                                type="button"
                                variant="secondary"
                                disabled={sendingInviteAdminId === admin.id}
                                onClick={() => {
                                  void onResendSchoolAdminInvite(admin.id);
                                }}
                              >
                                {sendingInviteAdminId === admin.id
                                  ? t("schools.details.inviteSending")
                                  : t("schools.details.inviteResend")}
                              </Button>
                            ) : (
                              <span className="text-xs text-text-secondary">
                                {t("schools.details.adminActive")}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div>
                    <BackButton onClick={() => setTab("list")}>
                      {t("schools.details.backToList")}
                    </BackButton>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}

          {tab === "create" ? (
            <form
              className="grid gap-3 md:grid-cols-2"
              onSubmit={createSchoolForm.handleSubmit(onCreateSchool)}
            >
              <FormField
                label={t("schools.form.fieldName")}
                className="md:col-span-2"
                error={createSchoolForm.formState.errors.name?.message}
                hint={
                  slugPreview.loading
                    ? t("schools.slug.loading")
                    : !slugPreview.loading && slugPreview.error
                      ? slugPreview.error
                      : !slugPreview.loading && slugPreview.suggestedSlug
                        ? slugPreview.baseExists
                          ? t("schools.slug.taken")
                              .replace("{baseSlug}", slugPreview.baseSlug ?? "")
                              .replace(
                                "{suggestedSlug}",
                                slugPreview.suggestedSlug,
                              )
                          : t("schools.slug.available").replace(
                              "{suggestedSlug}",
                              slugPreview.suggestedSlug,
                            )
                        : null
                }
              >
                <FormTextInput
                  aria-label={t("schools.form.fieldName")}
                  value={createSchoolValues.name ?? ""}
                  onChange={(event) => {
                    createSchoolForm.setValue("name", event.target.value, {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: true,
                    });
                  }}
                  invalid={
                    Boolean(createSchoolForm.formState.errors.name) ||
                    !String(createSchoolValues.name ?? "").trim()
                  }
                />
              </FormField>

              <FormField
                label={t("schools.form.fieldCountryOpt")}
                error={createSchoolForm.formState.errors.country?.message}
              >
                <FormTextInput
                  aria-label={t("schools.form.fieldCountry")}
                  value={createSchoolValues.country ?? ""}
                  onChange={(event) => {
                    createSchoolForm.setValue("country", event.target.value, {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: true,
                    });
                  }}
                  invalid={Boolean(createSchoolForm.formState.errors.country)}
                />
              </FormField>

              <FormField
                label={t("schools.form.fieldRegionOpt")}
                error={createSchoolForm.formState.errors.region?.message}
              >
                <FormTextInput
                  aria-label={t("schools.form.fieldRegion")}
                  value={createSchoolValues.region ?? ""}
                  onChange={(event) => {
                    createSchoolForm.setValue("region", event.target.value, {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: true,
                    });
                  }}
                  invalid={Boolean(createSchoolForm.formState.errors.region)}
                />
              </FormField>

              <FormField
                label={t("schools.form.fieldCityOpt")}
                className="md:col-span-2"
                error={createSchoolForm.formState.errors.city?.message}
              >
                <FormTextInput
                  aria-label={t("schools.form.fieldCity")}
                  value={createSchoolValues.city ?? ""}
                  onChange={(event) => {
                    createSchoolForm.setValue("city", event.target.value, {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: true,
                    });
                  }}
                  invalid={Boolean(createSchoolForm.formState.errors.city)}
                />
              </FormField>

              <FormField label={t("schools.form.fieldCycleOpt")}>
                <select
                  aria-label={t("schools.form.fieldCycleOpt")}
                  className="w-full rounded-card border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  value={createSchoolValues.cycle ?? ""}
                  onChange={(event) => {
                    createSchoolForm.setValue(
                      "cycle",
                      event.target.value as "" | "PRIMARY" | "SECONDARY",
                      {
                        shouldDirty: true,
                        shouldTouch: true,
                        shouldValidate: true,
                      },
                    );
                  }}
                >
                  <option value="">{t("schools.form.cyclePlaceholder")}</option>
                  <option value="PRIMARY">
                    {t("schools.form.cyclePrimary")}
                  </option>
                  <option value="SECONDARY">
                    {t("schools.form.cycleSecondary")}
                  </option>
                </select>
              </FormField>

              <FormField label={t("schools.form.fieldLanguageSystemOpt")}>
                <select
                  aria-label={t("schools.form.fieldLanguageSystemOpt")}
                  className="w-full rounded-card border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  value={createSchoolValues.languageSystem ?? ""}
                  onChange={(event) => {
                    createSchoolForm.setValue(
                      "languageSystem",
                      event.target.value as
                        | ""
                        | "FRANCOPHONE"
                        | "ANGLOPHONE"
                        | "BILINGUAL",
                      {
                        shouldDirty: true,
                        shouldTouch: true,
                        shouldValidate: true,
                      },
                    );
                  }}
                >
                  <option value="">
                    {t("schools.form.languageSystemPlaceholder")}
                  </option>
                  <option value="FRANCOPHONE">
                    {t("schools.form.languageSystemFrancophone")}
                  </option>
                  <option value="ANGLOPHONE">
                    {t("schools.form.languageSystemAnglophone")}
                  </option>
                  <option value="BILINGUAL">
                    {t("schools.form.languageSystemBilingual")}
                  </option>
                </select>
              </FormField>

              <FormField
                label={t("schools.form.fieldAdminEmail")}
                className="md:col-span-2"
                error={
                  createSchoolForm.formState.errors.schoolAdminEmail?.message
                }
                hint={
                  emailCheckState === "checking"
                    ? t("schools.email.checking")
                    : emailCheckState === "invalid"
                      ? t("schools.email.invalid")
                      : emailCheckState === "exists"
                        ? t("schools.email.exists").replace(
                            "{name}",
                            emailCheckName ?? "utilisateur",
                          )
                        : emailCheckState === "not_found"
                          ? t("schools.email.notFound")
                          : emailCheckState === "error"
                            ? t("schools.email.error")
                            : null
                }
              >
                <EmailInput
                  aria-label={t("schools.form.fieldAdminEmail")}
                  value={createSchoolValues.schoolAdminEmail ?? ""}
                  onChange={(event) => {
                    createSchoolForm.setValue(
                      "schoolAdminEmail",
                      event.target.value,
                      {
                        shouldDirty: true,
                        shouldTouch: true,
                        shouldValidate: true,
                      },
                    );
                  }}
                  invalid={
                    Boolean(
                      createSchoolForm.formState.errors.schoolAdminEmail,
                    ) ||
                    !String(createSchoolValues.schoolAdminEmail ?? "").trim()
                  }
                />
              </FormField>

              <div className="md:col-span-2">
                <ImageUploadField
                  kind="school-logo"
                  label={t("schools.form.fieldLogoCreate")}
                  helperText={t("schools.form.logoHelperFull")}
                  value={createSchoolValues.logoUrl || null}
                  onChange={(value) => {
                    createSchoolForm.setValue("logoUrl", value ?? "", {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: true,
                    });
                  }}
                />
              </div>

              <p className="text-xs text-text-secondary md:col-span-2">
                {t("schools.form.emailNote")}
              </p>

              {submitError ? (
                <p className="text-sm text-notification md:col-span-2">
                  {submitError}
                </p>
              ) : null}
              {submitSuccess ? (
                <p className="text-sm text-primary md:col-span-2">
                  {submitSuccess}
                </p>
              ) : null}
              <div className="md:col-span-2">
                <FormSubmitHint visible={!createSchoolForm.formState.isValid} />
              </div>

              <div className="md:col-span-2">
                <SubmitButton
                  disabled={submitting || !createSchoolForm.formState.isValid}
                >
                  {submitting
                    ? t("schools.action.creating")
                    : t("schools.action.create")}
                </SubmitButton>
              </div>
            </form>
          ) : null}

          {tab === "help" ? (
            <ModuleHelpTab
              moduleName="Ecoles"
              moduleSummary="ce module gere les etablissements: creation, informations de base, logo et administrateurs de reference."
              actions={[
                {
                  name: "Creer",
                  purpose:
                    "ouvrir un nouvel etablissement avec son identite et son school admin.",
                  howTo:
                    "remplir le formulaire de creation (nom, email admin, logo), puis valider.",
                  moduleImpact:
                    "l'ecole apparait dans la liste et devient selectionnable dans les autres ecrans admin.",
                  crossModuleImpact:
                    "les modules Utilisateurs, Classes et Inscriptions peuvent ensuite recevoir des donnees rattachees a cette ecole.",
                },
                {
                  name: "Modifier",
                  purpose:
                    "mettre a jour le nom/logo ou corriger des informations d'etablissement.",
                  howTo:
                    "ouvrir les actions d'une ligne puis enregistrer les changements.",
                  moduleImpact:
                    "la fiche detail et la liste sont mises a jour immediatement.",
                  crossModuleImpact:
                    "les libelles ecole affiches dans les modules dependants sont harmonises.",
                },
                {
                  name: "Supprimer",
                  purpose:
                    "retirer un etablissement non utilise ou cree par erreur.",
                  howTo:
                    "lancer l'action Supprimer puis confirmer l'operation irreversible.",
                  moduleImpact: "l'ecole disparait de ce module.",
                  crossModuleImpact:
                    "les comptes, classes et inscriptions relies deviennent orphelins ou invalides selon les regles backend; operation a reserver aux cas maitrises.",
                },
              ]}
              tips={[
                "Verifier l'email du school admin avant creation pour eviter les doublons d'acces.",
                "Traiter les suppressions uniquement apres audit des donnees rattachees.",
              ]}
            />
          ) : null}

          {tab !== "create" && submitError ? (
            <p className="mt-3 text-sm text-notification">{submitError}</p>
          ) : null}
        </Card>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={t("schools.delete.title")}
        message={
          deleteTarget
            ? t("schools.delete.message").replace("{name}", deleteTarget.label)
            : ""
        }
        confirmLabel={t("schools.delete.confirm")}
        loading={Boolean(deletingSchoolId)}
        onCancel={() => {
          if (!deletingSchoolId) {
            setDeleteTarget(null);
          }
        }}
        onConfirm={() => {
          if (deleteTarget) {
            void onDeleteSchool(deleteTarget.id);
          }
        }}
      />
    </AppShell>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-border bg-background px-3 py-2">
      <p className="text-xs text-text-secondary">{label}</p>
      <p className="text-sm text-text-primary">{value}</p>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-card border border-border bg-background px-3 py-2">
      <p className="text-xs text-text-secondary">{label}</p>
      <p className="text-lg font-heading font-semibold text-primary">{value}</p>
    </div>
  );
}
