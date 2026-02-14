"use client";

import { FormEvent, Fragment, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  | "SCHOOL_ACCOUNTANT"
  | "TEACHER"
  | "PARENT"
  | "STUDENT";

type Tab = "catalog" | "assignments" | "help";

type MeResponse = {
  role: Role;
  schoolSlug: string | null;
};

type SchoolOption = {
  id: string;
  slug: string;
  name: string;
};

type SubjectRow = {
  id: string;
  schoolId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    assignments: number;
    grades: number;
    curriculumSubjects: number;
    classOverrides: number;
  };
};

type TeacherOption = {
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

export default function SubjectsPage() {
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("catalog");
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [role, setRole] = useState<Role | null>(null);
  const [schoolSlug, setSchoolSlug] = useState<string | null>(null);
  const [schools, setSchools] = useState<SchoolOption[]>([]);

  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [schoolYears, setSchoolYears] = useState<SchoolYearOption[]>([]);
  const [classrooms, setClassrooms] = useState<ClassroomOption[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);

  const [subjectName, setSubjectName] = useState("");
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [editSubjectName, setEditSubjectName] = useState("");

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

  const [submittingSubject, setSubmittingSubject] = useState(false);
  const [savingSubject, setSavingSubject] = useState(false);
  const [submittingAssignment, setSubmittingAssignment] = useState(false);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<
    | { kind: "subject"; id: string; label: string }
    | { kind: "assignment"; id: string; label: string }
    | null
  >(null);

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
        subjectsResponse,
        teachersResponse,
        schoolYearsResponse,
        classroomsResponse,
        assignmentsResponse,
      ] = await Promise.all([
        fetch(buildAdminPath(currentSchoolSlug, "subjects"), {
          credentials: "include",
        }),
        fetch(buildAdminPath(currentSchoolSlug, "teachers"), {
          credentials: "include",
        }),
        fetch(buildAdminPath(currentSchoolSlug, "school-years"), {
          credentials: "include",
        }),
        fetch(buildAdminPath(currentSchoolSlug, "classrooms"), {
          credentials: "include",
        }),
        fetch(buildAdminPath(currentSchoolSlug, "teacher-assignments"), {
          credentials: "include",
        }),
      ]);

      if (
        !subjectsResponse.ok ||
        !teachersResponse.ok ||
        !schoolYearsResponse.ok ||
        !classroomsResponse.ok ||
        !assignmentsResponse.ok
      ) {
        setError("Impossible de charger le module matieres.");
        return;
      }

      const subjectsPayload = (await subjectsResponse.json()) as SubjectRow[];
      const teachersPayload =
        (await teachersResponse.json()) as TeacherOption[];
      const schoolYearsPayload =
        (await schoolYearsResponse.json()) as SchoolYearOption[];
      const classroomsPayload =
        (await classroomsResponse.json()) as ClassroomOption[];
      const assignmentsPayload =
        (await assignmentsResponse.json()) as AssignmentRow[];

      setSubjects(subjectsPayload);
      setTeachers(teachersPayload);
      setSchoolYears(schoolYearsPayload);
      setClassrooms(classroomsPayload);
      setAssignments(assignmentsPayload);

      if (!assignmentSchoolYearId && schoolYearsPayload.length > 0) {
        setAssignmentSchoolYearId(
          schoolYearsPayload.find((entry) => entry.isActive)?.id ??
            schoolYearsPayload[0].id,
        );
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

  const filteredClassroomsForCreate = useMemo(
    () =>
      classrooms.filter(
        (entry) =>
          !assignmentSchoolYearId ||
          entry.schoolYear.id === assignmentSchoolYearId,
      ),
    [classrooms, assignmentSchoolYearId],
  );

  useEffect(() => {
    if (!assignmentClassId) {
      if (filteredClassroomsForCreate.length > 0) {
        setAssignmentClassId(filteredClassroomsForCreate[0].id);
      }
      return;
    }

    const exists = filteredClassroomsForCreate.some(
      (entry) => entry.id === assignmentClassId,
    );
    if (!exists) {
      setAssignmentClassId(filteredClassroomsForCreate[0]?.id ?? "");
    }
  }, [filteredClassroomsForCreate, assignmentClassId]);

  async function onCreateSubject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!schoolSlug) {
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError("Session CSRF invalide. Reconnectez-vous.");
      router.replace("/");
      return;
    }

    setSubmittingSubject(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(buildAdminPath(schoolSlug, "subjects"), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({ name: subjectName }),
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

      setSubjectName("");
      setSuccess("Matiere creee.");
      await loadData(schoolSlug);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setSubmittingSubject(false);
    }
  }

  function startEditSubject(subject: SubjectRow) {
    setEditingSubjectId(subject.id);
    setEditSubjectName(subject.name);
    setError(null);
    setSuccess(null);
  }

  async function saveSubject(subjectId: string) {
    if (!schoolSlug) {
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError("Session CSRF invalide. Reconnectez-vous.");
      router.replace("/");
      return;
    }

    setSavingSubject(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        buildAdminPath(schoolSlug, `subjects/${subjectId}`),
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({ name: editSubjectName }),
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          payload?.message && Array.isArray(payload.message)
            ? payload.message.join(", ")
            : (payload?.message ?? "Mise a jour impossible.");
        setError(String(message));
        return;
      }

      setEditingSubjectId(null);
      setSuccess("Matiere modifiee.");
      await loadData(schoolSlug);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setSavingSubject(false);
    }
  }

  function askDeleteSubject(subject: SubjectRow) {
    setDeleteTarget({ kind: "subject", id: subject.id, label: subject.name });
  }

  function startEditAssignment(assignment: AssignmentRow) {
    setEditingAssignmentId(assignment.id);
    setEditAssignmentSchoolYearId(assignment.schoolYearId);
    setEditAssignmentTeacherUserId(assignment.teacherUserId);
    setEditAssignmentClassId(assignment.classId);
    setEditAssignmentSubjectId(assignment.subjectId);
    setError(null);
    setSuccess(null);
  }

  async function onCreateAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!schoolSlug) {
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError("Session CSRF invalide. Reconnectez-vous.");
      router.replace("/");
      return;
    }

    setSubmittingAssignment(true);
    setError(null);
    setSuccess(null);

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
          body: JSON.stringify({
            schoolYearId: assignmentSchoolYearId,
            teacherUserId: assignmentTeacherUserId,
            classId: assignmentClassId,
            subjectId: assignmentSubjectId,
          }),
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          payload?.message && Array.isArray(payload.message)
            ? payload.message.join(", ")
            : (payload?.message ?? "Creation affectation impossible.");
        setError(String(message));
        return;
      }

      setSuccess("Affectation enseignant/matiere creee.");
      await loadData(schoolSlug);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setSubmittingAssignment(false);
    }
  }

  async function saveAssignment(assignmentId: string) {
    if (!schoolSlug) {
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError("Session CSRF invalide. Reconnectez-vous.");
      router.replace("/");
      return;
    }

    setSavingAssignment(true);
    setError(null);
    setSuccess(null);

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
          body: JSON.stringify({
            schoolYearId: editAssignmentSchoolYearId,
            teacherUserId: editAssignmentTeacherUserId,
            classId: editAssignmentClassId,
            subjectId: editAssignmentSubjectId,
          }),
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          payload?.message && Array.isArray(payload.message)
            ? payload.message.join(", ")
            : (payload?.message ?? "Mise a jour affectation impossible.");
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

  function askDeleteAssignment(assignment: AssignmentRow) {
    setDeleteTarget({
      kind: "assignment",
      id: assignment.id,
      label: `${assignment.teacherUser.lastName} ${assignment.teacherUser.firstName} - ${assignment.subject.name}`,
    });
  }

  async function onConfirmDelete() {
    if (!schoolSlug || !deleteTarget) {
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
    setSuccess(null);

    try {
      const segment =
        deleteTarget.kind === "subject"
          ? `subjects/${deleteTarget.id}`
          : `teacher-assignments/${deleteTarget.id}`;

      const response = await fetch(buildAdminPath(schoolSlug, segment), {
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
        deleteTarget.kind === "subject"
          ? "Matiere supprimee."
          : "Affectation supprimee.",
      );
      await loadData(schoolSlug);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setDeleting(false);
    }
  }

  const sortedSubjects = useMemo(
    () => [...subjects].sort((a, b) => a.name.localeCompare(b.name)),
    [subjects],
  );

  const sortedAssignments = useMemo(
    () =>
      [...assignments].sort((a, b) =>
        `${a.schoolYear.label}-${a.class.name}-${a.subject.name}-${a.teacherUser.lastName}-${a.teacherUser.firstName}`.localeCompare(
          `${b.schoolYear.label}-${b.class.name}-${b.subject.name}-${b.teacherUser.lastName}-${b.teacherUser.firstName}`,
        ),
      ),
    [assignments],
  );

  return (
    <AppShell schoolSlug={schoolSlug} schoolName="Gestion des matieres">
      <div className="grid gap-4">
        <Card
          title="Matieres"
          subtitle="Catalogue et affectations enseignant-classe-matiere"
        >
          <div className="mb-4 flex flex-wrap items-end gap-2 border-b border-border">
            <button
              type="button"
              onClick={() => setTab("catalog")}
              className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                tab === "catalog"
                  ? "border border-border border-b-surface bg-surface text-primary"
                  : "text-text-secondary"
              }`}
            >
              Catalogue
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
              moduleName="Matieres"
              moduleSummary="ce module gere le catalogue des matieres et les affectations enseignants par classe et annee scolaire."
              actions={[
                {
                  name: "Creer une matiere",
                  purpose: "definir les disciplines disponibles dans l'ecole.",
                  howTo:
                    "ajouter la matiere dans Catalogue, puis l'utiliser dans les programmes et affectations.",
                  moduleImpact:
                    "la matiere devient selectionnable dans le module Matieres.",
                  crossModuleImpact:
                    "elle pourra etre rattachee aux curriculums, classes et notes.",
                },
                {
                  name: "Affecter un enseignant",
                  purpose:
                    "lier un prof a une matiere pour une classe et une annee precise.",
                  howTo:
                    "dans Affectations, choisir annee, enseignant, classe et matiere, puis enregistrer.",
                  moduleImpact:
                    "l'affectation apparait dans la liste operationnelle.",
                  crossModuleImpact:
                    "le professeur pourra saisir/consulter les notes sur son perimetre assigne.",
                },
                {
                  name: "Modifier/Supprimer",
                  purpose:
                    "ajuster les erreurs d'affectation ou nettoyer les elements non utilises.",
                  howTo:
                    "utiliser les actions ligne par ligne dans les tableaux.",
                  moduleImpact:
                    "mise a jour immediate des donnees de matieres/affectations.",
                  crossModuleImpact:
                    "impacte directement les droits de saisie de notes et la coherence avec classes/inscriptions.",
                },
              ]}
              tips={[
                "Toujours verifier que la classe et l'annee scolaire correspondent.",
                "Si une classe a un curriculum, l'affectation respecte la liste des matieres autorisees (avec overrides).",
              ]}
            />
          ) : !schoolSlug ? (
            <p className="text-sm text-text-secondary">
              Selectionnez une ecole pour gerer les matieres.
            </p>
          ) : tab === "catalog" ? (
            <div className="grid gap-4">
              <form
                className="grid gap-3 md:grid-cols-[1fr_auto]"
                onSubmit={onCreateSubject}
              >
                <label className="grid gap-1 text-sm">
                  <span className="text-text-secondary">Nouvelle matiere</span>
                  <input
                    value={subjectName}
                    onChange={(event) => setSubjectName(event.target.value)}
                    placeholder="Ex: Mathematiques"
                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  />
                </label>
                <div className="self-end">
                  <Button type="submit" disabled={submittingSubject}>
                    {submittingSubject ? "Creation..." : "Ajouter"}
                  </Button>
                </div>
              </form>

              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-text-secondary">
                      <th className="px-3 py-2 font-medium">Matiere</th>
                      <th className="px-3 py-2 font-medium">Curriculums</th>
                      <th className="px-3 py-2 font-medium">Affectations</th>
                      <th className="px-3 py-2 font-medium">Notes</th>
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
                      sortedSubjects.map((subject) => (
                        <Fragment key={subject.id}>
                          <tr className="border-b border-border text-text-primary">
                            <td className="px-3 py-2">{subject.name}</td>
                            <td className="px-3 py-2">
                              {subject._count.curriculumSubjects}
                            </td>
                            <td className="px-3 py-2">
                              {subject._count.assignments}
                            </td>
                            <td className="px-3 py-2">
                              {subject._count.grades}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <div className="inline-flex gap-2">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  onClick={() => startEditSubject(subject)}
                                >
                                  Modifier
                                </Button>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  onClick={() => askDeleteSubject(subject)}
                                >
                                  Supprimer
                                </Button>
                              </div>
                            </td>
                          </tr>
                          {editingSubjectId === subject.id ? (
                            <tr className="border-b border-border bg-background">
                              <td className="px-3 py-3" colSpan={5}>
                                <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
                                  <input
                                    value={editSubjectName}
                                    onChange={(event) =>
                                      setEditSubjectName(event.target.value)
                                    }
                                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                                  />
                                  <Button
                                    type="button"
                                    disabled={savingSubject}
                                    onClick={() => {
                                      void saveSubject(subject.id);
                                    }}
                                  >
                                    {savingSubject
                                      ? "Enregistrement..."
                                      : "Enregistrer"}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setEditingSubjectId(null)}
                                  >
                                    Annuler
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      ))}

                    {!loading && !loadingData && sortedSubjects.length === 0 ? (
                      <tr>
                        <td
                          className="px-3 py-6 text-text-secondary"
                          colSpan={5}
                        >
                          Aucune matiere.
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
                className="grid gap-3 md:grid-cols-4"
                onSubmit={onCreateAssignment}
              >
                <label className="grid gap-1 text-sm">
                  <span className="text-text-secondary">Annee scolaire</span>
                  <select
                    value={assignmentSchoolYearId}
                    onChange={(event) =>
                      setAssignmentSchoolYearId(event.target.value)
                    }
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
                    {teachers.map((teacher) => (
                      <option key={teacher.userId} value={teacher.userId}>
                        {teacher.lastName} {teacher.firstName}
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
                    {filteredClassroomsForCreate.map((entry) => (
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
                    {sortedSubjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="md:col-span-4">
                  <Button type="submit" disabled={submittingAssignment}>
                    {submittingAssignment
                      ? "Creation..."
                      : "Ajouter affectation"}
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
                      sortedAssignments.map((assignment) => (
                        <Fragment key={assignment.id}>
                          <tr className="border-b border-border text-text-primary">
                            <td className="px-3 py-2">
                              {assignment.schoolYear.label}
                            </td>
                            <td className="px-3 py-2">
                              {assignment.teacherUser.lastName}{" "}
                              {assignment.teacherUser.firstName}
                            </td>
                            <td className="px-3 py-2">
                              {assignment.class.name}
                            </td>
                            <td className="px-3 py-2">
                              {assignment.subject.name}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <div className="inline-flex gap-2">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  onClick={() =>
                                    startEditAssignment(assignment)
                                  }
                                >
                                  Modifier
                                </Button>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  onClick={() =>
                                    askDeleteAssignment(assignment)
                                  }
                                >
                                  Supprimer
                                </Button>
                              </div>
                            </td>
                          </tr>

                          {editingAssignmentId === assignment.id ? (
                            <tr className="border-b border-border bg-background">
                              <td className="px-3 py-3" colSpan={5}>
                                <div className="grid gap-3 md:grid-cols-4">
                                  <select
                                    value={editAssignmentSchoolYearId}
                                    onChange={(event) =>
                                      setEditAssignmentSchoolYearId(
                                        event.target.value,
                                      )
                                    }
                                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                                  >
                                    <option value="">Selectionner annee</option>
                                    {schoolYears.map((entry) => (
                                      <option key={entry.id} value={entry.id}>
                                        {entry.label}
                                      </option>
                                    ))}
                                  </select>

                                  <select
                                    value={editAssignmentTeacherUserId}
                                    onChange={(event) =>
                                      setEditAssignmentTeacherUserId(
                                        event.target.value,
                                      )
                                    }
                                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                                  >
                                    <option value="">
                                      Selectionner enseignant
                                    </option>
                                    {teachers.map((teacher) => (
                                      <option
                                        key={teacher.userId}
                                        value={teacher.userId}
                                      >
                                        {teacher.lastName} {teacher.firstName}
                                      </option>
                                    ))}
                                  </select>

                                  <select
                                    value={editAssignmentClassId}
                                    onChange={(event) =>
                                      setEditAssignmentClassId(
                                        event.target.value,
                                      )
                                    }
                                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                                  >
                                    <option value="">
                                      Selectionner classe
                                    </option>
                                    {classrooms
                                      .filter(
                                        (entry) =>
                                          !editAssignmentSchoolYearId ||
                                          entry.schoolYear.id ===
                                            editAssignmentSchoolYearId,
                                      )
                                      .map((entry) => (
                                        <option key={entry.id} value={entry.id}>
                                          {entry.name}
                                        </option>
                                      ))}
                                  </select>

                                  <select
                                    value={editAssignmentSubjectId}
                                    onChange={(event) =>
                                      setEditAssignmentSubjectId(
                                        event.target.value,
                                      )
                                    }
                                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                                  >
                                    <option value="">
                                      Selectionner matiere
                                    </option>
                                    {sortedSubjects.map((subject) => (
                                      <option
                                        key={subject.id}
                                        value={subject.id}
                                      >
                                        {subject.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div className="mt-3 flex gap-2">
                                  <Button
                                    type="button"
                                    disabled={savingAssignment}
                                    onClick={() => {
                                      void saveAssignment(assignment.id);
                                    }}
                                  >
                                    {savingAssignment
                                      ? "Enregistrement..."
                                      : "Enregistrer"}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setEditingAssignmentId(null)}
                                  >
                                    Annuler
                                  </Button>
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
                          Aucune affectation.
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
        open={Boolean(deleteTarget)}
        title="Confirmer la suppression"
        message={
          deleteTarget ? `Voulez-vous supprimer ${deleteTarget.label} ?` : ""
        }
        confirmLabel="Supprimer"
        loading={deleting}
        onCancel={() => {
          if (!deleting) {
            setDeleteTarget(null);
          }
        }}
        onConfirm={() => {
          void onConfirmDelete();
        }}
      />
    </AppShell>
  );
}
