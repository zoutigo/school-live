"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "../../components/layout/app-shell";
import { Card } from "../../components/ui/card";
import { getCsrfTokenCookie } from "../../lib/auth-cookies";
import type { Role } from "../../lib/role-view";
import { useTranslation } from "../../i18n/useTranslation";
import { OnboardingTarget } from "../../components/onboarding/onboarding-target";
import { useOnboardingTourStore } from "../../store/onboarding-tour";
import { usePageHelp } from "../../store/page-help";
import {
  SCHOOL_SETTINGS_TOUR_ID,
  SCHOOL_SETTINGS_TOUR_STEPS,
  SCHOOL_SETTINGS_TOUR_TARGETS,
} from "./school-settings-tour.config";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type MeResponse = {
  role: Role | null;
  onboardingHelpEnabled?: boolean;
  schoolSlug: string | null;
};

type AcademicLevelRow = {
  id: string;
  code: string;
  label: string;
  order: number | null;
  isNational: boolean;
  isActivated: boolean;
};

export default function SettingsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [academicLevels, setAcademicLevels] = useState<AcademicLevelRow[]>([]);
  const [loadingLevels, setLoadingLevels] = useState(false);
  const [togglingLevelId, setTogglingLevelId] = useState<string | null>(null);
  const [levelOrderDrafts, setLevelOrderDrafts] = useState<
    Record<string, string>
  >({});
  const [savingLevelOrderId, setSavingLevelOrderId] = useState<string | null>(
    null,
  );

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
      setMe(payload);
    } catch {
      setError("Impossible de charger vos parametres.");
    } finally {
      setLoading(false);
    }
  }

  const schoolSlug = me?.schoolSlug ?? null;
  const canManageLevels =
    Boolean(schoolSlug) &&
    (me?.role === "SCHOOL_ADMIN" ||
      me?.role === "SCHOOL_MANAGER" ||
      me?.role === "ADMIN" ||
      me?.role === "SUPER_ADMIN");

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

  usePageHelp(
    canManageLevels
      ? {
          title: t("schoolSettings.help.title"),
          sections: [
            {
              title: t("schoolSettings.help.section1Title"),
              body: [t("schoolSettings.help.section1Body")],
            },
            {
              title: t("schoolSettings.help.section2Title"),
              body: [t("schoolSettings.help.section2Body")],
            },
          ],
        }
      : null,
  );

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
      setLevelOrderDrafts((current) => ({
        ...current,
        [level.id]: parsed != null ? String(parsed) : "",
      }));
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
            <OnboardingTarget id={SCHOOL_SETTINGS_TOUR_TARGETS.levelsTab}>
              <button
                type="button"
                className="rounded-t-card border border-border border-b-surface bg-surface px-4 py-2 text-sm font-heading font-semibold text-primary"
                data-testid="settings-tab-levels"
              >
                {t("settings.tab.levels")}
              </button>
            </OnboardingTarget>
          </div>

          {loading ? (
            <p className="text-sm text-text-secondary">Chargement...</p>
          ) : !canManageLevels ? (
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
          )}
        </Card>
      </div>
    </AppShell>
  );
}
