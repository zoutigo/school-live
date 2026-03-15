"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AppShell } from "../../components/layout/app-shell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import {
  FormCheckbox,
  FormSelect,
  FormTextInput,
} from "../../components/ui/form-controls";
import { FormField } from "../../components/ui/form-field";
import { SubmitButton } from "../../components/ui/form-buttons";
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
      if (filterValues.schoolYearId) {
        params.set("schoolYearId", filterValues.schoolYearId);
      }
      if (filterValues.classId) {
        params.set("classId", filterValues.classId);
      }
      if (filterValues.status) {
        params.set("status", filterValues.status);
      }
      if ((filterValues.search ?? "").trim()) {
        params.set("search", (filterValues.search ?? "").trim());
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

      if (!filterValues.schoolYearId && schoolYearsPayload.length > 0) {
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
                  <FormSelect
                    value={schoolSlug ?? ""}
                    onChange={(event) =>
                      setSchoolSlug(event.target.value || null)
                    }
                  >
                    <option value="">Selectionner une ecole</option>
                    {schools.map((school) => (
                      <option key={school.id} value={school.slug}>
                        {school.name}
                      </option>
                    ))}
                  </FormSelect>
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
                      <FormSelect
                        aria-label="Annee scolaire"
                        value={filterValues.schoolYearId ?? ""}
                        onChange={(event) => {
                          filtersForm.setValue(
                            "schoolYearId",
                            event.target.value,
                            {
                              shouldDirty: true,
                              shouldTouch: true,
                              shouldValidate: true,
                            },
                          );
                          filtersForm.setValue("classId", "", {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                          });
                        }}
                      >
                        <option value="">Toutes</option>
                        {schoolYears.map((entry) => (
                          <option key={entry.id} value={entry.id}>
                            {entry.label}
                            {entry.isActive ? " (active)" : ""}
                          </option>
                        ))}
                      </FormSelect>
                    </FormField>

                    <FormField label="Classe">
                      <FormSelect
                        aria-label="Classe"
                        value={filterValues.classId ?? ""}
                        onChange={(event) =>
                          filtersForm.setValue("classId", event.target.value, {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                          })
                        }
                      >
                        <option value="">Toutes</option>
                        {filteredClassrooms.map((entry) => (
                          <option key={entry.id} value={entry.id}>
                            {entry.name} ({entry.schoolYear.label})
                          </option>
                        ))}
                      </FormSelect>
                    </FormField>

                    <FormField label="Statut">
                      <FormSelect
                        aria-label="Statut"
                        value={filterValues.status ?? ""}
                        onChange={(event) =>
                          filtersForm.setValue("status", event.target.value, {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                          })
                        }
                      >
                        <option value="">Tous</option>
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="TRANSFERRED">TRANSFERRED</option>
                        <option value="WITHDRAWN">WITHDRAWN</option>
                        <option value="GRADUATED">GRADUATED</option>
                      </FormSelect>
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
                      <FormSelect
                        aria-label="Statut cible"
                        value={bulkValues.status}
                        onChange={(event) =>
                          bulkForm.setValue(
                            "status",
                            event.target.value as z.infer<typeof statusSchema>,
                            {
                              shouldDirty: true,
                              shouldTouch: true,
                              shouldValidate: true,
                            },
                          )
                        }
                      >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="TRANSFERRED">TRANSFERRED</option>
                        <option value="WITHDRAWN">WITHDRAWN</option>
                        <option value="GRADUATED">GRADUATED</option>
                      </FormSelect>
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
                                {row.enrollment.class.name}
                              </td>
                              <td className="px-3 py-2">
                                <FormSelect
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
                                  className="px-2 py-1"
                                >
                                  <option value="ACTIVE">ACTIVE</option>
                                  <option value="TRANSFERRED">
                                    TRANSFERRED
                                  </option>
                                  <option value="WITHDRAWN">WITHDRAWN</option>
                                  <option value="GRADUATED">GRADUATED</option>
                                </FormSelect>
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
