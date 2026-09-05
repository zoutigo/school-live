"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  AlertOctagon,
  AlertTriangle,
  Activity,
  ChevronRight,
  ClipboardList,
  CircleEllipsis,
  Filter,
  Info,
  Pencil,
  Pill,
  Plus,
  RotateCcw,
  School,
  Search,
  User,
  UtensilsCrossed,
} from "lucide-react";
import { Card } from "../../../../../../../components/ui/card";
import { Button } from "../../../../../../../components/ui/button";
import {
  FormCheckbox,
  FormSubmitHint,
  FormTextInput,
  FormTextarea,
} from "../../../../../../../components/ui/form-controls";
import { FormField } from "../../../../../../../components/ui/form-field";
import { SubmitButton } from "../../../../../../../components/ui/form-buttons";
import { PaginationControls } from "../../../../../../../components/ui/pagination-controls";
import { SearchableSelect } from "../../../../../../../components/ui/searchable-select";
import { getCsrfTokenCookie } from "../../../../../../../lib/auth-cookies";
import {
  useTranslation,
  type TranslateFn,
} from "../../../../../../../i18n/useTranslation";
import { useOnboardingTourStore } from "../../../../../../../store/onboarding-tour";
import { OnboardingTarget } from "../../../../../../../components/onboarding/onboarding-target";
import {
  HEALTH_PARENT_TOUR_ID,
  HEALTH_PARENT_TOUR_STEPS,
  HEALTH_PARENT_TOUR_TARGETS,
} from "../../../../../../../components/health/health-parent-tour.config";
import { usePageHelp } from "../../../../../../../store/page-help";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

type ListTabKey = "conditions" | "history";

type ParentChild = { id: string; firstName: string; lastName: string };

type AlertLevel = "INFO" | "ATTENTION" | "URGENT";
type ConditionType =
  | "ALLERGY"
  | "PATHOLOGY"
  | "TREATMENT"
  | "INSTRUCTION"
  | "OTHER";
type ReportType =
  | "MALADIE"
  | "TRAITEMENT"
  | "ACCIDENT"
  | "CONSULTATION"
  | "HOSPITALISATION"
  | "VACCINATION"
  | "RESTRICTION_SPORT"
  | "AUTRE";
type HistoryOrigin = "CARE_EVENT" | "REPORT";

const CONDITION_TYPES: ConditionType[] = [
  "ALLERGY",
  "PATHOLOGY",
  "TREATMENT",
  "INSTRUCTION",
  "OTHER",
];
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
const ALERT_LEVELS: AlertLevel[] = ["INFO", "ATTENTION", "URGENT"];

type ConditionRow = {
  id: string;
  type: ConditionType;
  alertLevel: AlertLevel;
  label: string;
  description: string | null;
  active: boolean;
  isVisibleToAllTeachers: boolean;
  publicAlertLabel: string | null;
  createdAt: string;
};

type CareEventRow = {
  id: string;
  summary: string;
  description: string | null;
  occurredAt: string;
  alertLevel: AlertLevel;
  followUpNeeded: boolean;
  authorUser: { firstName: string; lastName: string } | null;
};

type ReportRow = {
  id: string;
  type: ReportType;
  alertLevel: AlertLevel;
  description: string;
  sportRestriction: boolean;
  createdAt: string;
  acknowledgedAt: string | null;
  reportedByUser: { firstName: string; lastName: string } | null;
  acknowledgedByUser: { firstName: string; lastName: string } | null;
};

type HistoryItem =
  | { kind: "CARE_EVENT"; at: string; payload: CareEventRow }
  | { kind: "REPORT"; at: string; payload: ReportRow };

type ConditionsPanel =
  | { type: "form"; mode: "create" | "edit"; item: ConditionRow | null }
  | { type: "detail"; item: ConditionRow };

type HistoryPanel = { type: "form" } | { type: "detail"; item: HistoryItem };

function alertLevelLabel(t: TranslateFn, level: AlertLevel) {
  return t(`health.alertLevel.${level}`);
}

function alertLevelClass(level: AlertLevel) {
  if (level === "URGENT") return "bg-rose-100 text-rose-700";
  if (level === "ATTENTION") return "bg-amber-100 text-amber-800";
  return "bg-sky-100 text-sky-700";
}

function AlertLevelIcon({ level, t }: { level: AlertLevel; t: TranslateFn }) {
  const Icon =
    level === "URGENT"
      ? AlertOctagon
      : level === "ATTENTION"
        ? AlertTriangle
        : Info;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${alertLevelClass(level)}`}
      title={alertLevelLabel(t, level)}
    >
      <Icon className="h-3.5 w-3.5" />
      {alertLevelLabel(t, level)}
    </span>
  );
}

function ConditionTypeIcon({ type }: { type: ConditionType }) {
  const Icon =
    type === "ALLERGY"
      ? UtensilsCrossed
      : type === "PATHOLOGY"
        ? Activity
        : type === "TREATMENT"
          ? Pill
          : type === "INSTRUCTION"
            ? ClipboardList
            : CircleEllipsis;
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-teal-100 text-teal-700">
      <Icon className="h-4 w-4" />
    </span>
  );
}

function HistoryOriginIcon({ origin }: { origin: HistoryOrigin }) {
  const Icon = origin === "CARE_EVENT" ? School : User;
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-teal-100 text-teal-700">
      <Icon className="h-4 w-4" />
    </span>
  );
}

function conditionTypeLabel(t: TranslateFn, type: ConditionType) {
  return t(`health.conditionType.${type}`);
}

function reportTypeLabel(t: TranslateFn, type: ReportType) {
  return t(`health.reportType.${type}`);
}

function createConditionSchema(t: TranslateFn) {
  return z.object({
    type: z.enum(["ALLERGY", "PATHOLOGY", "TREATMENT", "INSTRUCTION", "OTHER"]),
    alertLevel: z.enum(["INFO", "ATTENTION", "URGENT"]),
    label: z.string().trim().min(1, t("health.validation.labelRequired")),
    description: z.string().trim().optional(),
    active: z.boolean(),
  });
}

function createReportSchema(t: TranslateFn) {
  return z.object({
    type: z.enum([
      "MALADIE",
      "TRAITEMENT",
      "ACCIDENT",
      "CONSULTATION",
      "HOSPITALISATION",
      "VACCINATION",
      "RESTRICTION_SPORT",
      "AUTRE",
    ]),
    alertLevel: z.enum(["INFO", "ATTENTION", "URGENT"]),
    description: z
      .string()
      .trim()
      .min(1, t("health.validation.descriptionRequired")),
    sportRestriction: z.boolean().optional(),
  });
}

type ConditionFormValues = z.infer<ReturnType<typeof createConditionSchema>>;
type ReportFormValues = z.infer<ReturnType<typeof createReportSchema>>;

export default function ChildSantePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams<{ schoolSlug: string; childId: string }>();
  const schoolSlug = params.schoolSlug;
  const childId = params.childId;

  const [children, setChildren] = useState<ParentChild[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tab, setTab] = useState<ListTabKey>("conditions");

  usePageHelp({
    title: t(`health.parent.help.${tab}.title`),
    sections: [1, 2, 3].map((n) => ({
      title: t(`health.parent.help.${tab}.section${n}Title`),
      body: [t(`health.parent.help.${tab}.section${n}Body`)],
    })),
  });

  // ── Conditions list ──────────────────────────────────────────────────────
  const [conditions, setConditions] = useState<ConditionRow[]>([]);
  const [conditionsPage, setConditionsPage] = useState(1);
  const [conditionsTotal, setConditionsTotal] = useState(0);
  const [conditionsLoading, setConditionsLoading] = useState(false);
  const [conditionsSearch, setConditionsSearch] = useState("");
  const [conditionsFiltersOpen, setConditionsFiltersOpen] = useState(false);
  const [conditionsTypeFilter, setConditionsTypeFilter] = useState<
    ConditionType | ""
  >("");
  const [conditionsAlertFilter, setConditionsAlertFilter] = useState<
    AlertLevel | ""
  >("");
  const [conditionsActiveFilter, setConditionsActiveFilter] = useState<
    "" | "true" | "false"
  >("");
  const [conditionsPanel, setConditionsPanel] =
    useState<ConditionsPanel | null>(null);

  // ── History list (care events + reports, merged server-side) ────────────
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [historyFiltersOpen, setHistoryFiltersOpen] = useState(false);
  const [historyAlertFilter, setHistoryAlertFilter] = useState<AlertLevel | "">(
    "",
  );
  const [historyOriginFilter, setHistoryOriginFilter] = useState<
    HistoryOrigin | ""
  >("");
  const [historyReportTypeFilter, setHistoryReportTypeFilter] = useState<
    ReportType | ""
  >("");
  const [historyPanel, setHistoryPanel] = useState<HistoryPanel | null>(null);

  const conditionSchema = useMemo(() => createConditionSchema(t), [t]);
  const reportSchema = useMemo(() => createReportSchema(t), [t]);

  const conditionForm = useForm<
    z.input<typeof conditionSchema>,
    unknown,
    z.output<typeof conditionSchema>
  >({
    resolver: zodResolver(conditionSchema),
    mode: "onChange",
    defaultValues: {
      type: "ALLERGY",
      alertLevel: "INFO",
      label: "",
      description: "",
      active: true,
    },
  });

  const reportForm = useForm<
    z.input<typeof reportSchema>,
    unknown,
    z.output<typeof reportSchema>
  >({
    resolver: zodResolver(reportSchema),
    mode: "onChange",
    defaultValues: {
      type: "MALADIE",
      alertLevel: "INFO",
      description: "",
      sportRestriction: false,
    },
  });

  const conditionValues = conditionForm.watch();
  const reportValues = reportForm.watch();

  const loadConditions = useCallback(
    async (targetPage: number) => {
      if (!schoolSlug || !childId) return;
      setConditionsLoading(true);
      try {
        const query = new URLSearchParams({
          page: String(targetPage),
          limit: String(PAGE_SIZE),
        });
        if (conditionsSearch.trim())
          query.set("search", conditionsSearch.trim());
        if (conditionsTypeFilter) query.set("type", conditionsTypeFilter);
        if (conditionsAlertFilter)
          query.set("alertLevel", conditionsAlertFilter);
        if (conditionsActiveFilter) query.set("active", conditionsActiveFilter);

        const response = await fetch(
          `${API_URL}/schools/${schoolSlug}/students/${childId}/health/conditions?${query.toString()}`,
          { credentials: "include" },
        );
        if (!response.ok) return;
        const body = (await response.json()) as {
          items: ConditionRow[];
          page: number;
          total: number;
        };
        setConditions(body.items);
        setConditionsPage(body.page);
        setConditionsTotal(body.total);
      } finally {
        setConditionsLoading(false);
      }
    },
    [
      schoolSlug,
      childId,
      conditionsSearch,
      conditionsTypeFilter,
      conditionsAlertFilter,
      conditionsActiveFilter,
    ],
  );

  const loadHistory = useCallback(
    async (targetPage: number) => {
      if (!schoolSlug || !childId) return;
      setHistoryLoading(true);
      try {
        const query = new URLSearchParams({
          page: String(targetPage),
          limit: String(PAGE_SIZE),
        });
        if (historySearch.trim()) query.set("search", historySearch.trim());
        if (historyAlertFilter) query.set("alertLevel", historyAlertFilter);
        if (historyOriginFilter) query.set("origin", historyOriginFilter);
        if (historyReportTypeFilter)
          query.set("reportType", historyReportTypeFilter);

        const response = await fetch(
          `${API_URL}/schools/${schoolSlug}/students/${childId}/health/history?${query.toString()}`,
          { credentials: "include" },
        );
        if (!response.ok) return;
        const body = (await response.json()) as {
          items: HistoryItem[];
          page: number;
          total: number;
        };
        setHistoryItems(body.items);
        setHistoryPage(body.page);
        setHistoryTotal(body.total);
      } finally {
        setHistoryLoading(false);
      }
    },
    [
      schoolSlug,
      childId,
      historySearch,
      historyAlertFilter,
      historyOriginFilter,
      historyReportTypeFilter,
    ],
  );

  useEffect(() => {
    if (!schoolSlug) return;
    void bootstrap();
  }, [schoolSlug, childId]);

  useEffect(() => {
    if (loading) return;
    const timeout = setTimeout(
      () => void loadConditions(1),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timeout);
  }, [
    loading,
    conditionsSearch,
    conditionsTypeFilter,
    conditionsAlertFilter,
    conditionsActiveFilter,
  ]);

  useEffect(() => {
    if (loading) return;
    const timeout = setTimeout(() => void loadHistory(1), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [
    loading,
    historySearch,
    historyAlertFilter,
    historyOriginFilter,
    historyReportTypeFilter,
  ]);

  async function bootstrap() {
    setLoading(true);
    setError(null);
    try {
      const meResponse = await fetch(`${API_URL}/schools/${schoolSlug}/me`, {
        credentials: "include",
      });
      if (!meResponse.ok) {
        router.replace(`/schools/${schoolSlug}/login`);
        return;
      }
      const payload = (await meResponse.json()) as {
        role?: string;
        linkedStudents?: ParentChild[];
        onboardingHelpEnabled?: boolean;
      };
      if (payload.role !== "PARENT") {
        router.replace(`/schools/${schoolSlug}/dashboard`);
        return;
      }
      const linked = payload.linkedStudents ?? [];
      setChildren(linked);
      if (linked.length > 0 && !linked.some((entry) => entry.id === childId)) {
        router.replace(`/schools/${schoolSlug}/children/${linked[0].id}/sante`);
        return;
      }

      const tourStore = useOnboardingTourStore.getState();
      if (
        payload.onboardingHelpEnabled !== false &&
        !tourStore.isCompleted("parent", HEALTH_PARENT_TOUR_ID) &&
        !tourStore.activeTourId
      ) {
        tourStore.startTour(
          HEALTH_PARENT_TOUR_ID,
          "parent",
          HEALTH_PARENT_TOUR_STEPS,
        );
      }
      await Promise.all([loadConditions(1), loadHistory(1)]);
    } catch {
      setError(t("health.errors.load"));
    } finally {
      setLoading(false);
    }
  }

  const currentChild = useMemo(
    () => children.find((entry) => entry.id === childId) ?? null,
    [children, childId],
  );

  const conditionsTotalPages = Math.max(
    1,
    Math.ceil(conditionsTotal / PAGE_SIZE),
  );
  const historyTotalPages = Math.max(1, Math.ceil(historyTotal / PAGE_SIZE));
  const hasActiveConditionFilters = Boolean(
    conditionsTypeFilter || conditionsAlertFilter || conditionsActiveFilter,
  );
  const hasActiveHistoryFilters = Boolean(
    historyAlertFilter || historyOriginFilter || historyReportTypeFilter,
  );

  function openCreateCondition() {
    conditionForm.reset({
      type: "ALLERGY",
      alertLevel: "INFO",
      label: "",
      description: "",
      active: true,
    });
    setFormError(null);
    setSuccess(null);
    setConditionsPanel({ type: "form", mode: "create", item: null });
  }

  function openEditCondition(item: ConditionRow) {
    conditionForm.reset({
      type: item.type,
      alertLevel: item.alertLevel,
      label: item.label,
      description: item.description ?? "",
      active: item.active,
    });
    setFormError(null);
    setSuccess(null);
    setConditionsPanel({ type: "form", mode: "edit", item });
  }

  function openConditionDetail(item: ConditionRow) {
    setConditionsPanel({ type: "detail", item });
  }

  function openCreateReport() {
    reportForm.reset({
      type: "MALADIE",
      alertLevel: "INFO",
      description: "",
      sportRestriction: false,
    });
    setFormError(null);
    setSuccess(null);
    setHistoryPanel({ type: "form" });
  }

  function openHistoryDetail(item: HistoryItem) {
    setHistoryPanel({ type: "detail", item });
  }

  async function submitCondition(values: ConditionFormValues) {
    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setFormError(t("health.common.csrfInvalid"));
      router.replace(`/schools/${schoolSlug}/login`);
      return;
    }
    const editing =
      conditionsPanel?.type === "form" && conditionsPanel.mode === "edit"
        ? conditionsPanel.item
        : null;
    setSaving(true);
    setFormError(null);
    setSuccess(null);
    try {
      const url = editing
        ? `${API_URL}/schools/${schoolSlug}/students/${childId}/health/conditions/${editing.id}`
        : `${API_URL}/schools/${schoolSlug}/students/${childId}/health/conditions`;
      const response = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          type: values.type,
          alertLevel: values.alertLevel,
          label: values.label,
          description: values.description || undefined,
          ...(editing ? { active: values.active } : {}),
        }),
      });
      if (!response.ok) {
        setFormError(t("health.errors.createFailed"));
        return;
      }
      setSuccess(
        editing
          ? t("health.parent.form.editConditionSuccess")
          : t("health.parent.form.createConditionSuccess"),
      );
      setConditionsPanel(null);
      await loadConditions(1);
    } catch {
      setFormError(t("health.common.networkError"));
    } finally {
      setSaving(false);
    }
  }

  async function submitReport(values: ReportFormValues) {
    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setFormError(t("health.common.csrfInvalid"));
      router.replace(`/schools/${schoolSlug}/login`);
      return;
    }
    setSaving(true);
    setFormError(null);
    setSuccess(null);
    try {
      const response = await fetch(
        `${API_URL}/schools/${schoolSlug}/students/${childId}/health/reports`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({
            type: values.type,
            alertLevel: values.alertLevel,
            description: values.description,
            sportRestriction: values.sportRestriction ?? false,
          }),
        },
      );
      if (!response.ok) {
        setFormError(t("health.errors.createFailed"));
        return;
      }
      setSuccess(t("health.parent.form.createReportSuccess"));
      setHistoryPanel(null);
      await loadHistory(1);
    } catch {
      setFormError(t("health.common.networkError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4">
      <Card
        title={t("health.title")}
        subtitle={
          currentChild
            ? `${currentChild.firstName} ${currentChild.lastName}`
            : t("health.subtitleDefault")
        }
      >
        {loading ? (
          <p className="text-sm text-text-secondary">
            {t("health.common.loading")}
          </p>
        ) : error ? (
          <p className="text-sm text-notification">{error}</p>
        ) : (
          <div className="grid gap-4">
            <OnboardingTarget
              id={HEALTH_PARENT_TOUR_TARGETS.tabs}
              className="flex flex-wrap items-end gap-2 border-b border-border"
            >
              {(
                [
                  ["conditions", t("health.parent.tabs.conditions")],
                  ["history", t("health.parent.tabs.history")],
                ] as [ListTabKey, string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  data-testid={`sante-tab-${key}`}
                  className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                    tab === key
                      ? "border border-border border-b-surface bg-surface text-primary"
                      : "text-text-secondary"
                  }`}
                >
                  {label}
                </button>
              ))}
            </OnboardingTarget>

            {formError ? (
              <p className="text-sm text-notification">{formError}</p>
            ) : null}
            {success ? <p className="text-sm text-success">{success}</p> : null}

            {tab === "conditions" ? (
              conditionsPanel?.type === "form" ? (
                <ConditionFormPanel
                  t={t}
                  mode={conditionsPanel.mode}
                  form={conditionForm}
                  values={conditionValues}
                  saving={saving}
                  onCancel={() => setConditionsPanel(null)}
                  onSubmit={submitCondition}
                />
              ) : conditionsPanel?.type === "detail" ? (
                <ConditionDetailPanel
                  t={t}
                  item={conditionsPanel.item}
                  onBack={() => setConditionsPanel(null)}
                  onEdit={() => openEditCondition(conditionsPanel.item)}
                />
              ) : (
                <ConditionsListPanel
                  t={t}
                  conditions={conditions}
                  loading={conditionsLoading}
                  page={conditionsPage}
                  totalPages={conditionsTotalPages}
                  total={conditionsTotal}
                  search={conditionsSearch}
                  setSearch={setConditionsSearch}
                  filtersOpen={conditionsFiltersOpen}
                  setFiltersOpen={setConditionsFiltersOpen}
                  hasActiveFilters={hasActiveConditionFilters}
                  typeFilter={conditionsTypeFilter}
                  setTypeFilter={setConditionsTypeFilter}
                  alertFilter={conditionsAlertFilter}
                  setAlertFilter={setConditionsAlertFilter}
                  activeFilter={conditionsActiveFilter}
                  setActiveFilter={setConditionsActiveFilter}
                  onResetFilters={() => {
                    setConditionsTypeFilter("");
                    setConditionsAlertFilter("");
                    setConditionsActiveFilter("");
                    setConditionsSearch("");
                  }}
                  onPageChange={(next) => void loadConditions(next)}
                  onAdd={openCreateCondition}
                  onCardClick={openConditionDetail}
                />
              )
            ) : null}

            {tab === "history" ? (
              historyPanel?.type === "form" ? (
                <ReportFormPanel
                  t={t}
                  form={reportForm}
                  values={reportValues}
                  saving={saving}
                  onCancel={() => setHistoryPanel(null)}
                  onSubmit={submitReport}
                />
              ) : historyPanel?.type === "detail" ? (
                <HistoryDetailPanel
                  t={t}
                  item={historyPanel.item}
                  onBack={() => setHistoryPanel(null)}
                />
              ) : (
                <HistoryListPanel
                  t={t}
                  items={historyItems}
                  loading={historyLoading}
                  page={historyPage}
                  totalPages={historyTotalPages}
                  total={historyTotal}
                  search={historySearch}
                  setSearch={setHistorySearch}
                  filtersOpen={historyFiltersOpen}
                  setFiltersOpen={setHistoryFiltersOpen}
                  hasActiveFilters={hasActiveHistoryFilters}
                  alertFilter={historyAlertFilter}
                  setAlertFilter={setHistoryAlertFilter}
                  originFilter={historyOriginFilter}
                  setOriginFilter={setHistoryOriginFilter}
                  reportTypeFilter={historyReportTypeFilter}
                  setReportTypeFilter={setHistoryReportTypeFilter}
                  onResetFilters={() => {
                    setHistoryAlertFilter("");
                    setHistoryOriginFilter("");
                    setHistoryReportTypeFilter("");
                    setHistorySearch("");
                  }}
                  onPageChange={(next) => void loadHistory(next)}
                  onAdd={openCreateReport}
                  onCardClick={openHistoryDetail}
                />
              )
            ) : null}
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Conditions list ─────────────────────────────────────────────────────────

function ConditionsListPanel(props: {
  t: TranslateFn;
  conditions: ConditionRow[];
  loading: boolean;
  page: number;
  totalPages: number;
  total: number;
  search: string;
  setSearch: (value: string) => void;
  filtersOpen: boolean;
  setFiltersOpen: (value: boolean) => void;
  hasActiveFilters: boolean;
  typeFilter: ConditionType | "";
  setTypeFilter: (value: ConditionType | "") => void;
  alertFilter: AlertLevel | "";
  setAlertFilter: (value: AlertLevel | "") => void;
  activeFilter: "" | "true" | "false";
  setActiveFilter: (value: "" | "true" | "false") => void;
  onResetFilters: () => void;
  onPageChange: (page: number) => void;
  onAdd: () => void;
  onCardClick: (item: ConditionRow) => void;
}) {
  const { t } = props;
  return (
    <div className="grid gap-3" data-testid="sante-conditions-tab">
      <div className="flex flex-wrap items-center gap-2">
        <OnboardingTarget
          id={HEALTH_PARENT_TOUR_TARGETS.search}
          className="relative flex-1 min-w-[180px]"
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
          <input
            value={props.search}
            onChange={(event) => props.setSearch(event.target.value)}
            placeholder={t("health.parent.search.placeholderConditions")}
            data-testid="sante-conditions-search-input"
            className="w-full rounded-card border border-border bg-background py-2 pl-9 pr-3 text-sm text-text-primary"
          />
        </OnboardingTarget>
        <button
          type="button"
          data-testid="sante-conditions-filter-toggle"
          onClick={() => props.setFiltersOpen(!props.filtersOpen)}
          className={`flex items-center gap-1.5 rounded-[12px] border px-3 py-2 text-xs font-semibold transition ${
            props.hasActiveFilters
              ? "border-teal-600 bg-teal-600 text-white"
              : "border-teal-600/40 bg-surface text-teal-700"
          }`}
        >
          <Filter className="h-3.5 w-3.5" />
          {t("health.parent.filters.toggleAccessibilityLabel")}
        </button>
        <OnboardingTarget id={HEALTH_PARENT_TOUR_TARGETS.add}>
          <Button
            type="button"
            data-testid="sante-conditions-add"
            onClick={props.onAdd}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            {t("health.parent.fab.addCondition")}
          </Button>
        </OnboardingTarget>
      </div>

      {props.filtersOpen ? (
        <div
          className="grid gap-3 rounded-card border border-teal-600/30 bg-background p-4 md:grid-cols-3"
          data-testid="sante-conditions-filter-panel"
        >
          <FormField label={t("health.parent.filters.typeLabel")}>
            <SearchableSelect
              value={props.typeFilter}
              onChange={(value) =>
                props.setTypeFilter(value as ConditionType | "")
              }
              ariaLabel={t("health.parent.filters.typeLabel")}
              data-testid="sante-conditions-filter-type"
              options={[
                { value: "", label: t("health.parent.filters.allTypes") },
                ...CONDITION_TYPES.map((type) => ({
                  value: type,
                  label: conditionTypeLabel(t, type),
                })),
              ]}
            />
          </FormField>
          <FormField label={t("health.parent.filters.alertLevelLabel")}>
            <SearchableSelect
              value={props.alertFilter}
              onChange={(value) =>
                props.setAlertFilter(value as AlertLevel | "")
              }
              ariaLabel={t("health.parent.filters.alertLevelLabel")}
              data-testid="sante-conditions-filter-alertLevel"
              options={[
                { value: "", label: t("health.parent.filters.allLevels") },
                ...ALERT_LEVELS.map((level) => ({
                  value: level,
                  label: alertLevelLabel(t, level),
                })),
              ]}
            />
          </FormField>
          <FormField label={t("health.parent.filters.statusLabel")}>
            <SearchableSelect
              value={props.activeFilter}
              onChange={(value) =>
                props.setActiveFilter(value as "" | "true" | "false")
              }
              ariaLabel={t("health.parent.filters.statusLabel")}
              data-testid="sante-conditions-filter-status"
              options={[
                { value: "", label: t("health.parent.filters.status.all") },
                {
                  value: "true",
                  label: t("health.parent.filters.status.active"),
                },
                {
                  value: "false",
                  label: t("health.parent.filters.status.inactive"),
                },
              ]}
            />
          </FormField>
          <button
            type="button"
            data-testid="sante-conditions-filter-reset"
            onClick={props.onResetFilters}
            className="flex items-center justify-center gap-2 rounded-card border border-primary px-3 py-2 text-sm font-semibold text-primary md:col-span-3"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {t("health.parent.filters.reset")}
          </button>
        </div>
      ) : null}

      <div className="grid gap-2" data-testid="sante-conditions-list">
        {props.loading ? (
          <p className="text-sm text-text-secondary">
            {t("health.parent.loading")}
          </p>
        ) : props.conditions.length === 0 ? (
          <p className="text-sm text-text-secondary">
            {props.search || props.hasActiveFilters
              ? t("health.parent.empty.conditionsSearch")
              : t("health.conditions.empty")}
          </p>
        ) : (
          props.conditions.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => props.onCardClick(row)}
              data-testid={`sante-condition-card-${row.id}`}
              className="flex min-w-0 items-center gap-3 rounded-card border border-border bg-background p-3 text-left transition hover:border-teal-600/50"
            >
              <ConditionTypeIcon type={row.type} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-text-primary">
                    {row.label}
                  </p>
                  <AlertLevelIcon level={row.alertLevel} t={t} />
                </div>
                <p className="mt-1 text-xs text-text-secondary">
                  {conditionTypeLabel(t, row.type)}
                  {!row.active ? ` · ${t("health.parent.card.inactive")}` : ""}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-text-secondary" />
            </button>
          ))
        )}
      </div>

      {!props.loading && props.conditions.length > 0 ? (
        <PaginationControls
          page={props.page}
          totalPages={props.totalPages}
          totalItems={props.total}
          disabled={props.loading}
          onPageChange={props.onPageChange}
        />
      ) : null}
    </div>
  );
}

function ConditionFormPanel(props: {
  t: TranslateFn;
  mode: "create" | "edit";
  form: ReturnType<typeof useForm<ConditionFormValues>>;
  values: Partial<ConditionFormValues>;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (values: ConditionFormValues) => void;
}) {
  const { t, form } = props;
  return (
    <form
      className="grid gap-3 md:grid-cols-2"
      onSubmit={form.handleSubmit(props.onSubmit)}
      noValidate
      data-testid="sante-condition-form"
    >
      <p className="md:col-span-2 text-sm font-heading font-semibold text-text-primary">
        {props.mode === "edit"
          ? t("health.parent.form.hero.editConditionTitle")
          : t("health.parent.form.hero.createConditionTitle")}
      </p>

      <FormField
        label={t("health.form.conditionType")}
        htmlFor="health-condition-type"
      >
        <SearchableSelect
          id="health-condition-type"
          ariaLabel={t("health.form.conditionType")}
          value={props.values.type ?? ""}
          onChange={(value) =>
            form.setValue("type", value as ConditionType, {
              shouldDirty: true,
              shouldTouch: true,
              shouldValidate: true,
            })
          }
          data-testid="condition-form-type"
          options={CONDITION_TYPES.map((type) => ({
            value: type,
            label: conditionTypeLabel(t, type),
          }))}
        />
      </FormField>

      <FormField
        label={t("health.form.alertLevel")}
        htmlFor="health-condition-alert"
      >
        <SearchableSelect
          id="health-condition-alert"
          ariaLabel={t("health.form.alertLevel")}
          value={props.values.alertLevel ?? ""}
          onChange={(value) =>
            form.setValue("alertLevel", value as AlertLevel, {
              shouldDirty: true,
              shouldTouch: true,
              shouldValidate: true,
            })
          }
          data-testid="condition-form-alert"
          options={ALERT_LEVELS.map((level) => ({
            value: level,
            label: alertLevelLabel(t, level),
          }))}
        />
      </FormField>

      <FormField
        label={t("health.form.label")}
        error={form.formState.errors.label?.message}
        className="md:col-span-2"
      >
        <FormTextInput
          invalid={!!form.formState.errors.label}
          value={props.values.label}
          onChange={(event) =>
            form.setValue("label", event.target.value, {
              shouldDirty: true,
              shouldTouch: true,
              shouldValidate: true,
            })
          }
          placeholder={t("health.form.labelPlaceholder")}
          data-testid="condition-form-label"
        />
      </FormField>

      <FormField label={t("health.form.description")} className="md:col-span-2">
        <FormTextarea
          value={props.values.description}
          onChange={(event) =>
            form.setValue("description", event.target.value, {
              shouldDirty: true,
              shouldTouch: true,
              shouldValidate: true,
            })
          }
          rows={3}
        />
      </FormField>

      {props.mode === "edit" ? (
        <label className="inline-flex items-center gap-2 text-sm text-text-secondary md:col-span-2">
          <FormCheckbox
            checked={props.values.active ?? true}
            onChange={(event) =>
              form.setValue("active", event.target.checked, {
                shouldDirty: true,
                shouldTouch: true,
                shouldValidate: true,
              })
            }
          />
          {t("health.parent.form.active")}
        </label>
      ) : null}

      <div className="md:col-span-2 flex items-center gap-3">
        <SubmitButton
          disabled={props.saving}
          data-testid="condition-form-submit"
        >
          {t("health.form.submitCondition")}
        </SubmitButton>
        <Button type="button" variant="secondary" onClick={props.onCancel}>
          {t("health.parent.form.cancel")}
        </Button>
        <FormSubmitHint visible={!form.formState.isValid} />
      </div>
    </form>
  );
}

function ConditionDetailPanel({
  t,
  item,
  onBack,
  onEdit,
}: {
  t: TranslateFn;
  item: ConditionRow;
  onBack: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="grid gap-3" data-testid="sante-condition-detail">
      <button
        type="button"
        onClick={onBack}
        className="justify-self-start text-sm font-semibold text-primary"
      >
        ← {t("health.parent.form.cancel")}
      </button>
      <div className="flex items-center gap-3">
        <ConditionTypeIcon type={item.type} />
        <div>
          <p className="text-base font-heading font-semibold text-text-primary">
            {item.label}
          </p>
          <p className="text-xs text-text-secondary">
            {conditionTypeLabel(t, item.type)}
          </p>
        </div>
        <AlertLevelIcon level={item.alertLevel} t={t} />
      </div>
      <div className="grid gap-2 rounded-card border border-border bg-background p-4">
        <DetailRow
          label={t("health.parent.detail.statusLabel")}
          value={
            item.active
              ? t("health.parent.card.active")
              : t("health.parent.card.inactive")
          }
        />
        {item.description ? (
          <DetailRow
            label={t("health.form.description")}
            value={item.description}
          />
        ) : null}
        <DetailRow
          label={t("health.parent.detail.visibleToTeachers")}
          value={
            item.isVisibleToAllTeachers
              ? t("health.parent.detail.yes")
              : t("health.parent.detail.no")
          }
        />
      </div>
      <Button
        type="button"
        onClick={onEdit}
        data-testid="sante-condition-detail-edit"
      >
        <Pencil className="mr-1.5 h-4 w-4" />
        {t("health.parent.detail.editAction")}
      </Button>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
        {label}
      </p>
      <p className="text-sm text-text-primary">{value}</p>
    </div>
  );
}

// ── History list ─────────────────────────────────────────────────────────

function HistoryListPanel(props: {
  t: TranslateFn;
  items: HistoryItem[];
  loading: boolean;
  page: number;
  totalPages: number;
  total: number;
  search: string;
  setSearch: (value: string) => void;
  filtersOpen: boolean;
  setFiltersOpen: (value: boolean) => void;
  hasActiveFilters: boolean;
  alertFilter: AlertLevel | "";
  setAlertFilter: (value: AlertLevel | "") => void;
  originFilter: HistoryOrigin | "";
  setOriginFilter: (value: HistoryOrigin | "") => void;
  reportTypeFilter: ReportType | "";
  setReportTypeFilter: (value: ReportType | "") => void;
  onResetFilters: () => void;
  onPageChange: (page: number) => void;
  onAdd: () => void;
  onCardClick: (item: HistoryItem) => void;
}) {
  const { t } = props;
  return (
    <div className="grid gap-3" data-testid="sante-history-tab">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
          <input
            value={props.search}
            onChange={(event) => props.setSearch(event.target.value)}
            placeholder={t("health.parent.search.placeholderHistory")}
            data-testid="sante-history-search-input"
            className="w-full rounded-card border border-border bg-background py-2 pl-9 pr-3 text-sm text-text-primary"
          />
        </div>
        <button
          type="button"
          data-testid="sante-history-filter-toggle"
          onClick={() => props.setFiltersOpen(!props.filtersOpen)}
          className={`flex items-center gap-1.5 rounded-[12px] border px-3 py-2 text-xs font-semibold transition ${
            props.hasActiveFilters
              ? "border-teal-600 bg-teal-600 text-white"
              : "border-teal-600/40 bg-surface text-teal-700"
          }`}
        >
          <Filter className="h-3.5 w-3.5" />
          {t("health.parent.filters.toggleAccessibilityLabel")}
        </button>
        <Button
          type="button"
          data-testid="sante-history-add"
          onClick={props.onAdd}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          {t("health.parent.fab.addReport")}
        </Button>
      </div>

      {props.filtersOpen ? (
        <div
          className="grid gap-3 rounded-card border border-teal-600/30 bg-background p-4 md:grid-cols-3"
          data-testid="sante-history-filter-panel"
        >
          <FormField label={t("health.parent.filters.alertLevelLabel")}>
            <SearchableSelect
              value={props.alertFilter}
              onChange={(value) =>
                props.setAlertFilter(value as AlertLevel | "")
              }
              ariaLabel={t("health.parent.filters.alertLevelLabel")}
              data-testid="sante-history-filter-alertLevel"
              options={[
                { value: "", label: t("health.parent.filters.allLevels") },
                ...ALERT_LEVELS.map((level) => ({
                  value: level,
                  label: alertLevelLabel(t, level),
                })),
              ]}
            />
          </FormField>
          <FormField label={t("health.parent.filters.originLabel")}>
            <SearchableSelect
              value={props.originFilter}
              onChange={(value) =>
                props.setOriginFilter(value as HistoryOrigin | "")
              }
              ariaLabel={t("health.parent.filters.originLabel")}
              data-testid="sante-history-filter-origin"
              options={[
                { value: "", label: t("health.parent.filters.allOrigins") },
                {
                  value: "CARE_EVENT",
                  label: t("health.parent.filters.originSchool"),
                },
                {
                  value: "REPORT",
                  label: t("health.parent.filters.originParent"),
                },
              ]}
            />
          </FormField>
          <FormField label={t("health.parent.filters.reportTypeLabel")}>
            <SearchableSelect
              value={props.reportTypeFilter}
              onChange={(value) =>
                props.setReportTypeFilter(value as ReportType | "")
              }
              ariaLabel={t("health.parent.filters.reportTypeLabel")}
              data-testid="sante-history-filter-reportType"
              options={[
                {
                  value: "",
                  label: t("health.parent.filters.allReportTypes"),
                },
                ...REPORT_TYPES.map((type) => ({
                  value: type,
                  label: reportTypeLabel(t, type),
                })),
              ]}
            />
          </FormField>
          <button
            type="button"
            data-testid="sante-history-filter-reset"
            onClick={props.onResetFilters}
            className="flex items-center justify-center gap-2 rounded-card border border-primary px-3 py-2 text-sm font-semibold text-primary md:col-span-3"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {t("health.parent.filters.reset")}
          </button>
        </div>
      ) : null}

      <div className="grid gap-2" data-testid="sante-history-list">
        {props.loading ? (
          <p className="text-sm text-text-secondary">
            {t("health.parent.loading")}
          </p>
        ) : props.items.length === 0 ? (
          <p className="text-sm text-text-secondary">
            {props.search || props.hasActiveFilters
              ? t("health.parent.empty.historySearch")
              : t("health.history.empty")}
          </p>
        ) : (
          props.items.map((item) => (
            <button
              key={`${item.kind}-${item.payload.id}`}
              type="button"
              onClick={() => props.onCardClick(item)}
              data-testid={`sante-history-card-${item.kind}-${item.payload.id}`}
              className="flex min-w-0 items-center gap-3 rounded-card border border-border bg-background p-3 text-left transition hover:border-teal-600/50"
            >
              <HistoryOriginIcon origin={item.kind} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-text-primary">
                    {item.kind === "CARE_EVENT"
                      ? item.payload.summary
                      : reportTypeLabel(t, item.payload.type)}
                  </p>
                  <AlertLevelIcon level={item.payload.alertLevel} t={t} />
                </div>
                <p className="mt-1 text-xs text-text-secondary">
                  {new Date(item.at).toLocaleString("fr-FR")}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-text-secondary" />
            </button>
          ))
        )}
      </div>

      {!props.loading && props.items.length > 0 ? (
        <PaginationControls
          page={props.page}
          totalPages={props.totalPages}
          totalItems={props.total}
          disabled={props.loading}
          onPageChange={props.onPageChange}
        />
      ) : null}
    </div>
  );
}

function ReportFormPanel(props: {
  t: TranslateFn;
  form: ReturnType<typeof useForm<ReportFormValues>>;
  values: Partial<ReportFormValues>;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (values: ReportFormValues) => void;
}) {
  const { t, form } = props;
  return (
    <form
      className="grid gap-3 md:grid-cols-2"
      onSubmit={form.handleSubmit(props.onSubmit)}
      noValidate
      data-testid="sante-report-form"
    >
      <p className="md:col-span-2 text-sm font-heading font-semibold text-text-primary">
        {t("health.parent.form.hero.createReportTitle")}
      </p>

      <FormField
        label={t("health.form.reportType")}
        htmlFor="health-report-type"
      >
        <SearchableSelect
          id="health-report-type"
          ariaLabel={t("health.form.reportType")}
          value={props.values.type ?? ""}
          onChange={(value) =>
            form.setValue("type", value as ReportType, {
              shouldDirty: true,
              shouldTouch: true,
              shouldValidate: true,
            })
          }
          data-testid="report-form-type"
          options={REPORT_TYPES.map((type) => ({
            value: type,
            label: reportTypeLabel(t, type),
          }))}
        />
      </FormField>

      <FormField
        label={t("health.form.alertLevel")}
        htmlFor="health-report-alert"
      >
        <SearchableSelect
          id="health-report-alert"
          ariaLabel={t("health.form.alertLevel")}
          value={props.values.alertLevel ?? ""}
          onChange={(value) =>
            form.setValue("alertLevel", value as AlertLevel, {
              shouldDirty: true,
              shouldTouch: true,
              shouldValidate: true,
            })
          }
          data-testid="report-form-alert"
          options={ALERT_LEVELS.map((level) => ({
            value: level,
            label: alertLevelLabel(t, level),
          }))}
        />
      </FormField>

      <FormField
        label={t("health.form.description")}
        error={form.formState.errors.description?.message}
        className="md:col-span-2"
      >
        <FormTextarea
          invalid={!!form.formState.errors.description}
          value={props.values.description}
          onChange={(event) =>
            form.setValue("description", event.target.value, {
              shouldDirty: true,
              shouldTouch: true,
              shouldValidate: true,
            })
          }
          rows={3}
          placeholder={t("health.form.descriptionPlaceholder")}
          data-testid="report-form-description"
        />
      </FormField>

      <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
        <FormCheckbox
          checked={props.values.sportRestriction ?? false}
          onChange={(event) =>
            form.setValue("sportRestriction", event.target.checked, {
              shouldDirty: true,
              shouldTouch: true,
              shouldValidate: true,
            })
          }
        />
        {t("health.form.sportRestriction")}
      </label>

      <div className="md:col-span-2 flex items-center gap-3">
        <SubmitButton disabled={props.saving} data-testid="report-form-submit">
          {t("health.form.submitReport")}
        </SubmitButton>
        <Button type="button" variant="secondary" onClick={props.onCancel}>
          {t("health.parent.form.cancel")}
        </Button>
        <FormSubmitHint visible={!form.formState.isValid} />
      </div>
    </form>
  );
}

function HistoryDetailPanel({
  t,
  item,
  onBack,
}: {
  t: TranslateFn;
  item: HistoryItem;
  onBack: () => void;
}) {
  return (
    <div className="grid gap-3" data-testid="sante-history-detail">
      <button
        type="button"
        onClick={onBack}
        className="justify-self-start text-sm font-semibold text-primary"
      >
        ← {t("health.parent.form.cancel")}
      </button>
      <div className="flex items-center gap-3">
        <HistoryOriginIcon origin={item.kind} />
        <div>
          <p className="text-base font-heading font-semibold text-text-primary">
            {item.kind === "CARE_EVENT"
              ? item.payload.summary
              : reportTypeLabel(t, item.payload.type)}
          </p>
          <p className="text-xs text-text-secondary">
            {new Date(item.at).toLocaleString("fr-FR")}
          </p>
        </div>
        <AlertLevelIcon level={item.payload.alertLevel} t={t} />
      </div>

      {item.kind === "CARE_EVENT" ? (
        <div className="grid gap-2 rounded-card border border-border bg-background p-4">
          {item.payload.description ? (
            <DetailRow
              label={t("health.form.description")}
              value={item.payload.description}
            />
          ) : null}
          <DetailRow
            label={t("health.parent.detail.careBy")}
            value={
              item.payload.authorUser
                ? `${item.payload.authorUser.firstName} ${item.payload.authorUser.lastName}`
                : t("health.parent.detail.origin.school")
            }
          />
          <DetailRow
            label={t("health.parent.detail.followUpNeeded")}
            value={
              item.payload.followUpNeeded
                ? t("health.parent.detail.yes")
                : t("health.parent.detail.no")
            }
          />
        </div>
      ) : (
        <div className="grid gap-2 rounded-card border border-border bg-background p-4">
          <DetailRow
            label={t("health.form.description")}
            value={item.payload.description}
          />
          <DetailRow
            label={t("health.parent.detail.reportedBy")}
            value={
              item.payload.reportedByUser
                ? `${item.payload.reportedByUser.firstName} ${item.payload.reportedByUser.lastName}`
                : t("health.parent.detail.origin.parent")
            }
          />
          <DetailRow
            label={t("health.form.sportRestriction")}
            value={
              item.payload.sportRestriction
                ? t("health.parent.detail.yes")
                : t("health.parent.detail.no")
            }
          />
          <DetailRow
            label={t("health.reports.acknowledged")}
            value={
              item.payload.acknowledgedAt
                ? item.payload.acknowledgedByUser
                  ? `${item.payload.acknowledgedByUser.firstName} ${item.payload.acknowledgedByUser.lastName}`
                  : t("health.parent.detail.yes")
                : t("health.reports.pending")
            }
          />
        </div>
      )}
    </div>
  );
}
