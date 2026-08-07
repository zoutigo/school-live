"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AppShell } from "../../components/layout/app-shell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { BackButton, SubmitButton } from "../../components/ui/form-buttons";
import {
  FormRadio,
  FormSelect,
  FormSubmitHint,
  FormTextInput,
} from "../../components/ui/form-controls";
import { FormField } from "../../components/ui/form-field";
import { ModuleHelpTab } from "../../components/ui/module-help-tab";
import { getCsrfTokenCookie } from "../../lib/auth-cookies";
import { extractAvailableRoles, type Role } from "../../lib/role-view";
import { LanguageSwitcher } from "../../i18n/LanguageSwitcher";
import { useTranslation } from "../../i18n/useTranslation";
import { OnboardingTarget } from "../../components/onboarding/onboarding-target";
import { useOnboardingTourStore } from "../../store/onboarding-tour";
import {
  SCHOOL_SETTINGS_TOUR_ID,
  SCHOOL_SETTINGS_TOUR_STEPS,
  SCHOOL_SETTINGS_TOUR_TARGETS,
} from "./school-settings-tour.config";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

const staffFunctionSchema = z.object({
  name: z.string().trim().min(1, "Le nom est obligatoire."),
  description: z.string().trim().optional(),
});

const staffAssignmentSchema = z.object({
  functionId: z.string().min(1, "Selectionnez une fonction."),
  userId: z.string().min(1, "Selectionnez un personnel."),
});

type Tab = "navigation" | "staff" | "levels" | "help" | "language";

type SchoolMembershipRole =
  | "SCHOOL_ADMIN"
  | "SCHOOL_MANAGER"
  | "SUPERVISOR"
  | "SCHOOL_ACCOUNTANT"
  | "SCHOOL_STAFF"
  | "SCHOOL_HEALTH_OFFICER"
  | "TEACHER"
  | "PARENT"
  | "STUDENT";

type MeResponse = {
  role: Role | null;
  activeRole?: Role | null;
  onboardingHelpEnabled?: boolean;
  schoolSlug: string | null;
  activeSchoolId?: string | null;
  schools?: Array<{
    schoolId: string;
    slug: string;
    name: string;
    role: SchoolMembershipRole;
  }>;
  platformRoles: Array<"SUPER_ADMIN" | "ADMIN" | "SALES" | "SUPPORT">;
  memberships: Array<{
    schoolId: string;
    role: SchoolMembershipRole;
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

type AcademicLevelRow = {
  id: string;
  code: string;
  label: string;
  order: number | null;
  isNational: boolean;
  isActivated: boolean;
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
  SCHOOL_HEALTH_OFFICER: "Responsable sante",
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
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("navigation");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [savingSchool, setSavingSchool] = useState(false);
  const [staffFunctions, setStaffFunctions] = useState<StaffFunctionRow[]>([]);
  const [staffAssignments, setStaffAssignments] = useState<
    StaffAssignmentRow[]
  >([]);
  const [staffCandidates, setStaffCandidates] = useState<StaffCandidateRow[]>(
    [],
  );
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [submittingStaff, setSubmittingStaff] = useState(false);
  const [academicLevels, setAcademicLevels] = useState<AcademicLevelRow[]>([]);
  const [loadingLevels, setLoadingLevels] = useState(false);
  const [togglingLevelId, setTogglingLevelId] = useState<string | null>(null);
  const [levelOrderDrafts, setLevelOrderDrafts] = useState<
    Record<string, string>
  >({});
  const [savingLevelOrderId, setSavingLevelOrderId] = useState<string | null>(
    null,
  );
  const staffFunctionForm = useForm<
    z.input<typeof staffFunctionSchema>,
    unknown,
    z.output<typeof staffFunctionSchema>
  >({
    resolver: zodResolver(staffFunctionSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      description: "",
    },
  });
  const staffAssignmentForm = useForm<
    z.input<typeof staffAssignmentSchema>,
    unknown,
    z.output<typeof staffAssignmentSchema>
  >({
    resolver: zodResolver(staffAssignmentSchema),
    mode: "onChange",
    defaultValues: {
      functionId: "",
      userId: "",
    },
  });

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

      const nextSelectedSchoolId =
        payload.activeSchoolId ?? payload.schools?.[0]?.schoolId ?? null;

      setMe(payload);
      setSelectedRole(nextSelected);
      setSelectedSchoolId(nextSelectedSchoolId);
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
  const canManageLevels =
    Boolean(schoolSlug) &&
    (me?.role === "SCHOOL_ADMIN" ||
      me?.role === "SCHOOL_MANAGER" ||
      me?.role === "ADMIN" ||
      me?.role === "SUPER_ADMIN");

  useEffect(() => {
    if (!schoolSlug || !canReadStaff) {
      return;
    }
    void loadStaffData(schoolSlug);
  }, [schoolSlug, canReadStaff]);

  useEffect(() => {
    if (!schoolSlug || !canManageLevels) {
      return;
    }
    void loadAcademicLevels(schoolSlug);
  }, [schoolSlug, canManageLevels]);

  useEffect(() => {
    if (!canManageLevels || !me?.role) {
      return;
    }
    if (me.onboardingHelpEnabled === false) {
      return;
    }
    const tourStore = useOnboardingTourStore.getState();
    if (
      !tourStore.isCompleted(me.role, SCHOOL_SETTINGS_TOUR_ID) &&
      !tourStore.activeTourId
    ) {
      tourStore.startTour(
        SCHOOL_SETTINGS_TOUR_ID,
        me.role,
        SCHOOL_SETTINGS_TOUR_STEPS,
      );
    }
  }, [canManageLevels, me?.role, me?.onboardingHelpEnabled]);

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

  async function onSaveSchool() {
    if (!selectedSchoolId) {
      setError("Selectionnez une ecole.");
      return;
    }

    setSavingSchool(true);
    setError(null);
    setSuccess(null);
    try {
      const csrfToken = getCsrfTokenCookie();
      if (!csrfToken) {
        setError("Session CSRF invalide. Reconnectez-vous.");
        router.replace("/");
        return;
      }

      const response = await fetch(`${API_URL}/me/active-school`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({ schoolId: selectedSchoolId }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          payload?.message && Array.isArray(payload.message)
            ? payload.message.join(", ")
            : (payload?.message ?? "Impossible d'enregistrer l'ecole active.");
        setError(String(message));
        return;
      }

      const payload = (await response.json()) as MeResponse;
      setMe(payload);
      setSuccess("Ecole active enregistree.");
      if (payload.schoolSlug) {
        router.push(`/schools/${payload.schoolSlug}/dashboard`);
      }
    } catch {
      setError("Impossible d'enregistrer l'ecole active.");
    } finally {
      setSavingSchool(false);
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

      const currentFunctionId = staffAssignmentForm.getValues("functionId");
      if (
        functionsPayload.length > 0 &&
        !functionsPayload.some((entry) => entry.id === currentFunctionId)
      ) {
        staffAssignmentForm.setValue("functionId", functionsPayload[0].id, {
          shouldDirty: false,
          shouldTouch: false,
          shouldValidate: true,
        });
      }

      const currentUserId = staffAssignmentForm.getValues("userId");
      if (
        candidatesPayload.length > 0 &&
        !candidatesPayload.some((entry) => entry.userId === currentUserId)
      ) {
        staffAssignmentForm.setValue("userId", candidatesPayload[0].userId, {
          shouldDirty: false,
          shouldTouch: false,
          shouldValidate: true,
        });
      }
    } finally {
      setLoadingStaff(false);
    }
  }

  async function createStaffFunction(
    values: z.output<typeof staffFunctionSchema>,
  ) {
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
        `${API_URL}/schools/${schoolSlug}/admin/staff-functions`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({
            name: values.name,
            description: values.description || undefined,
          }),
        },
      );

      if (!response.ok) {
        setError("Impossible de creer la fonction.");
        return;
      }

      staffFunctionForm.reset({
        name: "",
        description: "",
      });
      await loadStaffData(schoolSlug);
      setSuccess("Fonction creee.");
    } finally {
      setSubmittingStaff(false);
    }
  }

  async function createStaffAssignment(
    values: z.output<typeof staffAssignmentSchema>,
  ) {
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
        `${API_URL}/schools/${schoolSlug}/admin/staff-assignments`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({
            functionId: values.functionId,
            userId: values.userId,
          }),
        },
      );

      if (!response.ok) {
        setError("Impossible d'affecter ce personnel.");
        return;
      }

      await loadStaffData(schoolSlug);
      staffAssignmentForm.setValue("userId", "", {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: true,
      });
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

  async function loadAcademicLevels(currentSchoolSlug: string) {
    setLoadingLevels(true);
    try {
      const response = await fetch(
        `${API_URL}/schools/${currentSchoolSlug}/admin/academic-levels`,
        { credentials: "include" },
      );
      if (!response.ok) {
        return;
      }
      const rows = (await response.json()) as AcademicLevelRow[];
      setAcademicLevels(rows);
      setLevelOrderDrafts(
        Object.fromEntries(
          rows.map((row) => [
            row.id,
            row.order != null ? String(row.order) : "",
          ]),
        ),
      );
    } finally {
      setLoadingLevels(false);
    }
  }

  async function toggleLevelActivation(level: AcademicLevelRow) {
    if (!schoolSlug || !canManageLevels || !level.isNational) {
      return;
    }
    const nextActivated = !level.isActivated;
    setTogglingLevelId(level.id);
    setError(null);
    try {
      const csrfToken = getCsrfTokenCookie();
      if (!csrfToken) {
        setError("Session CSRF invalide. Reconnectez-vous.");
        return;
      }
      const response = await fetch(
        `${API_URL}/schools/${schoolSlug}/admin/academic-levels/${level.id}/activation`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({ activated: nextActivated }),
        },
      );
      if (!response.ok) {
        setError("Impossible de modifier l'activation de ce niveau.");
        return;
      }
      setAcademicLevels((current) =>
        current.map((entry) =>
          entry.id === level.id
            ? { ...entry, isActivated: nextActivated }
            : entry,
        ),
      );
      setSuccess("Modification enregistree.");
    } finally {
      setTogglingLevelId(null);
    }
  }

  async function saveLevelOrder(level: AcademicLevelRow) {
    if (!schoolSlug || !canManageLevels || level.isNational) {
      return;
    }
    const draft = levelOrderDrafts[level.id] ?? "";
    const parsed = draft.trim() === "" ? null : Number(draft);
    if (parsed !== null && (!Number.isInteger(parsed) || parsed < 0)) {
      setError("L'ordre doit etre un nombre entier positif.");
      return;
    }
    setSavingLevelOrderId(level.id);
    setError(null);
    try {
      const csrfToken = getCsrfTokenCookie();
      if (!csrfToken) {
        setError("Session CSRF invalide. Reconnectez-vous.");
        return;
      }
      const response = await fetch(
        `${API_URL}/schools/${schoolSlug}/admin/academic-levels/${level.id}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({ order: parsed ?? undefined }),
        },
      );
      if (!response.ok) {
        setError("Impossible d'enregistrer l'ordre.");
        return;
      }
      setAcademicLevels((current) =>
        current.map((entry) =>
          entry.id === level.id ? { ...entry, order: parsed } : entry,
        ),
      );
      setSuccess("Modification enregistree.");
    } finally {
      setSavingLevelOrderId(null);
    }
  }

  const orderedAcademicLevels = useMemo(
    () =>
      [...academicLevels].sort((a, b) => {
        if (a.order == null && b.order == null)
          return a.code.localeCompare(b.code);
        if (a.order == null) return 1;
        if (b.order == null) return -1;
        return a.order - b.order;
      }),
    [academicLevels],
  );

  return (
    <AppShell
      schoolSlug={schoolSlug}
      schoolName={schoolSlug ? `Etablissement (${schoolSlug})` : "Plateforme"}
    >
      <div className="grid gap-4">
        <Card title={t("settings.title")} subtitle={t("settings.subtitle")}>
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
              {t("settings.tab.navigation")}
            </button>
            <button
              type="button"
              onClick={() => setTab("language")}
              className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                tab === "language"
                  ? "border border-border border-b-surface bg-surface text-primary"
                  : "text-text-secondary"
              }`}
            >
              {t("settings.tab.language")}
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
              {t("settings.tab.help")}
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
                {t("settings.tab.staff")}
              </button>
            ) : null}
            {canManageLevels ? (
              <OnboardingTarget id={SCHOOL_SETTINGS_TOUR_TARGETS.levelsTab}>
                <button
                  type="button"
                  onClick={() => setTab("levels")}
                  className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                    tab === "levels"
                      ? "border border-border border-b-surface bg-surface text-primary"
                      : "text-text-secondary"
                  }`}
                  data-testid="settings-tab-levels"
                >
                  {t("settings.tab.levels")}
                </button>
              </OnboardingTarget>
            ) : null}
          </div>

          {tab === "navigation" ? (
            loading ? (
              <p className="text-sm text-text-secondary">Chargement...</p>
            ) : (
              <div className="grid gap-4">
                {(me?.schools?.length ?? 0) > 1 ? (
                  <div className="grid gap-2 rounded-card border border-border bg-surface p-3">
                    <h3 className="text-sm font-semibold text-text-primary">
                      Ecole active
                    </h3>
                    <p className="text-sm text-text-secondary">
                      Choisissez l&apos;etablissement qui conditionne les
                      modules et donnees affiches dans l&apos;application.
                    </p>
                    <div className="grid gap-2">
                      {(me?.schools ?? []).map((school) => (
                        <label
                          key={school.schoolId}
                          className={`flex cursor-pointer items-center justify-between rounded-card border px-3 py-2 text-sm ${
                            selectedSchoolId === school.schoolId
                              ? "border-primary bg-primary/5"
                              : "border-border bg-background"
                          }`}
                        >
                          <span className="font-medium text-text-primary">
                            {school.name}{" "}
                            <span className="text-text-secondary">
                              ({ROLE_LABEL[school.role]})
                            </span>
                          </span>
                          <FormRadio
                            name="activeSchool"
                            value={school.schoolId}
                            checked={selectedSchoolId === school.schoolId}
                            onChange={() =>
                              setSelectedSchoolId(school.schoolId)
                            }
                          />
                        </label>
                      ))}
                    </div>
                    <div>
                      <Button
                        type="button"
                        onClick={() => {
                          void onSaveSchool();
                        }}
                        disabled={
                          savingSchool ||
                          !selectedSchoolId ||
                          selectedSchoolId === (me?.activeSchoolId ?? null)
                        }
                      >
                        {savingSchool ? "Enregistrement..." : "Changer d'ecole"}
                      </Button>
                    </div>
                  </div>
                ) : null}

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
                        <FormRadio
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
                  <BackButton onClick={() => router.push("/account")}>
                    Retour compte
                  </BackButton>
                </div>
              </div>
            )
          ) : tab === "language" ? (
            <div className="grid gap-4">
              <div>
                <h3 className="text-sm font-semibold text-text-primary">
                  {t("settings.language.title")}
                </h3>
                <p className="text-sm text-text-secondary">
                  {t("settings.language.subtitle")}
                </p>
              </div>
              <LanguageSwitcher />
              <p className="text-sm text-text-secondary">
                {t("settings.language.hint")}
              </p>
            </div>
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
                    <form
                      className="grid gap-2 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)_auto]"
                      onSubmit={staffFunctionForm.handleSubmit(
                        createStaffFunction,
                      )}
                      noValidate
                    >
                      <FormField
                        label="Fonction"
                        htmlFor="staff-function-name"
                        error={staffFunctionForm.formState.errors.name?.message}
                      >
                        <FormTextInput
                          id="staff-function-name"
                          invalid={!!staffFunctionForm.formState.errors.name}
                          value={staffFunctionForm.watch("name")}
                          onChange={(event) =>
                            staffFunctionForm.setValue(
                              "name",
                              event.target.value,
                              {
                                shouldDirty: true,
                                shouldTouch: true,
                                shouldValidate: true,
                              },
                            )
                          }
                          placeholder="Ex: Vie scolaire"
                          className="h-10 bg-background text-sm"
                        />
                      </FormField>
                      <FormField
                        label="Description"
                        htmlFor="staff-function-description"
                      >
                        <FormTextInput
                          id="staff-function-description"
                          value={staffFunctionForm.watch("description") ?? ""}
                          onChange={(event) =>
                            staffFunctionForm.setValue(
                              "description",
                              event.target.value,
                              {
                                shouldDirty: true,
                                shouldTouch: true,
                                shouldValidate: true,
                              },
                            )
                          }
                          placeholder="Description (optionnelle)"
                          className="h-10 bg-background text-sm"
                        />
                      </FormField>
                      <div className="flex items-end">
                        <div className="grid gap-2">
                          <FormSubmitHint
                            visible={!staffFunctionForm.formState.isValid}
                          />
                          <SubmitButton
                            disabled={
                              submittingStaff ||
                              !staffFunctionForm.formState.isValid
                            }
                          >
                            Ajouter
                          </SubmitButton>
                        </div>
                      </div>
                    </form>
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
                    <form
                      className="grid gap-2 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)_auto]"
                      onSubmit={staffAssignmentForm.handleSubmit(
                        createStaffAssignment,
                      )}
                      noValidate
                    >
                      <FormField
                        label="Fonction"
                        htmlFor="staff-assignment-function"
                        error={
                          staffAssignmentForm.formState.errors.functionId
                            ?.message
                        }
                      >
                        <FormSelect
                          id="staff-assignment-function"
                          invalid={
                            !!staffAssignmentForm.formState.errors.functionId
                          }
                          value={staffAssignmentForm.watch("functionId")}
                          onChange={(event) =>
                            staffAssignmentForm.setValue(
                              "functionId",
                              event.target.value,
                              {
                                shouldDirty: true,
                                shouldTouch: true,
                                shouldValidate: true,
                              },
                            )
                          }
                          className="h-10 bg-background text-sm"
                        >
                          <option value="">Choisir une fonction</option>
                          {staffFunctions.map((entry) => (
                            <option key={entry.id} value={entry.id}>
                              {entry.name}
                            </option>
                          ))}
                        </FormSelect>
                      </FormField>
                      <FormField
                        label="Personnel"
                        htmlFor="staff-assignment-user"
                        error={
                          staffAssignmentForm.formState.errors.userId?.message
                        }
                      >
                        <FormSelect
                          id="staff-assignment-user"
                          invalid={
                            !!staffAssignmentForm.formState.errors.userId
                          }
                          value={staffAssignmentForm.watch("userId")}
                          onChange={(event) =>
                            staffAssignmentForm.setValue(
                              "userId",
                              event.target.value,
                              {
                                shouldDirty: true,
                                shouldTouch: true,
                                shouldValidate: true,
                              },
                            )
                          }
                          className="h-10 bg-background text-sm"
                        >
                          <option value="">Choisir un personnel</option>
                          {staffCandidates.map((entry) => (
                            <option key={entry.userId} value={entry.userId}>
                              {entry.lastName} {entry.firstName} ({entry.role})
                            </option>
                          ))}
                        </FormSelect>
                      </FormField>
                      <div className="flex items-end">
                        <div className="grid gap-2">
                          <FormSubmitHint
                            visible={!staffAssignmentForm.formState.isValid}
                          />
                          <SubmitButton
                            disabled={
                              submittingStaff ||
                              !staffAssignmentForm.formState.isValid
                            }
                          >
                            Affecter
                          </SubmitButton>
                        </div>
                      </div>
                    </form>
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
          ) : tab === "levels" ? (
            !canManageLevels ? (
              <p className="text-sm text-text-secondary">
                Gestion des niveaux indisponible pour ce role.
              </p>
            ) : loadingLevels ? (
              <p className="text-sm text-text-secondary">Chargement...</p>
            ) : (
              <div className="grid gap-4" data-testid="settings-levels-panel">
                {error ? (
                  <p className="text-sm text-notification">{error}</p>
                ) : null}
                {success ? (
                  <p className="text-sm text-primary-dark">{success}</p>
                ) : null}
                <p className="text-sm text-text-secondary">
                  {t("schoolSettings.levels.intro")}
                </p>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-left text-text-secondary">
                      <tr>
                        <th className="px-2 py-2">Niveau</th>
                        <th className="px-2 py-2">Type</th>
                        <th className="px-2 py-2">Ordre</th>
                        <th className="px-2 py-2">Actif</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderedAcademicLevels.map((level, index) => (
                        <tr
                          key={level.id}
                          className={index % 2 === 0 ? "bg-background/60" : ""}
                          data-testid={`settings-level-row-${level.id}`}
                        >
                          <td className="px-2 py-2 font-medium text-text-primary">
                            {index === 0 ? (
                              <OnboardingTarget
                                id={SCHOOL_SETTINGS_TOUR_TARGETS.firstRow}
                                className="inline"
                              >
                                {level.label}{" "}
                                <span className="text-text-secondary">
                                  ({level.code})
                                </span>
                              </OnboardingTarget>
                            ) : (
                              <>
                                {level.label}{" "}
                                <span className="text-text-secondary">
                                  ({level.code})
                                </span>
                              </>
                            )}
                          </td>
                          <td className="px-2 py-2 text-text-secondary">
                            {level.isNational
                              ? t("schoolSettings.levels.national")
                              : t("schoolSettings.levels.own")}
                          </td>
                          <td className="px-2 py-2">
                            {level.isNational ? (
                              <span className="text-text-secondary">
                                {level.order ?? "—"}
                              </span>
                            ) : (
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={0}
                                  className="h-9 w-20 rounded-card border border-border bg-background px-2 text-sm"
                                  value={levelOrderDrafts[level.id] ?? ""}
                                  onChange={(event) =>
                                    setLevelOrderDrafts((current) => ({
                                      ...current,
                                      [level.id]: event.target.value,
                                    }))
                                  }
                                  data-testid={`settings-level-row-${level.id}-order-input`}
                                />
                                <button
                                  type="button"
                                  className="rounded-card border border-border px-2 py-1 text-xs text-primary transition hover:bg-primary/10 disabled:opacity-50"
                                  disabled={savingLevelOrderId === level.id}
                                  onClick={() => void saveLevelOrder(level)}
                                  data-testid={`settings-level-row-${level.id}-order-save`}
                                >
                                  {t("common.save")}
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="px-2 py-2">
                            {level.isNational ? (
                              <label className="inline-flex cursor-pointer items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={level.isActivated}
                                  disabled={togglingLevelId === level.id}
                                  onChange={() =>
                                    void toggleLevelActivation(level)
                                  }
                                  data-testid={`settings-level-row-${level.id}-toggle`}
                                />
                              </label>
                            ) : (
                              <span className="text-xs font-semibold uppercase text-accent-teal-dark">
                                {t("schoolSettings.levels.alwaysActive")}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {orderedAcademicLevels.length === 0 ? (
                        <tr>
                          <td
                            className="px-2 py-3 text-text-secondary"
                            colSpan={4}
                          >
                            {t("schoolSettings.levels.empty.message")}
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
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
                ...(canManageLevels
                  ? [
                      {
                        name: "Activer les niveaux de l'ecole (onglet Niveaux)",
                        purpose:
                          "Ne proposer, comme cible de decision de passage, que les niveaux academiques reellement utilises par votre ecole plutot que tout le catalogue national.",
                        howTo:
                          "Dans l'onglet Niveaux, cochez les niveaux nationaux utilises par votre ecole. Les niveaux propres a l'ecole sont toujours actifs. Renseignez l'ordre sur vos niveaux propres pour piloter la suggestion automatique du niveau suivant.",
                        moduleImpact:
                          "L'onglet Decision de Notes ne propose plus que les niveaux actives, tries par cet ordre, et suggere automatiquement le niveau cible pour une decision Promu ou Redouble.",
                        crossModuleImpact:
                          "Utile avant tout conseil de classe de fin d'annee pour eviter des erreurs de niveau cible.",
                      },
                    ]
                  : []),
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
