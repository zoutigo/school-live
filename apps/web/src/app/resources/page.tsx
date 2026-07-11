"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Search } from "lucide-react";
import { AppShell } from "../../components/layout/app-shell";
import { Card } from "../../components/ui/card";
import { FormSelect, FormTextInput } from "../../components/ui/form-controls";
import { useTranslation } from "../../i18n/useTranslation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type ResourceKind = "ASSESSMENT" | "EXAM";

type ResourceRow = {
  id: string;
  kind: ResourceKind;
  title: string;
  examType: string;
  sequence: string | null;
  academicYearLabel: string;
  school: { id: string; name: string } | null;
  academicLevel: { id: string; label: string };
  subject: { id: string; name: string };
  correctionContent: string | null;
  correctionStatus: "PENDING" | "APPROVED" | "REJECTED";
};

type ResourceDetail = ResourceRow & {
  statementContent: string | null;
};

type ListResponse = {
  items: ResourceRow[];
  total: number;
};

type CatalogResponse = {
  academicLevels: Array<{ id: string; label: string }>;
  subjects: Array<{ id: string; name: string }>;
};

type SchoolOption = { id: string; name: string };

const SEQUENCE_VALUES = [
  "SEQ_1",
  "SEQ_2",
  "SEQ_3",
  "SEQ_4",
  "SEQ_5",
  "SEQ_6",
] as const;
const EXAM_TYPE_VALUES = ["SEQUENCE_TEST", "POP_QUIZ", "MOCK_EXAM"] as const;

function currentAcademicYearLabel(now = new Date()): string {
  const year = now.getFullYear();
  return now.getMonth() >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

function academicYearValues(): string[] {
  const [startYear] = currentAcademicYearLabel().split("-").map(Number);
  const years: string[] = [];
  for (let offset = -2; offset <= 1; offset += 1) {
    years.push(`${startYear + offset}-${startYear + offset + 1}`);
  }
  return years;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default function ResourcesBrowsePage() {
  const { t } = useTranslation();
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<ResourceKind>("ASSESSMENT");
  const [items, setItems] = useState<ResourceRow[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [catalog, setCatalog] = useState<CatalogResponse>({
    academicLevels: [],
    subjects: [],
  });
  const [schools, setSchools] = useState<SchoolOption[]>([]);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [academicYearLabel, setAcademicYearLabel] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [academicLevelId, setAcademicLevelId] = useState("");
  const [sequence, setSequence] = useState("");
  const [examType, setExamType] = useState("");

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedDetail, setExpandedDetail] = useState<ResourceDetail | null>(
    null,
  );
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const hasActiveFilters =
    !!search ||
    !!academicYearLabel ||
    !!schoolId ||
    !!academicLevelId ||
    !!sequence ||
    !!examType;

  useEffect(() => {
    void boot();
  }, []);

  async function boot() {
    try {
      const meRes = await fetch(`${API_URL}/me`, { credentials: "include" });
      if (!meRes.ok) {
        router.replace("/");
        return;
      }
    } catch {
      router.replace("/");
      return;
    }

    try {
      const [catalogRes, schoolsRes] = await Promise.all([
        fetch(`${API_URL}/resources/catalog`, { credentials: "include" }),
        fetch(`${API_URL}/resources/schools`, { credentials: "include" }),
      ]);
      if (catalogRes.ok) {
        setCatalog((await catalogRes.json()) as CatalogResponse);
      }
      if (schoolsRes.ok) {
        setSchools((await schoolsRes.json()) as SchoolOption[]);
      }
    } catch {
      // le catalogue/écoles alimentent seulement les filtres, pas bloquant
    } finally {
      setReady(true);
    }
  }

  const loadList = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ kind: tab });
      if (search.trim()) params.set("search", search.trim());
      if (academicYearLabel) params.set("academicYearLabel", academicYearLabel);
      if (schoolId) params.set("schoolId", schoolId);
      if (academicLevelId) params.set("academicLevelId", academicLevelId);
      if (tab === "ASSESSMENT" && sequence) params.set("sequence", sequence);
      if (examType) params.set("examType", examType);

      const res = await fetch(`${API_URL}/resources?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("LOAD_FAILED");
      const data = (await res.json()) as ListResponse;
      setItems(data.items);
      setTotal(data.total);
    } catch {
      setError(t("resourcesBrowse.errors.loadFailed"));
    } finally {
      setIsLoading(false);
    }
  }, [
    tab,
    search,
    academicYearLabel,
    schoolId,
    academicLevelId,
    sequence,
    examType,
    t,
  ]);

  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => {
      void loadList();
    }, 300);
    return () => clearTimeout(timer);
  }, [ready, loadList]);

  function resetFilters() {
    setSearch("");
    setAcademicYearLabel("");
    setSchoolId("");
    setAcademicLevelId("");
    setSequence("");
    setExamType("");
  }

  async function toggleExpand(resource: ResourceRow) {
    if (expandedId === resource.id) {
      setExpandedId(null);
      setExpandedDetail(null);
      return;
    }
    setExpandedId(resource.id);
    setIsLoadingDetail(true);
    try {
      const res = await fetch(`${API_URL}/resources/${resource.id}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("LOAD_FAILED");
      setExpandedDetail((await res.json()) as ResourceDetail);
    } catch {
      setExpandedId(null);
    } finally {
      setIsLoadingDetail(false);
    }
  }

  if (!ready) {
    return (
      <AppShell schoolName={t("resourcesBrowse.shellName")}>
        <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
          {t("common.loading")}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell schoolName={t("resourcesBrowse.shellName")}>
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{t("resourcesBrowse.title")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("resourcesBrowse.subtitle")}
            </p>
          </div>
          <button
            type="button"
            data-testid="resources-search-toggle"
            onClick={() => setFiltersOpen((current) => !current)}
            className={`flex items-center gap-1.5 rounded-[12px] border px-3 py-1.5 text-xs font-semibold transition ${
              filtersOpen
                ? "border-primary bg-primary/10 text-primary"
                : "border-warm-border bg-warm-surface text-text-secondary hover:text-text-primary"
            }`}
          >
            <Search className="h-3.5 w-3.5" />
            {t("resourcesBrowse.filters.toggleLabel")}
          </button>
        </div>

        <div className="flex gap-2 border-b border-warm-border">
          {(
            [
              ["ASSESSMENT", t("resourcesBrowse.tabs.assessments")],
              ["EXAM", t("resourcesBrowse.tabs.exams")],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              data-testid={`resources-tab-${key}`}
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

        {filtersOpen ? (
          <div
            className="grid gap-3 rounded-[20px] border border-warm-border bg-warm-surface p-4 sm:grid-cols-2 md:grid-cols-3"
            data-testid="resources-filter-panel"
          >
            <div className="sm:col-span-2 md:col-span-3">
              <FormTextInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("resourcesBrowse.filters.searchPlaceholder")}
                data-testid="resources-filter-search-input"
              />
            </div>

            <FormSelect
              value={academicYearLabel}
              onChange={(e) => setAcademicYearLabel(e.target.value)}
              data-testid="resources-filter-academic-year"
            >
              <option value="">{t("resourcesBrowse.filters.allYears")}</option>
              {academicYearValues().map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </FormSelect>

            <FormSelect
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
              data-testid="resources-filter-school"
            >
              <option value="">
                {t("resourcesBrowse.filters.allSchools")}
              </option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </FormSelect>

            <FormSelect
              value={academicLevelId}
              onChange={(e) => setAcademicLevelId(e.target.value)}
              data-testid="resources-filter-level"
            >
              <option value="">{t("resourcesBrowse.filters.allLevels")}</option>
              {catalog.academicLevels.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </FormSelect>

            {tab === "ASSESSMENT" ? (
              <FormSelect
                value={sequence}
                onChange={(e) => setSequence(e.target.value)}
                data-testid="resources-filter-sequence"
              >
                <option value="">
                  {t("resourcesBrowse.filters.allSequences")}
                </option>
                {SEQUENCE_VALUES.map((seq) => (
                  <option key={seq} value={seq}>
                    {t(`resources.sequence.${seq}`)}
                  </option>
                ))}
              </FormSelect>
            ) : null}

            <FormSelect
              value={examType}
              onChange={(e) => setExamType(e.target.value)}
              data-testid="resources-filter-exam-type"
            >
              <option value="">
                {t("resourcesBrowse.filters.allExamTypes")}
              </option>
              {EXAM_TYPE_VALUES.map((type) => (
                <option key={type} value={type}>
                  {t(`resources.examType.${type}`)}
                </option>
              ))}
            </FormSelect>

            <button
              type="button"
              data-testid="resources-filter-reset"
              onClick={resetFilters}
              disabled={!hasActiveFilters}
              className="flex items-center justify-center gap-2 rounded-[14px] border border-primary px-3 py-2 text-sm font-semibold text-primary transition disabled:cursor-not-allowed disabled:border-warm-border disabled:text-text-secondary"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {t("resourcesBrowse.filters.reset")}
            </button>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="text-sm text-muted-foreground">
            {t("common.loading")}
          </div>
        ) : items.length === 0 ? (
          <div
            className="text-sm text-muted-foreground"
            data-testid="resources-empty"
          >
            {t("resourcesBrowse.empty")}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              {t("resourcesBrowse.total").replace("{total}", String(total))}
            </p>
            {items.map((item) => (
              <Card key={item.id} data-testid={`resources-card-${item.id}`}>
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => toggleExpand(item)}
                  data-testid={`resources-card-${item.id}-toggle`}
                >
                  <p className="font-heading text-lg font-semibold">
                    {item.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {item.subject.name} • {item.academicLevel.label}
                    {item.school ? ` • ${item.school.name}` : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span
                      className="rounded-full border border-warm-border bg-warm-surface px-2.5 py-0.5 text-xs font-semibold text-text-secondary"
                      data-testid={`resources-card-${item.id}-academic-year`}
                    >
                      {item.academicYearLabel}
                    </span>
                    <span className="rounded-full border border-warm-border bg-warm-surface px-2.5 py-0.5 text-xs font-semibold text-text-secondary">
                      {t(`resources.examType.${item.examType}`)}
                    </span>
                    {item.sequence ? (
                      <span className="rounded-full border border-warm-border bg-warm-surface px-2.5 py-0.5 text-xs font-semibold text-text-secondary">
                        {t(`resources.sequence.${item.sequence}`)}
                      </span>
                    ) : null}
                    {item.correctionStatus === "APPROVED" &&
                    item.correctionContent ? (
                      <span
                        className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700"
                        data-testid={`resources-card-${item.id}-correction-badge`}
                      >
                        {t("resourcesBrowse.correctionAvailable")}
                      </span>
                    ) : null}
                  </div>
                </button>

                {expandedId === item.id ? (
                  <div
                    className="mt-3 border-t border-warm-border pt-3 text-sm text-text-primary"
                    data-testid={`resources-detail-${item.id}`}
                  >
                    {isLoadingDetail ? (
                      <p className="text-muted-foreground">
                        {t("common.loading")}
                      </p>
                    ) : expandedDetail ? (
                      <p>
                        {expandedDetail.statementContent
                          ? stripHtml(expandedDetail.statementContent)
                          : t("resourcesBrowse.noStatementYet")}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
