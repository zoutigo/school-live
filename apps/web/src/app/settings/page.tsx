"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "../../components/layout/app-shell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { ModuleHelpTab } from "../../components/ui/module-help-tab";
import { getCsrfTokenCookie } from "../../lib/auth-cookies";
import { extractAvailableRoles, type Role } from "../../lib/role-view";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type Tab = "navigation" | "staff" | "help";

type MeResponse = {
  role: Role | null;
  activeRole?: Role | null;
  schoolSlug: string | null;
  platformRoles: Array<"SUPER_ADMIN" | "ADMIN" | "SALES" | "SUPPORT">;
  memberships: Array<{
    schoolId: string;
    role:
      | "SCHOOL_ADMIN"
      | "SCHOOL_MANAGER"
      | "SUPERVISOR"
      | "SCHOOL_ACCOUNTANT"
      | "SCHOOL_STAFF"
      | "TEACHER"
      | "PARENT"
      | "STUDENT";
  }>;
};

type StaffFunctionRow = {
  id: string;
  name: string;
  description: string | null;
  _count?: { assignments: number };
};

type StaffAssignmentRow = {
  id: string;
  createdAt: string;
  function: {
    id: string;
    name: string;
    description: string | null;
  };
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
};

type StaffCandidateRow = {
  userId: string;
  role: string;
  firstName: string;
  lastName: string;
  email: string;
};

const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: "Super administrateur plateforme",
  ADMIN: "Administrateur plateforme",
  SALES: "Commercial plateforme",
  SUPPORT: "Support plateforme",
  SCHOOL_ADMIN: "Administrateur d'etablissement",
  SCHOOL_MANAGER: "Gestionnaire d'etablissement",
  SUPERVISOR: "Superviseur discipline",
  SCHOOL_ACCOUNTANT: "Comptable d'etablissement",
  SCHOOL_STAFF: "Personnel scolaire",
  TEACHER: "Enseignant",
  PARENT: "Parent",
  STUDENT: "Eleve",
};

function getHomeRoute(role: Role, schoolSlug: string | null): string {
  if (
    role === "SUPER_ADMIN" ||
    role === "ADMIN" ||
    role === "SALES" ||
    role === "SUPPORT"
  ) {
    return "/acceuil";
  }

  if (schoolSlug) {
    return `/schools/${schoolSlug}/dashboard`;
  }

  return "/account";
}

export default function SettingsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("navigation");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [staffFunctions, setStaffFunctions] = useState<StaffFunctionRow[]>([]);
  const [staffAssignments, setStaffAssignments] = useState<
    StaffAssignmentRow[]
  >([]);
  const [staffCandidates, setStaffCandidates] = useState<StaffCandidateRow[]>(
    [],
  );
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [submittingStaff, setSubmittingStaff] = useState(false);
  const [newFunctionName, setNewFunctionName] = useState("");
  const [newFunctionDescription, setNewFunctionDescription] = useState("");
  const [selectedFunctionId, setSelectedFunctionId] = useState("");
  const [selectedCandidateId, setSelectedCandidateId] = useState("");

  useEffect(() => {
    void bootstrap();
  }, []);

  async function bootstrap() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/me`, {
        credentials: "include",
      });

      if (!response.ok) {
        router.replace("/");
        return;
      }

      const payload = (await response.json()) as MeResponse;
      const availableRoles = extractAvailableRoles(payload);
      const nextSelected =
        payload.activeRole && availableRoles.includes(payload.activeRole)
          ? payload.activeRole
          : (payload.role ?? availableRoles[0] ?? null);

      setMe(payload);
      setSelectedRole(nextSelected);
    } catch {
      setError("Impossible de charger vos parametres.");
    } finally {
      setLoading(false);
    }
  }

  const availableRoles = useMemo(() => extractAvailableRoles(me), [me]);
  const schoolSlug = me?.schoolSlug ?? null;
  const canReadStaff =
    Boolean(schoolSlug) &&
    (me?.role === "SCHOOL_ADMIN" ||
      me?.role === "SCHOOL_MANAGER" ||
      me?.role === "SUPERVISOR" ||
      me?.role === "ADMIN" ||
      me?.role === "SUPER_ADMIN");
  const canWriteStaff =
    Boolean(schoolSlug) &&
    (me?.role === "SCHOOL_ADMIN" ||
      me?.role === "ADMIN" ||
      me?.role === "SUPER_ADMIN");

  useEffect(() => {
    if (!schoolSlug || !canReadStaff) {
      return;
    }
    void loadStaffData(schoolSlug);
  }, [schoolSlug, canReadStaff]);

  async function onSaveNavigation() {
    if (!selectedRole) {
      setError("Selectionnez un role.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const csrfToken = getCsrfTokenCookie();
      if (!csrfToken) {
        setError("Session CSRF invalide. Reconnectez-vous.");
        router.replace("/");
        return;
      }

      const response = await fetch(`${API_URL}/me/active-role`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({ role: selectedRole }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          payload?.message && Array.isArray(payload.message)
            ? payload.message.join(", ")
            : (payload?.message ?? "Impossible d'enregistrer le role actif.");
        setError(String(message));
        return;
      }

      setSuccess("Role actif enregistre.");
      router.push(getHomeRoute(selectedRole, schoolSlug));
    } catch {
      setError("Impossible d'enregistrer le role actif.");
    } finally {
      setSaving(false);
    }
  }

  async function loadStaffData(currentSchoolSlug: string) {
    setLoadingStaff(true);
    try {
      const [functionsResponse, assignmentsResponse, candidatesResponse] =
        await Promise.all([
          fetch(
            `${API_URL}/schools/${currentSchoolSlug}/admin/staff-functions`,
            {
              credentials: "include",
            },
          ),
          fetch(
            `${API_URL}/schools/${currentSchoolSlug}/admin/staff-assignments`,
            {
              credentials: "include",
            },
          ),
          fetch(
            `${API_URL}/schools/${currentSchoolSlug}/admin/staff-candidates`,
            {
              credentials: "include",
            },
          ),
        ]);

      if (
        !functionsResponse.ok ||
        !assignmentsResponse.ok ||
        !candidatesResponse.ok
      ) {
        return;
      }

      const functionsPayload =
        (await functionsResponse.json()) as StaffFunctionRow[];
      const assignmentsPayload =
        (await assignmentsResponse.json()) as StaffAssignmentRow[];
      const candidatesPayload =
        (await candidatesResponse.json()) as StaffCandidateRow[];

      setStaffFunctions(functionsPayload);
      setStaffAssignments(assignmentsPayload);
      setStaffCandidates(candidatesPayload);
      if (!selectedFunctionId && functionsPayload.length > 0) {
        setSelectedFunctionId(functionsPayload[0].id);
      }
      if (!selectedCandidateId && candidatesPayload.length > 0) {
        setSelectedCandidateId(candidatesPayload[0].userId);
      }
    } finally {
      setLoadingStaff(false);
    }
  }

  async function createStaffFunction() {
    if (!schoolSlug || !canWriteStaff || !newFunctionName.trim()) {
      return;
    }

    setSubmittingStaff(true);
    setError(null);
    try {
      const csrfToken = getCsrfTokenCookie();
      if (!csrfToken) {
        setError("Session CSRF invalide. Reconnectez-vous.");
        return;
      }

      const response = await fetch(
        `${API_URL}/schools/${schoolSlug}/admin/staff-functions`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({
            name: newFunctionName.trim(),
            description: newFunctionDescription.trim() || undefined,
          }),
        },
      );

      if (!response.ok) {
        setError("Impossible de creer la fonction.");
        return;
      }

      setNewFunctionName("");
      setNewFunctionDescription("");
      await loadStaffData(schoolSlug);
      setSuccess("Fonction creee.");
    } finally {
      setSubmittingStaff(false);
    }
  }

  async function createStaffAssignment() {
    if (
      !schoolSlug ||
      !canWriteStaff ||
      !selectedFunctionId ||
      !selectedCandidateId
    ) {
      return;
    }

    setSubmittingStaff(true);
    setError(null);
    try {
      const csrfToken = getCsrfTokenCookie();
      if (!csrfToken) {
        setError("Session CSRF invalide. Reconnectez-vous.");
        return;
      }

      const response = await fetch(
        `${API_URL}/schools/${schoolSlug}/admin/staff-assignments`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({
            functionId: selectedFunctionId,
            userId: selectedCandidateId,
          }),
        },
      );

      if (!response.ok) {
        setError("Impossible d'affecter ce personnel.");
        return;
      }

      await loadStaffData(schoolSlug);
      setSuccess("Affectation enregistree.");
    } finally {
      setSubmittingStaff(false);
    }
  }

  async function deleteStaffAssignment(assignmentId: string) {
    if (!schoolSlug || !canWriteStaff) {
      return;
    }
    setSubmittingStaff(true);
    setError(null);
    try {
      const csrfToken = getCsrfTokenCookie();
      if (!csrfToken) {
        setError("Session CSRF invalide. Reconnectez-vous.");
        return;
      }
      const response = await fetch(
        `${API_URL}/schools/${schoolSlug}/admin/staff-assignments/${assignmentId}`,
        {
          method: "DELETE",
          credentials: "include",
          headers: {
            "X-CSRF-Token": csrfToken,
          },
        },
      );
      if (!response.ok) {
        setError("Suppression impossible.");
        return;
      }
      await loadStaffData(schoolSlug);
      setSuccess("Affectation supprimee.");
    } finally {
      setSubmittingStaff(false);
    }
  }

  return (
    <AppShell
      schoolSlug={schoolSlug}
      schoolName={schoolSlug ? `Etablissement (${schoolSlug})` : "Plateforme"}
    >
      <div className="grid gap-4">
        <Card title="Parametres" subtitle="Preferences de navigation">
          <div className="mb-4 flex items-end gap-2 border-b border-border">
            <button
              type="button"
              onClick={() => setTab("navigation")}
              className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                tab === "navigation"
                  ? "border border-border border-b-surface bg-surface text-primary"
                  : "text-text-secondary"
              }`}
            >
              Navigation
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
            {canReadStaff ? (
              <button
                type="button"
                onClick={() => setTab("staff")}
                className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                  tab === "staff"
                    ? "border border-border border-b-surface bg-surface text-primary"
                    : "text-text-secondary"
                }`}
              >
                Personnel
              </button>
            ) : null}
          </div>

          {tab === "navigation" ? (
            loading ? (
              <p className="text-sm text-text-secondary">Chargement...</p>
            ) : (
              <div className="grid gap-4">
                <p className="text-sm text-text-secondary">
                  Choisissez le role actif pour afficher une seule vue a la fois
                  dans le menu.
                </p>

                {availableRoles.length === 0 ? (
                  <p className="rounded-card border border-border bg-background px-3 py-2 text-sm text-text-secondary">
                    Aucun role disponible.
                  </p>
                ) : (
                  <div className="grid gap-2">
                    {availableRoles.map((role) => (
                      <label
                        key={role}
                        className={`flex cursor-pointer items-center justify-between rounded-card border px-3 py-2 text-sm ${
                          selectedRole === role
                            ? "border-primary bg-primary/5"
                            : "border-border bg-surface"
                        }`}
                      >
                        <span className="font-medium text-text-primary">
                          {ROLE_LABEL[role]}
                        </span>
                        <input
                          type="radio"
                          name="activeRole"
                          value={role}
                          checked={selectedRole === role}
                          onChange={() => setSelectedRole(role)}
                        />
                      </label>
                    ))}
                  </div>
                )}

                {error ? (
                  <p className="text-sm text-notification">{error}</p>
                ) : null}
                {success ? (
                  <p className="text-sm text-primary-dark">{success}</p>
                ) : null}

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={() => {
                      void onSaveNavigation();
                    }}
                    disabled={
                      saving ||
                      !selectedRole ||
                      selectedRole === (me?.activeRole ?? me?.role ?? null)
                    }
                  >
                    {saving ? "Enregistrement..." : "Appliquer ce role"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => router.push("/account")}
                  >
                    Retour compte
                  </Button>
                </div>
              </div>
            )
          ) : tab === "staff" ? (
            !canReadStaff ? (
              <p className="text-sm text-text-secondary">
                Gestion du personnel indisponible pour ce role.
              </p>
            ) : loadingStaff ? (
              <p className="text-sm text-text-secondary">Chargement...</p>
            ) : (
              <div className="grid gap-4">
                {error ? (
                  <p className="text-sm text-notification">{error}</p>
                ) : null}
                {success ? (
                  <p className="text-sm text-primary-dark">{success}</p>
                ) : null}
                <div className="grid gap-3 rounded-card border border-border bg-surface p-3">
                  <h3 className="text-sm font-semibold text-text-primary">
                    Fonctions du personnel
                  </h3>
                  {canWriteStaff ? (
                    <div className="grid gap-2 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)_auto]">
                      <input
                        value={newFunctionName}
                        onChange={(event) =>
                          setNewFunctionName(event.target.value)
                        }
                        placeholder="Ex: Vie scolaire"
                        className="h-10 rounded-card border border-border bg-background px-3 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                      <input
                        value={newFunctionDescription}
                        onChange={(event) =>
                          setNewFunctionDescription(event.target.value)
                        }
                        placeholder="Description (optionnelle)"
                        className="h-10 rounded-card border border-border bg-background px-3 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                      <Button
                        type="button"
                        disabled={submittingStaff || !newFunctionName.trim()}
                        onClick={() => {
                          void createStaffFunction();
                        }}
                      >
                        Ajouter
                      </Button>
                    </div>
                  ) : null}

                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="text-left text-text-secondary">
                        <tr>
                          <th className="px-2 py-2">Fonction</th>
                          <th className="px-2 py-2">Description</th>
                          <th className="px-2 py-2">Affectations</th>
                        </tr>
                      </thead>
                      <tbody>
                        {staffFunctions.map((entry, index) => (
                          <tr
                            key={entry.id}
                            className={
                              index % 2 === 0 ? "bg-background/60" : ""
                            }
                          >
                            <td className="px-2 py-2 font-medium text-text-primary">
                              {entry.name}
                            </td>
                            <td className="px-2 py-2 text-text-secondary">
                              {entry.description || "-"}
                            </td>
                            <td className="px-2 py-2 text-text-secondary">
                              {entry._count?.assignments ?? 0}
                            </td>
                          </tr>
                        ))}
                        {staffFunctions.length === 0 ? (
                          <tr>
                            <td
                              className="px-2 py-3 text-text-secondary"
                              colSpan={3}
                            >
                              Aucune fonction definie.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="grid gap-3 rounded-card border border-border bg-surface p-3">
                  <h3 className="text-sm font-semibold text-text-primary">
                    Affectations
                  </h3>
                  {canWriteStaff ? (
                    <div className="grid gap-2 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)_auto]">
                      <select
                        value={selectedFunctionId}
                        onChange={(event) =>
                          setSelectedFunctionId(event.target.value)
                        }
                        className="h-10 rounded-card border border-border bg-background px-3 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="">Choisir une fonction</option>
                        {staffFunctions.map((entry) => (
                          <option key={entry.id} value={entry.id}>
                            {entry.name}
                          </option>
                        ))}
                      </select>
                      <select
                        value={selectedCandidateId}
                        onChange={(event) =>
                          setSelectedCandidateId(event.target.value)
                        }
                        className="h-10 rounded-card border border-border bg-background px-3 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="">Choisir un personnel</option>
                        {staffCandidates.map((entry) => (
                          <option key={entry.userId} value={entry.userId}>
                            {entry.lastName} {entry.firstName} ({entry.role})
                          </option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        disabled={
                          submittingStaff ||
                          !selectedFunctionId ||
                          !selectedCandidateId
                        }
                        onClick={() => {
                          void createStaffAssignment();
                        }}
                      >
                        Affecter
                      </Button>
                    </div>
                  ) : null}

                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="text-left text-text-secondary">
                        <tr>
                          <th className="px-2 py-2">Personnel</th>
                          <th className="px-2 py-2">Fonction</th>
                          <th className="px-2 py-2">Email</th>
                          <th className="px-2 py-2">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {staffAssignments.map((entry, index) => (
                          <tr
                            key={entry.id}
                            className={
                              index % 2 === 0 ? "bg-background/60" : ""
                            }
                          >
                            <td className="px-2 py-2 text-text-primary">
                              {entry.user.lastName} {entry.user.firstName}
                            </td>
                            <td className="px-2 py-2 text-text-secondary">
                              {entry.function.name}
                            </td>
                            <td className="px-2 py-2 text-text-secondary">
                              {entry.user.email}
                            </td>
                            <td className="px-2 py-2">
                              {canWriteStaff ? (
                                <button
                                  type="button"
                                  className="rounded-card border border-notification/40 px-2 py-1 text-xs text-notification transition hover:bg-notification/10"
                                  onClick={() => {
                                    void deleteStaffAssignment(entry.id);
                                  }}
                                >
                                  Retirer
                                </button>
                              ) : (
                                <span className="text-text-secondary">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                        {staffAssignments.length === 0 ? (
                          <tr>
                            <td
                              className="px-2 py-3 text-text-secondary"
                              colSpan={4}
                            >
                              Aucune affectation.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )
          ) : (
            <ModuleHelpTab
              moduleName="Parametres de navigation"
              moduleSummary="Ce module permet de definir votre role actif pour n'afficher qu'une seule vue a la fois dans l'application."
              actions={[
                {
                  name: "Choisir un role actif",
                  purpose:
                    "Afficher une navigation coherente avec votre contexte de travail actuel.",
                  howTo:
                    "Selectionnez un role dans la liste puis cliquez sur Appliquer ce role.",
                  moduleImpact:
                    "Le menu lateral et le portail dans le header se mettent a jour sur ce role.",
                  crossModuleImpact:
                    "Le changement simplifie vos deplacements vers les modules associes a ce role.",
                },
              ]}
              tips={[
                "La preference est enregistree localement sur ce navigateur.",
                "Vous pouvez modifier ce role a tout moment depuis Parametres.",
              ]}
            />
          )}
        </Card>
      </div>
    </AppShell>
  );
}
