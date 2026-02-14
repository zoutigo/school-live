"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "../../components/layout/app-shell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
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
type Tab = "manage" | "help";

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
  };
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

  const [schoolYearFilter, setSchoolYearFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [bulkStatus, setBulkStatus] = useState<
    "ACTIVE" | "TRANSFERRED" | "WITHDRAWN" | "GRADUATED"
  >("ACTIVE");
  const [statusDraftByEnrollmentId, setStatusDraftByEnrollmentId] = useState<
    Record<string, "ACTIVE" | "TRANSFERRED" | "WITHDRAWN" | "GRADUATED">
  >({});

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

  async function loadData(currentSchoolSlug: string) {
    setLoadingData(true);
    setError(null);
    setSuccess(null);
    setSelectedEnrollmentIds([]);
    setStatusDraftByEnrollmentId({});
    try {
      const params = new URLSearchParams();
      if (schoolYearFilter) {
        params.set("schoolYearId", schoolYearFilter);
      }
      if (classFilter) {
        params.set("classId", classFilter);
      }
      if (statusFilter) {
        params.set("status", statusFilter);
      }
      if (searchFilter.trim()) {
        params.set("search", searchFilter.trim());
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
      const studentsPayload =
        (await studentsResponse.json()) as StudentEnrollmentRow[];

      setSchoolYears(schoolYearsPayload);
      setClassrooms(classroomsPayload);
      setStudents(studentsPayload);

      if (!schoolYearFilter && schoolYearsPayload.length > 0) {
        const active = schoolYearsPayload.find((entry) => entry.isActive);
        setSchoolYearFilter(active?.id ?? "");
      }
    } catch {
      setError("Erreur reseau.");
    } finally {
      setLoadingData(false);
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

  async function onApplyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
            status: bulkStatus,
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
          !schoolYearFilter || entry.schoolYear.id === schoolYearFilter,
      ),
    [classrooms, schoolYearFilter],
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

          {tab === "manage" ? (
            <>
              {role === "SUPER_ADMIN" || role === "ADMIN" ? (
                <label className="mb-4 grid min-w-[260px] max-w-[420px] gap-1 text-sm">
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

              {!schoolSlug ? (
                <p className="text-sm text-text-secondary">
                  Selectionnez une ecole.
                </p>
              ) : (
                <>
                  <form
                    className="mb-4 grid gap-3 md:grid-cols-5"
                    onSubmit={onApplyFilters}
                  >
                    <label className="grid gap-1 text-sm">
                      <span className="text-text-secondary">
                        Annee scolaire
                      </span>
                      <select
                        value={schoolYearFilter}
                        onChange={(event) => {
                          setSchoolYearFilter(event.target.value);
                          setClassFilter("");
                        }}
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

                    <label className="grid gap-1 text-sm">
                      <span className="text-text-secondary">Classe</span>
                      <select
                        value={classFilter}
                        onChange={(event) => setClassFilter(event.target.value)}
                        className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">Toutes</option>
                        {filteredClassrooms.map((entry) => (
                          <option key={entry.id} value={entry.id}>
                            {entry.name} ({entry.schoolYear.label})
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-1 text-sm">
                      <span className="text-text-secondary">Statut</span>
                      <select
                        value={statusFilter}
                        onChange={(event) =>
                          setStatusFilter(event.target.value)
                        }
                        className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">Tous</option>
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="TRANSFERRED">TRANSFERRED</option>
                        <option value="WITHDRAWN">WITHDRAWN</option>
                        <option value="GRADUATED">GRADUATED</option>
                      </select>
                    </label>

                    <label className="grid gap-1 text-sm md:col-span-2">
                      <span className="text-text-secondary">
                        Recherche eleve
                      </span>
                      <div className="flex gap-2">
                        <input
                          value={searchFilter}
                          onChange={(event) =>
                            setSearchFilter(event.target.value)
                          }
                          placeholder="Nom ou prenom"
                          className="w-full rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                        />
                        <Button type="submit" disabled={loadingData}>
                          Filtrer
                        </Button>
                      </div>
                    </label>
                  </form>

                  <div className="mb-3 flex flex-wrap items-end gap-2 rounded-card border border-border bg-background p-3">
                    <label className="grid gap-1 text-sm">
                      <span className="text-text-secondary">
                        Statut cible (selection)
                      </span>
                      <select
                        value={bulkStatus}
                        onChange={(event) =>
                          setBulkStatus(
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
                                <input
                                  type="checkbox"
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
                                {row.enrollment.class.name}
                              </td>
                              <td className="px-3 py-2">
                                <select
                                  value={
                                    statusDraftByEnrollmentId[
                                      row.enrollment.id
                                    ] ?? row.enrollment.status
                                  }
                                  onChange={(event) =>
                                    setStatusDraftByEnrollmentId((current) => ({
                                      ...current,
                                      [row.enrollment.id]: event.target
                                        .value as
                                        | "ACTIVE"
                                        | "TRANSFERRED"
                                        | "WITHDRAWN"
                                        | "GRADUATED",
                                    }))
                                  }
                                  className="rounded-card border border-border bg-surface px-2 py-1 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                                >
                                  <option value="ACTIVE">ACTIVE</option>
                                  <option value="TRANSFERRED">
                                    TRANSFERRED
                                  </option>
                                  <option value="WITHDRAWN">WITHDRAWN</option>
                                  <option value="GRADUATED">GRADUATED</option>
                                </select>
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
