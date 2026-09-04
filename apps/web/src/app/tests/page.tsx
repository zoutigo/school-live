"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "../../components/layout/app-shell";
import { OnboardingTarget } from "../../components/onboarding/onboarding-target";
import { useOnboardingTourStore } from "../../store/onboarding-tour";
import { usePageHelp } from "../../store/page-help";
import { useTranslation } from "../../i18n/useTranslation";
import {
  testsApi,
  getCampaignDisplayStatus,
  sortCampaignsByDisplayStatus,
  type TestCampaignSummary,
  type TestCaseToRedo,
  type TestExecutionRow,
  type TestExecutionStatus,
} from "../../api/tests.api";
import {
  TESTS_TOUR_ID,
  TESTS_TOUR_ROLE,
  TESTS_TOUR_STEPS,
  TESTS_TOUR_TARGETS,
} from "../../components/tests/tests-tour.config";
import {
  ALL_CAMPAIGNS_FILTER,
  campaignStatusKey,
  formatDate,
  formatDateTime,
  statusLabel,
  type CampaignsFilter,
} from "../../components/tests/tests-format";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type Tab = "summary" | "campaigns" | "executions" | "toRedo";

type Me = { isTester?: boolean };

export default function TestsPage() {
  const { t } = useTranslation();
  const [ready, setReady] = useState(false);
  const [isTester, setIsTester] = useState(false);
  const [tab, setTab] = useState<Tab>("summary");
  const [campaigns, setCampaigns] = useState<TestCampaignSummary[]>([]);
  const [toRedo, setToRedo] = useState<TestCaseToRedo[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [campaignsFilter, setCampaignsFilter] =
    useState<CampaignsFilter>(ALL_CAMPAIGNS_FILTER);

  usePageHelp({
    title: t("tests.help.title"),
    sections: [1, 2, 3, 4].map((n) => ({
      title: t(`tests.help.section${n}Title`),
      body: [t(`tests.help.section${n}Body`)],
    })),
  });

  useEffect(() => {
    void boot();
  }, []);

  async function boot() {
    try {
      const meRes = await fetch(`${API_URL}/me`, { credentials: "include" });
      if (!meRes.ok) {
        setReady(true);
        return;
      }
      const me = (await meRes.json()) as Me & {
        onboardingHelpEnabled?: boolean;
      };
      setIsTester(Boolean(me.isTester));
      if (me.isTester) {
        const tourStore = useOnboardingTourStore.getState();
        if (
          me.onboardingHelpEnabled !== false &&
          !tourStore.isCompleted(TESTS_TOUR_ROLE, TESTS_TOUR_ID) &&
          !tourStore.activeTourId
        ) {
          tourStore.startTour(TESTS_TOUR_ID, TESTS_TOUR_ROLE, TESTS_TOUR_STEPS);
        }
      }
    } finally {
      setReady(true);
    }
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [campaignsResponse, toRedoResponse] = await Promise.all([
        testsApi.listCampaigns(),
        testsApi.listToRedo(),
      ]);
      setCampaigns(campaignsResponse);
      setToRedo(toRedoResponse);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : t("tests.common.errors.loadGeneric"),
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (isTester) void load();
    else setLoading(false);
  }, [isTester, load]);

  function openCampaignsWithFilter(filter: CampaignsFilter) {
    setCampaignsFilter(filter);
    setTab("campaigns");
  }

  if (!ready) {
    return (
      <AppShell schoolName="Scolive Platform">
        <div className="flex h-48 items-center justify-center text-sm text-text-secondary">
          {t("common.loading")}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell schoolName="Scolive Platform">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold" data-testid="tests-title">
            {t("tests.title")}
          </h1>
          <p className="text-sm text-text-secondary">
            {t("tests.campaigns.subtitle")}
          </p>
        </div>

        {!isTester ? (
          <div
            className="rounded-[20px] border border-warm-border bg-surface p-8 text-center"
            data-testid="tests-restricted"
          >
            <p className="font-heading text-lg font-semibold text-text-primary">
              {t("tests.common.restrictedTitle")}
            </p>
            <p className="mt-2 text-sm text-text-secondary">
              {t("tests.common.restrictedMessage")}
            </p>
          </div>
        ) : loading ? (
          <div className="flex h-48 items-center justify-center text-sm text-text-secondary">
            {t("common.loading")}
          </div>
        ) : errorMessage ? (
          <div className="rounded-[20px] border border-notification/40 bg-notification/5 p-6 text-sm text-notification">
            {errorMessage}
          </div>
        ) : (
          <>
            <OnboardingTarget id={TESTS_TOUR_TARGETS.tabs}>
              <div className="flex gap-2 border-b border-warm-border">
                {(
                  [
                    ["summary", t("tests.tabs.summary")],
                    ["campaigns", t("tests.tabs.campaigns")],
                    ["executions", t("tests.tabs.executions")],
                    [
                      "toRedo",
                      `${t("tests.tabs.toRedo")}${toRedo.length > 0 ? ` (${toRedo.length})` : ""}`,
                    ],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    data-testid={`tests-tab-${key}`}
                    onClick={() => setTab(key)}
                    className={`px-4 py-2 text-sm font-semibold ${
                      tab === key
                        ? "border-b-2 border-primary text-primary"
                        : "text-text-secondary"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </OnboardingTarget>

            {tab === "summary" && (
              <SummaryTab
                campaigns={campaigns}
                onCampaignsFilterPress={openCampaignsWithFilter}
              />
            )}
            {tab === "campaigns" && (
              <CampaignsTab
                campaigns={campaigns}
                filter={campaignsFilter}
                onFilterChange={setCampaignsFilter}
              />
            )}
            {tab === "executions" && <ExecutionsTab campaigns={campaigns} />}
            {tab === "toRedo" && (
              <ToRedoTab items={toRedo} campaigns={campaigns} />
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

function SummaryTab({
  campaigns,
  onCampaignsFilterPress,
}: {
  campaigns: TestCampaignSummary[];
  onCampaignsFilterPress: (filter: CampaignsFilter) => void;
}) {
  const { t } = useTranslation();

  function computeKpis(source: TestCampaignSummary[]) {
    let inProgress = 0;
    let completed = 0;
    let upcoming = 0;
    let totalCases = 0;
    let pendingCases = 0;
    for (const campaign of source) {
      const status = getCampaignDisplayStatus(campaign);
      if (status === "IN_PROGRESS") inProgress += 1;
      else if (status === "COMPLETED") completed += 1;
      else upcoming += 1;
      totalCases += campaign.summary.totalCases;
      pendingCases += Math.max(
        0,
        campaign.summary.totalCases - campaign.summary.completedCases,
      );
    }
    return {
      totalCampaigns: source.length,
      inProgress,
      completed,
      upcoming,
      totalCases,
      pendingCases,
    };
  }

  const kpis = useMemo(() => computeKpis(campaigns), [campaigns]);

  const highlight = useMemo(() => {
    const candidates = campaigns
      .filter((campaign) => {
        const status = getCampaignDisplayStatus(campaign);
        return (
          (status === "IN_PROGRESS" || status === "UPCOMING") &&
          campaign.summary.completedCases < campaign.summary.totalCases
        );
      })
      .sort((a, b) => {
        const mineDiff = Number(!a.assignedToMe) - Number(!b.assignedToMe);
        if (mineDiff !== 0) return mineDiff;
        const aDue = a.dueAt ? new Date(a.dueAt).getTime() : Infinity;
        const bDue = b.dueAt ? new Date(b.dueAt).getTime() : Infinity;
        return aDue - bDue;
      });
    return candidates[0] ?? null;
  }, [campaigns]);

  if (campaigns.length === 0) {
    return (
      <div
        className="rounded-[20px] border border-warm-border bg-surface p-8 text-center"
        data-testid="tests-summary-empty"
      >
        <p className="font-heading text-lg font-semibold text-text-primary">
          {t("tests.summary.emptyTitle")}
        </p>
        <p className="mt-2 text-sm text-text-secondary">
          {t("tests.summary.emptyMessage")}
        </p>
      </div>
    );
  }

  const tiles: Array<{
    key: string;
    label: string;
    count: number;
    color: string;
    filter: CampaignsFilter;
  }> = [
    {
      key: "total",
      label: t("tests.summary.kpi.totalCampaigns"),
      count: kpis.totalCampaigns,
      color: "bg-primary",
      filter: ALL_CAMPAIGNS_FILTER,
    },
    {
      key: "inProgress",
      label: t("tests.summary.kpi.inProgress"),
      count: kpis.inProgress,
      color: "bg-accent-teal",
      filter: "IN_PROGRESS",
    },
    {
      key: "upcoming",
      label: t("tests.summary.kpi.upcoming"),
      count: kpis.upcoming,
      color: "bg-warm-accent",
      filter: "UPCOMING",
    },
    {
      key: "completed",
      label: t("tests.summary.kpi.completed"),
      count: kpis.completed,
      color: "bg-[#5f5a52]",
      filter: "COMPLETED",
    },
    {
      key: "totalCases",
      label: t("tests.summary.kpi.totalCases"),
      count: kpis.totalCases,
      color: "bg-[#7c6aa3]",
      filter: ALL_CAMPAIGNS_FILTER,
    },
    {
      key: "pending",
      label: t("tests.summary.kpi.pending"),
      count: kpis.pendingCases,
      color: "bg-[#b45a3c]",
      filter: ALL_CAMPAIGNS_FILTER,
    },
  ];

  return (
    <div className="space-y-6" data-testid="tests-summary-tab">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {tiles.map((tile) => (
          <button
            key={tile.key}
            type="button"
            onClick={() => onCampaignsFilterPress(tile.filter)}
            data-testid={`tests-kpi-${tile.key}`}
            className={`rounded-[16px] px-4 py-4 text-left text-surface ${tile.color}`}
          >
            <p className="text-xs font-semibold">{tile.label}</p>
            <p className="mt-2 text-2xl font-bold">{tile.count}</p>
          </button>
        ))}
      </div>

      <div
        className="rounded-[20px] border border-warm-border bg-surface p-5"
        data-testid="tests-highlight-card"
      >
        <p className="font-heading text-base font-semibold text-text-primary">
          {t("tests.summary.highlight.title")}
        </p>
        {highlight ? (
          <div className="mt-3 space-y-2">
            <p className="text-lg font-bold text-text-primary">
              {highlight.title}
            </p>
            <p className="text-sm text-text-secondary">
              {t("tests.campaigns.progressLabel")
                .replace("{done}", String(highlight.summary.completedCases))
                .replace("{total}", String(highlight.summary.totalCases))}
            </p>
            <Link
              href={`/tests/${highlight.id}`}
              data-testid="tests-highlight-cta"
              className="inline-flex items-center gap-2 rounded-card bg-primary px-4 py-2 text-sm font-semibold text-surface hover:bg-primary-dark"
            >
              {t("tests.summary.highlight.cta")}
            </Link>
          </div>
        ) : (
          <p className="mt-2 text-sm text-text-secondary">
            {t("tests.summary.highlight.empty")}
          </p>
        )}
      </div>
    </div>
  );
}

function CampaignsTab({
  campaigns,
  filter,
  onFilterChange,
}: {
  campaigns: TestCampaignSummary[];
  filter: CampaignsFilter;
  onFilterChange: (filter: CampaignsFilter) => void;
}) {
  const { t, locale } = useTranslation();
  const [search, setSearch] = useState("");
  const [mineOnly, setMineOnly] = useState(() =>
    campaigns.some((campaign) => campaign.assignedToMe),
  );

  const sorted = useMemo(
    () => sortCampaignsByDisplayStatus(campaigns),
    [campaigns],
  );

  const searchNormalized = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    return sorted.filter((campaign) => {
      if (filter !== "ALL" && getCampaignDisplayStatus(campaign) !== filter) {
        return false;
      }
      if (mineOnly && !campaign.assignedToMe) return false;
      if (searchNormalized) {
        const haystack =
          `${campaign.title} ${campaign.description ?? ""}`.toLowerCase();
        if (!haystack.includes(searchNormalized)) return false;
      }
      return true;
    });
  }, [sorted, filter, mineOnly, searchNormalized]);

  if (campaigns.length === 0) {
    return (
      <div
        className="rounded-[20px] border border-warm-border bg-surface p-8 text-center"
        data-testid="tests-campaigns-empty"
      >
        <p className="font-heading text-lg font-semibold text-text-primary">
          {t("tests.campaigns.emptyTitle")}
        </p>
        <p className="mt-2 text-sm text-text-secondary">
          {t("tests.campaigns.emptyMessage")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="tests-campaigns-tab">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("tests.campaigns.search.placeholder")}
          aria-label={t("tests.campaigns.search.accessibilityLabel")}
          data-testid="tests-campaigns-search"
          className="rounded-[14px] border border-warm-border bg-warm-surface px-3 py-2 text-sm"
        />
        <select
          value={filter}
          onChange={(event) =>
            onFilterChange(event.target.value as CampaignsFilter)
          }
          data-testid="tests-campaigns-status-filter"
          className="rounded-[14px] border border-warm-border bg-warm-surface px-3 py-2 text-sm"
        >
          <option value="ALL">{t("tests.campaigns.filters.all")}</option>
          <option value="IN_PROGRESS">
            {t("tests.campaigns.filters.inProgress")}
          </option>
          <option value="UPCOMING">
            {t("tests.campaigns.filters.upcoming")}
          </option>
          <option value="COMPLETED">
            {t("tests.campaigns.filters.completed")}
          </option>
        </select>
        <label className="flex items-center gap-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={mineOnly}
            onChange={(event) => setMineOnly(event.target.checked)}
            data-testid="tests-campaigns-mine-only"
          />
          {t("tests.filters.mineOnlyLabel")}
        </label>
      </div>

      {filtered.length === 0 ? (
        <div
          className="rounded-[16px] border border-warm-border bg-surface p-6 text-center"
          data-testid="tests-campaigns-no-results"
        >
          <p className="font-semibold text-text-primary">
            {t("tests.campaigns.emptySearchTitle")}
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            {t("tests.campaigns.emptySearchMessage")}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((campaign) => {
            const status = getCampaignDisplayStatus(campaign);
            const hasStarted = campaign.summary.completedCases > 0;
            return (
              <Link
                key={campaign.id}
                href={`/tests/${campaign.id}`}
                data-testid={`test-campaign-card-${campaign.id}`}
                className="rounded-[16px] border border-warm-border bg-surface p-4 hover:shadow-card"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-heading text-base font-semibold text-text-primary">
                    {campaign.title}
                  </p>
                  <div className="flex items-center gap-2">
                    {campaign.assignedToMe ? (
                      <span className="rounded-card bg-primary px-2 py-1 text-xs font-semibold text-surface">
                        {t("tests.campaigns.badge.assigned")}
                      </span>
                    ) : null}
                    <span className="rounded-full border border-warm-border bg-warm-surface px-2 py-1 text-xs font-semibold text-text-secondary">
                      {t(`tests.campaigns.status.${campaignStatusKey(status)}`)}
                    </span>
                  </div>
                </div>
                {campaign.description ? (
                  <p className="mt-1 line-clamp-2 text-sm text-text-secondary">
                    {campaign.description}
                  </p>
                ) : null}
                <div className="mt-2 flex items-center justify-between gap-3 text-xs text-text-secondary">
                  <span>
                    {t("tests.campaigns.progressCompact")
                      .replace(
                        "{done}",
                        String(campaign.summary.completedCases),
                      )
                      .replace("{total}", String(campaign.summary.totalCases))}
                    {campaign.dueAt
                      ? ` · ${t("tests.campaigns.dueLabel").replace(
                          "{date}",
                          formatDate(campaign.dueAt, locale),
                        )}`
                      : ""}
                  </span>
                  <span className="font-semibold text-primary">
                    {t(
                      hasStarted
                        ? "tests.campaigns.actions.review"
                        : "tests.campaigns.actions.start",
                    )}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ExecutionsTab({ campaigns }: { campaigns: TestCampaignSummary[] }) {
  const { t, locale } = useTranslation();
  const [status, setStatus] = useState<TestExecutionStatus | "">("");
  const [campaignId, setCampaignId] = useState("");
  const [search, setSearch] = useState("");
  const [mineOnly, setMineOnly] = useState(() =>
    campaigns.some((campaign) => campaign.assignedToMe),
  );
  const [items, setItems] = useState<TestExecutionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const response = await testsApi.listExecutions({
          status: status || undefined,
          campaignId: campaignId || undefined,
        });
        if (!cancelled) {
          setItems(response.items);
          setErrorMessage(null);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : t("tests.common.errors.loadGeneric"),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, campaignId, t]);

  const assignedCampaignIds = useMemo(
    () =>
      new Set(
        campaigns
          .filter((campaign) => campaign.assignedToMe)
          .map((campaign) => campaign.id),
      ),
    [campaigns],
  );

  const searchNormalized = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    return items.filter((execution) => {
      if (mineOnly && !assignedCampaignIds.has(execution.campaign.id)) {
        return false;
      }
      if (searchNormalized) {
        const haystack =
          `${execution.testCase.title} ${execution.campaign.title}`.toLowerCase();
        if (!haystack.includes(searchNormalized)) return false;
      }
      return true;
    });
  }, [items, mineOnly, assignedCampaignIds, searchNormalized]);

  return (
    <div className="space-y-4" data-testid="tests-executions-tab">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("tests.executions.search.placeholder")}
          aria-label={t("tests.executions.search.accessibilityLabel")}
          data-testid="tests-executions-search"
          className="rounded-[14px] border border-warm-border bg-warm-surface px-3 py-2 text-sm"
        />
        <select
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as TestExecutionStatus | "")
          }
          data-testid="tests-executions-status-filter"
          className="rounded-[14px] border border-warm-border bg-warm-surface px-3 py-2 text-sm"
        >
          <option value="">{t("tests.executions.filters.statusAll")}</option>
          {(
            [
              "PASSED",
              "FAILED",
              "BLOCKED",
              "SKIPPED",
              "IN_PROGRESS",
              "TODO",
            ] as TestExecutionStatus[]
          ).map((value) => (
            <option key={value} value={value}>
              {statusLabel(t, value)}
            </option>
          ))}
        </select>
        <select
          value={campaignId}
          onChange={(event) => setCampaignId(event.target.value)}
          data-testid="tests-executions-campaign-filter"
          className="rounded-[14px] border border-warm-border bg-warm-surface px-3 py-2 text-sm"
        >
          <option value="">{t("tests.executions.filters.campaignAll")}</option>
          {campaigns.map((campaign) => (
            <option key={campaign.id} value={campaign.id}>
              {campaign.title}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={mineOnly}
            onChange={(event) => setMineOnly(event.target.checked)}
            data-testid="tests-executions-mine-only"
          />
          {t("tests.filters.mineOnlyLabel")}
        </label>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center text-sm text-text-secondary">
          {t("common.loading")}
        </div>
      ) : errorMessage ? (
        <p className="text-sm text-notification">{errorMessage}</p>
      ) : items.length === 0 ? (
        <div className="rounded-[16px] border border-warm-border bg-surface p-6 text-center">
          <p className="font-semibold text-text-primary">
            {t("tests.executions.emptyTitle")}
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            {t("tests.executions.emptyMessage")}
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="rounded-[16px] border border-warm-border bg-surface p-6 text-center"
          data-testid="tests-executions-no-results"
        >
          <p className="font-semibold text-text-primary">
            {t("tests.executions.emptySearchTitle")}
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            {t("tests.executions.emptySearchMessage")}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((execution) => (
            <Link
              key={execution.id}
              href={`/tests/executions/${execution.id}`}
              data-testid={`tests-execution-card-${execution.id}`}
              className="rounded-[16px] border border-warm-border bg-surface p-4 hover:shadow-card"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-heading text-sm font-semibold text-text-primary">
                  {execution.testCase.title}
                </p>
                <span className="rounded-full border border-warm-border bg-warm-surface px-2 py-1 text-xs font-semibold text-text-secondary">
                  {statusLabel(t, execution.status)}
                </span>
              </div>
              <p className="mt-1 text-xs text-text-secondary">
                {t("tests.executions.cardCampaign").replace(
                  "{title}",
                  execution.campaign.title,
                )}{" "}
                · {formatDateTime(execution.executedAt, locale)}
              </p>
              {execution.comment ? (
                <p className="mt-1 line-clamp-2 text-sm text-text-primary">
                  {execution.comment}
                </p>
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function ToRedoTab({
  items,
  campaigns,
}: {
  items: TestCaseToRedo[];
  campaigns: TestCampaignSummary[];
}) {
  const { t, locale } = useTranslation();
  const [search, setSearch] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [mineOnly, setMineOnly] = useState(() =>
    campaigns.some((campaign) => campaign.assignedToMe),
  );

  const assignedCampaignIds = useMemo(
    () =>
      new Set(
        campaigns
          .filter((campaign) => campaign.assignedToMe)
          .map((campaign) => campaign.id),
      ),
    [campaigns],
  );

  const campaignOptions = useMemo(() => {
    const unique = new Map<string, string>();
    for (const item of items) unique.set(item.campaign.id, item.campaign.title);
    return Array.from(unique.entries());
  }, [items]);

  const searchNormalized = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (campaignId && item.campaign.id !== campaignId) return false;
      if (mineOnly && !assignedCampaignIds.has(item.campaign.id)) return false;
      if (searchNormalized) {
        const haystack = `${item.title} ${item.campaign.title}`.toLowerCase();
        if (!haystack.includes(searchNormalized)) return false;
      }
      return true;
    });
  }, [items, campaignId, mineOnly, assignedCampaignIds, searchNormalized]);

  if (items.length === 0) {
    return (
      <div
        className="rounded-[20px] border border-warm-border bg-surface p-8 text-center"
        data-testid="tests-to-redo-empty"
      >
        <p className="font-heading text-lg font-semibold text-text-primary">
          {t("tests.toRedo.emptyTitle")}
        </p>
        <p className="mt-2 text-sm text-text-secondary">
          {t("tests.toRedo.emptyMessage")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="tests-to-redo-tab">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("tests.toRedo.search.placeholder")}
          aria-label={t("tests.toRedo.search.accessibilityLabel")}
          data-testid="tests-to-redo-search"
          className="rounded-[14px] border border-warm-border bg-warm-surface px-3 py-2 text-sm"
        />
        {campaignOptions.length > 1 ? (
          <select
            value={campaignId}
            onChange={(event) => setCampaignId(event.target.value)}
            data-testid="tests-to-redo-campaign-filter"
            className="rounded-[14px] border border-warm-border bg-warm-surface px-3 py-2 text-sm"
          >
            <option value="">{t("tests.toRedo.filters.campaignAll")}</option>
            {campaignOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        ) : null}
        <label className="flex items-center gap-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={mineOnly}
            onChange={(event) => setMineOnly(event.target.checked)}
            data-testid="tests-to-redo-mine-only"
          />
          {t("tests.filters.mineOnlyLabel")}
        </label>
      </div>

      {filtered.length === 0 ? (
        <div
          className="rounded-[16px] border border-warm-border bg-surface p-6 text-center"
          data-testid="tests-to-redo-no-results"
        >
          <p className="font-semibold text-text-primary">
            {t("tests.toRedo.emptySearchTitle")}
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            {t("tests.toRedo.emptySearchMessage")}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((item) => (
            <Link
              key={item.id}
              href={`/tests/cases/${item.id}`}
              data-testid={`tests-to-redo-card-${item.id}`}
              className="rounded-[16px] border border-[#f0c9c2] bg-surface p-4 hover:shadow-card"
            >
              <p className="font-heading text-sm font-semibold text-text-primary">
                {item.title}
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                {t("tests.toRedo.cardCampaign").replace(
                  "{title}",
                  item.campaign.title,
                )}
              </p>
              <p className="text-xs text-text-secondary">
                {t("tests.toRedo.requestedOn").replace(
                  "{date}",
                  formatDateTime(item.reworkRequestedAt, locale),
                )}
              </p>
              {item.reworkNote ? (
                <p className="mt-1 line-clamp-3 text-sm text-text-primary">
                  {item.reworkNote}
                </p>
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
