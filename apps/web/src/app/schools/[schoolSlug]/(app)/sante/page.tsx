"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "../../../../../components/ui/card";
import { FormTextInput } from "../../../../../components/ui/form-controls";
import { PaginationControls } from "../../../../../components/ui/pagination-controls";
import { SearchableSelect } from "../../../../../components/ui/searchable-select";
import { useTranslation } from "../../../../../i18n/useTranslation";
import { useOnboardingTourStore } from "../../../../../store/onboarding-tour";
import { OnboardingTarget } from "../../../../../components/onboarding/onboarding-target";
import {
  HEALTH_SCHOOL_TOUR_ID,
  HEALTH_SCHOOL_TOUR_STEPS,
  HEALTH_SCHOOL_TOUR_TARGETS,
} from "../../../../../components/health/health-school-tour.config";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

type AlertLevel = "INFO" | "ATTENTION" | "URGENT";
type ReportType =
  | "MALADIE"
  | "TRAITEMENT"
  | "ACCIDENT"
  | "CONSULTATION"
  | "HOSPITALISATION"
  | "VACCINATION"
  | "RESTRICTION_SPORT"
  | "AUTRE";

const ALERT_LEVELS: AlertLevel[] = ["INFO", "ATTENTION", "URGENT"];
const REPORT_TYPES: ReportType[] = [
  "MALADIE",
  "TRAITEMENT",
  "ACCIDENT",
  "CONSULTATION",
  "HOSPITALISATION",
  "VACCINATION",
  "RESTRICTION_SPORT",
  "AUTRE",
];

type ClassOption = { id: string; name: string };

type StudentRow = {
  id: string;
  firstName: string;
  lastName: string;
  class: ClassOption | null;
  age: number | null;
};

type ReportRow = {
  id: string;
  type: ReportType;
  alertLevel: AlertLevel;
  description: string;
  createdAt: string;
  acknowledgedAt: string | null;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    class: ClassOption | null;
  };
};

type Stats = {
  activeConditionsByAlertLevel: Record<AlertLevel, number>;
  activeConditionsTotal: number;
  studentsWithActiveConditions: number;
  careEventsLast7Days: number;
  careEventsLast30Days: number;
  reportsPendingAcknowledgement: number;
};

function alertLevelClass(level: AlertLevel) {
  if (level === "URGENT") return "bg-rose-100 text-rose-700";
  if (level === "ATTENTION") return "bg-amber-100 text-amber-800";
  return "bg-sky-100 text-sky-700";
}

type MainTab = "synthese" | "cares" | "eleves";

export default function SchoolSantePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { schoolSlug } = useParams<{ schoolSlug: string }>();

  const [tab, setTab] = useState<MainTab>("synthese");
  const [classes, setClasses] = useState<ClassOption[]>([]);

  useEffect(() => {
    if (!schoolSlug) return;
    fetch(`${API_URL}/schools/${schoolSlug}/admin/classrooms`, {
      credentials: "include",
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((rows: Array<{ id: string; name: string }>) =>
        setClasses(rows.map((r) => ({ id: r.id, name: r.name }))),
      )
      .catch(() => setClasses([]));
  }, [schoolSlug]);

  useEffect(() => {
    if (!schoolSlug) return;
    (async () => {
      try {
        const response = await fetch(`${API_URL}/schools/${schoolSlug}/me`, {
          credentials: "include",
        });
        if (!response.ok) return;
        const payload = (await response.json()) as {
          onboardingHelpEnabled?: boolean;
        };
        const tourStore = useOnboardingTourStore.getState();
        if (
          payload.onboardingHelpEnabled !== false &&
          !tourStore.isCompleted("school", HEALTH_SCHOOL_TOUR_ID) &&
          !tourStore.activeTourId
        ) {
          tourStore.startTour(
            HEALTH_SCHOOL_TOUR_ID,
            "school",
            HEALTH_SCHOOL_TOUR_STEPS,
          );
        }
      } catch {
        // Silent: the onboarding tour is a non-blocking enhancement.
      }
    })();
  }, [schoolSlug]);

  // ── Synthèse ─────────────────────────────────────────────────────────────

  const [statsClassId, setStatsClassId] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    if (!schoolSlug || tab !== "synthese") return;
    const q = new URLSearchParams();
    if (statsClassId) q.set("classId", statsClassId);
    fetch(`${API_URL}/schools/${schoolSlug}/health/stats?${q.toString()}`, {
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) throw new Error("failed");
        return res.json();
      })
      .then((payload: Stats) => {
        setStats(payload);
        setStatsError(null);
      })
      .catch(() => setStatsError(t("health.admin.stats.error")));
  }, [schoolSlug, tab, statsClassId, t]);

  // ── Cares ────────────────────────────────────────────────────────────────

  const [caresSearchInput, setCaresSearchInput] = useState("");
  const [caresSearch, setCaresSearch] = useState("");
  const [caresAlertLevel, setCaresAlertLevel] = useState("");
  const [caresReportType, setCaresReportType] = useState("");
  const [caresAcknowledged, setCaresAcknowledged] = useState("");
  const [caresPage, setCaresPage] = useState(1);
  const [cares, setCares] = useState<ReportRow[]>([]);
  const [caresTotal, setCaresTotal] = useState(0);

  useEffect(() => {
    const timer = setTimeout(
      () => setCaresSearch(caresSearchInput.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [caresSearchInput]);

  useEffect(() => {
    setCaresPage(1);
  }, [caresSearch, caresAlertLevel, caresReportType, caresAcknowledged]);

  const loadCares = useCallback(
    (page: number) => {
      if (!schoolSlug) return;
      const q = new URLSearchParams();
      if (caresSearch) q.set("search", caresSearch);
      if (caresAlertLevel) q.set("alertLevel", caresAlertLevel);
      if (caresReportType) q.set("reportType", caresReportType);
      if (caresAcknowledged) q.set("acknowledged", caresAcknowledged);
      q.set("page", String(page));
      q.set("limit", String(PAGE_SIZE));
      fetch(`${API_URL}/schools/${schoolSlug}/health/reports?${q.toString()}`, {
        credentials: "include",
      })
        .then((res) => (res.ok ? res.json() : { items: [], total: 0 }))
        .then((payload: { items: ReportRow[]; total: number }) => {
          setCares(payload.items ?? []);
          setCaresTotal(payload.total ?? 0);
        })
        .catch(() => {
          setCares([]);
          setCaresTotal(0);
        });
    },
    [
      schoolSlug,
      caresSearch,
      caresAlertLevel,
      caresReportType,
      caresAcknowledged,
    ],
  );

  useEffect(() => {
    if (tab === "cares") loadCares(caresPage);
  }, [tab, caresPage, loadCares]);

  // ── Élèves ───────────────────────────────────────────────────────────────

  const [elevesSearchInput, setElevesSearchInput] = useState("");
  const [elevesSearch, setElevesSearch] = useState("");
  const [elevesClassId, setElevesClassId] = useState("");
  const [elevesPage, setElevesPage] = useState(1);
  const [eleves, setEleves] = useState<StudentRow[]>([]);
  const [elevesTotal, setElevesTotal] = useState(0);

  useEffect(() => {
    const timer = setTimeout(
      () => setElevesSearch(elevesSearchInput.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [elevesSearchInput]);

  useEffect(() => {
    setElevesPage(1);
  }, [elevesSearch, elevesClassId]);

  const loadEleves = useCallback(
    (page: number) => {
      if (!schoolSlug) return;
      const q = new URLSearchParams();
      if (elevesSearch) q.set("search", elevesSearch);
      if (elevesClassId) q.set("classId", elevesClassId);
      q.set("page", String(page));
      q.set("limit", String(PAGE_SIZE));
      fetch(
        `${API_URL}/schools/${schoolSlug}/health/students?${q.toString()}`,
        {
          credentials: "include",
        },
      )
        .then((res) => (res.ok ? res.json() : { items: [], total: 0 }))
        .then((payload: { items: StudentRow[]; total: number }) => {
          setEleves(payload.items ?? []);
          setElevesTotal(payload.total ?? 0);
        })
        .catch(() => {
          setEleves([]);
          setElevesTotal(0);
        });
    },
    [schoolSlug, elevesSearch, elevesClassId],
  );

  useEffect(() => {
    if (tab === "eleves") loadEleves(elevesPage);
  }, [tab, elevesPage, loadEleves]);

  const caresTotalPages = Math.max(1, Math.ceil(caresTotal / PAGE_SIZE));
  const elevesTotalPages = Math.max(1, Math.ceil(elevesTotal / PAGE_SIZE));

  const classOptions = useMemo(() => classes, [classes]);

  return (
    <div className="grid gap-4" data-testid="school-sante-page">
      <OnboardingTarget id={HEALTH_SCHOOL_TOUR_TARGETS.tabs}>
        <div className="flex gap-2 border-b border-warm-border">
          {(
            [
              ["synthese", t("health.admin.tabs.synthese")],
              ["cares", t("health.admin.tabs.cares")],
              ["eleves", t("health.admin.tabs.eleves")],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              data-testid={`sante-tab-${key}`}
              onClick={() => setTab(key)}
              className={`px-4 py-2 text-sm font-semibold ${
                tab === key
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </OnboardingTarget>

      {tab === "synthese" ? (
        <Card title={t("health.admin.tabs.synthese")}>
          <div className="mb-4 max-w-xs">
            <SearchableSelect
              ariaLabel={t("health.admin.scope.allClasses")}
              value={statsClassId}
              onChange={setStatsClassId}
              placeholder={t("health.admin.scope.allClasses")}
              searchPlaceholder={t("settings.form.searchPlaceholder")}
              noResultsLabel={t("settings.form.noResults")}
              data-testid="sante-stats-class"
              options={classOptions.map((c) => ({
                value: c.id,
                label: c.name,
              }))}
            />
          </div>

          {statsError ? (
            <p className="text-sm text-notification">{statsError}</p>
          ) : stats ? (
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <StatTile
                  label={t("health.admin.stats.activeConditions")}
                  value={stats.activeConditionsTotal}
                />
                <StatTile
                  label={t("health.admin.stats.studentsWithConditions")}
                  value={stats.studentsWithActiveConditions}
                />
                <StatTile
                  label={t("health.admin.stats.careEvents7d")}
                  value={stats.careEventsLast7Days}
                />
                <StatTile
                  label={t("health.admin.stats.careEvents30d")}
                  value={stats.careEventsLast30Days}
                />
                <StatTile
                  label={t("health.admin.stats.reportsPending")}
                  value={stats.reportsPendingAcknowledgement}
                />
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold text-text-primary">
                  {t("health.admin.stats.byAlertLevel")}
                </p>
                <div className="flex gap-3">
                  {ALERT_LEVELS.map((level) => (
                    <div
                      key={level}
                      className={`flex-1 rounded-card p-3 text-center ${alertLevelClass(level)}`}
                      data-testid={`sante-stats-alert-${level}`}
                    >
                      <p className="text-xl font-bold">
                        {stats.activeConditionsByAlertLevel[level]}
                      </p>
                      <p className="text-xs font-semibold">
                        {t(`health.alertLevel.${level}`)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </Card>
      ) : tab === "cares" ? (
        <Card title={t("health.admin.tabs.cares")}>
          <OnboardingTarget id={HEALTH_SCHOOL_TOUR_TARGETS.search}>
            <FormTextInput
              value={caresSearchInput}
              onChange={(e) => setCaresSearchInput(e.target.value)}
              placeholder={t("health.admin.cares.searchPlaceholder")}
              data-testid="sante-cares-search"
            />
          </OnboardingTarget>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <SearchableSelect
              ariaLabel={t("health.admin.cares.filters.allLevels")}
              value={caresAlertLevel}
              onChange={setCaresAlertLevel}
              placeholder={t("health.admin.cares.filters.allLevels")}
              data-testid="sante-cares-filter-alertLevel"
              options={ALERT_LEVELS.map((level) => ({
                value: level,
                label: t(`health.alertLevel.${level}`),
              }))}
            />
            <SearchableSelect
              ariaLabel={t("health.admin.cares.filters.allReportTypes")}
              value={caresReportType}
              onChange={setCaresReportType}
              placeholder={t("health.admin.cares.filters.allReportTypes")}
              searchPlaceholder={t("settings.form.searchPlaceholder")}
              noResultsLabel={t("settings.form.noResults")}
              data-testid="sante-cares-filter-reportType"
              options={REPORT_TYPES.map((type) => ({
                value: type,
                label: t(`health.reportType.${type}`),
              }))}
            />
            <SearchableSelect
              ariaLabel={t("health.admin.cares.filters.statusAll")}
              value={caresAcknowledged}
              onChange={setCaresAcknowledged}
              data-testid="sante-cares-filter-status"
              options={[
                {
                  value: "",
                  label: t("health.admin.cares.filters.statusAll"),
                },
                {
                  value: "true",
                  label: t("health.admin.cares.filters.statusAcknowledged"),
                },
                {
                  value: "false",
                  label: t("health.admin.cares.filters.statusPending"),
                },
              ]}
            />
          </div>

          <div className="mt-4 grid gap-2">
            {cares.length === 0 ? (
              <p className="text-sm text-text-secondary">
                {t("health.admin.cares.empty")}
              </p>
            ) : (
              cares.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  data-testid={`sante-cares-item-${row.id}`}
                  onClick={() =>
                    router.push(
                      `/schools/${schoolSlug}/sante/${row.student.id}?${new URLSearchParams(
                        {
                          firstName: row.student.firstName,
                          lastName: row.student.lastName,
                          className: row.student.class?.name ?? "",
                        },
                      ).toString()}`,
                    )
                  }
                  className="rounded-card border border-border bg-background p-3 text-left"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-text-primary">
                      {row.student.lastName} {row.student.firstName}
                    </span>
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${alertLevelClass(row.alertLevel)}`}
                    >
                      {t(`health.alertLevel.${row.alertLevel}`)}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary">
                    {t(`health.reportType.${row.type}`)}
                    {row.student.class ? ` · ${row.student.class.name}` : ""}
                  </p>
                  <p className="mt-1 text-sm text-text-secondary">
                    {row.description}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-text-secondary">
                    {row.acknowledgedAt
                      ? t("health.admin.cares.acknowledged")
                      : t("health.admin.cares.pending")}
                  </p>
                </button>
              ))
            )}
          </div>

          <div className="mt-4">
            <PaginationControls
              page={caresPage}
              totalPages={caresTotalPages}
              totalItems={caresTotal}
              onPageChange={setCaresPage}
            />
          </div>
        </Card>
      ) : (
        <Card title={t("health.admin.tabs.eleves")}>
          <FormTextInput
            value={elevesSearchInput}
            onChange={(e) => setElevesSearchInput(e.target.value)}
            placeholder={t("health.admin.eleves.searchPlaceholder")}
            data-testid="sante-eleves-search"
          />

          <div className="mt-3 max-w-xs">
            <SearchableSelect
              ariaLabel={t("health.admin.eleves.filters.allClasses")}
              value={elevesClassId}
              onChange={setElevesClassId}
              placeholder={t("health.admin.eleves.filters.allClasses")}
              searchPlaceholder={t("settings.form.searchPlaceholder")}
              noResultsLabel={t("settings.form.noResults")}
              data-testid="sante-eleves-filter-class"
              options={classOptions.map((c) => ({
                value: c.id,
                label: c.name,
              }))}
            />
          </div>

          <div className="mt-4 grid gap-2">
            {eleves.length === 0 ? (
              <p className="text-sm text-text-secondary">
                {t("health.admin.eleves.empty")}
              </p>
            ) : (
              eleves.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  data-testid={`sante-eleves-item-${row.id}`}
                  onClick={() =>
                    router.push(
                      `/schools/${schoolSlug}/sante/${row.id}?${new URLSearchParams(
                        {
                          firstName: row.firstName,
                          lastName: row.lastName,
                          className: row.class?.name ?? "",
                          age: row.age != null ? String(row.age) : "",
                        },
                      ).toString()}`,
                    )
                  }
                  className="flex items-center justify-between rounded-card border border-border bg-background p-3 text-left"
                >
                  <span className="text-sm font-semibold text-text-primary">
                    {row.lastName} {row.firstName}
                  </span>
                  <span className="text-xs text-text-secondary">
                    {row.class?.name ?? t("health.admin.eleves.noClass")}
                    {row.age != null
                      ? ` · ${row.age} ${t("health.admin.eleves.ageUnit")}`
                      : ""}
                  </span>
                </button>
              ))
            )}
          </div>

          <div className="mt-4">
            <PaginationControls
              page={elevesPage}
              totalPages={elevesTotalPages}
              totalItems={elevesTotal}
              onPageChange={setElevesPage}
            />
          </div>
        </Card>
      )}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-card border border-border bg-background p-3">
      <p className="text-xl font-bold text-text-primary">{value}</p>
      <p className="text-xs text-text-secondary">{label}</p>
    </div>
  );
}
