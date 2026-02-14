"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { AppShell } from "../../components/layout/app-shell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { ModuleHelpTab } from "../../components/ui/module-help-tab";
import { getCsrfTokenCookie } from "../../lib/auth-cookies";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

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

type SchoolYearRow = {
  id: string;
  label: string;
  isActive: boolean;
};

type ClassroomRow = {
  id: string;
  name: string;
  schoolYear: { id: string; label: string };
};

type EnrollmentRow = {
  id: string;
  status: "ACTIVE" | "TRANSFERRED" | "WITHDRAWN" | "GRADUATED";
  isCurrent: boolean;
  createdAt: string;
  updatedAt: string;
  schoolYear: { id: string; label: string };
  class: {
    id: string;
    name: string;
  };
};

type StudentRow = {
  id: string;
  firstName: string;
  lastName: string;
  parentLinks: Array<{
    id: string;
    parent: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  }>;
  currentEnrollment: EnrollmentRow | null;
  enrollments: EnrollmentRow[];
};

const createStudentSchema = z
  .object({
    firstName: z.string().trim().min(1, "Le prenom est obligatoire."),
    lastName: z.string().trim().min(1, "Le nom est obligatoire."),
    classId: z.string().trim().min(1, "La classe est obligatoire."),
    email: z.union([z.string().trim().email("Email invalide."), z.literal("")]),
    password: z.union([
      z
        .string()
        .regex(
          PASSWORD_COMPLEXITY_REGEX,
          "Le mot de passe doit contenir au moins 8 caracteres avec majuscules, minuscules et chiffres.",
        ),
      z.literal(""),
    ]),
  })
  .superRefine((value, ctx) => {
    const hasEmail = value.email.trim().length > 0;
    const hasPassword = value.password.trim().length > 0;

    if (hasEmail !== hasPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["email"],
        message:
          "Saisissez email et mot de passe ensemble, ou laissez les deux vides.",
      });
    }
  });

const updateStudentSchema = z.object({
  firstName: z.string().trim().min(1, "Le prenom est obligatoire."),
  lastName: z.string().trim().min(1, "Le nom est obligatoire."),
});

export default function ElevesPage() {
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("list");
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [role, setRole] = useState<Role | null>(null);
  const [schoolSlug, setSchoolSlug] = useState<string | null>(null);
  const [schools, setSchools] = useState<SchoolOption[]>([]);

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [schoolYears, setSchoolYears] = useState<SchoolYearRow[]>([]);
  const [classrooms, setClassrooms] = useState<ClassroomRow[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [selectedStudentEnrollments, setSelectedStudentEnrollments] = useState<
    EnrollmentRow[]
  >([]);

  const [searchFilter, setSearchFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [schoolYearFilter, setSchoolYearFilter] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [classId, setClassId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");

  const [targetClassId, setTargetClassId] = useState("");
  const [targetStatus, setTargetStatus] = useState<
    "ACTIVE" | "TRANSFERRED" | "WITHDRAWN" | "GRADUATED"
  >("ACTIVE");

  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    label: string;
  } | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [statusDraftByEnrollmentId, setStatusDraftByEnrollmentId] = useState<
    Record<string, "ACTIVE" | "TRANSFERRED" | "WITHDRAWN" | "GRADUATED">
  >({});

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [parentEmail, setParentEmail] = useState("");
  const [linkingParent, setLinkingParent] = useState(false);

  useEffect(() => {
    void bootstrap();
  }, []);

  useEffect(() => {
    if (!schoolSlug) {
      return;
    }
    void loadData(schoolSlug);
  }, [schoolSlug]);

  useEffect(() => {
    if (!schoolSlug || !selectedStudentId) {
      setSelectedStudentEnrollments([]);
      return;
    }
    void loadStudentEnrollments(schoolSlug, selectedStudentId);
  }, [schoolSlug, selectedStudentId]);

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

    try {
      const params = new URLSearchParams();
      if (searchFilter.trim()) {
        params.set("search", searchFilter.trim());
      }
      if (classFilter) {
        params.set("classId", classFilter);
      }
      if (schoolYearFilter) {
        params.set("schoolYearId", schoolYearFilter);
      }

      const [schoolYearsResponse, classroomsResponse, studentsResponse] =
        await Promise.all([
          fetch(buildAdminPath(currentSchoolSlug, "school-years"), {
            credentials: "include",
          }),
          fetch(buildAdminPath(currentSchoolSlug, "classrooms"), {
            credentials: "include",
          }),
          fetch(
            buildAdminPath(currentSchoolSlug, `students?${params.toString()}`),
            {
              credentials: "include",
            },
          ),
        ]);

      if (
        !schoolYearsResponse.ok ||
        !classroomsResponse.ok ||
        !studentsResponse.ok
      ) {
        setError("Impossible de charger les eleves.");
        return;
      }

      const schoolYearsPayload =
        (await schoolYearsResponse.json()) as SchoolYearRow[];
      const classroomsPayload =
        (await classroomsResponse.json()) as ClassroomRow[];
      const studentsPayload = (await studentsResponse.json()) as StudentRow[];

      setSchoolYears(schoolYearsPayload);
      setClassrooms(classroomsPayload);
      setStudents(studentsPayload);

      if (!schoolYearFilter && schoolYearsPayload.length > 0) {
        const active = schoolYearsPayload.find((entry) => entry.isActive);
        setSchoolYearFilter(active?.id ?? "");
      }

      if (!classId && classroomsPayload.length > 0) {
        const preferred = classroomsPayload.find(
          (entry) =>
            entry.schoolYear.id ===
            (schoolYearsPayload.find((y) => y.isActive)?.id ?? ""),
        );
        setClassId(preferred?.id ?? classroomsPayload[0].id);
      }

      if (!selectedStudentId && studentsPayload.length > 0) {
        setSelectedStudentId(studentsPayload[0].id);
      }
    } catch {
      setError("Erreur reseau.");
    } finally {
      setLoadingData(false);
    }
  }

  async function loadStudentEnrollments(
    currentSchoolSlug: string,
    studentId: string,
  ) {
    try {
      const response = await fetch(
        buildAdminPath(currentSchoolSlug, `students/${studentId}/enrollments`),
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as EnrollmentRow[];
      setSelectedStudentEnrollments(payload);

      const current = payload.find((row) => row.isCurrent);
      if (current) {
        setTargetClassId(current.class.id);
        setTargetStatus(current.status);
      } else if (payload.length > 0) {
        setTargetClassId(payload[0].class.id);
        setTargetStatus(payload[0].status);
      }

      const draft: Record<
        string,
        "ACTIVE" | "TRANSFERRED" | "WITHDRAWN" | "GRADUATED"
      > = {};
      payload.forEach((entry) => {
        draft[entry.id] = entry.status;
      });
      setStatusDraftByEnrollmentId(draft);
    } catch {
      // no-op
    }
  }

  async function onCreateStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!schoolSlug) {
      return;
    }
    setError(null);
    setSuccess(null);

    const parsed = createStudentSchema.safeParse({
      firstName,
      lastName,
      classId,
      email,
      password,
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

    setSubmitting(true);
    try {
      const response = await fetch(buildAdminPath(schoolSlug, "students"), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          firstName: parsed.data.firstName,
          lastName: parsed.data.lastName,
          classId: parsed.data.classId,
          email: parsed.data.email.trim() || undefined,
          password: parsed.data.password.trim() || undefined,
        }),
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

      setFirstName("");
      setLastName("");
      setEmail("");
      setPassword("");
      setSuccess("Eleve cree.");
      await loadData(schoolSlug);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setSubmitting(false);
    }
  }

  function startEditStudent(student: StudentRow) {
    setEditingStudentId(student.id);
    setEditFirstName(student.firstName);
    setEditLastName(student.lastName);
  }

  async function saveStudent(studentId: string) {
    if (!schoolSlug) {
      return;
    }

    setError(null);
    const parsed = updateStudentSchema.safeParse({
      firstName: editFirstName,
      lastName: editLastName,
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

    setSaving(true);
    try {
      const response = await fetch(
        buildAdminPath(schoolSlug, `students/${studentId}`),
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

      setEditingStudentId(null);
      setSuccess("Eleve modifie.");
      await loadData(schoolSlug);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDeleteStudent() {
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
    try {
      const response = await fetch(
        buildAdminPath(schoolSlug, `students/${deleteTarget.id}`),
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

      if (selectedStudentId === deleteTarget.id) {
        setSelectedStudentId("");
        setSelectedStudentEnrollments([]);
      }

      setDeleteTarget(null);
      setSuccess("Eleve supprime.");
      await loadData(schoolSlug);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setDeleting(false);
    }
  }

  async function assignStudentClass() {
    if (!schoolSlug || !selectedStudentId || !targetClassId) {
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError("Session CSRF invalide. Reconnectez-vous.");
      router.replace("/");
      return;
    }

    setAssigning(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(
        buildAdminPath(schoolSlug, `students/${selectedStudentId}/enrollments`),
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({
            classId: targetClassId,
            status: targetStatus,
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
            : (payload?.message ?? "Affectation impossible.");
        setError(String(message));
        return;
      }

      setSuccess("Affectation enregistree.");
      await Promise.all([
        loadData(schoolSlug),
        loadStudentEnrollments(schoolSlug, selectedStudentId),
      ]);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setAssigning(false);
    }
  }

  async function updateOneEnrollmentStatus(enrollmentId: string) {
    if (!schoolSlug || !selectedStudentId) {
      return;
    }

    const draft = statusDraftByEnrollmentId[enrollmentId];
    if (!draft) {
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError("Session CSRF invalide. Reconnectez-vous.");
      router.replace("/");
      return;
    }

    setUpdatingStatusId(enrollmentId);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        buildAdminPath(
          schoolSlug,
          `students/${selectedStudentId}/enrollments/${enrollmentId}`,
        ),
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({ status: draft }),
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

      setSuccess("Statut d'inscription mis a jour.");
      await Promise.all([
        loadData(schoolSlug),
        loadStudentEnrollments(schoolSlug, selectedStudentId),
      ]);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setUpdatingStatusId(null);
    }
  }

  async function linkParentToStudent() {
    if (!schoolSlug || !selectedStudentId || !parentEmail.trim()) {
      return;
    }

    const emailParsed = z
      .string()
      .email("Email parent invalide.")
      .safeParse(parentEmail.trim());
    if (!emailParsed.success) {
      setError(emailParsed.error.issues[0]?.message ?? "Email invalide.");
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError("Session CSRF invalide. Reconnectez-vous.");
      router.replace("/");
      return;
    }

    setLinkingParent(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(
        buildAdminPath(schoolSlug, "parent-students"),
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({
            studentId: selectedStudentId,
            email: parentEmail.trim(),
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
            : (payload?.message ?? "Affectation parent impossible.");
        setError(String(message));
        return;
      }

      setParentEmail("");
      setSuccess(
        "Parent affecte. Si le parent n'avait pas de compte, un email d'acces lui a ete envoye.",
      );
      await loadData(schoolSlug);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setLinkingParent(false);
    }
  }

  const sortedStudents = useMemo(
    () =>
      [...students].sort((a, b) =>
        `${a.lastName} ${a.firstName}`.localeCompare(
          `${b.lastName} ${b.firstName}`,
        ),
      ),
    [students],
  );

  const selectedStudent = useMemo(
    () => students.find((entry) => entry.id === selectedStudentId) ?? null,
    [students, selectedStudentId],
  );

  if (loading) {
    return (
      <AppShell schoolSlug={schoolSlug} schoolName="Gestion des eleves">
        <Card title="Eleves" subtitle="Chargement...">
          <p className="text-sm text-text-secondary">Chargement...</p>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell schoolSlug={schoolSlug} schoolName="Gestion des eleves">
      <div className="grid gap-4">
        <Card
          title="Eleves"
          subtitle="CRUD des eleves, visualisation et suivi des inscriptions"
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
              moduleName="Eleves"
              moduleSummary="ce module gere la creation, la mise a jour, la suppression et la consultation du parcours eleve."
              actions={[
                {
                  name: "Creer",
                  purpose:
                    "ajouter un nouvel eleve et l'affecter a une classe de l'annee scolaire.",
                  howTo:
                    "completer le formulaire puis valider. Vous pouvez ajouter un compte de connexion en saisissant email + mot de passe.",
                  moduleImpact:
                    "l'eleve est visible dans la liste et dans les filtres de suivi.",
                  crossModuleImpact:
                    "l'eleve devient utilisable dans Inscriptions, Notes et tableaux de bord.",
                },
                {
                  name: "Modifier",
                  purpose:
                    "corriger l'identite eleve ou ajuster ses affectations annuelles.",
                  howTo:
                    "utiliser Modifier dans la liste, puis l'onglet Affectations pour les inscriptions et statuts.",
                  moduleImpact:
                    "les donnees eleve et son historique sont mis a jour.",
                  crossModuleImpact:
                    "les autres modules refletent immediatement les nouveaux noms/classes/statuts.",
                },
                {
                  name: "Supprimer",
                  purpose:
                    "retirer un eleve errone ou inactif du perimetre de l'ecole.",
                  howTo: "cliquer Supprimer puis confirmer.",
                  moduleImpact:
                    "la fiche eleve et ses inscriptions associees sont retirees.",
                  crossModuleImpact:
                    "les historiques liees a cet eleve ne seront plus visibles dans les vues operationnelles.",
                },
              ]}
              tips={[
                "Verifier la classe cible avant creation pour eviter des reassigations inutiles.",
                "Pour les changements de statut, utiliser l'onglet Affectations afin de conserver un suivi propre.",
              ]}
            />
          ) : !schoolSlug ? (
            <p className="text-sm text-text-secondary">
              Selectionnez une ecole pour gerer les eleves.
            </p>
          ) : tab === "list" ? (
            <div className="grid gap-4">
              <form
                className="grid gap-3 md:grid-cols-6"
                onSubmit={onCreateStudent}
              >
                <label className="grid gap-1 text-sm">
                  <span className="text-text-secondary">Prenom</span>
                  <input
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-text-secondary">Nom</span>
                  <input
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-text-secondary">Classe</span>
                  <select
                    value={classId}
                    onChange={(event) => setClassId(event.target.value)}
                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Selectionner</option>
                    {classrooms.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.name} ({entry.schoolYear.label})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-text-secondary">Email (optionnel)</span>
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-text-secondary">
                    Mot de passe (optionnel)
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  />
                </label>
                <div className="self-end">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Creation..." : "Ajouter"}
                  </Button>
                </div>
              </form>

              <form
                className="grid gap-3 rounded-card border border-border bg-background p-3 md:grid-cols-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (schoolSlug) {
                    void loadData(schoolSlug);
                  }
                }}
              >
                <label className="grid gap-1 text-sm">
                  <span className="text-text-secondary">Recherche</span>
                  <input
                    value={searchFilter}
                    onChange={(event) => setSearchFilter(event.target.value)}
                    placeholder="Nom ou prenom"
                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-text-secondary">Classe</span>
                  <select
                    value={classFilter}
                    onChange={(event) => setClassFilter(event.target.value)}
                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Toutes</option>
                    {classrooms.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.name} ({entry.schoolYear.label})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-text-secondary">Annee scolaire</span>
                  <select
                    value={schoolYearFilter}
                    onChange={(event) =>
                      setSchoolYearFilter(event.target.value)
                    }
                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Toutes</option>
                    {schoolYears.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.label}
                        {entry.isActive ? " (active)" : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="self-end">
                  <Button type="submit" disabled={loadingData}>
                    Filtrer
                  </Button>
                </div>
              </form>

              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-text-secondary">
                      <th className="px-3 py-2 font-medium">Eleve</th>
                      <th className="px-3 py-2 font-medium">Classe courante</th>
                      <th className="px-3 py-2 font-medium">Statut</th>
                      <th className="px-3 py-2 font-medium">Inscriptions</th>
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
                      sortedStudents.map((student) => (
                        <tr
                          key={student.id}
                          className="border-b border-border text-text-primary"
                        >
                          <td className="px-3 py-2">
                            {editingStudentId === student.id ? (
                              <div className="grid gap-2">
                                <label className="grid gap-1 text-xs">
                                  <span className="text-text-secondary">
                                    Prenom
                                  </span>
                                  <input
                                    value={editFirstName}
                                    onChange={(event) =>
                                      setEditFirstName(event.target.value)
                                    }
                                    className="rounded-card border border-border bg-surface px-2 py-1 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                                  />
                                </label>
                                <label className="grid gap-1 text-xs">
                                  <span className="text-text-secondary">
                                    Nom
                                  </span>
                                  <input
                                    value={editLastName}
                                    onChange={(event) =>
                                      setEditLastName(event.target.value)
                                    }
                                    className="rounded-card border border-border bg-surface px-2 py-1 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                                  />
                                </label>
                              </div>
                            ) : (
                              `${student.lastName} ${student.firstName}`
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {student.currentEnrollment
                              ? `${student.currentEnrollment.class.name} (${student.currentEnrollment.schoolYear.label})`
                              : "-"}
                          </td>
                          <td className="px-3 py-2">
                            {student.currentEnrollment?.status ?? "-"}
                          </td>
                          <td className="px-3 py-2">
                            {student.enrollments.length}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="inline-flex gap-2">
                              {editingStudentId === student.id ? (
                                <>
                                  <Button
                                    type="button"
                                    disabled={saving}
                                    onClick={() => {
                                      void saveStudent(student.id);
                                    }}
                                  >
                                    {saving ? "..." : "Enregistrer"}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setEditingStudentId(null)}
                                  >
                                    Annuler
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => {
                                      setSelectedStudentId(student.id);
                                      setTab("assignments");
                                    }}
                                  >
                                    Voir
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => startEditStudent(student)}
                                  >
                                    Modifier
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() =>
                                      setDeleteTarget({
                                        id: student.id,
                                        label: `${student.lastName} ${student.firstName}`,
                                      })
                                    }
                                  >
                                    Supprimer
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}

                    {!loading && !loadingData && sortedStudents.length === 0 ? (
                      <tr>
                        <td
                          className="px-3 py-6 text-text-secondary"
                          colSpan={5}
                        >
                          Aucun eleve trouve.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              <label className="grid gap-1 text-sm md:max-w-[420px]">
                <span className="text-text-secondary">Eleve</span>
                <select
                  value={selectedStudentId}
                  onChange={(event) => setSelectedStudentId(event.target.value)}
                  className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Selectionner</option>
                  {sortedStudents.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.lastName} {entry.firstName}
                    </option>
                  ))}
                </select>
              </label>

              {!selectedStudent ? (
                <p className="text-sm text-text-secondary">
                  Selectionnez un eleve pour voir son detail.
                </p>
              ) : (
                <>
                  <div className="rounded-card border border-border bg-background p-3 text-sm">
                    <p className="font-medium text-text-primary">Identite</p>
                    <p className="mt-1 text-text-secondary">
                      {selectedStudent.lastName} {selectedStudent.firstName}
                    </p>
                    <p className="mt-1 text-text-secondary">
                      Classe courante:{" "}
                      {selectedStudent.currentEnrollment?.class.name ?? "-"}
                    </p>
                  </div>

                  <div className="grid gap-3 rounded-card border border-border bg-background p-3 md:grid-cols-[1fr_auto]">
                    <label className="grid gap-1 text-sm">
                      <span className="text-text-secondary">
                        Email du parent
                      </span>
                      <input
                        value={parentEmail}
                        onChange={(event) => setParentEmail(event.target.value)}
                        placeholder="parent@email.com"
                        className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                      />
                    </label>
                    <div className="self-end">
                      <Button
                        type="button"
                        disabled={linkingParent || !parentEmail.trim()}
                        onClick={() => {
                          void linkParentToStudent();
                        }}
                      >
                        {linkingParent ? "Affectation..." : "Affecter parent"}
                      </Button>
                    </div>
                    <div className="md:col-span-2">
                      <p className="mb-2 text-sm font-medium text-text-primary">
                        Parents lies
                      </p>
                      {(selectedStudent.parentLinks ?? []).length === 0 ? (
                        <p className="text-sm text-text-secondary">
                          Aucun parent lie.
                        </p>
                      ) : (
                        <ul className="grid gap-1 text-sm text-text-secondary">
                          {(selectedStudent.parentLinks ?? []).map((link) => (
                            <li key={link.id}>
                              {link.parent.lastName} {link.parent.firstName} -{" "}
                              {link.parent.email}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-3 rounded-card border border-border bg-background p-3 md:grid-cols-3">
                    <label className="grid gap-1 text-sm">
                      <span className="text-text-secondary">
                        Nouvelle classe
                      </span>
                      <select
                        value={targetClassId}
                        onChange={(event) =>
                          setTargetClassId(event.target.value)
                        }
                        className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">Selectionner</option>
                        {classrooms.map((entry) => (
                          <option key={entry.id} value={entry.id}>
                            {entry.name} ({entry.schoolYear.label})
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-1 text-sm">
                      <span className="text-text-secondary">Statut</span>
                      <select
                        value={targetStatus}
                        onChange={(event) =>
                          setTargetStatus(
                            event.target.value as
                              | "ACTIVE"
                              | "TRANSFERRED"
                              | "WITHDRAWN"
                              | "GRADUATED",
                          )
                        }
                        className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="TRANSFERRED">TRANSFERRED</option>
                        <option value="WITHDRAWN">WITHDRAWN</option>
                        <option value="GRADUATED">GRADUATED</option>
                      </select>
                    </label>
                    <div className="self-end">
                      <Button
                        type="button"
                        disabled={assigning || !targetClassId}
                        onClick={() => {
                          void assignStudentClass();
                        }}
                      >
                        {assigning ? "Affectation..." : "Affecter"}
                      </Button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-text-secondary">
                          <th className="px-3 py-2 font-medium">Annee</th>
                          <th className="px-3 py-2 font-medium">Classe</th>
                          <th className="px-3 py-2 font-medium">Statut</th>
                          <th className="px-3 py-2 font-medium">Courant</th>
                          <th className="px-3 py-2 font-medium text-right">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedStudentEnrollments.map((enrollment) => (
                          <tr
                            key={enrollment.id}
                            className="border-b border-border text-text-primary"
                          >
                            <td className="px-3 py-2">
                              {enrollment.schoolYear.label}
                            </td>
                            <td className="px-3 py-2">
                              {enrollment.class.name}
                            </td>
                            <td className="px-3 py-2">
                              <select
                                value={
                                  statusDraftByEnrollmentId[enrollment.id] ??
                                  enrollment.status
                                }
                                onChange={(event) =>
                                  setStatusDraftByEnrollmentId((current) => ({
                                    ...current,
                                    [enrollment.id]: event.target.value as
                                      | "ACTIVE"
                                      | "TRANSFERRED"
                                      | "WITHDRAWN"
                                      | "GRADUATED",
                                  }))
                                }
                                className="rounded-card border border-border bg-surface px-2 py-1 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                              >
                                <option value="ACTIVE">ACTIVE</option>
                                <option value="TRANSFERRED">TRANSFERRED</option>
                                <option value="WITHDRAWN">WITHDRAWN</option>
                                <option value="GRADUATED">GRADUATED</option>
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              {enrollment.isCurrent ? "Oui" : "Non"}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <Button
                                type="button"
                                variant="secondary"
                                disabled={updatingStatusId === enrollment.id}
                                onClick={() => {
                                  void updateOneEnrollmentStatus(enrollment.id);
                                }}
                              >
                                {updatingStatusId === enrollment.id
                                  ? "..."
                                  : "Maj"}
                              </Button>
                            </td>
                          </tr>
                        ))}
                        {selectedStudentEnrollments.length === 0 ? (
                          <tr>
                            <td
                              className="px-3 py-6 text-text-secondary"
                              colSpan={5}
                            >
                              Aucune inscription.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
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
            ? `Voulez-vous supprimer l'eleve ${deleteTarget.label} ?`
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
          void confirmDeleteStudent();
        }}
      />
    </AppShell>
  );
}
