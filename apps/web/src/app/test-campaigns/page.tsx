"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AppShell } from "../../components/layout/app-shell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { FormSelect, FormTextInput } from "../../components/ui/form-controls";
import { FormField } from "../../components/ui/form-field";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type SchoolOption = { id: string; slug: string; name: string };

type CampaignRow = {
  id: string;
  title: string;
  description: string | null;
  targetVersion: string | null;
  startsAt: string | null;
  dueAt: string | null;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  testCasesCount: number;
};

type TestCaseRow = {
  id: string;
  title: string;
  module: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  dueAt: string | null;
  evidenceRequired: boolean;
  audienceRoles: string[];
  executionsCount: number;
};

const CAMPAIGN_STATUSES: CampaignRow["status"][] = [
  "DRAFT",
  "ACTIVE",
  "ARCHIVED",
];
const PRIORITIES: TestCaseRow["priority"][] = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
];

const campaignSchema = z.object({
  title: z.string().trim().min(1, "Le titre est obligatoire."),
  description: z.string().trim().optional(),
  targetVersion: z.string().trim().optional(),
  startsAt: z.string().optional(),
  dueAt: z.string().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
});

const testCaseSchema = z.object({
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

type CampaignFormValues = z.output<typeof campaignSchema>;
type TestCaseFormValues = z.output<typeof testCaseSchema>;

type View = "campaigns" | "cases";

export default function TestCampaignsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [view, setView] = useState<View>("campaigns");
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignRow | null>(
    null,
  );
  const [cases, setCases] = useState<TestCaseRow[]>([]);
  const [loadingCases, setLoadingCases] = useState(false);

  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<CampaignRow | null>(
    null,
  );
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [campaignError, setCampaignError] = useState<string | null>(null);
  const [deletingCampaignId, setDeletingCampaignId] = useState<string | null>(
    null,
  );
  const [campaignDeleteTarget, setCampaignDeleteTarget] = useState<{
    id: string;
    label: string;
  } | null>(null);

  const [showCaseForm, setShowCaseForm] = useState(false);
  const [editingCase, setEditingCase] = useState<TestCaseRow | null>(null);
  const [savingCase, setSavingCase] = useState(false);
  const [caseError, setCaseError] = useState<string | null>(null);
  const [deletingCaseId, setDeletingCaseId] = useState<string | null>(null);
  const [caseDeleteTarget, setCaseDeleteTarget] = useState<{
    id: string;
    label: string;
  } | null>(null);

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

  const caseForm = useForm<TestCaseFormValues>({
    resolver: zodResolver(testCaseSchema),
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

  useEffect(() => {
    void boot();
  }, []);

  useEffect(() => {
    if (selectedSlug) void loadCampaigns(selectedSlug);
  }, [selectedSlug]);

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
      const schoolsRes = await fetch(`${API_URL}/schools`, {
        credentials: "include",
      });
      if (schoolsRes.ok) {
        const data = (await schoolsRes.json()) as { items: SchoolOption[] };
        setSchools(data.items ?? []);
        const first = data.items?.[0];
        if (first) setSelectedSlug(first.slug);
      }
    } catch {
      router.replace("/");
    } finally {
      setReady(true);
    }
  }

  const loadCampaigns = useCallback(async (slug: string) => {
    setLoadingCampaigns(true);
    try {
      const res = await fetch(
        `${API_URL}/schools/${slug}/admin/tests/campaigns`,
        { credentials: "include" },
      );
      if (res.ok) {
        const data = (await res.json()) as CampaignRow[];
        setCampaigns(data);
      }
    } finally {
      setLoadingCampaigns(false);
    }
  }, []);

  async function loadCases(slug: string, campaignId: string) {
    setLoadingCases(true);
    try {
      const res = await fetch(
        `${API_URL}/schools/${slug}/admin/tests/campaigns/${campaignId}`,
        { credentials: "include" },
      );
      if (res.ok) {
        const data = (await res.json()) as { testCases: TestCaseRow[] };
        setCases(data.testCases ?? []);
      }
    } finally {
      setLoadingCases(false);
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
    if (!selectedSlug) return;
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
        ? `${API_URL}/schools/${selectedSlug}/admin/tests/campaigns/${editingCampaign.id}`
        : `${API_URL}/schools/${selectedSlug}/admin/tests/campaigns`;
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
      await loadCampaigns(selectedSlug);
    } finally {
      setSavingCampaign(false);
    }
  }

  async function handleDeleteCampaign(id: string) {
    if (!selectedSlug) return;
    setDeletingCampaignId(id);
    try {
      await fetch(
        `${API_URL}/schools/${selectedSlug}/admin/tests/campaigns/${id}`,
        { method: "DELETE", credentials: "include" },
      );
      await loadCampaigns(selectedSlug);
    } finally {
      setDeletingCampaignId(null);
      setCampaignDeleteTarget(null);
    }
  }

  function openCampaignDetail(campaign: CampaignRow) {
    setSelectedCampaign(campaign);
    setCases([]);
    setView("cases");
    void loadCases(selectedSlug, campaign.id);
  }

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

  function openEditCase(tc: TestCaseRow) {
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

  async function handleCaseSubmit(values: TestCaseFormValues) {
    if (!selectedSlug || !selectedCampaign) return;
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
        ? `${API_URL}/schools/${selectedSlug}/admin/tests/cases/${editingCase.id}`
        : `${API_URL}/schools/${selectedSlug}/admin/tests/campaigns/${selectedCampaign.id}/cases`;
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
      await loadCases(selectedSlug, selectedCampaign.id);
    } finally {
      setSavingCase(false);
    }
  }

  async function handleDeleteCase(id: string) {
    if (!selectedSlug) return;
    setDeletingCaseId(id);
    try {
      await fetch(
        `${API_URL}/schools/${selectedSlug}/admin/tests/cases/${id}`,
        { method: "DELETE", credentials: "include" },
      );
      if (selectedCampaign) await loadCases(selectedSlug, selectedCampaign.id);
    } finally {
      setDeletingCaseId(null);
      setCaseDeleteTarget(null);
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
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Campagnes de tests</h1>
            <p className="text-sm text-muted-foreground">
              Gérez les campagnes de recette et les cas de test.
            </p>
          </div>
          {view === "cases" && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setView("campaigns");
                setSelectedCampaign(null);
                setShowCaseForm(false);
              }}
            >
              ← Retour aux campagnes
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm font-medium">École :</label>
          <select
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
            value={selectedSlug}
            onChange={(e) => {
              setSelectedSlug(e.target.value);
              setView("campaigns");
              setSelectedCampaign(null);
            }}
          >
            {schools.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {view === "campaigns" && (
          <CampaignsList
            campaigns={campaigns}
            loading={loadingCampaigns}
            showForm={showCampaignForm}
            form={campaignForm}
            saving={savingCampaign}
            error={campaignError}
            deletingId={deletingCampaignId}
            deleteTarget={campaignDeleteTarget}
            onOpenCreate={openCreateCampaign}
            onEdit={openEditCampaign}
            onRequestDelete={(c) =>
              setCampaignDeleteTarget({ id: c.id, label: c.title })
            }
            onConfirmDelete={() => {
              if (campaignDeleteTarget)
                void handleDeleteCampaign(campaignDeleteTarget.id);
            }}
            onCancelDelete={() => setCampaignDeleteTarget(null)}
            onSubmit={campaignForm.handleSubmit(handleCampaignSubmit)}
            onCancelForm={() => setShowCampaignForm(false)}
            onOpenDetail={openCampaignDetail}
          />
        )}

        {view === "cases" && selectedCampaign && (
          <CasesList
            campaign={selectedCampaign}
            cases={cases}
            loading={loadingCases}
            showForm={showCaseForm}
            form={caseForm}
            saving={savingCase}
            error={caseError}
            deletingId={deletingCaseId}
            deleteTarget={caseDeleteTarget}
            onOpenCreate={openCreateCase}
            onEdit={openEditCase}
            onRequestDelete={(tc) =>
              setCaseDeleteTarget({ id: tc.id, label: tc.title })
            }
            onConfirmDelete={() => {
              if (caseDeleteTarget) void handleDeleteCase(caseDeleteTarget.id);
            }}
            onCancelDelete={() => setCaseDeleteTarget(null)}
            onSubmit={caseForm.handleSubmit(handleCaseSubmit)}
            onCancelForm={() => setShowCaseForm(false)}
          />
        )}
      </div>
    </AppShell>
  );
}

function CampaignsList({
  campaigns,
  loading,
  showForm,
  form,
  saving,
  error,
  deletingId,
  deleteTarget,
  onOpenCreate,
  onEdit,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
  onSubmit,
  onCancelForm,
  onOpenDetail,
}: {
  campaigns: CampaignRow[];
  loading: boolean;
  showForm: boolean;
  form: ReturnType<typeof useForm<CampaignFormValues>>;
  saving: boolean;
  error: string | null;
  deletingId: string | null;
  deleteTarget: { id: string; label: string } | null;
  onOpenCreate: () => void;
  onEdit: (c: CampaignRow) => void;
  onRequestDelete: (c: CampaignRow) => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancelForm: () => void;
  onOpenDetail: (c: CampaignRow) => void;
}) {
  const {
    register,
    formState: { errors, isValid },
    getValues,
  } = form;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {campaigns.length} campagne{campaigns.length !== 1 ? "s" : ""}
        </h2>
        <Button
          type="button"
          onClick={onOpenCreate}
          data-testid="create-campaign-btn"
        >
          + Nouvelle campagne
        </Button>
      </div>

      {showForm && (
        <Card className="p-6">
          <h3 className="mb-4 text-base font-semibold">
            {getValues("title") ? "Modifier la campagne" : "Nouvelle campagne"}
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
                placeholder="Description optionnelle"
                invalid={!!errors.description}
              />
            </FormField>
            <FormField
              label="Version cible"
              error={errors.targetVersion?.message}
            >
              <FormTextInput
                {...register("targetVersion")}
                placeholder="ex: 1.3.0"
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
                    {s === "DRAFT"
                      ? "Brouillon"
                      : s === "ACTIVE"
                        ? "Active"
                        : "Archivée"}
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
                onClick={onCancelForm}
                disabled={saving}
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
      ) : campaigns.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
          Aucune campagne pour cette école.
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
                onClick={() => onOpenDetail(campaign)}
              >
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-foreground">
                    {campaign.title}
                  </span>
                  <StatusBadge status={campaign.status} />
                </div>
                <div className="mt-1 flex gap-4 text-xs text-muted-foreground">
                  {campaign.targetVersion && (
                    <span>v{campaign.targetVersion}</span>
                  )}
                  <span>{campaign.testCasesCount} cas de test</span>
                  {campaign.dueAt && (
                    <span>Échéance : {formatDate(campaign.dueAt)}</span>
                  )}
                </div>
              </button>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => onEdit(campaign)}
                  data-testid={`campaign-edit-${campaign.id}`}
                >
                  Modifier
                </Button>
                <button
                  type="button"
                  disabled={deletingId === campaign.id}
                  onClick={() => onRequestDelete(campaign)}
                  className="rounded-[14px] bg-destructive px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                  data-testid={`campaign-delete-${campaign.id}`}
                >
                  {deletingId === campaign.id ? "…" : "Supprimer"}
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
          onConfirm={onConfirmDelete}
          onCancel={onCancelDelete}
        />
      )}
    </div>
  );
}

function CasesList({
  campaign,
  cases,
  loading,
  showForm,
  form,
  saving,
  error,
  deletingId,
  deleteTarget,
  onOpenCreate,
  onEdit,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
  onSubmit,
  onCancelForm,
}: {
  campaign: CampaignRow;
  cases: TestCaseRow[];
  loading: boolean;
  showForm: boolean;
  form: ReturnType<typeof useForm<TestCaseFormValues>>;
  saving: boolean;
  error: string | null;
  deletingId: string | null;
  deleteTarget: { id: string; label: string } | null;
  onOpenCreate: () => void;
  onEdit: (tc: TestCaseRow) => void;
  onRequestDelete: (tc: TestCaseRow) => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancelForm: () => void;
}) {
  const {
    register,
    formState: { errors, isValid },
    getValues,
  } = form;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-muted/30 p-4">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-foreground">
            {campaign.title}
          </span>
          <StatusBadge status={campaign.status} />
          {campaign.targetVersion && (
            <span className="text-xs text-muted-foreground">
              v{campaign.targetVersion}
            </span>
          )}
        </div>
        {campaign.description && (
          <p className="mt-1 text-sm text-muted-foreground">
            {campaign.description}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{cases.length} cas de test</h2>
        <Button
          type="button"
          onClick={onOpenCreate}
          data-testid="create-case-btn"
        >
          + Nouveau cas
        </Button>
      </div>

      {showForm && (
        <Card className="p-6">
          <h3 className="mb-4 text-base font-semibold">
            {getValues("title") ? "Modifier le cas" : "Nouveau cas de test"}
          </h3>
          <form onSubmit={onSubmit} className="space-y-4">
            <FormField label="Titre *" error={errors.title?.message}>
              <FormTextInput
                {...register("title")}
                placeholder="ex: Envoi d'un message"
                invalid={!!errors.title}
                data-testid="case-title-input"
              />
            </FormField>
            <FormField label="Module" error={errors.module?.message}>
              <FormTextInput
                {...register("module")}
                placeholder="ex: Messagerie"
                invalid={!!errors.module}
              />
            </FormField>
            <FormField label="Objectif" error={errors.objective?.message}>
              <FormTextInput
                {...register("objective")}
                placeholder="Décrire l'objectif du test"
                invalid={!!errors.objective}
              />
            </FormField>
            <FormField label="Prérequis" error={errors.preconditions?.message}>
              <FormTextInput
                {...register("preconditions")}
                placeholder="Conditions nécessaires avant le test"
                invalid={!!errors.preconditions}
              />
            </FormField>
            <FormField
              label="Résultat attendu *"
              error={errors.expectedResult?.message}
            >
              <FormTextInput
                {...register("expectedResult")}
                placeholder="Ce qui doit se passer"
                invalid={!!errors.expectedResult}
                data-testid="case-expected-result-input"
              />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Priorité" error={errors.priority?.message}>
                <FormSelect
                  {...register("priority")}
                  invalid={!!errors.priority}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p === "LOW"
                        ? "Faible"
                        : p === "MEDIUM"
                          ? "Moyenne"
                          : p === "HIGH"
                            ? "Haute"
                            : "Critique"}
                    </option>
                  ))}
                </FormSelect>
              </FormField>
              <FormField label="Échéance" error={errors.dueAt?.message}>
                <FormTextInput
                  {...register("dueAt")}
                  type="date"
                  invalid={!!errors.dueAt}
                />
              </FormField>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="evidenceRequired"
                {...register("evidenceRequired")}
                className="h-4 w-4 rounded border-input"
              />
              <label htmlFor="evidenceRequired" className="text-sm font-medium">
                Capture d&apos;écran obligatoire
              </label>
            </div>
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
                data-testid="case-save-btn"
              >
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
              <Button
                type="button"
                variant="ghost"
                onClick={onCancelForm}
                disabled={saving}
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
      ) : cases.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
          Aucun cas de test pour cette campagne.
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
                  <span className="font-semibold text-foreground">
                    {tc.title}
                  </span>
                  <PriorityBadge priority={tc.priority} />
                  {tc.evidenceRequired && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      Capture requise
                    </span>
                  )}
                </div>
                <div className="mt-1 flex gap-4 text-xs text-muted-foreground">
                  {tc.module && <span>{tc.module}</span>}
                  <span>{tc.executionsCount} exécution(s)</span>
                  {tc.dueAt && <span>Échéance : {formatDate(tc.dueAt)}</span>}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => onEdit(tc)}
                  data-testid={`case-edit-${tc.id}`}
                >
                  Modifier
                </Button>
                <button
                  type="button"
                  disabled={deletingId === tc.id}
                  onClick={() => onRequestDelete(tc)}
                  className="rounded-[14px] bg-destructive px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                  data-testid={`case-delete-${tc.id}`}
                >
                  {deletingId === tc.id ? "…" : "Supprimer"}
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          open={!!deleteTarget}
          title="Supprimer le cas de test"
          message={`Supprimer "${deleteTarget.label}" ? Toutes les exécutions associées seront perdues.`}
          confirmLabel="Supprimer"
          onConfirm={onConfirmDelete}
          onCancel={onCancelDelete}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: CampaignRow["status"] }) {
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

function PriorityBadge({ priority }: { priority: TestCaseRow["priority"] }) {
  const map = {
    LOW: { label: "Faible", className: "bg-slate-100 text-slate-600" },
    MEDIUM: { label: "Moyenne", className: "bg-blue-100 text-blue-700" },
    HIGH: { label: "Haute", className: "bg-orange-100 text-orange-700" },
    CRITICAL: { label: "Critique", className: "bg-red-100 text-red-700" },
  } as const;
  const { label, className } = map[priority];
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}
