"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AppShell } from "../../components/layout/app-shell";
import { createSchoolMessage } from "../../components/messaging/messaging-api";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import {
  FormSelect,
  FormTextarea,
  FormTextInput,
} from "../../components/ui/form-controls";
import { FormField } from "../../components/ui/form-field";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type CampaignStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
type CasePriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type ExecutionStatus =
  | "TODO"
  | "IN_PROGRESS"
  | "PASSED"
  | "FAILED"
  | "BLOCKED"
  | "SKIPPED";

type SchoolRef = { id: string; name: string; slug: string };

type CampaignRow = {
  id: string;
  reference: number;
  title: string;
  description: string | null;
  targetVersion: string | null;
  startsAt: string | null;
  dueAt: string | null;
  status: CampaignStatus;
  school: SchoolRef | null;
  testCasesCount: number;
};

type CaseRow = {
  id: string;
  reference: number;
  title: string;
  module: string | null;
  priority: CasePriority;
  dueAt: string | null;
  evidenceRequired: boolean;
  recycledAt: string | null;
  audienceRoles: string[];
  executionsCount: number;
};

type AssignmentRow = {
  id: string;
  note: string | null;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
  };
  assignedBy: { id: string; firstName: string; lastName: string };
};

type TesterRow = {
  id: string;
  fullName: string;
  email: string | null;
  schools: SchoolRef[];
  stats: {
    campaignsCount: number;
    executionsCount: number;
    passedCount: number;
    failedCount: number;
  };
};

type Synthesis = {
  campaigns: { draft: number; active: number; archived: number; total: number };
  totalCases: number;
  executions: {
    total: number;
    passed: number;
    failed: number;
    blocked: number;
    successRate: number;
    pendingReview: number;
  };
  testersCount: number;
};

type ExecutionRow = {
  id: string;
  status: ExecutionStatus;
  resultText: string | null;
  comment: string | null;
  executedAt: string;
  adminReviewedAt: string | null;
  adminReviewNote: string | null;
  user: { id: string; fullName: string };
  adminReviewedBy: { id: string; fullName: string } | null;
  testCase: { id: string; title: string };
  campaign: { id: string; title: string };
};

type ExecutionDetail = ExecutionRow & {
  deviceInfo: string | null;
  appVersion: string | null;
  attachments: Array<{
    id: string;
    fileName: string;
    url: string;
    mimeType: string;
    sizeBytes: number;
  }>;
};

type ExecutionsFilter = {
  status: ExecutionStatus | "";
  campaignId: string;
  testerId: string;
  reviewed: "" | "true" | "false";
};

const EMPTY_EXECUTIONS_FILTER: ExecutionsFilter = {
  status: "",
  campaignId: "",
  testerId: "",
  reviewed: "",
};

const CAMPAIGN_STATUSES: CampaignStatus[] = ["DRAFT", "ACTIVE", "ARCHIVED"];
const PRIORITIES: CasePriority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const EXECUTION_STATUSES: ExecutionStatus[] = [
  "PASSED",
  "FAILED",
  "BLOCKED",
  "SKIPPED",
  "IN_PROGRESS",
  "TODO",
];

const campaignSchema = z.object({
  title: z.string().trim().min(1, "Le titre est obligatoire."),
  description: z.string().trim().optional(),
  targetVersion: z.string().trim().optional(),
  startsAt: z.string().optional(),
  dueAt: z.string().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
});

const caseSchema = z.object({
  title: z.string().trim().min(1, "Le titre est obligatoire."),
  module: z.string().trim().optional(),
  objective: z.string().trim().optional(),
  preconditions: z.string().trim().optional(),
  expectedResult: z
    .string()
    .trim()
    .min(1, "Le résultat attendu est obligatoire."),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  evidenceRequired: z.boolean(),
  dueAt: z.string().optional(),
});

const assignSchema = z.object({
  testerId: z.string().trim().min(1, "Choisissez un testeur."),
  note: z.string().trim().optional(),
});

const messageSchema = z.object({
  subject: z.string().trim().min(1, "Le sujet est obligatoire."),
  body: z.string().trim().min(1, "Le message est obligatoire."),
});

type CampaignFormValues = z.output<typeof campaignSchema>;
type CaseFormValues = z.output<typeof caseSchema>;
type AssignFormValues = z.output<typeof assignSchema>;
type MessageFormValues = z.output<typeof messageSchema>;

type Tab = "synthesis" | "campaigns" | "testers" | "executions";

export default function AdminTestsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("synthesis");
  const [executionsFilter, setExecutionsFilter] = useState<ExecutionsFilter>(
    EMPTY_EXECUTIONS_FILTER,
  );

  function openExecutionsWithFilter(filter: ExecutionsFilter) {
    setExecutionsFilter(filter);
    setTab("executions");
  }

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
      const me = (await meRes.json()) as { platformRoles?: string[] };
      const roles = me.platformRoles ?? [];
      if (!roles.some((r) => ["SUPER_ADMIN", "ADMIN"].includes(r))) {
        router.replace("/acceuil");
        return;
      }
    } catch {
      router.replace("/");
      return;
    } finally {
      setReady(true);
    }
  }

  if (!ready) {
    return (
      <AppShell schoolName="Scolive Platform">
        <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
          Chargement…
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell schoolName="Scolive Platform">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold">Tests</h1>
          <p className="text-sm text-muted-foreground">
            Pilotage global des campagnes de recette, tous établissements
            confondus.
          </p>
        </div>

        <div className="flex gap-2 border-b border-warm-border">
          {(
            [
              ["synthesis", "Synthèse"],
              ["campaigns", "Campagnes"],
              ["testers", "Testeurs"],
              ["executions", "Tests réalisés"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              data-testid={`admin-tests-tab-${key}`}
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

        {tab === "synthesis" && (
          <SynthesisTab onKpiPress={openExecutionsWithFilter} />
        )}
        {tab === "campaigns" && <CampaignsTab />}
        {tab === "testers" && <TestersTab />}
        {tab === "executions" && (
          <ExecutionsTab
            filter={executionsFilter}
            onFilterChange={setExecutionsFilter}
          />
        )}
      </div>
    </AppShell>
  );
}

function SynthesisTab({
  onKpiPress,
}: {
  onKpiPress: (filter: ExecutionsFilter) => void;
}) {
  const [data, setData] = useState<Synthesis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/tests/synthesis`, {
        credentials: "include",
      });
      if (res.ok) {
        setData(await res.json());
        setError(null);
      } else {
        setError("Impossible de charger la synthèse.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Chargement…
      </div>
    );
  }
  if (error || !data) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  const kpis: Array<{
    key: string;
    label: string;
    value: string | number;
    filter?: ExecutionsFilter;
  }> = [
    { key: "campaignsActive", label: "Campagnes actives", value: data.campaigns.active },
    { key: "campaignsTotal", label: "Campagnes totales", value: data.campaigns.total },
    { key: "totalCases", label: "Cas de test", value: data.totalCases },
    { key: "testersCount", label: "Testeurs actifs", value: data.testersCount },
    {
      key: "executions",
      label: "Exécutions",
      value: data.executions.total,
      filter: EMPTY_EXECUTIONS_FILTER,
    },
    {
      key: "successRate",
      label: "Taux de réussite",
      value: `${Math.round(data.executions.successRate * 100)}%`,
      filter: { ...EMPTY_EXECUTIONS_FILTER, status: "PASSED" },
    },
    {
      key: "failed",
      label: "Échecs",
      value: data.executions.failed,
      filter: { ...EMPTY_EXECUTIONS_FILTER, status: "FAILED" },
    },
    {
      key: "pendingReview",
      label: "À traiter",
      value: data.executions.pendingReview,
      filter: { ...EMPTY_EXECUTIONS_FILTER, reviewed: "false" },
    },
  ];

  return (
    <div
      data-testid="admin-tests-synthesis"
      className="grid grid-cols-2 gap-4 sm:grid-cols-3"
    >
      {kpis.map((kpi) =>
        kpi.filter ? (
          <Card key={kpi.key} className="p-5 transition hover:border-primary">
            <button
              type="button"
              className="w-full text-left"
              onClick={() => onKpiPress(kpi.filter as ExecutionsFilter)}
              data-testid={`admin-tests-kpi-${kpi.key}`}
            >
              <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
              <p className="text-sm text-muted-foreground">{kpi.label}</p>
            </button>
          </Card>
        ) : (
          <Card key={kpi.key} className="p-5" data-testid={`admin-tests-kpi-${kpi.key}`}>
            <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
            <p className="text-sm text-muted-foreground">{kpi.label}</p>
          </Card>
        ),
      )}
    </div>
  );
}

function CampaignsTab() {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | "">("");
  const [testers, setTesters] = useState<TesterRow[]>([]);

  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<CampaignRow | null>(
    null,
  );
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [campaignError, setCampaignError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    label: string;
  } | null>(null);

  const [selectedCampaign, setSelectedCampaign] = useState<CampaignRow | null>(
    null,
  );

  const campaignForm = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignSchema),
    mode: "onChange",
    defaultValues: {
      title: "",
      description: "",
      targetVersion: "",
      startsAt: "",
      dueAt: "",
      status: "DRAFT",
    },
  });

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(
        `${API_URL}/admin/tests/campaigns?${params.toString()}`,
        { credentials: "include" },
      );
      if (res.ok) {
        const data = (await res.json()) as { items: CampaignRow[] };
        setCampaigns(data.items ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns]);

  useEffect(() => {
    void loadTesters();
  }, []);

  async function loadTesters() {
    const res = await fetch(`${API_URL}/admin/tests/testers?limit=100`, {
      credentials: "include",
    });
    if (res.ok) {
      const data = (await res.json()) as { items: TesterRow[] };
      setTesters(data.items ?? []);
    }
  }

  function openCreateCampaign() {
    setEditingCampaign(null);
    campaignForm.reset({
      title: "",
      description: "",
      targetVersion: "",
      startsAt: "",
      dueAt: "",
      status: "DRAFT",
    });
    setCampaignError(null);
    setShowCampaignForm(true);
  }

  function openEditCampaign(campaign: CampaignRow) {
    setEditingCampaign(campaign);
    campaignForm.reset({
      title: campaign.title,
      description: campaign.description ?? "",
      targetVersion: campaign.targetVersion ?? "",
      startsAt: campaign.startsAt ? campaign.startsAt.slice(0, 10) : "",
      dueAt: campaign.dueAt ? campaign.dueAt.slice(0, 10) : "",
      status: campaign.status,
    });
    setCampaignError(null);
    setShowCampaignForm(true);
  }

  async function handleCampaignSubmit(values: CampaignFormValues) {
    setSavingCampaign(true);
    setCampaignError(null);
    try {
      const body = {
        title: values.title,
        description: values.description || null,
        targetVersion: values.targetVersion || null,
        startsAt: values.startsAt || null,
        dueAt: values.dueAt || null,
        status: values.status,
      };
      const url = editingCampaign
        ? `${API_URL}/admin/tests/campaigns/${editingCampaign.id}`
        : `${API_URL}/admin/tests/campaigns`;
      const method = editingCampaign ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = (await res.json()) as { message?: string };
        setCampaignError(err.message ?? "Erreur lors de l'enregistrement.");
        return;
      }
      setShowCampaignForm(false);
      await loadCampaigns();
    } finally {
      setSavingCampaign(false);
    }
  }

  async function handleDeleteCampaign(id: string) {
    await fetch(`${API_URL}/admin/tests/campaigns/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    setDeleteTarget(null);
    if (selectedCampaign?.id === id) setSelectedCampaign(null);
    await loadCampaigns();
  }

  if (selectedCampaign) {
    return (
      <CampaignDetail
        campaign={selectedCampaign}
        testers={testers}
        onBack={() => setSelectedCampaign(null)}
        onCampaignChanged={loadCampaigns}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <FormTextInput
          placeholder="Rechercher par numéro ou titre…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          data-testid="admin-tests-search"
          className="max-w-xs"
        />
        <FormSelect
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as CampaignStatus | "")
          }
          data-testid="admin-tests-status-filter"
          className="max-w-[180px]"
        >
          <option value="">Tous statuts</option>
          {CAMPAIGN_STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s)}
            </option>
          ))}
        </FormSelect>
        <Button
          type="button"
          onClick={openCreateCampaign}
          data-testid="create-campaign-btn"
        >
          + Nouvelle campagne
        </Button>
      </div>

      {showCampaignForm && (
        <CampaignFormCard
          form={campaignForm}
          saving={savingCampaign}
          error={campaignError}
          isEditing={!!editingCampaign}
          onSubmit={campaignForm.handleSubmit(handleCampaignSubmit)}
          onCancel={() => setShowCampaignForm(false)}
        />
      )}

      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Chargement…
        </div>
      ) : campaigns.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
          Aucune campagne.
        </div>
      ) : (
        <div className="space-y-2">
          {campaigns.map((campaign) => (
            <Card
              key={campaign.id}
              className="flex items-center justify-between gap-4 px-5 py-4"
              data-testid={`campaign-row-${campaign.id}`}
            >
              <button
                type="button"
                className="flex-1 text-left"
                onClick={() => setSelectedCampaign(campaign)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-muted-foreground">
                    CMP-{String(campaign.reference).padStart(6, "0")}
                  </span>
                  <span className="font-semibold text-foreground">
                    {campaign.title}
                  </span>
                  <StatusBadge status={campaign.status} />
                </div>
                <div className="mt-1 flex gap-4 text-xs text-muted-foreground">
                  {campaign.school && <span>{campaign.school.name}</span>}
                  <span>{campaign.testCasesCount} cas de test</span>
                </div>
              </button>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => openEditCampaign(campaign)}
                >
                  Modifier
                </Button>
                <button
                  type="button"
                  onClick={() =>
                    setDeleteTarget({ id: campaign.id, label: campaign.title })
                  }
                  className="rounded-[14px] bg-destructive px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Supprimer
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          open={!!deleteTarget}
          title="Supprimer la campagne"
          message={`Supprimer "${deleteTarget.label}" ? Tous les cas et exécutions associés seront perdus.`}
          confirmLabel="Supprimer"
          onConfirm={() => void handleDeleteCampaign(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

function CampaignFormCard({
  form,
  saving,
  error,
  isEditing,
  onSubmit,
  onCancel,
}: {
  form: ReturnType<typeof useForm<CampaignFormValues>>;
  saving: boolean;
  error: string | null;
  isEditing: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}) {
  const {
    register,
    formState: { errors, isValid },
  } = form;

  return (
    <Card className="p-6">
      <h3 className="mb-4 text-base font-semibold">
        {isEditing ? "Modifier la campagne" : "Nouvelle campagne"}
      </h3>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField label="Titre *" error={errors.title?.message}>
          <FormTextInput
            {...register("title")}
            placeholder="ex: Recette mobile v1.3"
            invalid={!!errors.title}
            data-testid="campaign-title-input"
          />
        </FormField>
        <FormField label="Description" error={errors.description?.message}>
          <FormTextInput
            {...register("description")}
            invalid={!!errors.description}
          />
        </FormField>
        <FormField label="Version cible" error={errors.targetVersion?.message}>
          <FormTextInput
            {...register("targetVersion")}
            invalid={!!errors.targetVersion}
          />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Début" error={errors.startsAt?.message}>
            <FormTextInput
              {...register("startsAt")}
              type="date"
              invalid={!!errors.startsAt}
            />
          </FormField>
          <FormField label="Échéance" error={errors.dueAt?.message}>
            <FormTextInput
              {...register("dueAt")}
              type="date"
              invalid={!!errors.dueAt}
            />
          </FormField>
        </div>
        <FormField label="Statut" error={errors.status?.message}>
          <FormSelect {...register("status")} invalid={!!errors.status}>
            {CAMPAIGN_STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </FormSelect>
        </FormField>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={!isValid || saving}
            className="rounded-[14px] bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            data-testid="campaign-save-btn"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={saving}
          >
            Annuler
          </Button>
        </div>
      </form>
    </Card>
  );
}

function CampaignDetail({
  campaign,
  testers,
  onBack,
  onCampaignChanged,
}: {
  campaign: CampaignRow;
  testers: TesterRow[];
  onBack: () => void;
  onCampaignChanged: () => void;
}) {
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCaseForm, setShowCaseForm] = useState(false);
  const [editingCase, setEditingCase] = useState<CaseRow | null>(null);
  const [savingCase, setSavingCase] = useState(false);
  const [caseError, setCaseError] = useState<string | null>(null);
  const [recyclingId, setRecyclingId] = useState<string | null>(null);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [savingAssign, setSavingAssign] = useState(false);
  const [messageTarget, setMessageTarget] = useState<TesterRow | null>(null);

  const caseForm = useForm<CaseFormValues>({
    resolver: zodResolver(caseSchema),
    mode: "onChange",
    defaultValues: {
      title: "",
      module: "",
      objective: "",
      preconditions: "",
      expectedResult: "",
      priority: "MEDIUM",
      evidenceRequired: false,
      dueAt: "",
    },
  });

  const assignForm = useForm<AssignFormValues>({
    resolver: zodResolver(assignSchema),
    mode: "onChange",
    defaultValues: { testerId: "", note: "" },
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [detailRes, assignmentsRes] = await Promise.all([
        fetch(`${API_URL}/admin/tests/campaigns/${campaign.id}`, {
          credentials: "include",
        }),
        fetch(`${API_URL}/admin/tests/campaigns/${campaign.id}/assignments`, {
          credentials: "include",
        }),
      ]);
      if (detailRes.ok) {
        const data = (await detailRes.json()) as { testCases: CaseRow[] };
        setCases(data.testCases ?? []);
      }
      if (assignmentsRes.ok) {
        setAssignments(await assignmentsRes.json());
      }
    } finally {
      setLoading(false);
    }
  }, [campaign.id]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreateCase() {
    setEditingCase(null);
    caseForm.reset({
      title: "",
      module: "",
      objective: "",
      preconditions: "",
      expectedResult: "",
      priority: "MEDIUM",
      evidenceRequired: false,
      dueAt: "",
    });
    setCaseError(null);
    setShowCaseForm(true);
  }

  function openEditCase(tc: CaseRow) {
    setEditingCase(tc);
    caseForm.reset({
      title: tc.title,
      module: tc.module ?? "",
      objective: "",
      preconditions: "",
      expectedResult: "",
      priority: tc.priority,
      evidenceRequired: tc.evidenceRequired,
      dueAt: tc.dueAt ? tc.dueAt.slice(0, 10) : "",
    });
    setCaseError(null);
    setShowCaseForm(true);
  }

  async function handleCaseSubmit(values: CaseFormValues) {
    setSavingCase(true);
    setCaseError(null);
    try {
      const body = {
        title: values.title,
        module: values.module || null,
        objective: values.objective || null,
        preconditions: values.preconditions || null,
        expectedResult: values.expectedResult,
        priority: values.priority,
        evidenceRequired: values.evidenceRequired,
        dueAt: values.dueAt || null,
      };
      const url = editingCase
        ? `${API_URL}/admin/tests/cases/${editingCase.id}`
        : `${API_URL}/admin/tests/campaigns/${campaign.id}/cases`;
      const method = editingCase ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = (await res.json()) as { message?: string };
        setCaseError(err.message ?? "Erreur lors de l'enregistrement.");
        return;
      }
      setShowCaseForm(false);
      await Promise.all([load(), onCampaignChanged()]);
    } finally {
      setSavingCase(false);
    }
  }

  async function handleRecycle(testCaseId: string) {
    setRecyclingId(testCaseId);
    try {
      await fetch(`${API_URL}/admin/tests/cases/${testCaseId}/recycle`, {
        method: "POST",
        credentials: "include",
      });
      await load();
    } finally {
      setRecyclingId(null);
    }
  }

  async function handleAssignSubmit(values: AssignFormValues) {
    setSavingAssign(true);
    setAssignError(null);
    try {
      const res = await fetch(
        `${API_URL}/admin/tests/campaigns/${campaign.id}/assignments`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            testerId: values.testerId,
            note: values.note || undefined,
          }),
        },
      );
      if (!res.ok) {
        const err = (await res.json()) as { message?: string };
        setAssignError(err.message ?? "Erreur lors de l'affectation.");
        return;
      }
      setShowAssignForm(false);
      assignForm.reset({ testerId: "", note: "" });
      await load();
    } finally {
      setSavingAssign(false);
    }
  }

  async function handleUnassign(assignmentId: string) {
    await fetch(`${API_URL}/admin/tests/assignments/${assignmentId}`, {
      method: "DELETE",
      credentials: "include",
    });
    await load();
  }

  return (
    <div className="space-y-6">
      <Button type="button" variant="ghost" onClick={onBack}>
        ← Retour aux campagnes
      </Button>

      <Card className="space-y-1 p-5">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-muted-foreground">
            CMP-{String(campaign.reference).padStart(6, "0")}
          </span>
          <span className="font-semibold text-foreground">
            {campaign.title}
          </span>
          <StatusBadge status={campaign.status} />
        </div>
        {campaign.description && (
          <p className="text-sm text-muted-foreground">
            {campaign.description}
          </p>
        )}
      </Card>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Testeurs affectés</h2>
          <Button
            type="button"
            onClick={() => setShowAssignForm((v) => !v)}
            data-testid="open-assign-btn"
          >
            + Affecter à un testeur
          </Button>
        </div>

        {showAssignForm && (
          <Card className="p-5">
            <form
              onSubmit={assignForm.handleSubmit(handleAssignSubmit)}
              className="space-y-4"
            >
              <FormField
                label="Testeur *"
                error={assignForm.formState.errors.testerId?.message}
              >
                <FormSelect
                  {...assignForm.register("testerId")}
                  invalid={!!assignForm.formState.errors.testerId}
                  data-testid="assign-tester-select"
                >
                  <option value="">Choisir…</option>
                  {testers.map((tester) => (
                    <option key={tester.id} value={tester.id}>
                      {tester.fullName}
                    </option>
                  ))}
                </FormSelect>
              </FormField>
              <FormField
                label="Note"
                error={assignForm.formState.errors.note?.message}
              >
                <FormTextInput
                  {...assignForm.register("note")}
                  placeholder="ex: Prioritaire avant vendredi"
                />
              </FormField>
              {assignError && (
                <p className="text-sm text-destructive">{assignError}</p>
              )}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={!assignForm.formState.isValid || savingAssign}
                  className="rounded-[14px] bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  data-testid="assign-save-btn"
                >
                  {savingAssign ? "Affectation…" : "Affecter"}
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowAssignForm(false)}
                >
                  Annuler
                </Button>
              </div>
            </form>
          </Card>
        )}

        {assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun testeur affecté.
          </p>
        ) : (
          <div className="space-y-2">
            {assignments.map((assignment) => (
              <Card
                key={assignment.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div>
                  <p className="font-medium text-foreground">
                    {assignment.user.firstName} {assignment.user.lastName}
                  </p>
                  {assignment.note && (
                    <p className="text-xs text-muted-foreground">
                      {assignment.note}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      const tester = testers.find(
                        (t) => t.id === assignment.user.id,
                      );
                      if (tester) setMessageTarget(tester);
                    }}
                  >
                    Message rapide
                  </Button>
                  <button
                    type="button"
                    onClick={() => void handleUnassign(assignment.id)}
                    className="rounded-[14px] bg-destructive px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Retirer
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{cases.length} cas de test</h2>
          <Button
            type="button"
            onClick={openCreateCase}
            data-testid="create-case-btn"
          >
            + Nouveau cas
          </Button>
        </div>

        {showCaseForm && (
          <Card className="p-6">
            <h3 className="mb-4 text-base font-semibold">
              {editingCase
                ? "Modifier les instructions du cas"
                : "Nouveau cas de test"}
            </h3>
            <form
              onSubmit={caseForm.handleSubmit(handleCaseSubmit)}
              className="space-y-4"
            >
              <FormField
                label="Titre *"
                error={caseForm.formState.errors.title?.message}
              >
                <FormTextInput
                  {...caseForm.register("title")}
                  invalid={!!caseForm.formState.errors.title}
                  data-testid="case-title-input"
                />
              </FormField>
              <FormField
                label="Module"
                error={caseForm.formState.errors.module?.message}
              >
                <FormTextInput {...caseForm.register("module")} />
              </FormField>
              <FormField
                label="Objectif"
                error={caseForm.formState.errors.objective?.message}
              >
                <FormTextInput {...caseForm.register("objective")} />
              </FormField>
              <FormField
                label="Prérequis"
                error={caseForm.formState.errors.preconditions?.message}
              >
                <FormTextInput {...caseForm.register("preconditions")} />
              </FormField>
              <FormField
                label="Résultat attendu *"
                error={caseForm.formState.errors.expectedResult?.message}
              >
                <FormTextInput
                  {...caseForm.register("expectedResult")}
                  invalid={!!caseForm.formState.errors.expectedResult}
                  data-testid="case-expected-result-input"
                />
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Priorité"
                  error={caseForm.formState.errors.priority?.message}
                >
                  <FormSelect {...caseForm.register("priority")}>
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {priorityLabel(p)}
                      </option>
                    ))}
                  </FormSelect>
                </FormField>
                <FormField
                  label="Échéance"
                  error={caseForm.formState.errors.dueAt?.message}
                >
                  <FormTextInput {...caseForm.register("dueAt")} type="date" />
                </FormField>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="evidenceRequired"
                  {...caseForm.register("evidenceRequired")}
                  className="h-4 w-4 rounded border-input"
                />
                <label
                  htmlFor="evidenceRequired"
                  className="text-sm font-medium"
                >
                  Capture d&apos;écran obligatoire
                </label>
              </div>
              {caseError && (
                <p className="text-sm text-destructive">{caseError}</p>
              )}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={!caseForm.formState.isValid || savingCase}
                  className="rounded-[14px] bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  data-testid="case-save-btn"
                >
                  {savingCase ? "Enregistrement…" : "Enregistrer"}
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowCaseForm(false)}
                >
                  Annuler
                </Button>
              </div>
            </form>
          </Card>
        )}

        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Chargement…
          </div>
        ) : (
          <div className="space-y-2">
            {cases.map((tc) => (
              <Card
                key={tc.id}
                className="flex items-center justify-between gap-4 px-5 py-4"
                data-testid={`case-row-${tc.id}`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-muted-foreground">
                      CAS-{String(tc.reference).padStart(6, "0")}
                    </span>
                    <span className="font-semibold text-foreground">
                      {tc.title}
                    </span>
                  </div>
                  <div className="mt-1 flex gap-4 text-xs text-muted-foreground">
                    {tc.module && <span>{tc.module}</span>}
                    <span>{tc.executionsCount} exécution(s)</span>
                    {tc.recycledAt && (
                      <span>Recyclé le {formatDate(tc.recycledAt)}</span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => openEditCase(tc)}
                  >
                    Modifier
                  </Button>
                  <button
                    type="button"
                    disabled={recyclingId === tc.id}
                    onClick={() => void handleRecycle(tc.id)}
                    className="rounded-[14px] border border-warm-border px-3 py-1.5 text-xs font-semibold text-foreground disabled:opacity-50"
                    data-testid={`case-recycle-${tc.id}`}
                  >
                    {recyclingId === tc.id ? "…" : "Recycler"}
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {messageTarget && (
        <QuickMessageModal
          tester={messageTarget}
          onClose={() => setMessageTarget(null)}
        />
      )}
    </div>
  );
}

function QuickMessageModal({
  tester,
  onClose,
}: {
  tester: TesterRow;
  onClose: () => void;
}) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const schoolSlug = tester.schools[0]?.slug ?? null;

  const form = useForm<MessageFormValues>({
    resolver: zodResolver(messageSchema),
    mode: "onChange",
    defaultValues: { subject: "", body: "" },
  });

  async function handleSend(values: MessageFormValues) {
    if (!schoolSlug) {
      setError("Ce testeur n'est rattaché à aucune école.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      await createSchoolMessage(schoolSlug, {
        subject: values.subject,
        body: values.body,
        recipientUserIds: [tester.id],
      });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-md space-y-4 p-6">
        <h3 className="text-base font-semibold">
          Message rapide à {tester.fullName}
        </h3>
        {sent ? (
          <>
            <p
              className="text-sm text-foreground"
              data-testid="quick-message-sent"
            >
              Message envoyé.
            </p>
            <Button type="button" onClick={onClose}>
              Fermer
            </Button>
          </>
        ) : (
          <form onSubmit={form.handleSubmit(handleSend)} className="space-y-4">
            <FormField
              label="Sujet *"
              error={form.formState.errors.subject?.message}
            >
              <FormTextInput
                {...form.register("subject")}
                invalid={!!form.formState.errors.subject}
                data-testid="quick-message-subject"
              />
            </FormField>
            <FormField
              label="Message *"
              error={form.formState.errors.body?.message}
            >
              <FormTextarea
                {...form.register("body")}
                invalid={!!form.formState.errors.body}
                rows={4}
                data-testid="quick-message-body"
              />
            </FormField>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={!form.formState.isValid || sending}
                className="rounded-[14px] bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                data-testid="quick-message-send"
              >
                {sending ? "Envoi…" : "Envoyer"}
              </button>
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={sending}
              >
                Annuler
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}

function TestersTab() {
  const [testers, setTesters] = useState<TesterRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [messageTarget, setMessageTarget] = useState<TesterRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(
        `${API_URL}/admin/tests/testers?${params.toString()}`,
        {
          credentials: "include",
        },
      );
      if (res.ok) {
        const data = (await res.json()) as { items: TesterRow[] };
        setTesters(data.items ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <FormTextInput
        placeholder="Rechercher un testeur par nom…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        data-testid="testers-search"
        className="max-w-xs"
      />

      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Chargement…
        </div>
      ) : testers.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
          Aucun testeur.
        </div>
      ) : (
        <table className="w-full text-left text-sm" data-testid="testers-table">
          <thead>
            <tr className="text-xs uppercase text-muted-foreground">
              <th className="py-2">Nom</th>
              <th className="py-2">École(s)</th>
              <th className="py-2">Campagnes</th>
              <th className="py-2">Tests faits</th>
              <th className="py-2">OK</th>
              <th className="py-2">NOK</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {testers.map((tester) => (
              <tr
                key={tester.id}
                className="border-t border-warm-border"
                data-testid={`tester-row-${tester.id}`}
              >
                <td className="py-2 font-medium text-foreground">
                  {tester.fullName}
                </td>
                <td className="py-2 text-muted-foreground">
                  {tester.schools.map((s) => s.name).join(", ") || "—"}
                </td>
                <td className="py-2">{tester.stats.campaignsCount}</td>
                <td className="py-2">{tester.stats.executionsCount}</td>
                <td className="py-2 text-green-700">
                  {tester.stats.passedCount}
                </td>
                <td className="py-2 text-red-700">
                  {tester.stats.failedCount}
                </td>
                <td className="py-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setMessageTarget(tester)}
                  >
                    Message rapide
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {messageTarget && (
        <QuickMessageModal
          tester={messageTarget}
          onClose={() => setMessageTarget(null)}
        />
      )}
    </div>
  );
}

function ExecutionsTab({
  filter,
  onFilterChange,
}: {
  filter: ExecutionsFilter;
  onFilterChange: (filter: ExecutionsFilter) => void;
}) {
  const [items, setItems] = useState<ExecutionRow[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [testers, setTesters] = useState<TesterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ExecutionRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.status) params.set("status", filter.status);
      if (filter.campaignId) params.set("campaignId", filter.campaignId);
      if (filter.testerId) params.set("testerId", filter.testerId);
      if (filter.reviewed) params.set("reviewed", filter.reviewed);
      const res = await fetch(
        `${API_URL}/admin/tests/executions?${params.toString()}`,
        { credentials: "include" },
      );
      if (res.ok) {
        const data = (await res.json()) as { items: ExecutionRow[] };
        setItems(data.items ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void (async () => {
      const [campaignsRes, testersRes] = await Promise.all([
        fetch(`${API_URL}/admin/tests/campaigns?limit=100`, {
          credentials: "include",
        }),
        fetch(`${API_URL}/admin/tests/testers?limit=100`, {
          credentials: "include",
        }),
      ]);
      if (campaignsRes.ok) {
        const data = (await campaignsRes.json()) as { items: CampaignRow[] };
        setCampaigns(data.items ?? []);
      }
      if (testersRes.ok) {
        const data = (await testersRes.json()) as { items: TesterRow[] };
        setTesters(data.items ?? []);
      }
    })();
  }, []);

  if (selected) {
    return (
      <ExecutionDetail
        executionId={selected.id}
        onBack={() => setSelected(null)}
        onReviewed={load}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <FormSelect
          value={filter.status}
          onChange={(e) =>
            onFilterChange({
              ...filter,
              status: e.target.value as ExecutionStatus | "",
            })
          }
          data-testid="executions-status-filter"
          className="max-w-[180px]"
        >
          <option value="">Tous statuts</option>
          {EXECUTION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {executionStatusLabel(s)}
            </option>
          ))}
        </FormSelect>
        <FormSelect
          value={filter.campaignId}
          onChange={(e) =>
            onFilterChange({ ...filter, campaignId: e.target.value })
          }
          data-testid="executions-campaign-filter"
          className="max-w-[220px]"
        >
          <option value="">Toutes campagnes</option>
          {campaigns.map((campaign) => (
            <option key={campaign.id} value={campaign.id}>
              {campaign.title}
            </option>
          ))}
        </FormSelect>
        <FormSelect
          value={filter.testerId}
          onChange={(e) =>
            onFilterChange({ ...filter, testerId: e.target.value })
          }
          data-testid="executions-tester-filter"
          className="max-w-[200px]"
        >
          <option value="">Tous testeurs</option>
          {testers.map((tester) => (
            <option key={tester.id} value={tester.id}>
              {tester.fullName}
            </option>
          ))}
        </FormSelect>
        <FormSelect
          value={filter.reviewed}
          onChange={(e) =>
            onFilterChange({
              ...filter,
              reviewed: e.target.value as ExecutionsFilter["reviewed"],
            })
          }
          data-testid="executions-reviewed-filter"
          className="max-w-[160px]"
        >
          <option value="">Tous</option>
          <option value="false">À traiter</option>
          <option value="true">Traités</option>
        </FormSelect>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Chargement…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
          Aucune exécution ne correspond à ces filtres.
        </div>
      ) : (
        <table
          className="w-full text-left text-sm"
          data-testid="executions-table"
        >
          <thead>
            <tr className="text-xs uppercase text-muted-foreground">
              <th className="py-2">Test</th>
              <th className="py-2">Campagne</th>
              <th className="py-2">Testeur</th>
              <th className="py-2">Statut</th>
              <th className="py-2">Date</th>
              <th className="py-2">Traitement</th>
            </tr>
          </thead>
          <tbody>
            {items.map((execution) => (
              <tr
                key={execution.id}
                className="cursor-pointer border-t border-warm-border hover:bg-warm-surface"
                onClick={() => setSelected(execution)}
                data-testid={`execution-row-${execution.id}`}
              >
                <td className="py-2 font-medium text-foreground">
                  {execution.testCase.title}
                </td>
                <td className="py-2 text-muted-foreground">
                  {execution.campaign.title}
                </td>
                <td className="py-2">{execution.user.fullName}</td>
                <td className="py-2">
                  <ExecutionStatusBadge status={execution.status} />
                </td>
                <td className="py-2 text-muted-foreground">
                  {formatDateTime(execution.executedAt)}
                </td>
                <td className="py-2">
                  {execution.adminReviewedAt ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      Traité
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      À traiter
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function ExecutionDetail({
  executionId,
  onBack,
  onReviewed,
}: {
  executionId: string;
  onBack: () => void;
  onReviewed: () => void;
}) {
  const [detail, setDetail] = useState<ExecutionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/admin/tests/executions/${executionId}`,
        { credentials: "include" },
      );
      if (res.ok) {
        setDetail(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, [executionId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submitReview(reviewed: boolean) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_URL}/admin/tests/executions/${executionId}/review`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reviewed, note: reviewed ? note : undefined }),
        },
      );
      if (!res.ok) {
        const err = (await res.json()) as { message?: string };
        setError(err.message ?? "Erreur lors de l'enregistrement.");
        return;
      }
      setShowReviewForm(false);
      setNote("");
      await load();
      onReviewed();
    } finally {
      setSaving(false);
    }
  }

  if (loading || !detail) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Chargement…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button type="button" variant="secondary" onClick={onBack}>
        ← Retour
      </Button>

      <Card className="space-y-3 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground">
            {detail.testCase.title}
          </h2>
          <ExecutionStatusBadge status={detail.status} />
        </div>
        <p className="text-sm text-muted-foreground">
          {detail.campaign.title} · {detail.user.fullName} ·{" "}
          {formatDateTime(detail.executedAt)}
        </p>

        <div>
          <h3 className="text-sm font-semibold text-foreground">Résultat</h3>
          <p className="text-sm text-muted-foreground">
            {detail.resultText?.trim() || "—"}
          </p>
        </div>

        {detail.comment && (
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Commentaire
            </h3>
            <p className="text-sm text-muted-foreground">{detail.comment}</p>
          </div>
        )}

        {(detail.deviceInfo || detail.appVersion) && (
          <div className="flex gap-4 text-xs text-muted-foreground">
            {detail.deviceInfo && <span>Appareil : {detail.deviceInfo}</span>}
            {detail.appVersion && <span>Version : {detail.appVersion}</span>}
          </div>
        )}

        {detail.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {detail.attachments.map((attachment) => (
              <a
                key={attachment.id}
                href={attachment.url}
                target="_blank"
                rel="noreferrer"
              >
                <img
                  src={attachment.url}
                  alt={attachment.fileName}
                  className="h-20 w-20 rounded-lg border border-warm-border object-cover"
                />
              </a>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-3 p-5">
        {detail.adminReviewedAt ? (
          <>
            <p className="text-sm font-semibold text-green-700">
              Traité par {detail.adminReviewedBy?.fullName ?? "—"} le{" "}
              {formatDateTime(detail.adminReviewedAt)}
            </p>
            {detail.adminReviewNote && (
              <p className="text-sm text-muted-foreground">
                {detail.adminReviewNote}
              </p>
            )}
            <Button
              type="button"
              variant="secondary"
              onClick={() => void submitReview(false)}
              disabled={saving}
            >
              Annuler le traitement
            </Button>
          </>
        ) : showReviewForm ? (
          <div className="space-y-3">
            <FormTextarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note optionnelle, ex. Corrigé dans la version 1.3"
              data-testid="execution-review-note"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => void submitReview(true)}
                disabled={saving}
                data-testid="execution-review-submit"
              >
                {saving ? "Enregistrement…" : "Valider"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowReviewForm(false)}
                disabled={saving}
              >
                Annuler
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            onClick={() => setShowReviewForm(true)}
            data-testid="execution-mark-reviewed"
          >
            Marquer traité
          </Button>
        )}
      </Card>
    </div>
  );
}

const EXECUTION_STATUS_DISPLAY: Record<
  ExecutionStatus,
  { label: string; className: string }
> = {
  PASSED: { label: "Validé", className: "bg-green-100 text-green-700" },
  FAILED: { label: "Échoué", className: "bg-red-100 text-red-700" },
  BLOCKED: { label: "Bloqué", className: "bg-amber-100 text-amber-700" },
  SKIPPED: { label: "Ignoré", className: "bg-slate-100 text-slate-600" },
  IN_PROGRESS: { label: "En cours", className: "bg-green-100 text-green-700" },
  TODO: { label: "À faire", className: "bg-slate-100 text-slate-600" },
};

function ExecutionStatusBadge({ status }: { status: ExecutionStatus }) {
  const { label, className } = EXECUTION_STATUS_DISPLAY[status];
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}

function executionStatusLabel(status: ExecutionStatus) {
  return EXECUTION_STATUS_DISPLAY[status].label;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function StatusBadge({ status }: { status: CampaignStatus }) {
  const map = {
    DRAFT: { label: "Brouillon", className: "bg-muted text-muted-foreground" },
    ACTIVE: { label: "Active", className: "bg-green-100 text-green-700" },
    ARCHIVED: { label: "Archivée", className: "bg-slate-100 text-slate-600" },
  } as const;
  const { label, className } = map[status];
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}

function statusLabel(status: CampaignStatus) {
  return status === "DRAFT"
    ? "Brouillon"
    : status === "ACTIVE"
      ? "Active"
      : "Archivée";
}

function priorityLabel(priority: CasePriority) {
  switch (priority) {
    case "LOW":
      return "Faible";
    case "HIGH":
      return "Haute";
    case "CRITICAL":
      return "Critique";
    default:
      return "Moyenne";
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}
