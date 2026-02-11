"use client";

import { FormEvent, Fragment, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical } from "lucide-react";
import { z } from "zod";
import { AppShell } from "../../components/layout/app-shell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { getCsrfTokenCookie } from "../../lib/auth-cookies";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type Role =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "SALES"
  | "SUPPORT"
  | "SCHOOL_ADMIN"
  | "SCHOOL_MANAGER"
  | "SCHOOL_ACCOUNTANT"
  | "TEACHER"
  | "PARENT"
  | "STUDENT";
type Tab = "groups" | "classes";

type MeResponse = {
  role: Role;
  schoolSlug: string | null;
};

type SchoolOption = {
  id: string;
  slug: string;
  name: string;
};

type ClassGroupRow = {
  id: string;
  schoolId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    classes: number;
  };
};

type ClassroomRow = {
  id: string;
  schoolId: string;
  classGroupId: string;
  name: string;
  schoolYear: {
    id: string;
    label: string;
  };
  createdAt: string;
  updatedAt: string;
  classGroup: {
    id: string;
    name: string;
  } | null;
  _count: {
    enrollments: number;
  };
};

type SchoolYearRow = {
  id: string;
  label: string;
  isActive: boolean;
};

const createClassGroupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Le nom du groupe de classes est obligatoire."),
});

const updateClassGroupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Le nom du groupe de classes est obligatoire."),
});

const createClassroomSchema = z.object({
  classGroupId: z
    .string()
    .trim()
    .min(1, "Le groupe de classes est obligatoire."),
  name: z.string().trim().min(1, "Le nom de la classe est obligatoire."),
  schoolYearId: z.string().trim().min(1, "L'annee scolaire est obligatoire."),
});

const updateClassroomSchema = z.object({
  classGroupId: z
    .string()
    .trim()
    .min(1, "Le groupe de classes est obligatoire."),
  name: z.string().trim().min(1, "Le nom de la classe est obligatoire."),
  schoolYearId: z.string().trim().min(1, "L'annee scolaire est obligatoire."),
});

export default function ClassesPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("groups");
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [role, setRole] = useState<Role | null>(null);
  const [schoolSlug, setSchoolSlug] = useState<string | null>(null);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [groups, setGroups] = useState<ClassGroupRow[]>([]);
  const [classrooms, setClassrooms] = useState<ClassroomRow[]>([]);
  const [schoolYears, setSchoolYears] = useState<SchoolYearRow[]>([]);

  const [groupName, setGroupName] = useState("");
  const [classGroupId, setClassGroupId] = useState("");
  const [className, setClassName] = useState("");
  const [classSchoolYearId, setClassSchoolYearId] = useState("");

  const [openGroupActionsId, setOpenGroupActionsId] = useState<string | null>(
    null,
  );
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState("");

  const [openClassActionsId, setOpenClassActionsId] = useState<string | null>(
    null,
  );
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editClassGroupId, setEditClassGroupId] = useState("");
  const [editClassName, setEditClassName] = useState("");
  const [editClassSchoolYearId, setEditClassSchoolYearId] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<
    | { kind: "group"; id: string; label: string }
    | { kind: "class"; id: string; label: string }
    | null
  >(null);
  const [deleting, setDeleting] = useState(false);
  const [savingGroup, setSavingGroup] = useState(false);
  const [savingClass, setSavingClass] = useState(false);
  const [submittingGroup, setSubmittingGroup] = useState(false);
  const [submittingClass, setSubmittingClass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    void bootstrap();
  }, []);

  useEffect(() => {
    if (!schoolSlug) {
      return;
    }
    void loadData(schoolSlug);
  }, [schoolSlug]);

  async function bootstrap() {
    const meResponse = await fetch(`${API_URL}/me`, { credentials: "include" });
    if (!meResponse.ok) {
      router.replace("/");
      return;
    }

    const me = (await meResponse.json()) as MeResponse;
    setRole(me.role);

    const allowed =
      me.role === "SUPER_ADMIN" ||
      me.role === "ADMIN" ||
      me.role === "SCHOOL_ADMIN";
    if (!allowed) {
      router.replace(
        me.schoolSlug ? `/schools/${me.schoolSlug}/dashboard` : "/",
      );
      return;
    }

    if (me.role === "SCHOOL_ADMIN") {
      if (!me.schoolSlug) {
        setError("Aucune ecole rattachee a ce compte SCHOOL_ADMIN.");
        setLoading(false);
        return;
      }
      setSchoolSlug(me.schoolSlug);
      setLoading(false);
      return;
    }

    const schoolsResponse = await fetch(`${API_URL}/system/schools`, {
      credentials: "include",
    });
    if (!schoolsResponse.ok) {
      router.replace("/");
      return;
    }

    const schoolRows = (await schoolsResponse.json()) as SchoolOption[];
    setSchools(schoolRows);
    setSchoolSlug(schoolRows[0]?.slug ?? null);
    setLoading(false);
  }

  function buildAdminPath(currentSchoolSlug: string, segment: string) {
    return `${API_URL}/schools/${currentSchoolSlug}/admin/${segment}`;
  }

  async function loadData(currentSchoolSlug: string) {
    setLoadingData(true);
    setError(null);
    try {
      const [groupsResponse, classesResponse, schoolYearsResponse] =
        await Promise.all([
          fetch(buildAdminPath(currentSchoolSlug, "class-groups"), {
            credentials: "include",
          }),
          fetch(buildAdminPath(currentSchoolSlug, "classrooms"), {
            credentials: "include",
          }),
          fetch(buildAdminPath(currentSchoolSlug, "school-years"), {
            credentials: "include",
          }),
        ]);

      if (
        !groupsResponse.ok ||
        !classesResponse.ok ||
        !schoolYearsResponse.ok
      ) {
        setError("Impossible de charger les donnees des classes.");
        return;
      }

      const groupsPayload = (await groupsResponse.json()) as ClassGroupRow[];
      const classesPayload = (await classesResponse.json()) as ClassroomRow[];
      const schoolYearsPayload =
        (await schoolYearsResponse.json()) as SchoolYearRow[];

      setGroups(groupsPayload);
      setClassrooms(classesPayload);
      setSchoolYears(schoolYearsPayload);
      if (!classGroupId && groupsPayload.length > 0) {
        setClassGroupId(groupsPayload[0].id);
      }
      if (!classSchoolYearId && schoolYearsPayload.length > 0) {
        setClassSchoolYearId(
          schoolYearsPayload.find((schoolYear) => schoolYear.isActive)?.id ??
            schoolYearsPayload[0].id,
        );
      }
    } catch {
      setError("Erreur reseau.");
    } finally {
      setLoadingData(false);
    }
  }

  async function onCreateGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    if (!schoolSlug) {
      return;
    }

    const parsed = createClassGroupSchema.safeParse({ name: groupName });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Formulaire invalide.");
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError("Session CSRF invalide. Reconnectez-vous.");
      router.replace("/");
      return;
    }

    setSubmittingGroup(true);
    try {
      const response = await fetch(buildAdminPath(schoolSlug, "class-groups"), {
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
        setError(String(message));
        return;
      }

      setGroupName("");
      setSuccess("Groupe de classes cree.");
      await loadData(schoolSlug);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setSubmittingGroup(false);
    }
  }

  async function onCreateClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    if (!schoolSlug) {
      return;
    }

    const parsed = createClassroomSchema.safeParse({
      classGroupId,
      name: className,
      schoolYearId: classSchoolYearId,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Formulaire invalide.");
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError("Session CSRF invalide. Reconnectez-vous.");
      router.replace("/");
      return;
    }

    setSubmittingClass(true);
    try {
      const response = await fetch(buildAdminPath(schoolSlug, "classrooms"), {
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
        setError(String(message));
        return;
      }

      setClassName("");
      setSuccess("Classe creee.");
      await loadData(schoolSlug);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setSubmittingClass(false);
    }
  }

  function startEditGroup(group: ClassGroupRow) {
    setOpenGroupActionsId(null);
    setEditingGroupId(group.id);
    setEditGroupName(group.name);
  }

  async function saveGroup(groupId: string) {
    if (!schoolSlug) {
      return;
    }
    setError(null);
    const parsed = updateClassGroupSchema.safeParse({ name: editGroupName });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Formulaire invalide.");
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError("Session CSRF invalide. Reconnectez-vous.");
      router.replace("/");
      return;
    }

    setSavingGroup(true);
    try {
      const response = await fetch(
        buildAdminPath(schoolSlug, `class-groups/${groupId}`),
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify(parsed.data),
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          payload?.message && Array.isArray(payload.message)
            ? payload.message.join(", ")
            : (payload?.message ?? "Modification impossible.");
        setError(String(message));
        return;
      }

      setEditingGroupId(null);
      setSuccess("Groupe de classes modifie.");
      await loadData(schoolSlug);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setSavingGroup(false);
    }
  }

  function startEditClass(entry: ClassroomRow) {
    setOpenClassActionsId(null);
    setEditingClassId(entry.id);
    setEditClassGroupId(entry.classGroupId ?? "");
    setEditClassName(entry.name);
    setEditClassSchoolYearId(entry.schoolYear.id);
  }

  async function saveClass(classId: string) {
    if (!schoolSlug) {
      return;
    }
    setError(null);
    const parsed = updateClassroomSchema.safeParse({
      classGroupId: editClassGroupId,
      name: editClassName,
      schoolYearId: editClassSchoolYearId,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Formulaire invalide.");
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError("Session CSRF invalide. Reconnectez-vous.");
      router.replace("/");
      return;
    }

    setSavingClass(true);
    try {
      const response = await fetch(
        buildAdminPath(schoolSlug, `classrooms/${classId}`),
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify(parsed.data),
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          payload?.message && Array.isArray(payload.message)
            ? payload.message.join(", ")
            : (payload?.message ?? "Modification impossible.");
        setError(String(message));
        return;
      }

      setEditingClassId(null);
      setSuccess("Classe modifiee.");
      await loadData(schoolSlug);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setSavingClass(false);
    }
  }

  function askDeleteGroup(group: ClassGroupRow) {
    setOpenGroupActionsId(null);
    setDeleteTarget({ kind: "group", id: group.id, label: group.name });
  }

  function askDeleteClass(entry: ClassroomRow) {
    setOpenClassActionsId(null);
    setDeleteTarget({
      kind: "class",
      id: entry.id,
      label: `${entry.name} (${entry.schoolYear.label})`,
    });
  }

  async function confirmDelete() {
    if (!deleteTarget || !schoolSlug) {
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError("Session CSRF invalide. Reconnectez-vous.");
      router.replace("/");
      return;
    }

    setDeleting(true);
    setError(null);
    try {
      const endpoint =
        deleteTarget.kind === "group"
          ? buildAdminPath(schoolSlug, `class-groups/${deleteTarget.id}`)
          : buildAdminPath(schoolSlug, `classrooms/${deleteTarget.id}`);

      const response = await fetch(endpoint, {
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
        setError(String(message));
        return;
      }

      setDeleteTarget(null);
      setSuccess(
        deleteTarget.kind === "group"
          ? "Groupe de classes supprime."
          : "Classe supprimee.",
      );
      await loadData(schoolSlug);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setDeleting(false);
    }
  }

  const sortedGroups = useMemo(
    () => [...groups].sort((a, b) => a.name.localeCompare(b.name)),
    [groups],
  );
  const sortedClasses = useMemo(
    () =>
      [...classrooms].sort((a, b) =>
        `${a.schoolYear.label}-${a.classGroup?.name ?? ""}-${a.name}`.localeCompare(
          `${b.schoolYear.label}-${b.classGroup?.name ?? ""}-${b.name}`,
        ),
      ),
    [classrooms],
  );

  return (
    <AppShell schoolSlug={schoolSlug} schoolName="Gestion des classes">
      <div className="grid gap-4">
        <Card
          title="Classes"
          subtitle="Gestion des groupes de classes et des classes"
        >
          <div className="mb-4 flex flex-wrap items-end gap-2 border-b border-border">
            <button
              type="button"
              onClick={() => setTab("groups")}
              className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                tab === "groups"
                  ? "border border-border border-b-surface bg-surface text-primary"
                  : "text-text-secondary"
              }`}
            >
              Groupes de classes
            </button>
            <button
              type="button"
              onClick={() => setTab("classes")}
              className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                tab === "classes"
                  ? "border border-border border-b-surface bg-surface text-primary"
                  : "text-text-secondary"
              }`}
            >
              Classes
            </button>

            {role === "SUPER_ADMIN" || role === "ADMIN" ? (
              <label className="ml-auto grid min-w-[260px] gap-1 text-sm">
                <span className="text-text-secondary">Ecole</span>
                <select
                  value={schoolSlug ?? ""}
                  onChange={(event) =>
                    setSchoolSlug(event.target.value || null)
                  }
                  className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Selectionner une ecole</option>
                  {schools.map((school) => (
                    <option key={school.id} value={school.slug}>
                      {school.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>

          {!schoolSlug ? (
            <p className="text-sm text-text-secondary">
              Selectionnez une ecole pour gerer ses classes.
            </p>
          ) : tab === "groups" ? (
            <div className="grid gap-4">
              <form
                className="grid gap-3 md:grid-cols-[1fr_auto]"
                onSubmit={onCreateGroup}
              >
                <label className="grid gap-1 text-sm">
                  <span className="text-text-secondary">
                    Nouveau groupe de classes
                  </span>
                  <input
                    value={groupName}
                    onChange={(event) => setGroupName(event.target.value)}
                    placeholder="Ex: 6eme, 5eme, 4eme..."
                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  />
                </label>
                <div className="self-end">
                  <Button type="submit" disabled={submittingGroup}>
                    {submittingGroup ? "Creation..." : "Ajouter"}
                  </Button>
                </div>
              </form>

              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-text-secondary">
                      <th className="px-3 py-2 font-medium">Nom</th>
                      <th className="px-3 py-2 font-medium">Nb classes</th>
                      <th className="px-3 py-2 font-medium">Cree le</th>
                      <th className="px-3 py-2 font-medium text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(loading || loadingData) && (
                      <tr>
                        <td
                          className="px-3 py-6 text-text-secondary"
                          colSpan={4}
                        >
                          Chargement...
                        </td>
                      </tr>
                    )}

                    {!loading &&
                      !loadingData &&
                      sortedGroups.map((group) => (
                        <Fragment key={group.id}>
                          <tr className="border-b border-border text-text-primary">
                            <td className="px-3 py-2">{group.name}</td>
                            <td className="px-3 py-2">
                              {group._count.classes}
                            </td>
                            <td className="px-3 py-2">
                              {new Date(group.createdAt).toLocaleDateString(
                                "fr-FR",
                              )}
                            </td>
                            <td className="relative px-3 py-2 text-right">
                              <button
                                type="button"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-card border border-border bg-surface text-text-primary hover:bg-background"
                                onClick={() =>
                                  setOpenGroupActionsId((current) =>
                                    current === group.id ? null : group.id,
                                  )
                                }
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>
                              {openGroupActionsId === group.id ? (
                                <div className="absolute right-3 top-11 z-10 w-36 rounded-card border border-border bg-surface p-1 shadow-soft">
                                  <button
                                    type="button"
                                    className="w-full rounded-card px-3 py-2 text-left text-sm text-text-primary hover:bg-background"
                                    onClick={() => startEditGroup(group)}
                                  >
                                    Modifier
                                  </button>
                                  <button
                                    type="button"
                                    className="w-full rounded-card px-3 py-2 text-left text-sm text-notification hover:bg-background"
                                    onClick={() => askDeleteGroup(group)}
                                  >
                                    Supprimer
                                  </button>
                                </div>
                              ) : null}
                            </td>
                          </tr>
                          {editingGroupId === group.id ? (
                            <tr className="border-b border-border bg-background">
                              <td className="px-3 py-3" colSpan={4}>
                                <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
                                  <input
                                    value={editGroupName}
                                    onChange={(event) =>
                                      setEditGroupName(event.target.value)
                                    }
                                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                                  />
                                  <Button
                                    type="button"
                                    disabled={savingGroup}
                                    onClick={() => {
                                      void saveGroup(group.id);
                                    }}
                                  >
                                    {savingGroup
                                      ? "Enregistrement..."
                                      : "Enregistrer"}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => {
                                      setEditingGroupId(null);
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
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              <form
                className="grid gap-3 md:grid-cols-4"
                onSubmit={onCreateClass}
              >
                <label className="grid gap-1 text-sm">
                  <span className="text-text-secondary">Groupe de classes</span>
                  <select
                    value={classGroupId}
                    onChange={(event) => setClassGroupId(event.target.value)}
                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Selectionner</option>
                    {sortedGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1 text-sm">
                  <span className="text-text-secondary">Nom de classe</span>
                  <input
                    value={className}
                    onChange={(event) => setClassName(event.target.value)}
                    placeholder="Ex: 6e A"
                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  />
                </label>

                <label className="grid gap-1 text-sm">
                  <span className="text-text-secondary">Annee scolaire</span>
                  <select
                    value={classSchoolYearId}
                    onChange={(event) =>
                      setClassSchoolYearId(event.target.value)
                    }
                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Selectionner</option>
                    {schoolYears.map((schoolYear) => (
                      <option key={schoolYear.id} value={schoolYear.id}>
                        {schoolYear.label}
                        {schoolYear.isActive ? " (active)" : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="self-end">
                  <Button type="submit" disabled={submittingClass}>
                    {submittingClass ? "Creation..." : "Ajouter"}
                  </Button>
                </div>
              </form>

              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-text-secondary">
                      <th className="px-3 py-2 font-medium">Classe</th>
                      <th className="px-3 py-2 font-medium">Groupe</th>
                      <th className="px-3 py-2 font-medium">Annee</th>
                      <th className="px-3 py-2 font-medium">Eleves</th>
                      <th className="px-3 py-2 font-medium text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(loading || loadingData) && (
                      <tr>
                        <td
                          className="px-3 py-6 text-text-secondary"
                          colSpan={5}
                        >
                          Chargement...
                        </td>
                      </tr>
                    )}

                    {!loading &&
                      !loadingData &&
                      sortedClasses.map((entry) => (
                        <Fragment key={entry.id}>
                          <tr className="border-b border-border text-text-primary">
                            <td className="px-3 py-2">{entry.name}</td>
                            <td className="px-3 py-2">
                              {entry.classGroup?.name ?? "Non assigne"}
                            </td>
                            <td className="px-3 py-2">
                              {entry.schoolYear.label}
                            </td>
                            <td className="px-3 py-2">
                              {entry._count.enrollments}
                            </td>
                            <td className="relative px-3 py-2 text-right">
                              <button
                                type="button"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-card border border-border bg-surface text-text-primary hover:bg-background"
                                onClick={() =>
                                  setOpenClassActionsId((current) =>
                                    current === entry.id ? null : entry.id,
                                  )
                                }
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>
                              {openClassActionsId === entry.id ? (
                                <div className="absolute right-3 top-11 z-10 w-36 rounded-card border border-border bg-surface p-1 shadow-soft">
                                  <button
                                    type="button"
                                    className="w-full rounded-card px-3 py-2 text-left text-sm text-text-primary hover:bg-background"
                                    onClick={() => startEditClass(entry)}
                                  >
                                    Modifier
                                  </button>
                                  <button
                                    type="button"
                                    className="w-full rounded-card px-3 py-2 text-left text-sm text-notification hover:bg-background"
                                    onClick={() => askDeleteClass(entry)}
                                  >
                                    Supprimer
                                  </button>
                                </div>
                              ) : null}
                            </td>
                          </tr>
                          {editingClassId === entry.id ? (
                            <tr className="border-b border-border bg-background">
                              <td className="px-3 py-3" colSpan={5}>
                                <div className="grid gap-3 md:grid-cols-5">
                                  <select
                                    value={editClassGroupId}
                                    onChange={(event) =>
                                      setEditClassGroupId(event.target.value)
                                    }
                                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                                  >
                                    <option value="">Selectionner</option>
                                    {sortedGroups.map((group) => (
                                      <option key={group.id} value={group.id}>
                                        {group.name}
                                      </option>
                                    ))}
                                  </select>
                                  <input
                                    value={editClassName}
                                    onChange={(event) =>
                                      setEditClassName(event.target.value)
                                    }
                                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                                  />
                                  <select
                                    value={editClassSchoolYearId}
                                    onChange={(event) =>
                                      setEditClassSchoolYearId(
                                        event.target.value,
                                      )
                                    }
                                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                                  >
                                    <option value="">Selectionner</option>
                                    {schoolYears.map((schoolYear) => (
                                      <option
                                        key={schoolYear.id}
                                        value={schoolYear.id}
                                      >
                                        {schoolYear.label}
                                      </option>
                                    ))}
                                  </select>
                                  <Button
                                    type="button"
                                    disabled={savingClass}
                                    onClick={() => {
                                      void saveClass(entry.id);
                                    }}
                                  >
                                    {savingClass
                                      ? "Enregistrement..."
                                      : "Enregistrer"}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => {
                                      setEditingClassId(null);
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
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {error ? (
            <p className="mt-3 text-sm text-notification">{error}</p>
          ) : null}
          {success ? (
            <p className="mt-3 text-sm text-primary">{success}</p>
          ) : null}
        </Card>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Confirmer la suppression"
        message={
          deleteTarget
            ? deleteTarget.kind === "group"
              ? `Voulez-vous supprimer le groupe ${deleteTarget.label} ?`
              : `Voulez-vous supprimer la classe ${deleteTarget.label} ?`
            : ""
        }
        confirmLabel="Supprimer"
        loading={deleting}
        onCancel={() => {
          if (!deleting) {
            setDeleteTarget(null);
          }
        }}
        onConfirm={() => {
          void confirmDelete();
        }}
      />
    </AppShell>
  );
}
