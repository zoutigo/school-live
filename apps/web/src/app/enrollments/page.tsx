"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AppShell } from "../../components/layout/app-shell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { FormCheckbox, FormTextInput } from "../../components/ui/form-controls";
import { FormField } from "../../components/ui/form-field";
import { SubmitButton } from "../../components/ui/form-buttons";
import { ModuleHelpTab } from "../../components/ui/module-help-tab";
import { SearchableSelect } from "../../components/ui/searchable-select";
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
type Tab = "manage" | "admissions" | "help";

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
  schoolYear: { id: string; label: string };
  class: {
    id: string;
    name: string;
  } | null;
};

type StudentEnrollmentRow = {
  id: string;
  firstName: string;
  lastName: string;
  currentEnrollment: EnrollmentRow | null;
  enrollments: EnrollmentRow[];
};

type FlatEnrollmentRow = {
  studentId: string;
  studentFirstName: string;
  studentLastName: string;
  enrollment: EnrollmentRow;
};

type AcademicLevelRow = {
  id: string;
  code: string;
  label: string;
};

type TrackRow = {
  id: string;
  code: string;
  label: string;
};

type PoolEntry = {
  id: string;
  studentId: string;
  student: { id: string; firstName: string; lastName: string };
  academicLevel: { id: string; label: string; code: string } | null;
  track: { id: string; label: string; code: string } | null;
};

const statusSchema = z.enum([
  "ACTIVE",
  "TRANSFERRED",
  "WITHDRAWN",
  "GRADUATED",
]);

const filtersSchema = z.object({
  schoolYearId: z.string().optional().default(""),
  classId: z.string().optional().default(""),
  status: z.string().optional().default(""),
  search: z.string().optional().default(""),
});

const bulkStatusSchema = z.object({
  status: statusSchema,
});

const admissionFormSchema = z.object({
  firstName: z.string().trim().min(1, "Prenom requis"),
  lastName: z.string().trim().min(1, "Nom requis"),
  dateOfBirth: z.string().optional().default(""),
  academicLevelId: z.string().trim().min(1, "Niveau requis"),
  trackId: z.string().optional().default(""),
  schoolYearId: z.string().optional().default(""),
});

export default function EnrollmentsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("manage");

  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [role, setRole] = useState<Role | null>(null);
  const [schoolSlug, setSchoolSlug] = useState<string | null>(null);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [schoolYears, setSchoolYears] = useState<SchoolYearRow[]>([]);
  const [classrooms, setClassrooms] = useState<ClassroomRow[]>([]);
  const [students, setStudents] = useState<StudentEnrollmentRow[]>([]);
  const [selectedEnrollmentIds, setSelectedEnrollmentIds] = useState<string[]>(
    [],
  );
  const [updatingOneId, setUpdatingOneId] = useState<string | null>(null);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusDraftByEnrollmentId, setStatusDraftByEnrollmentId] = useState<
    Record<string, "ACTIVE" | "TRANSFERRED" | "WITHDRAWN" | "GRADUATED">
  >({});
  const filtersForm = useForm<z.input<typeof filtersSchema>>({
    resolver: zodResolver(filtersSchema),
    mode: "onChange",
    defaultValues: {
      schoolYearId: "",
      classId: "",
      status: "",
      search: "",
    },
  });
  const bulkForm = useForm<z.input<typeof bulkStatusSchema>>({
    resolver: zodResolver(bulkStatusSchema),
    mode: "onChange",
    defaultValues: {
      status: "ACTIVE",
    },
  });
  const filterValues = filtersForm.watch();
  const bulkValues = bulkForm.watch();

  const [academicLevels, setAcademicLevels] = useState<AcademicLevelRow[]>([]);
  const [tracks, setTracks] = useState<TrackRow[]>([]);
  const [pool, setPool] = useState<PoolEntry[]>([]);
  const [submittingAdmission, setSubmittingAdmission] = useState(false);
  const [admissionError, setAdmissionError] = useState<string | null>(null);
  const [admissionSuccess, setAdmissionSuccess] = useState<string | null>(null);
  const [assigningPoolStudentId, setAssigningPoolStudentId] = useState<
    string | null
  >(null);
  const [poolAssignClassId, setPoolAssignClassId] = useState("");
  const [savingPoolAssignmentId, setSavingPoolAssignmentId] = useState<
    string | null
  >(null);
  const admissionForm = useForm<z.input<typeof admissionFormSchema>>({
    resolver: zodResolver(admissionFormSchema),
    mode: "onChange",
    defaultValues: {
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      academicLevelId: "",
      trackId: "",
      schoolYearId: "",
    },
  });
  const admissionValues = admissionForm.watch();

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

    const schoolsResponse = await fetch(`${API_URL}/system/schools/options`, {
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

  async function loadData(currentSchoolSlug: string) {
    setLoadingData(true);
    setError(null);
    setSuccess(null);
    setSelectedEnrollmentIds([]);
    setStatusDraftByEnrollmentId({});
    try {
      const currentFilters = filtersForm.getValues();
      const params = new URLSearchParams();
      if (currentFilters.schoolYearId) {
        params.set("schoolYearId", currentFilters.schoolYearId);
      }
      if (currentFilters.classId) {
        params.set("classId", currentFilters.classId);
      }
      if (currentFilters.status) {
        params.set("status", currentFilters.status);
      }
      if ((currentFilters.search ?? "").trim()) {
        params.set("search", (currentFilters.search ?? "").trim());
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
            { credentials: "include" },
          ),
        ]);

      if (
        !schoolYearsResponse.ok ||
        !classroomsResponse.ok ||
        !studentsResponse.ok
      ) {
        setError("Impossible de charger les inscriptions.");
        return;
      }

      const schoolYearsPayload =
        (await schoolYearsResponse.json()) as SchoolYearRow[];
      const classroomsPayload =
        (await classroomsResponse.json()) as ClassroomRow[];
      const studentsPayload = (await studentsResponse.json()) as {
        students: StudentEnrollmentRow[];
      };

      setSchoolYears(schoolYearsPayload);
      setClassrooms(classroomsPayload);
      setStudents(studentsPayload.students);
      void loadAdmissionsSectionData(currentSchoolSlug);

      const latestFilters = filtersForm.getValues();
      if (!latestFilters.schoolYearId && schoolYearsPayload.length > 0) {
        const active = schoolYearsPayload.find((entry) => entry.isActive);
        filtersForm.setValue("schoolYearId", active?.id ?? "", {
          shouldDirty: false,
          shouldTouch: false,
          shouldValidate: false,
        });
      }
    } catch {
      setError("Erreur reseau.");
    } finally {
      setLoadingData(false);
    }
  }

  async function loadPool(currentSchoolSlug: string) {
    try {
      const response = await fetch(
        buildAdminPath(currentSchoolSlug, "enrollments/pool"),
        { credentials: "include" },
      );
      if (!response.ok) {
        return;
      }
      const payload = (await response.json()) as PoolEntry[];
      setPool(payload);
    } catch {
      // Silencieux : le pool n'est qu'une section secondaire de la page.
    }
  }

  /**
   * Charge les donnees propres a l'onglet "Inscriptions" (niveaux, filieres,
   * pool en attente d'affectation), separement du chargement principal :
   * ces endpoints ne doivent jamais bloquer l'onglet "Gestion" si l'un
   * d'eux echoue ou n'est pas disponible.
   */
  async function loadAdmissionsSectionData(currentSchoolSlug: string) {
    try {
      const [academicLevelsResponse, tracksResponse] = await Promise.all([
        fetch(buildAdminPath(currentSchoolSlug, "academic-levels"), {
          credentials: "include",
        }),
        fetch(buildAdminPath(currentSchoolSlug, "tracks"), {
          credentials: "include",
        }),
      ]);
      if (academicLevelsResponse.ok) {
        setAcademicLevels(
          (await academicLevelsResponse.json()) as AcademicLevelRow[],
        );
      }
      if (tracksResponse.ok) {
        setTracks((await tracksResponse.json()) as TrackRow[]);
      }
    } catch {
      // Silencieux : section secondaire de la page.
    }
    await loadPool(currentSchoolSlug);
  }

  async function createAdmission(values: z.input<typeof admissionFormSchema>) {
    if (!schoolSlug) {
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setAdmissionError("Session CSRF invalide. Reconnectez-vous.");
      router.replace("/");
      return;
    }

    setSubmittingAdmission(true);
    setAdmissionError(null);
    setAdmissionSuccess(null);
    try {
      const response = await fetch(
        buildAdminPath(schoolSlug, "students/admissions"),
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({
            firstName: values.firstName,
            lastName: values.lastName,
            dateOfBirth: values.dateOfBirth || undefined,
            academicLevelId: values.academicLevelId,
            trackId: values.trackId || undefined,
            schoolYearId: values.schoolYearId || undefined,
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
            : (payload?.message ?? "Enregistrement impossible.");
        setAdmissionError(String(message));
        return;
      }

      setAdmissionSuccess("Admission enregistree.");
      admissionForm.reset({
        firstName: "",
        lastName: "",
        dateOfBirth: "",
        academicLevelId: "",
        trackId: "",
        schoolYearId: "",
      });
    } catch {
      setAdmissionError("Erreur reseau.");
    } finally {
      setSubmittingAdmission(false);
    }
  }

  async function assignPoolStudent(studentId: string) {
    if (!schoolSlug || !poolAssignClassId) {
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setAdmissionError("Session CSRF invalide. Reconnectez-vous.");
      router.replace("/");
      return;
    }

    setSavingPoolAssignmentId(studentId);
    setAdmissionError(null);
    setAdmissionSuccess(null);
    try {
      const response = await fetch(
        buildAdminPath(schoolSlug, `students/${studentId}/enrollments`),
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({
            classId: poolAssignClassId,
            status: "ACTIVE",
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
        setAdmissionError(String(message));
        return;
      }

      setAssigningPoolStudentId(null);
      setPoolAssignClassId("");
      setAdmissionSuccess("Eleve affecte a la classe.");
      await loadPool(schoolSlug);
    } catch {
      setAdmissionError("Erreur reseau.");
    } finally {
      setSavingPoolAssignmentId(null);
    }
  }

  const flatRows = useMemo<FlatEnrollmentRow[]>(
    () =>
      students.flatMap((student) =>
        student.enrollments.map((enrollment) => ({
          studentId: student.id,
          studentFirstName: student.firstName,
          studentLastName: student.lastName,
          enrollment,
        })),
      ),
    [students],
  );

  async function onApplyFilters() {
    if (!schoolSlug) {
      return;
    }
    await loadData(schoolSlug);
  }

  function toggleSelectEnrollment(enrollmentId: string, checked: boolean) {
    setSelectedEnrollmentIds((current) =>
      checked
        ? Array.from(new Set([...current, enrollmentId]))
        : current.filter((id) => id !== enrollmentId),
    );
  }

  async function updateOneStatus(row: FlatEnrollmentRow) {
    if (!schoolSlug) {
      return;
    }

    const nextStatus =
      statusDraftByEnrollmentId[row.enrollment.id] ?? row.enrollment.status;
    if (nextStatus === row.enrollment.status) {
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError("Session CSRF invalide. Reconnectez-vous.");
      router.replace("/");
      return;
    }

    setUpdatingOneId(row.enrollment.id);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(
        buildAdminPath(
          schoolSlug,
          `students/${row.studentId}/enrollments/${row.enrollment.id}`,
        ),
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({ status: nextStatus }),
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

      setSuccess("Statut mis a jour.");
      await loadData(schoolSlug);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setUpdatingOneId(null);
    }
  }

  async function bulkUpdateStatus() {
    if (!schoolSlug || selectedEnrollmentIds.length === 0) {
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError("Session CSRF invalide. Reconnectez-vous.");
      router.replace("/");
      return;
    }

    setBulkUpdating(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(
        buildAdminPath(schoolSlug, "enrollments/status"),
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({
            enrollmentIds: selectedEnrollmentIds,
            status: bulkValues.status,
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
            : (payload?.message ?? "Mise a jour en masse impossible.");
        setError(String(message));
        return;
      }

      setSuccess("Statut mis a jour en masse.");
      await loadData(schoolSlug);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setBulkUpdating(false);
    }
  }

  const filteredClassrooms = useMemo(
    () =>
      classrooms.filter(
        (entry) =>
          !filterValues.schoolYearId ||
          entry.schoolYear.id === filterValues.schoolYearId,
      ),
    [classrooms, filterValues.schoolYearId],
  );

  return (
    <AppShell schoolSlug={schoolSlug} schoolName="Gestion des inscriptions">
      <div className="grid gap-4">
        <Card
          title="Inscriptions annuelles"
          subtitle="Filtrer, affecter et mettre a jour les statuts"
        >
          <div className="mb-4 flex items-end gap-2 border-b border-border">
            <button
              type="button"
              onClick={() => setTab("manage")}
              className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                tab === "manage"
                  ? "border border-border border-b-surface bg-surface text-primary"
                  : "text-text-secondary"
              }`}
            >
              Gestion
            </button>
            <button
              type="button"
              onClick={() => setTab("admissions")}
              data-testid="enrollments-tab-admissions"
              className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                tab === "admissions"
                  ? "border border-border border-b-surface bg-surface text-primary"
                  : "text-text-secondary"
              }`}
            >
              Inscriptions
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

          {tab === "help" ? (
            <ModuleHelpTab
              moduleName="Inscriptions"
              moduleSummary="ce module suit l'affectation annuelle des eleves et le cycle de vie de leurs inscriptions."
              actions={[
                {
                  name: "Filtrer",
                  purpose:
                    "cibler rapidement une annee, une classe, un statut ou un eleve.",
                  howTo: "utiliser les filtres puis appliquer la recherche.",
                  moduleImpact:
                    "la vue courante affiche uniquement le sous-ensemble utile.",
                  crossModuleImpact:
                    "facilite les controles avant des actions sur Classes, Utilisateurs ou bulletins.",
                },
                {
                  name: "Modifier statut",
                  purpose:
                    "mettre a jour un dossier (ACTIVE, TRANSFERRED, WITHDRAWN, GRADUATED).",
                  howTo:
                    "modifier ligne par ligne ou en masse via la selection.",
                  moduleImpact:
                    "l'historique d'inscription est ajuste et la situation courante change.",
                  crossModuleImpact:
                    "les modules Notes, tableaux de bord et statistiques se basent ensuite sur ce nouveau statut.",
                },
                {
                  name: "Affecter en masse",
                  purpose:
                    "traiter rapidement plusieurs inscriptions avec le meme statut cible.",
                  howTo:
                    "selectionner des lignes, choisir le statut cible puis appliquer.",
                  moduleImpact:
                    "plusieurs inscriptions sont synchronisees en une seule operation.",
                  crossModuleImpact:
                    "reduis les ecarts entre suivi administratif et donnees pedagogiques.",
                },
              ]}
              tips={[
                "Toujours verifier l'annee scolaire et la classe avant mise a jour en masse.",
                "Pour les cas sensibles, preferer une mise a jour ligne par ligne.",
              ]}
            />
          ) : null}

          {tab === "admissions" ? (
            <div
              className="grid gap-6"
              data-testid="enrollments-admissions-tab"
            >
              <Card
                title="Nouvel eleve"
                subtitle="Cree un eleve sans historique ; il rejoint le pool en attente d'affectation de classe des que la premiere tranche est payee."
              >
                <form
                  className="grid gap-3 md:grid-cols-2"
                  onSubmit={admissionForm.handleSubmit(createAdmission)}
                  noValidate
                >
                  <FormField
                    label="Prenom"
                    error={admissionForm.formState.errors.firstName?.message}
                  >
                    <FormTextInput
                      value={admissionValues.firstName}
                      onChange={(event) =>
                        admissionForm.setValue(
                          "firstName",
                          event.target.value,
                          {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                          },
                        )
                      }
                    />
                  </FormField>

                  <FormField
                    label="Nom"
                    error={admissionForm.formState.errors.lastName?.message}
                  >
                    <FormTextInput
                      value={admissionValues.lastName}
                      onChange={(event) =>
                        admissionForm.setValue("lastName", event.target.value, {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        })
                      }
                    />
                  </FormField>

                  <FormField label="Date de naissance (optionnel)">
                    <FormTextInput
                      type="date"
                      value={admissionValues.dateOfBirth ?? ""}
                      onChange={(event) =>
                        admissionForm.setValue(
                          "dateOfBirth",
                          event.target.value,
                          {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                          },
                        )
                      }
                    />
                  </FormField>

                  <FormField
                    label="Niveau"
                    error={
                      admissionForm.formState.errors.academicLevelId?.message
                    }
                  >
                    <SearchableSelect
                      ariaLabel="Niveau"
                      value={admissionValues.academicLevelId ?? ""}
                      onChange={(value) =>
                        admissionForm.setValue("academicLevelId", value, {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        })
                      }
                      placeholder="Selectionner"
                      searchPlaceholder="Rechercher..."
                      noResultsLabel="Aucun resultat"
                      data-testid="admission-form-level-select"
                      options={academicLevels.map((level) => ({
                        value: level.id,
                        label: level.label,
                      }))}
                    />
                  </FormField>

                  <FormField label="Filiere (optionnel)">
                    <SearchableSelect
                      ariaLabel="Filiere"
                      value={admissionValues.trackId ?? ""}
                      onChange={(value) =>
                        admissionForm.setValue("trackId", value, {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        })
                      }
                      placeholder="Aucune"
                      searchPlaceholder="Rechercher..."
                      noResultsLabel="Aucun resultat"
                      data-testid="admission-form-track-select"
                      options={tracks.map((track) => ({
                        value: track.id,
                        label: track.label,
                      }))}
                    />
                  </FormField>

                  <FormField label="Annee scolaire (optionnel, defaut : active)">
                    <SearchableSelect
                      ariaLabel="Annee scolaire"
                      value={admissionValues.schoolYearId ?? ""}
                      onChange={(value) =>
                        admissionForm.setValue("schoolYearId", value, {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        })
                      }
                      placeholder="Annee active"
                      searchPlaceholder="Rechercher..."
                      noResultsLabel="Aucun resultat"
                      data-testid="admission-form-year-select"
                      options={schoolYears.map((year) => ({
                        value: year.id,
                        label: year.label,
                      }))}
                    />
                  </FormField>

                  <div className="md:col-span-2">
                    <SubmitButton
                      disabled={submittingAdmission}
                      data-testid="admission-form-submit"
                    >
                      {submittingAdmission
                        ? "Enregistrement..."
                        : "Enregistrer"}
                    </SubmitButton>
                  </div>
                </form>
              </Card>

              <Card
                title="En attente d'affectation de classe"
                subtitle="Eleves confirmes (admission ou reinscription) sans classe pour l'annee active"
              >
                <div className="grid gap-3" data-testid="enrollments-pool-list">
                  {pool.length === 0 ? (
                    <p className="text-sm text-text-secondary">
                      Aucun eleve en attente d&apos;affectation.
                    </p>
                  ) : (
                    pool.map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded-card border border-border p-3"
                        data-testid={`enrollments-pool-${entry.studentId}`}
                      >
                        <p className="text-sm font-semibold text-text-primary">
                          {entry.student.lastName} {entry.student.firstName}
                        </p>
                        <p className="mb-2 text-xs text-text-secondary">
                          {entry.academicLevel?.label ?? "-"}
                          {entry.track ? ` - ${entry.track.label}` : ""}
                        </p>

                        {assigningPoolStudentId === entry.studentId ? (
                          <div className="flex flex-wrap items-end gap-2">
                            <SearchableSelect
                              ariaLabel="Classe"
                              value={poolAssignClassId}
                              onChange={setPoolAssignClassId}
                              placeholder="Choisir une classe"
                              searchPlaceholder="Rechercher..."
                              noResultsLabel="Aucun resultat"
                              className="min-w-[220px]"
                              data-testid={`enrollments-pool-${entry.studentId}-class-select`}
                              options={classrooms.map((classroom) => ({
                                value: classroom.id,
                                label: `${classroom.name} (${classroom.schoolYear.label})`,
                              }))}
                            />
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => {
                                setAssigningPoolStudentId(null);
                                setPoolAssignClassId("");
                              }}
                            >
                              Annuler
                            </Button>
                            <Button
                              type="button"
                              disabled={
                                !poolAssignClassId ||
                                savingPoolAssignmentId === entry.studentId
                              }
                              onClick={() =>
                                void assignPoolStudent(entry.studentId)
                              }
                              data-testid={`enrollments-pool-${entry.studentId}-confirm`}
                            >
                              Confirmer l&apos;affectation
                            </Button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                              setAssigningPoolStudentId(entry.studentId);
                              setPoolAssignClassId("");
                            }}
                            data-testid={`enrollments-pool-${entry.studentId}-assign`}
                          >
                            Affecter une classe
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </Card>

              {admissionError ? (
                <p className="text-sm text-notification">{admissionError}</p>
              ) : null}
              {admissionSuccess ? (
                <p className="text-sm text-primary">{admissionSuccess}</p>
              ) : null}
            </div>
          ) : null}

          {tab === "manage" ? (
            <>
              {role === "SUPER_ADMIN" || role === "ADMIN" ? (
                <label className="mb-4 grid min-w-[260px] max-w-[420px] gap-1 text-sm">
                  <span className="text-text-secondary">Ecole</span>
                  <SearchableSelect
                    ariaLabel="Ecole"
                    value={schoolSlug ?? ""}
                    onChange={(value) => setSchoolSlug(value || null)}
                    placeholder="Selectionner une ecole"
                    searchPlaceholder="Rechercher..."
                    noResultsLabel="Aucun resultat"
                    data-testid="enrollments-school-select"
                    options={schools.map((school) => ({
                      value: school.slug,
                      label: school.name,
                    }))}
                  />
                </label>
              ) : null}

              {!schoolSlug ? (
                <p className="text-sm text-text-secondary">
                  Selectionnez une ecole.
                </p>
              ) : (
                <>
                  <form
                    className="mb-4 grid gap-3 md:grid-cols-5"
                    onSubmit={filtersForm.handleSubmit(onApplyFilters)}
                  >
                    <FormField label="Annee scolaire">
                      <SearchableSelect
                        ariaLabel="Annee scolaire"
                        value={filterValues.schoolYearId ?? ""}
                        onChange={(value) => {
                          filtersForm.setValue("schoolYearId", value, {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                          });
                          filtersForm.setValue("classId", "", {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                          });
                        }}
                        placeholder="Toutes"
                        searchPlaceholder="Rechercher..."
                        noResultsLabel="Aucun resultat"
                        data-testid="enrollments-filter-year-select"
                        options={schoolYears.map((entry) => ({
                          value: entry.id,
                          label: `${entry.label}${entry.isActive ? " (active)" : ""}`,
                        }))}
                      />
                    </FormField>

                    <FormField label="Classe">
                      <SearchableSelect
                        ariaLabel="Classe"
                        value={filterValues.classId ?? ""}
                        onChange={(value) =>
                          filtersForm.setValue("classId", value, {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                          })
                        }
                        placeholder="Toutes"
                        searchPlaceholder="Rechercher..."
                        noResultsLabel="Aucun resultat"
                        data-testid="enrollments-filter-class-select"
                        options={filteredClassrooms.map((entry) => ({
                          value: entry.id,
                          label: `${entry.name} (${entry.schoolYear.label})`,
                        }))}
                      />
                    </FormField>

                    <FormField label="Statut">
                      <SearchableSelect
                        ariaLabel="Statut"
                        value={filterValues.status ?? ""}
                        onChange={(value) =>
                          filtersForm.setValue("status", value, {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                          })
                        }
                        data-testid="enrollments-filter-status-select"
                        options={[
                          { value: "", label: "Tous" },
                          { value: "ACTIVE", label: "ACTIVE" },
                          { value: "TRANSFERRED", label: "TRANSFERRED" },
                          { value: "WITHDRAWN", label: "WITHDRAWN" },
                          { value: "GRADUATED", label: "GRADUATED" },
                        ]}
                      />
                    </FormField>

                    <FormField
                      label="Recherche eleve"
                      className="md:col-span-2"
                    >
                      <div className="flex gap-2">
                        <FormTextInput
                          aria-label="Recherche eleve"
                          value={filterValues.search ?? ""}
                          onChange={(event) =>
                            filtersForm.setValue("search", event.target.value, {
                              shouldDirty: true,
                              shouldTouch: true,
                              shouldValidate: true,
                            })
                          }
                          placeholder="Nom ou prenom"
                          className="w-full"
                        />
                        <SubmitButton disabled={loadingData}>
                          Filtrer
                        </SubmitButton>
                      </div>
                    </FormField>
                  </form>

                  <div className="mb-3 flex flex-wrap items-end gap-2 rounded-card border border-border bg-background p-3">
                    <FormField label="Statut cible (selection)">
                      <SearchableSelect
                        ariaLabel="Statut cible"
                        value={bulkValues.status}
                        onChange={(value) =>
                          bulkForm.setValue(
                            "status",
                            value as z.infer<typeof statusSchema>,
                            {
                              shouldDirty: true,
                              shouldTouch: true,
                              shouldValidate: true,
                            },
                          )
                        }
                        data-testid="enrollments-bulk-status-select"
                        options={[
                          { value: "ACTIVE", label: "ACTIVE" },
                          { value: "TRANSFERRED", label: "TRANSFERRED" },
                          { value: "WITHDRAWN", label: "WITHDRAWN" },
                          { value: "GRADUATED", label: "GRADUATED" },
                        ]}
                      />
                    </FormField>
                    <Button
                      type="button"
                      disabled={
                        bulkUpdating || selectedEnrollmentIds.length === 0
                      }
                      onClick={() => {
                        void bulkUpdateStatus();
                      }}
                    >
                      {bulkUpdating
                        ? "Mise a jour..."
                        : `Appliquer a la selection (${selectedEnrollmentIds.length})`}
                    </Button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-text-secondary">
                          <th className="px-3 py-2 font-medium">Sel.</th>
                          <th className="px-3 py-2 font-medium">Eleve</th>
                          <th className="px-3 py-2 font-medium">Annee</th>
                          <th className="px-3 py-2 font-medium">Classe</th>
                          <th className="px-3 py-2 font-medium">Statut</th>
                          <th className="px-3 py-2 font-medium">Current</th>
                          <th className="px-3 py-2 font-medium text-right">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(loading || loadingData) && (
                          <tr>
                            <td
                              className="px-3 py-6 text-text-secondary"
                              colSpan={7}
                            >
                              Chargement...
                            </td>
                          </tr>
                        )}
                        {!loading &&
                          !loadingData &&
                          flatRows.map((row) => (
                            <tr
                              key={row.enrollment.id}
                              className="border-b border-border text-text-primary"
                            >
                              <td className="px-3 py-2">
                                <FormCheckbox
                                  checked={selectedEnrollmentIds.includes(
                                    row.enrollment.id,
                                  )}
                                  onChange={(event) =>
                                    toggleSelectEnrollment(
                                      row.enrollment.id,
                                      event.target.checked,
                                    )
                                  }
                                />
                              </td>
                              <td className="px-3 py-2">
                                {row.studentLastName} {row.studentFirstName}
                              </td>
                              <td className="px-3 py-2">
                                {row.enrollment.schoolYear.label}
                              </td>
                              <td className="px-3 py-2">
                                {row.enrollment.class?.name ?? (
                                  <span className="text-text-secondary">
                                    Non affecte (pool)
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                <SearchableSelect
                                  ariaLabel={`Statut - ${row.enrollment.id}`}
                                  value={
                                    statusDraftByEnrollmentId[
                                      row.enrollment.id
                                    ] ?? row.enrollment.status
                                  }
                                  onChange={(value) =>
                                    setStatusDraftByEnrollmentId((current) => ({
                                      ...current,
                                      [row.enrollment.id]: value as
                                        | "ACTIVE"
                                        | "TRANSFERRED"
                                        | "WITHDRAWN"
                                        | "GRADUATED",
                                    }))
                                  }
                                  data-testid={`enrollments-row-status-select-${row.enrollment.id}`}
                                  options={[
                                    { value: "ACTIVE", label: "ACTIVE" },
                                    {
                                      value: "TRANSFERRED",
                                      label: "TRANSFERRED",
                                    },
                                    {
                                      value: "WITHDRAWN",
                                      label: "WITHDRAWN",
                                    },
                                    {
                                      value: "GRADUATED",
                                      label: "GRADUATED",
                                    },
                                  ]}
                                />
                              </td>
                              <td className="px-3 py-2">
                                {row.enrollment.isCurrent ? "Oui" : "Non"}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  disabled={updatingOneId === row.enrollment.id}
                                  onClick={() => {
                                    void updateOneStatus(row);
                                  }}
                                >
                                  {updatingOneId === row.enrollment.id
                                    ? "..."
                                    : "Maj"}
                                </Button>
                              </td>
                            </tr>
                          ))}
                        {!loading && !loadingData && flatRows.length === 0 ? (
                          <tr>
                            <td
                              className="px-3 py-6 text-text-secondary"
                              colSpan={7}
                            >
                              Aucune inscription trouvee.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {error ? (
                <p className="mt-3 text-sm text-notification">{error}</p>
              ) : null}
              {success ? (
                <p className="mt-3 text-sm text-primary">{success}</p>
              ) : null}
            </>
          ) : null}
        </Card>
      </div>
    </AppShell>
  );
}
