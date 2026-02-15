"use client";

import { FormEvent, Fragment, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { AppShell } from "../../components/layout/app-shell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { ModuleHelpTab } from "../../components/ui/module-help-tab";
import { getCsrfTokenCookie } from "../../lib/auth-cookies";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

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

type Tab = "list" | "assignments" | "help";

type MeResponse = {
  role: Role;
  schoolSlug: string | null;
};

type SchoolOption = {
  id: string;
  slug: string;
  name: string;
};

type TeacherRow = {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
};

type SchoolYearOption = {
  id: string;
  label: string;
  isActive: boolean;
};

type ClassroomOption = {
  id: string;
  name: string;
  schoolYear: { id: string; label: string };
};

type SubjectRow = {
  id: string;
  name: string;
};

type AssignmentRow = {
  id: string;
  schoolYearId: string;
  teacherUserId: string;
  classId: string;
  subjectId: string;
  createdAt: string;
  schoolYear: { id: string; label: string };
  teacherUser: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  class: {
    id: string;
    name: string;
  };
  subject: {
    id: string;
    name: string;
  };
};

const createTeacherSchema = z.object({
  email: z.string().trim().email("Email invalide."),
});

const assignmentSchema = z.object({
  schoolYearId: z.string().trim().min(1, "L'annee scolaire est obligatoire."),
  teacherUserId: z.string().trim().min(1, "L'enseignant est obligatoire."),
  classId: z.string().trim().min(1, "La classe est obligatoire."),
  subjectId: z.string().trim().min(1, "La matiere est obligatoire."),
});

export default function TeachersPage() {
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("list");
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [role, setRole] = useState<Role | null>(null);
  const [schoolSlug, setSchoolSlug] = useState<string | null>(null);
  const [schools, setSchools] = useState<SchoolOption[]>([]);

  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [schoolYears, setSchoolYears] = useState<SchoolYearOption[]>([]);
  const [classrooms, setClassrooms] = useState<ClassroomOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);

  const [email, setEmail] = useState("");

  const [assignmentSchoolYearId, setAssignmentSchoolYearId] = useState("");
  const [assignmentTeacherUserId, setAssignmentTeacherUserId] = useState("");
  const [assignmentClassId, setAssignmentClassId] = useState("");
  const [assignmentSubjectId, setAssignmentSubjectId] = useState("");

  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(
    null,
  );
  const [editAssignmentSchoolYearId, setEditAssignmentSchoolYearId] =
    useState("");
  const [editAssignmentTeacherUserId, setEditAssignmentTeacherUserId] =
    useState("");
  const [editAssignmentClassId, setEditAssignmentClassId] = useState("");
  const [editAssignmentSubjectId, setEditAssignmentSubjectId] = useState("");

  const [submittingTeacher, setSubmittingTeacher] = useState(false);
  const [submittingAssignment, setSubmittingAssignment] = useState(false);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteAssignment, setDeleteAssignment] = useState<{
    id: string;
    label: string;
  } | null>(null);

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

  function buildAdminPath(currentSchoolSlug: string, segment: string) {
    return `${API_URL}/schools/${currentSchoolSlug}/admin/${segment}`;
  }

  async function bootstrap() {
    try {
      const meResponse = await fetch(`${API_URL}/me`, {
        credentials: "include",
      });
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
    } catch {
      setError(
        "API indisponible. Verifiez que le serveur backend est demarre.",
      );
      setLoading(false);
    }
  }

  async function loadData(currentSchoolSlug: string) {
    setLoadingData(true);
    setError(null);
    setSuccess(null);

    try {
      const [
        teachersResponse,
        schoolYearsResponse,
        classroomsResponse,
        subjectsResponse,
        assignmentsResponse,
      ] = await Promise.all([
        fetch(buildAdminPath(currentSchoolSlug, "teachers"), {
          credentials: "include",
        }),
        fetch(buildAdminPath(currentSchoolSlug, "school-years"), {
          credentials: "include",
        }),
        fetch(buildAdminPath(currentSchoolSlug, "classrooms"), {
          credentials: "include",
        }),
        fetch(buildAdminPath(currentSchoolSlug, "subjects"), {
          credentials: "include",
        }),
        fetch(buildAdminPath(currentSchoolSlug, "teacher-assignments"), {
          credentials: "include",
        }),
      ]);

      if (
        !teachersResponse.ok ||
        !schoolYearsResponse.ok ||
        !classroomsResponse.ok ||
        !subjectsResponse.ok ||
        !assignmentsResponse.ok
      ) {
        setError("Impossible de charger les enseignants.");
        return;
      }

      const teachersPayload = (await teachersResponse.json()) as TeacherRow[];
      const schoolYearsPayload =
        (await schoolYearsResponse.json()) as SchoolYearOption[];
      const classroomsPayload =
        (await classroomsResponse.json()) as ClassroomOption[];
      const subjectsPayload = (await subjectsResponse.json()) as SubjectRow[];
      const assignmentsPayload =
        (await assignmentsResponse.json()) as AssignmentRow[];

      setTeachers(teachersPayload);
      setSchoolYears(schoolYearsPayload);
      setClassrooms(classroomsPayload);
      setSubjects(subjectsPayload);
      setAssignments(assignmentsPayload);

      if (!assignmentSchoolYearId && schoolYearsPayload.length > 0) {
        const active = schoolYearsPayload.find((entry) => entry.isActive);
        setAssignmentSchoolYearId(active?.id ?? schoolYearsPayload[0].id);
      }

      if (!assignmentTeacherUserId && teachersPayload.length > 0) {
        setAssignmentTeacherUserId(teachersPayload[0].userId);
      }

      if (!assignmentSubjectId && subjectsPayload.length > 0) {
        setAssignmentSubjectId(subjectsPayload[0].id);
      }
    } catch {
      setError("Erreur reseau.");
    } finally {
      setLoadingData(false);
    }
  }

  function filteredClassesForCreate() {
    return classrooms.filter(
      (entry) =>
        !assignmentSchoolYearId ||
        entry.schoolYear.id === assignmentSchoolYearId,
    );
  }

  function filteredClassesForEdit() {
    return classrooms.filter(
      (entry) =>
        !editAssignmentSchoolYearId ||
        entry.schoolYear.id === editAssignmentSchoolYearId,
    );
  }

  async function onCreateTeacher(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!schoolSlug) {
      return;
    }

    setError(null);
    setSuccess(null);

    const parsed = createTeacherSchema.safeParse({
      email,
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

    setSubmittingTeacher(true);
    try {
      const response = await fetch(buildAdminPath(schoolSlug, "teachers"), {
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

      setEmail("");
      setSuccess(
        "Enseignant cree. Un email de premiere connexion a ete envoye si le compte etait nouveau.",
      );
      await loadData(schoolSlug);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setSubmittingTeacher(false);
    }
  }

  async function onCreateAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!schoolSlug) {
      return;
    }

    setError(null);
    setSuccess(null);

    const parsed = assignmentSchema.safeParse({
      schoolYearId: assignmentSchoolYearId,
      teacherUserId: assignmentTeacherUserId,
      classId: assignmentClassId,
      subjectId: assignmentSubjectId,
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

    setSubmittingAssignment(true);
    try {
      const response = await fetch(
        buildAdminPath(schoolSlug, "teacher-assignments"),
        {
          method: "POST",
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
            : (payload?.message ?? "Creation impossible.");
        setError(String(message));
        return;
      }

      setAssignmentClassId("");
      setSuccess("Affectation enseignant creee.");
      await loadData(schoolSlug);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setSubmittingAssignment(false);
    }
  }

  function startEditAssignment(entry: AssignmentRow) {
    setEditingAssignmentId(entry.id);
    setEditAssignmentSchoolYearId(entry.schoolYearId);
    setEditAssignmentTeacherUserId(entry.teacherUserId);
    setEditAssignmentClassId(entry.classId);
    setEditAssignmentSubjectId(entry.subjectId);
  }

  async function saveAssignment(assignmentId: string) {
    if (!schoolSlug) {
      return;
    }

    setError(null);
    const parsed = assignmentSchema.safeParse({
      schoolYearId: editAssignmentSchoolYearId,
      teacherUserId: editAssignmentTeacherUserId,
      classId: editAssignmentClassId,
      subjectId: editAssignmentSubjectId,
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

    setSavingAssignment(true);
    try {
      const response = await fetch(
        buildAdminPath(schoolSlug, `teacher-assignments/${assignmentId}`),
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

      setEditingAssignmentId(null);
      setSuccess("Affectation modifiee.");
      await loadData(schoolSlug);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setSavingAssignment(false);
    }
  }

  async function confirmDeleteAssignment() {
    if (!schoolSlug || !deleteAssignment) {
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
      const response = await fetch(
        buildAdminPath(
          schoolSlug,
          `teacher-assignments/${deleteAssignment.id}`,
        ),
        {
          method: "DELETE",
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
            : (payload?.message ?? "Suppression impossible.");
        setError(String(message));
        return;
      }

      setDeleteAssignment(null);
      setSuccess("Affectation supprimee.");
      await loadData(schoolSlug);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setDeleting(false);
    }
  }

  const sortedTeachers = useMemo(
    () =>
      [...teachers].sort((a, b) =>
        `${a.lastName} ${a.firstName}`.localeCompare(
          `${b.lastName} ${b.firstName}`,
        ),
      ),
    [teachers],
  );

  const sortedAssignments = useMemo(
    () =>
      [...assignments].sort((a, b) =>
        `${a.schoolYear.label}-${a.teacherUser.lastName}-${a.class.name}-${a.subject.name}`.localeCompare(
          `${b.schoolYear.label}-${b.teacherUser.lastName}-${b.class.name}-${b.subject.name}`,
        ),
      ),
    [assignments],
  );

  const assignmentsByTeacher = useMemo(() => {
    const map = new Map<
      string,
      Array<{
        classId: string;
        className: string;
        subjectName: string;
        schoolYearLabel: string;
      }>
    >();

    for (const assignment of assignments) {
      const current = map.get(assignment.teacherUserId) ?? [];
      current.push({
        classId: assignment.classId,
        className: assignment.class.name,
        subjectName: assignment.subject.name,
        schoolYearLabel: assignment.schoolYear.label,
      });
      map.set(assignment.teacherUserId, current);
    }

    return map;
  }, [assignments]);

  if (loading) {
    return (
      <AppShell schoolSlug={schoolSlug} schoolName="Gestion des enseignants">
        <Card title="Enseignants" subtitle="Chargement...">
          <p className="text-sm text-text-secondary">Chargement...</p>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell schoolSlug={schoolSlug} schoolName="Gestion des enseignants">
      <div className="grid gap-4">
        <Card
          title="Enseignants"
          subtitle="Gestion des comptes enseignants et de leurs affectations"
        >
          <div className="mb-4 flex flex-wrap items-end gap-2 border-b border-border">
            <button
              type="button"
              onClick={() => setTab("list")}
              className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                tab === "list"
                  ? "border border-border border-b-surface bg-surface text-primary"
                  : "text-text-secondary"
              }`}
            >
              Liste
            </button>
            <button
              type="button"
              onClick={() => setTab("assignments")}
              className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                tab === "assignments"
                  ? "border border-border border-b-surface bg-surface text-primary"
                  : "text-text-secondary"
              }`}
            >
              Affectations
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

          {tab === "help" ? (
            <ModuleHelpTab
              moduleName="Enseignants"
              moduleSummary="ce module centralise les comptes enseignants et les affectations annee/classe/matiere."
              actions={[
                {
                  name: "Creer",
                  purpose:
                    "ajouter un enseignant avec son compte de connexion.",
                  howTo:
                    "renseigner identite, email et mot de passe conforme puis valider.",
                  moduleImpact:
                    "l'enseignant devient disponible dans la liste locale.",
                  crossModuleImpact:
                    "il peut ensuite etre affecte a des classes/matieres pour la saisie des notes.",
                },
                {
                  name: "Affecter",
                  purpose:
                    "lier un enseignant a une classe et une matiere pour une annee scolaire.",
                  howTo:
                    "dans l'onglet Affectations, choisir annee, enseignant, classe et matiere puis ajouter.",
                  moduleImpact:
                    "l'affectation apparait dans la table et devient editable.",
                  crossModuleImpact:
                    "le module Notes s'appuie sur ces affectations pour autoriser la saisie.",
                },
                {
                  name: "Modifier/Supprimer",
                  purpose: "corriger ou retirer une affectation erronee.",
                  howTo: "utiliser Modifier/Supprimer sur la ligne concernee.",
                  moduleImpact: "la table des affectations est synchronisee.",
                  crossModuleImpact:
                    "les droits de saisie notes de l'enseignant sont ajustes en consequence.",
                },
              ]}
              tips={[
                "Verifier la coherence annee/classe avant d'enregistrer une affectation.",
                "Une affectation en double est fusionnee (upsert) par le backend.",
              ]}
            />
          ) : !schoolSlug ? (
            <p className="text-sm text-text-secondary">
              Selectionnez une ecole pour gerer les enseignants.
            </p>
          ) : tab === "list" ? (
            <div className="grid gap-4">
              {role === "ADMIN" ? (
                <p className="text-sm text-text-secondary">
                  Creation enseignant reservee a SCHOOL_ADMIN / SUPER_ADMIN.
                </p>
              ) : (
                <form
                  className="grid gap-3 md:grid-cols-[1fr_auto]"
                  onSubmit={onCreateTeacher}
                >
                  <label className="grid gap-1 text-sm">
                    <span className="text-text-secondary">
                      Email enseignant
                    </span>
                    <input
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="enseignant@ecole.com"
                      className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                    />
                  </label>
                  <div className="self-end">
                    <Button type="submit" disabled={submittingTeacher}>
                      {submittingTeacher ? "Creation..." : "Ajouter"}
                    </Button>
                  </div>
                </form>
              )}

              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-text-secondary">
                      <th className="px-3 py-2 font-medium">Enseignant</th>
                      <th className="px-3 py-2 font-medium">Email</th>
                      <th className="px-3 py-2 font-medium">
                        Classes affectees
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(loading || loadingData) && (
                      <tr>
                        <td
                          className="px-3 py-6 text-text-secondary"
                          colSpan={3}
                        >
                          Chargement...
                        </td>
                      </tr>
                    )}
                    {!loading &&
                      !loadingData &&
                      sortedTeachers.map((entry) => (
                        <tr
                          key={entry.userId}
                          className="border-b border-border text-text-primary"
                        >
                          <td className="px-3 py-2">
                            {entry.lastName} {entry.firstName}
                          </td>
                          <td className="px-3 py-2">{entry.email}</td>
                          <td className="px-3 py-2">
                            {(assignmentsByTeacher.get(entry.userId) ?? [])
                              .length === 0 ? (
                              <span className="text-text-secondary">
                                Aucune
                              </span>
                            ) : (
                              <div className="grid gap-1">
                                {Array.from(
                                  new Set(
                                    (
                                      assignmentsByTeacher.get(entry.userId) ??
                                      []
                                    ).map(
                                      (item) =>
                                        `${item.className} (${item.schoolYearLabel})`,
                                    ),
                                  ),
                                ).map((classLabel) => (
                                  <span key={classLabel}>{classLabel}</span>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    {!loading && !loadingData && sortedTeachers.length === 0 ? (
                      <tr>
                        <td
                          className="px-3 py-6 text-text-secondary"
                          colSpan={3}
                        >
                          Aucun enseignant trouve.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              <form
                className="grid gap-3 md:grid-cols-5"
                onSubmit={onCreateAssignment}
              >
                <label className="grid gap-1 text-sm">
                  <span className="text-text-secondary">Annee scolaire</span>
                  <select
                    value={assignmentSchoolYearId}
                    onChange={(event) => {
                      setAssignmentSchoolYearId(event.target.value);
                      setAssignmentClassId("");
                    }}
                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Selectionner</option>
                    {schoolYears.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.label}
                        {entry.isActive ? " (active)" : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1 text-sm">
                  <span className="text-text-secondary">Enseignant</span>
                  <select
                    value={assignmentTeacherUserId}
                    onChange={(event) =>
                      setAssignmentTeacherUserId(event.target.value)
                    }
                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Selectionner</option>
                    {sortedTeachers.map((entry) => (
                      <option key={entry.userId} value={entry.userId}>
                        {entry.lastName} {entry.firstName}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1 text-sm">
                  <span className="text-text-secondary">Classe</span>
                  <select
                    value={assignmentClassId}
                    onChange={(event) =>
                      setAssignmentClassId(event.target.value)
                    }
                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Selectionner</option>
                    {filteredClassesForCreate().map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1 text-sm">
                  <span className="text-text-secondary">Matiere</span>
                  <select
                    value={assignmentSubjectId}
                    onChange={(event) =>
                      setAssignmentSubjectId(event.target.value)
                    }
                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Selectionner</option>
                    {subjects.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="self-end">
                  <Button type="submit" disabled={submittingAssignment}>
                    {submittingAssignment ? "Creation..." : "Ajouter"}
                  </Button>
                </div>
              </form>

              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-text-secondary">
                      <th className="px-3 py-2 font-medium">Annee</th>
                      <th className="px-3 py-2 font-medium">Enseignant</th>
                      <th className="px-3 py-2 font-medium">Classe</th>
                      <th className="px-3 py-2 font-medium">Matiere</th>
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
                      sortedAssignments.map((entry) => (
                        <Fragment key={entry.id}>
                          <tr className="border-b border-border text-text-primary">
                            <td className="px-3 py-2">
                              {entry.schoolYear.label}
                            </td>
                            <td className="px-3 py-2">
                              {entry.teacherUser.lastName}{" "}
                              {entry.teacherUser.firstName}
                            </td>
                            <td className="px-3 py-2">{entry.class.name}</td>
                            <td className="px-3 py-2">{entry.subject.name}</td>
                            <td className="px-3 py-2 text-right">
                              <div className="inline-flex gap-2">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  onClick={() => startEditAssignment(entry)}
                                >
                                  Modifier
                                </Button>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  onClick={() =>
                                    setDeleteAssignment({
                                      id: entry.id,
                                      label: `${entry.teacherUser.lastName} ${entry.teacherUser.firstName} - ${entry.class.name} / ${entry.subject.name}`,
                                    })
                                  }
                                >
                                  Supprimer
                                </Button>
                              </div>
                            </td>
                          </tr>
                          {editingAssignmentId === entry.id ? (
                            <tr className="border-b border-border bg-background">
                              <td className="px-3 py-3" colSpan={5}>
                                <div className="grid gap-3 md:grid-cols-4">
                                  <label className="grid gap-1 text-sm">
                                    <span className="text-text-secondary">
                                      Annee
                                    </span>
                                    <select
                                      value={editAssignmentSchoolYearId}
                                      onChange={(event) => {
                                        setEditAssignmentSchoolYearId(
                                          event.target.value,
                                        );
                                        setEditAssignmentClassId("");
                                      }}
                                      className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                                    >
                                      <option value="">Selectionner</option>
                                      {schoolYears.map((year) => (
                                        <option key={year.id} value={year.id}>
                                          {year.label}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                  <label className="grid gap-1 text-sm">
                                    <span className="text-text-secondary">
                                      Enseignant
                                    </span>
                                    <select
                                      value={editAssignmentTeacherUserId}
                                      onChange={(event) =>
                                        setEditAssignmentTeacherUserId(
                                          event.target.value,
                                        )
                                      }
                                      className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                                    >
                                      <option value="">Selectionner</option>
                                      {sortedTeachers.map((teacher) => (
                                        <option
                                          key={teacher.userId}
                                          value={teacher.userId}
                                        >
                                          {teacher.lastName} {teacher.firstName}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                  <label className="grid gap-1 text-sm">
                                    <span className="text-text-secondary">
                                      Classe
                                    </span>
                                    <select
                                      value={editAssignmentClassId}
                                      onChange={(event) =>
                                        setEditAssignmentClassId(
                                          event.target.value,
                                        )
                                      }
                                      className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                                    >
                                      <option value="">Selectionner</option>
                                      {filteredClassesForEdit().map((c) => (
                                        <option key={c.id} value={c.id}>
                                          {c.name}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                  <label className="grid gap-1 text-sm">
                                    <span className="text-text-secondary">
                                      Matiere
                                    </span>
                                    <select
                                      value={editAssignmentSubjectId}
                                      onChange={(event) =>
                                        setEditAssignmentSubjectId(
                                          event.target.value,
                                        )
                                      }
                                      className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                                    >
                                      <option value="">Selectionner</option>
                                      {subjects.map((subject) => (
                                        <option
                                          key={subject.id}
                                          value={subject.id}
                                        >
                                          {subject.name}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                  <div className="flex gap-2 md:col-span-4">
                                    <Button
                                      type="button"
                                      disabled={savingAssignment}
                                      onClick={() => {
                                        void saveAssignment(entry.id);
                                      }}
                                    >
                                      {savingAssignment
                                        ? "Enregistrement..."
                                        : "Enregistrer"}
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="secondary"
                                      onClick={() =>
                                        setEditingAssignmentId(null)
                                      }
                                    >
                                      Annuler
                                    </Button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      ))}

                    {!loading &&
                    !loadingData &&
                    sortedAssignments.length === 0 ? (
                      <tr>
                        <td
                          className="px-3 py-6 text-text-secondary"
                          colSpan={5}
                        >
                          Aucune affectation trouvee.
                        </td>
                      </tr>
                    ) : null}
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
        open={Boolean(deleteAssignment)}
        title="Confirmer la suppression"
        message={
          deleteAssignment
            ? `Voulez-vous supprimer l'affectation ${deleteAssignment.label} ?`
            : ""
        }
        confirmLabel="Supprimer"
        loading={deleting}
        onCancel={() => {
          if (!deleting) {
            setDeleteAssignment(null);
          }
        }}
        onConfirm={() => {
          void confirmDeleteAssignment();
        }}
      />
    </AppShell>
  );
}
