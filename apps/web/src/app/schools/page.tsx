"use client";

import { FormEvent, Fragment, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical } from "lucide-react";
import { z } from "zod";
import { AppShell } from "../../components/layout/app-shell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { ImageUploadField } from "../../components/ui/image-upload-field";
import { ModuleHelpTab } from "../../components/ui/module-help-tab";
import { getCsrfTokenCookie } from "../../lib/auth-cookies";

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

type SchoolRow = {
  id: string;
  slug: string;
  name: string;
  country: string | null;
  region: string | null;
  city: string | null;
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
  schoolAdminEmail: z
    .string()
    .trim()
    .email("L'email du school admin est invalide."),
  logoUrl: z.string().trim().url().optional(),
});

const updateSchoolSchema = z.object({
  name: z.string().trim().min(1, "Le nom de l ecole est obligatoire."),
  country: z.string().trim().nullable().optional(),
  region: z.string().trim().nullable().optional(),
  city: z.string().trim().nullable().optional(),
  logoUrl: z.string().trim().url().nullable().optional(),
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
  const [tab, setTab] = useState<Tab>("list");
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [schoolAdminEmail, setSchoolAdminEmail] = useState("");
  const [country, setCountry] = useState("");
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");
  const [schoolLogoUrl, setSchoolLogoUrl] = useState<string | null>(null);
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
  const [editSchoolName, setEditSchoolName] = useState("");
  const [editSchoolCountry, setEditSchoolCountry] = useState("");
  const [editSchoolRegion, setEditSchoolRegion] = useState("");
  const [editSchoolCity, setEditSchoolCity] = useState("");
  const [editSchoolLogoUrl, setEditSchoolLogoUrl] = useState<string | null>(
    null,
  );
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

  useEffect(() => {
    void bootstrap();
  }, []);

  useEffect(() => {
    const value = name.trim();
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
  }, [name]);

  useEffect(() => {
    const email = schoolAdminEmail.trim();
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
  }, [schoolAdminEmail]);

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
        setSubmitError("Impossible de charger les details de l ecole.");
        return;
      }

      setSelectedSchool((await response.json()) as SchoolDetails);
      setTab("details");
    } catch {
      setSubmitError("Erreur reseau.");
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
          error: "Verification du slug indisponible.",
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
        error: "Verification du slug indisponible.",
      });
    }
  }

  async function onCreateSchool(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    const parsed = createSchoolSchema.safeParse({
      name,
      country,
      region,
      city,
      schoolAdminEmail,
      logoUrl: schoolLogoUrl ?? undefined,
    });

    if (!parsed.success) {
      setSubmitError(parsed.error.issues[0]?.message ?? "Formulaire invalide.");
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setSubmitError("Session CSRF invalide. Reconnectez-vous.");
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
        body: JSON.stringify(parsed.data),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          payload?.message && Array.isArray(payload.message)
            ? payload.message.join(", ")
            : (payload?.message ?? "Creation impossible.");
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
            ? "Ecole creee et role SCHOOL_ADMIN assigne a un compte existant."
            : "Ecole creee. Le compte existant SCHOOL_ADMIN doit finaliser son changement de mot de passe.",
        );
      } else {
        setSubmitSuccess(
          "Ecole creee. Un compte SCHOOL_ADMIN a ete cree avec mot de passe provisoire et doit changer son mot de passe pour finaliser.",
        );
      }

      setName("");
      setSchoolAdminEmail("");
      setCountry("");
      setRegion("");
      setCity("");
      setSchoolLogoUrl(null);
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
      setSubmitError("Erreur reseau.");
    } finally {
      setSubmitting(false);
    }
  }

  function startEditSchool(school: SchoolRow) {
    setEditError(null);
    setOpenActionsSchoolId(null);
    setEditingSchoolId(school.id);
    setEditSchoolName(school.name);
    setEditSchoolCountry(school.country ?? "");
    setEditSchoolRegion(school.region ?? "");
    setEditSchoolCity(school.city ?? "");
    setEditSchoolLogoUrl(school.logoUrl);
  }

  async function onSaveSchool(schoolId: string) {
    setEditError(null);
    const parsed = updateSchoolSchema.safeParse({
      name: editSchoolName,
      country: editSchoolCountry || null,
      region: editSchoolRegion || null,
      city: editSchoolCity || null,
      logoUrl: editSchoolLogoUrl,
    });

    if (!parsed.success) {
      setEditError(parsed.error.issues[0]?.message ?? "Formulaire invalide.");
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setEditError("Session CSRF invalide. Reconnectez-vous.");
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
          name: parsed.data.name,
          country: parsed.data.country ?? null,
          region: parsed.data.region ?? null,
          city: parsed.data.city ?? null,
          logoUrl: parsed.data.logoUrl ?? null,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          payload?.message && Array.isArray(payload.message)
            ? payload.message.join(", ")
            : (payload?.message ?? "Modification impossible.");
        setEditError(String(message));
        return;
      }

      setEditingSchoolId(null);
      await loadSchools();
      if (selectedSchool?.id === schoolId) {
        await openSchoolDetails(schoolId);
      }
    } catch {
      setEditError("Erreur reseau.");
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
      setSubmitError("Session CSRF invalide. Reconnectez-vous.");
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
            : (payload?.message ?? "Suppression impossible.");
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
      setSubmitError("Erreur reseau.");
    } finally {
      setDeletingSchoolId(null);
      setDeleteTarget(null);
    }
  }

  const orderedSchools = useMemo(
    () => [...schools].sort((a, b) => a.name.localeCompare(b.name)),
    [schools],
  );

  return (
    <AppShell schoolName="School-Live Platform">
      <div className="grid gap-4">
        <Card title="Ecoles" subtitle="Gestion des etablissements">
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
              Liste des ecoles
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
              Creer une ecole
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
                Details
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
              Aide
            </button>
          </div>

          {tab === "list" ? (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-text-secondary">
                    <th className="px-3 py-2 font-medium">Nom</th>
                    <th className="px-3 py-2 font-medium">Slug</th>
                    <th className="px-3 py-2 font-medium">Localisation</th>
                    <th className="px-3 py-2 font-medium">Utilisateurs</th>
                    <th className="px-3 py-2 font-medium">Classes</th>
                    <th className="px-3 py-2 font-medium">Eleves</th>
                    <th className="px-3 py-2 font-medium">Creee le</th>
                    <th className="px-3 py-2 font-medium text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td className="px-3 py-6 text-text-secondary" colSpan={8}>
                        Chargement des ecoles...
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
                              aria-label="Actions ecole"
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
                                  Modifier
                                </button>
                                <button
                                  type="button"
                                  className="w-full rounded-card px-3 py-2 text-left text-sm text-notification hover:bg-background"
                                  onClick={() => {
                                    requestDeleteSchool(school);
                                  }}
                                >
                                  Supprimer
                                </button>
                              </div>
                            ) : null}
                          </td>
                        </tr>

                        {editingSchoolId === school.id ? (
                          <tr className="border-b border-border bg-background">
                            <td className="px-3 py-3" colSpan={8}>
                              <div className="grid gap-3 md:grid-cols-2">
                                <label className="grid gap-1 text-sm">
                                  <span className="text-text-secondary">
                                    Nom de l ecole
                                  </span>
                                  <input
                                    value={editSchoolName}
                                    onChange={(event) =>
                                      setEditSchoolName(event.target.value)
                                    }
                                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                                  />
                                </label>
                                <label className="grid gap-1 text-sm">
                                  <span className="text-text-secondary">
                                    Pays
                                  </span>
                                  <input
                                    value={editSchoolCountry}
                                    onChange={(event) =>
                                      setEditSchoolCountry(event.target.value)
                                    }
                                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                                  />
                                </label>
                                <label className="grid gap-1 text-sm">
                                  <span className="text-text-secondary">
                                    Region
                                  </span>
                                  <input
                                    value={editSchoolRegion}
                                    onChange={(event) =>
                                      setEditSchoolRegion(event.target.value)
                                    }
                                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                                  />
                                </label>
                                <label className="grid gap-1 text-sm">
                                  <span className="text-text-secondary">
                                    Ville
                                  </span>
                                  <input
                                    value={editSchoolCity}
                                    onChange={(event) =>
                                      setEditSchoolCity(event.target.value)
                                    }
                                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                                  />
                                </label>

                                <ImageUploadField
                                  kind="school-logo"
                                  label="Logo"
                                  helperText="Image JPG/PNG/WEBP, maximum 5MB."
                                  value={editSchoolLogoUrl}
                                  onChange={setEditSchoolLogoUrl}
                                />
                              </div>
                              {editError ? (
                                <p className="mt-2 text-sm text-notification">
                                  {editError}
                                </p>
                              ) : null}
                              <div className="mt-3 flex gap-2">
                                <Button
                                  type="button"
                                  disabled={savingEdit}
                                  onClick={() => {
                                    void onSaveSchool(school.id);
                                  }}
                                >
                                  {savingEdit
                                    ? "Enregistrement..."
                                    : "Enregistrer"}
                                </Button>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  onClick={() => {
                                    setEditingSchoolId(null);
                                    setEditError(null);
                                  }}
                                >
                                  Annuler
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
                        Aucune ecole trouvee.
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
                  Chargement des details...
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
                          Aucun logo
                        </div>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <InfoLine label="Nom" value={selectedSchool.name} />
                      <InfoLine label="Slug" value={selectedSchool.slug} />
                      <InfoLine
                        label="Pays"
                        value={selectedSchool.country ?? "-"}
                      />
                      <InfoLine
                        label="Region"
                        value={selectedSchool.region ?? "-"}
                      />
                      <InfoLine
                        label="Ville"
                        value={selectedSchool.city ?? "-"}
                      />
                      <InfoLine
                        label="Creee le"
                        value={new Date(
                          selectedSchool.createdAt,
                        ).toLocaleString("fr-FR")}
                      />
                      <InfoLine
                        label="Mise a jour"
                        value={new Date(
                          selectedSchool.updatedAt,
                        ).toLocaleString("fr-FR")}
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-5">
                    <StatBox
                      label="Utilisateurs"
                      value={selectedSchool.stats.usersCount}
                    />
                    <StatBox
                      label="Classes"
                      value={selectedSchool.stats.classesCount}
                    />
                    <StatBox
                      label="Eleves"
                      value={selectedSchool.stats.studentsCount}
                    />
                    <StatBox
                      label="Enseignants"
                      value={selectedSchool.stats.teachersCount}
                    />
                    <StatBox
                      label="Notes"
                      value={selectedSchool.stats.gradesCount}
                    />
                  </div>

                  <div className="rounded-card border border-border bg-background p-3">
                    <p className="mb-2 text-sm font-medium text-text-primary">
                      School Admins
                    </p>
                    {selectedSchool.schoolAdmins.length === 0 ? (
                      <p className="text-sm text-text-secondary">
                        Aucun school admin trouve.
                      </p>
                    ) : (
                      <ul className="grid gap-1 text-sm text-text-primary">
                        {selectedSchool.schoolAdmins.map((admin) => (
                          <li key={admin.id}>
                            {admin.firstName} {admin.lastName} - {admin.email}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setTab("list")}
                    >
                      Retour a la liste
                    </Button>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}

          {tab === "create" ? (
            <form
              className="grid gap-3 md:grid-cols-2"
              onSubmit={onCreateSchool}
            >
              <label className="grid gap-1 text-sm md:col-span-2">
                <span className="text-text-secondary">Nom de l ecole</span>
                <input
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                />
                <span className="text-xs text-text-secondary">
                  {slugPreview.loading
                    ? "Generation/verifications du slug..."
                    : null}
                  {!slugPreview.loading && slugPreview.error
                    ? slugPreview.error
                    : null}
                  {!slugPreview.loading &&
                  !slugPreview.error &&
                  slugPreview.suggestedSlug
                    ? slugPreview.baseExists
                      ? `Slug detecte deja pris (${slugPreview.baseSlug}). Le slug final sera ${slugPreview.suggestedSlug}.`
                      : `Slug genere: ${slugPreview.suggestedSlug}.`
                    : null}
                </span>
              </label>

              <label className="grid gap-1 text-sm">
                <span className="text-text-secondary">Pays (optionnel)</span>
                <input
                  value={country}
                  onChange={(event) => setCountry(event.target.value)}
                  className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                />
              </label>

              <label className="grid gap-1 text-sm">
                <span className="text-text-secondary">Region (optionnel)</span>
                <input
                  value={region}
                  onChange={(event) => setRegion(event.target.value)}
                  className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                />
              </label>

              <label className="grid gap-1 text-sm md:col-span-2">
                <span className="text-text-secondary">Ville (optionnel)</span>
                <input
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                />
              </label>

              <label className="grid gap-1 text-sm md:col-span-2">
                <span className="text-text-secondary">Email School Admin</span>
                <input
                  type="email"
                  required
                  value={schoolAdminEmail}
                  onChange={(event) => setSchoolAdminEmail(event.target.value)}
                  className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                />
                <span className="text-xs text-text-secondary">
                  {emailCheckState === "checking"
                    ? "Verification de l email..."
                    : null}
                  {emailCheckState === "invalid" ? "Email invalide." : null}
                  {emailCheckState === "exists"
                    ? `Compte existant detecte (${emailCheckName ?? "utilisateur"}). Il recevra le role SCHOOL_ADMIN pour cette ecole.`
                    : null}
                  {emailCheckState === "not_found"
                    ? "Aucun compte existant: un nouveau school admin sera cree et recevra un mot de passe provisoire genere automatiquement."
                    : null}
                  {emailCheckState === "error"
                    ? "Verification email indisponible."
                    : null}
                </span>
              </label>

              <div className="md:col-span-2">
                <ImageUploadField
                  kind="school-logo"
                  label="Logo de l ecole (optionnel)"
                  helperText="Image JPG/PNG/WEBP, maximum 5MB. Le logo est optimise automatiquement."
                  value={schoolLogoUrl}
                  onChange={setSchoolLogoUrl}
                />
              </div>

              <p className="text-xs text-text-secondary md:col-span-2">
                Si l email existe deja, ce compte sera reutilise. Sinon, un mot
                de passe provisoire sera genere par le backend et envoye par
                email.
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
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Creation..." : "Creer l ecole"}
                </Button>
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
        title="Confirmer la suppression"
        message={
          deleteTarget
            ? `Voulez-vous supprimer l'ecole ${deleteTarget.label} ? Cette action est irreversible.`
            : ""
        }
        confirmLabel="Supprimer"
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
