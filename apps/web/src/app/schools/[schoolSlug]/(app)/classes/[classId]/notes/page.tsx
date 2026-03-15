"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, ClipboardCheck, FileText, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Card } from "../../../../../../../components/ui/card";
import { BackButton } from "../../../../../../../components/ui/form-buttons";
import { FormField } from "../../../../../../../components/ui/form-field";
import { ModuleHelpTab } from "../../../../../../../components/ui/module-help-tab";
import { PaginationControls } from "../../../../../../../components/ui/pagination-controls";
import { getCsrfTokenCookie } from "../../../../../../../lib/auth-cookies";
import {
  getCreateEvaluationDefaults,
  getEvaluationListMeta,
  paginateEvaluations,
  type CreateEvaluationFormValues,
} from "./page-logic";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type TabKey = "evaluations" | "scores" | "council" | "help";

type TeacherContext = {
  class: {
    id: string;
    name: string;
    schoolYearId: string;
  };
  subjects: Array<{
    id: string;
    name: string;
    branches: Array<{ id: string; name: string; code?: string | null }>;
  }>;
  evaluationTypes: Array<{
    id: string;
    code: string;
    label: string;
    isDefault: boolean;
  }>;
  students: Array<{
    id: string;
    firstName: string;
    lastName: string;
  }>;
};

type EvaluationRow = {
  id: string;
  title: string;
  description?: string | null;
  coefficient: number;
  maxScore: number;
  term: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  scheduledAt?: string | null;
  createdAt: string;
  updatedAt: string;
  subject: { id: string; name: string };
  subjectBranch?: { id: string; name: string } | null;
  evaluationType: { id: string; code: string; label: string };
  attachments: Array<{
    id: string;
    fileName: string;
    fileUrl?: string | null;
    sizeLabel?: string | null;
    mimeType?: string | null;
  }>;
  _count: { scores: number };
};

type EvaluationDetail = EvaluationRow & {
  students: Array<{
    id: string;
    firstName: string;
    lastName: string;
    score: number | null;
    scoreStatus: "ENTERED" | "ABSENT" | "EXCUSED" | "NOT_GRADED";
    comment?: string | null;
  }>;
};

type AttachmentDraft = {
  fileName: string;
  fileUrl?: string;
  sizeLabel?: string;
  mimeType?: string;
};

type CouncilTermReport = {
  term: string;
  status: "DRAFT" | "PUBLISHED";
  councilHeldAt?: string | null;
  students: Array<{
    studentId: string;
    firstName: string;
    lastName: string;
    generalAppreciation?: string | null;
    subjects: Array<{
      subjectId: string;
      appreciation: string;
    }>;
  }>;
};

const createEvaluationSchema = z.object({
  subjectId: z.string().min(1, "Selectionnez une matiere."),
  subjectBranchId: z.string(),
  evaluationTypeId: z.string().min(1, "Selectionnez un type d'evaluation."),
  title: z
    .string()
    .trim()
    .min(3, "Le titre doit contenir au moins 3 caracteres."),
  description: z.string(),
  coefficient: z.number().gt(0, "Le coefficient doit etre superieur a 0."),
  maxScore: z.number().gt(0, "Le bareme doit etre superieur a 0."),
  term: z.enum(["TERM_1", "TERM_2", "TERM_3"]),
  scheduledAt: z.string(),
  status: z.enum(["DRAFT", "PUBLISHED"]),
});

export default function TeacherClassNotesPage() {
  const { schoolSlug, classId } = useParams<{
    schoolSlug: string;
    classId: string;
  }>();
  const router = useRouter();

  const [tab, setTab] = useState<TabKey>("evaluations");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingScores, setSavingScores] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [context, setContext] = useState<TeacherContext | null>(null);
  const [evaluations, setEvaluations] = useState<EvaluationRow[]>([]);
  const [selectedEvaluationId, setSelectedEvaluationId] = useState("");
  const [selectedEvaluation, setSelectedEvaluation] =
    useState<EvaluationDetail | null>(null);
  const [evaluationPage, setEvaluationPage] = useState(1);
  const [evaluationPanelMode, setEvaluationPanelMode] = useState<
    "details" | "create"
  >("details");
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);
  const [councilTerm, setCouncilTerm] = useState("TERM_1");
  const [councilStatus, setCouncilStatus] = useState<"DRAFT" | "PUBLISHED">(
    "DRAFT",
  );
  const [councilHeldAt, setCouncilHeldAt] = useState("");
  const [savingCouncil, setSavingCouncil] = useState(false);
  const [councilDrafts, setCouncilDrafts] = useState<
    Record<
      string,
      {
        generalAppreciation: string;
        subjects: Record<string, string>;
      }
    >
  >({});

  const [scoreDrafts, setScoreDrafts] = useState<
    Record<string, { score: string; status: string; comment: string }>
  >({});
  const createEvaluationForm = useForm<CreateEvaluationFormValues>({
    resolver: zodResolver(createEvaluationSchema),
    mode: "onChange",
    defaultValues: getCreateEvaluationDefaults(),
  });
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    reset,
    formState: { errors: createEvaluationErrors, isValid: isCreateFormValid },
  } = createEvaluationForm;
  const watchedSubjectId = watch("subjectId");

  useEffect(() => {
    void bootstrap();
  }, [schoolSlug, classId]);

  useEffect(() => {
    if (!context) {
      return;
    }
    reset(getCreateEvaluationDefaults(context));
  }, [context, reset]);

  useEffect(() => {
    if (!context) {
      return;
    }
    if (!watchedSubjectId) {
      setValue("subjectBranchId", "", { shouldValidate: true });
      return;
    }

    const subject = context.subjects.find(
      (entry) => entry.id === watchedSubjectId,
    );
    const currentBranchId = getValues("subjectBranchId");
    if (!subject || subject.branches.length === 0) {
      if (currentBranchId) {
        setValue("subjectBranchId", "", { shouldValidate: true });
      }
      return;
    }
    if (!subject.branches.some((branch) => branch.id === currentBranchId)) {
      setValue("subjectBranchId", subject.branches[0].id, {
        shouldValidate: true,
      });
    }
  }, [context, getValues, setValue, watchedSubjectId]);

  useEffect(() => {
    if (!selectedEvaluationId) {
      setSelectedEvaluation(null);
      return;
    }

    void loadEvaluationDetail(selectedEvaluationId);
  }, [selectedEvaluationId]);

  useEffect(() => {
    if (!context) {
      return;
    }

    void loadCouncilReports(councilTerm);
  }, [context, councilTerm]);

  async function bootstrap() {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const meResponse = await fetch(`${API_URL}/schools/${schoolSlug}/me`, {
        credentials: "include",
      });
      if (!meResponse.ok) {
        router.replace(`/schools/${schoolSlug}/login`);
        return;
      }

      const me = (await meResponse.json()) as { role?: string };
      if (
        !["TEACHER", "SCHOOL_ADMIN", "SCHOOL_MANAGER", "SUPERVISOR"].includes(
          me.role ?? "",
        )
      ) {
        router.replace(`/schools/${schoolSlug}/dashboard`);
        return;
      }

      await Promise.all([loadContext(), loadEvaluations()]);
    } catch {
      setError("Impossible de charger le module evaluations.");
    } finally {
      setLoading(false);
    }
  }

  async function loadContext() {
    const response = await fetch(
      `${API_URL}/schools/${schoolSlug}/classes/${classId}/evaluations/context`,
      {
        credentials: "include",
      },
    );
    if (!response.ok) {
      throw new Error("context-error");
    }
    setContext((await response.json()) as TeacherContext);
  }

  async function loadEvaluations() {
    const response = await fetch(
      `${API_URL}/schools/${schoolSlug}/classes/${classId}/evaluations`,
      {
        credentials: "include",
      },
    );
    if (!response.ok) {
      throw new Error("evaluations-error");
    }
    const payload = (await response.json()) as EvaluationRow[];
    setEvaluations(payload);
    if (payload.length === 0) {
      setSelectedEvaluationId("");
      setSelectedEvaluation(null);
      return;
    }

    const stillSelected = payload.some(
      (entry) => entry.id === selectedEvaluationId,
    );
    if (!selectedEvaluationId || !stillSelected) {
      setSelectedEvaluationId(payload[0].id);
    }
  }

  async function loadEvaluationDetail(evaluationId: string) {
    const response = await fetch(
      `${API_URL}/schools/${schoolSlug}/classes/${classId}/evaluations/${evaluationId}`,
      {
        credentials: "include",
      },
    );
    if (!response.ok) {
      setSelectedEvaluation(null);
      return;
    }
    const payload = (await response.json()) as EvaluationDetail;
    setSelectedEvaluation(payload);
    setScoreDrafts(
      Object.fromEntries(
        payload.students.map((student) => [
          student.id,
          {
            score: student.score === null ? "" : `${student.score}`,
            status: student.scoreStatus,
            comment: student.comment ?? "",
          },
        ]),
      ),
    );
  }

  async function loadCouncilReports(currentTerm: string) {
    const response = await fetch(
      `${API_URL}/schools/${schoolSlug}/classes/${classId}/term-reports?term=${currentTerm}`,
      {
        credentials: "include",
      },
    );
    if (!response.ok) {
      return;
    }

    const payload = (await response.json()) as CouncilTermReport[];
    const report = payload[0];
    if (!report) {
      setCouncilStatus("DRAFT");
      setCouncilHeldAt("");
      setCouncilDrafts({});
      return;
    }

    setCouncilStatus(report.status);
    setCouncilHeldAt(
      report.councilHeldAt
        ? new Date(report.councilHeldAt).toISOString().slice(0, 16)
        : "",
    );
    setCouncilDrafts(
      Object.fromEntries(
        report.students.map((student) => [
          student.studentId,
          {
            generalAppreciation: student.generalAppreciation ?? "",
            subjects: Object.fromEntries(
              (context?.subjects ?? []).map((subject) => [
                subject.id,
                student.subjects.find((entry) => entry.subjectId === subject.id)
                  ?.appreciation ?? "",
              ]),
            ),
          },
        ]),
      ),
    );
  }

  async function handleAttachmentSelection(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) {
      return;
    }

    setUploadingAttachment(true);
    setError(null);
    try {
      const csrfToken = getCsrfTokenCookie();
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(
        `${API_URL}/schools/${schoolSlug}/evaluations/uploads/attachment`,
        {
          method: "POST",
          credentials: "include",
          headers: csrfToken ? { "x-csrf-token": csrfToken } : undefined,
          body: formData,
        },
      );

      if (!response.ok) {
        throw new Error("attachment-upload-failed");
      }

      const payload = (await response.json()) as {
        url: string;
        size: number;
        mimeType: string;
      };

      setAttachments((prev) => [
        ...prev,
        {
          fileName: file.name,
          fileUrl: payload.url,
          sizeLabel: `${Math.max(1, Math.round(payload.size / 1024))} Ko`,
          mimeType: payload.mimeType,
        },
      ]);
    } catch {
      setError("Impossible de televerser la piece jointe.");
    } finally {
      setUploadingAttachment(false);
    }
  }

  async function handleCreateEvaluation(values: CreateEvaluationFormValues) {
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const csrfToken = getCsrfTokenCookie();
      const response = await fetch(
        `${API_URL}/schools/${schoolSlug}/classes/${classId}/evaluations`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "content-type": "application/json",
            ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
          },
          body: JSON.stringify({
            subjectId: values.subjectId,
            subjectBranchId: values.subjectBranchId || undefined,
            evaluationTypeId: values.evaluationTypeId,
            title: values.title.trim(),
            description: values.description.trim() || undefined,
            coefficient: values.coefficient,
            maxScore: values.maxScore,
            term: values.term,
            scheduledAt: values.scheduledAt
              ? new Date(values.scheduledAt).toISOString()
              : undefined,
            status: values.status,
            attachments,
          }),
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message = Array.isArray(payload?.message)
          ? payload?.message.join(", ")
          : payload?.message;
        throw new Error(message ?? "Echec creation evaluation");
      }

      const createdEvaluation = (await response.json()) as {
        id?: string;
      } | null;
      setSuccess("Evaluation enregistree.");
      reset(
        getCreateEvaluationDefaults(context, {
          subjectId: values.subjectId,
          subjectBranchId: values.subjectBranchId,
          evaluationTypeId: values.evaluationTypeId,
          term: values.term,
        }),
      );
      setAttachments([]);
      setEvaluationPanelMode("details");
      await loadEvaluations();
      if (createdEvaluation?.id) {
        setSelectedEvaluationId(createdEvaluation.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur reseau.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveScores() {
    if (!selectedEvaluation) {
      return;
    }

    setSavingScores(true);
    setError(null);
    setSuccess(null);
    try {
      const csrfToken = getCsrfTokenCookie();
      const response = await fetch(
        `${API_URL}/schools/${schoolSlug}/classes/${classId}/evaluations/${selectedEvaluation.id}/scores`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "content-type": "application/json",
            ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
          },
          body: JSON.stringify({
            scores: selectedEvaluation.students.map((student) => ({
              studentId: student.id,
              status: scoreDrafts[student.id]?.status ?? "NOT_GRADED",
              score:
                scoreDrafts[student.id]?.status === "ENTERED"
                  ? Number(scoreDrafts[student.id]?.score || 0)
                  : undefined,
              comment: scoreDrafts[student.id]?.comment || undefined,
            })),
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Impossible d'enregistrer les notes.");
      }

      await loadEvaluationDetail(selectedEvaluation.id);
      await loadEvaluations();
      setSuccess("Notes de l'evaluation mises a jour.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur reseau.");
    } finally {
      setSavingScores(false);
    }
  }

  async function handleSaveCouncilReports() {
    if (!context) {
      return;
    }

    setSavingCouncil(true);
    setError(null);
    setSuccess(null);
    try {
      const csrfToken = getCsrfTokenCookie();
      const response = await fetch(
        `${API_URL}/schools/${schoolSlug}/classes/${classId}/term-reports/${councilTerm}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "content-type": "application/json",
            ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
          },
          body: JSON.stringify({
            councilHeldAt: councilHeldAt
              ? new Date(councilHeldAt).toISOString()
              : undefined,
            status: councilStatus,
            reports: context.students.map((student) => ({
              studentId: student.id,
              generalAppreciation:
                councilDrafts[student.id]?.generalAppreciation.trim() ||
                undefined,
              subjects: context.subjects.map((subject) => ({
                subjectId: subject.id,
                appreciation:
                  councilDrafts[student.id]?.subjects[subject.id]?.trim() ||
                  undefined,
              })),
            })),
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          "Impossible d'enregistrer les appreciations du trimestre.",
        );
      }

      await loadCouncilReports(councilTerm);
      setSuccess(
        councilStatus === "PUBLISHED"
          ? "Conseil de classe publie."
          : "Brouillon du conseil de classe enregistre.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur reseau.");
    } finally {
      setSavingCouncil(false);
    }
  }

  const selectedSubject = useMemo(
    () =>
      context?.subjects.find((entry) => entry.id === watchedSubjectId) ?? null,
    [context, watchedSubjectId],
  );
  const evaluationsPerPage = 5;
  const studentCount = context?.students.length ?? 0;
  const totalEvaluationPages = Math.max(
    1,
    Math.ceil(evaluations.length / evaluationsPerPage),
  );
  const paginatedEvaluations = useMemo(() => {
    return paginateEvaluations(evaluations, evaluationPage, evaluationsPerPage);
  }, [evaluationPage, evaluations]);
  const selectedEvaluationScoresCount =
    selectedEvaluation?._count?.scores ??
    selectedEvaluation?.students.filter(
      (student) => student.scoreStatus === "ENTERED",
    ).length ??
    0;

  function startCreateEvaluation() {
    setEvaluationPanelMode("create");
    setSuccess(null);
    setError(null);
  }

  function openEvaluationDetails(evaluationId: string) {
    setEvaluationPanelMode("details");
    setSelectedEvaluationId(evaluationId);
    setSuccess(null);
  }

  useEffect(() => {
    if (evaluationPage > totalEvaluationPages) {
      setEvaluationPage(totalEvaluationPages);
    }
  }, [evaluationPage, totalEvaluationPages]);

  return (
    <div className="grid gap-4">
      <Card
        title={`Evaluations - ${context?.class.name ?? "Classe"}`}
        subtitle="Creation, publication et saisie des notes"
      >
        <div className="section-tabs mb-4">
          {[
            { key: "evaluations", label: "Evaluations" },
            { key: "scores", label: "Saisie des notes" },
            { key: "council", label: "Conseil de classe" },
            { key: "help", label: "Aide" },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key as TabKey)}
              className={`section-tab ${tab === item.key ? "section-tab-active" : ""}`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-text-secondary">Chargement...</p>
        ) : error ? (
          <p className="text-sm text-notification">{error}</p>
        ) : !context ? (
          <p className="text-sm text-notification">
            Classe non accessible avec vos affectations.
          </p>
        ) : tab === "help" ? (
          <ModuleHelpTab
            moduleName="Evaluations de classe"
            moduleSummary="cet espace enseignant permet de creer une evaluation, joindre un support, publier ou garder en brouillon et saisir ensuite les notes des eleves."
            actions={[
              {
                name: "Creer",
                purpose:
                  "preparer une evaluation sur une matiere et une sous-branche.",
                howTo:
                  "selectionner la matiere, le type, le bareme, le coefficient puis enregistrer en brouillon ou publier.",
                moduleImpact:
                  "l'evaluation devient disponible pour la saisie des notes.",
                crossModuleImpact:
                  "une evaluation publiee et notee alimente automatiquement le module Notes parent/eleve.",
              },
              {
                name: "Saisir",
                purpose:
                  "renseigner les notes, absences ou exemptions des eleves.",
                howTo:
                  "choisir une evaluation puis saisir les notes eleve par eleve.",
                moduleImpact:
                  "les moyennes sont recalculees en tenant compte du coefficient.",
                crossModuleImpact:
                  "les familles voient uniquement les evaluations publiees.",
              },
              {
                name: "Conseil de classe",
                purpose:
                  "saisir les appreciations trimestrielles qui enrichissent l'onglet Moyennes des familles.",
                howTo:
                  "selectionner le trimestre, renseigner les appreciations par eleve et par matiere, puis garder en brouillon ou publier.",
                moduleImpact:
                  "les appreciations sont stockees separement des evaluations et n'alterent pas le calcul des moyennes.",
                crossModuleImpact:
                  "une publication rend visibles les appreciations dans le module Notes parent/eleve.",
              },
            ]}
          />
        ) : tab === "evaluations" ? (
          <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
            <aside className="content-panel min-w-0 p-3 sm:p-4">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="font-heading text-lg font-semibold text-text-primary">
                    Evaluations
                  </p>
                  <p className="text-sm text-text-secondary">
                    Parcourez les evaluations puis ouvrez leur detail.
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Ajouter une evaluation"
                  onClick={startCreateEvaluation}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-[0_12px_24px_rgba(12,95,168,0.18)] transition hover:bg-primary-dark"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>

              <div className="grid gap-3">
                {evaluations.length === 0 ? (
                  <div className="rounded-[18px] border border-dashed border-warm-border bg-warm-surface/70 p-4 text-sm text-text-secondary">
                    Aucune evaluation pour cette classe.
                  </div>
                ) : (
                  paginatedEvaluations.map((evaluation) => {
                    const listMeta = getEvaluationListMeta(
                      evaluation,
                      studentCount,
                    );

                    return (
                      <button
                        key={evaluation.id}
                        type="button"
                        onClick={() => openEvaluationDetails(evaluation.id)}
                        className={`grid gap-2 rounded-[18px] border p-4 text-left transition ${
                          evaluationPanelMode === "details" &&
                          selectedEvaluationId === evaluation.id
                            ? "border-primary bg-[linear-gradient(180deg,rgba(12,95,168,0.08)_0%,rgba(255,248,240,0.9)_100%)] shadow-[0_12px_24px_rgba(12,95,168,0.12)]"
                            : "border-warm-border bg-surface hover:border-primary/30 hover:shadow-[0_10px_22px_rgba(77,56,32,0.08)]"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="font-heading text-base font-semibold text-text-primary">
                            {evaluation.title}
                          </p>
                          <p className="text-sm text-text-secondary">
                            {evaluation.subject.name}
                            {evaluation.subjectBranch
                              ? ` - ${evaluation.subjectBranch.name}`
                              : ""}{" "}
                            • {evaluation.evaluationType.label}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
                          <span
                            className={`rounded-full px-2.5 py-1 font-semibold ${
                              evaluation.status === "PUBLISHED"
                                ? "bg-accent-teal/10 text-accent-teal-dark"
                                : "bg-primary/10 text-primary"
                            }`}
                          >
                            {evaluation.status === "PUBLISHED"
                              ? "Publiee"
                              : "Brouillon"}
                          </span>
                          <span>{listMeta.dateLabel}</span>
                          <span>{listMeta.scoreProgress}</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {evaluations.length > evaluationsPerPage ? (
                <div className="mt-3">
                  <PaginationControls
                    page={evaluationPage}
                    totalPages={totalEvaluationPages}
                    totalItems={evaluations.length}
                    compact
                    onPageChange={setEvaluationPage}
                  />
                </div>
              ) : null}
            </aside>

            <section className="content-panel min-w-0 p-4 sm:p-5">
              {evaluationPanelMode === "create" ? (
                <div className="grid gap-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-heading text-xl font-semibold text-text-primary">
                        Nouvelle evaluation
                      </p>
                      <p className="text-sm text-text-secondary">
                        Preparez une evaluation puis publiez-la ou gardez-la en
                        brouillon.
                      </p>
                    </div>
                    {selectedEvaluation ? (
                      <BackButton
                        onClick={() => setEvaluationPanelMode("details")}
                      >
                        Retour au detail
                      </BackButton>
                    ) : null}
                  </div>

                  <form
                    className="grid gap-4"
                    noValidate
                    onSubmit={handleSubmit(handleCreateEvaluation)}
                  >
                    <div className="grid gap-3 md:grid-cols-2">
                      <FormField
                        label="Matiere"
                        htmlFor="evaluation-subject"
                        error={createEvaluationErrors.subjectId?.message}
                      >
                        <select
                          id="evaluation-subject"
                          aria-invalid={
                            createEvaluationErrors.subjectId ? "true" : "false"
                          }
                          {...register("subjectId")}
                          className="rounded-[10px] border border-warm-border bg-warm-surface px-3 py-2.5 text-text-primary outline-none transition-all duration-200 focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20"
                        >
                          {context.subjects.map((subject) => (
                            <option key={subject.id} value={subject.id}>
                              {subject.name}
                            </option>
                          ))}
                        </select>
                      </FormField>

                      <FormField
                        label="Sous-branche"
                        htmlFor="evaluation-subject-branch"
                        error={createEvaluationErrors.subjectBranchId?.message}
                      >
                        <select
                          id="evaluation-subject-branch"
                          aria-invalid={
                            createEvaluationErrors.subjectBranchId
                              ? "true"
                              : "false"
                          }
                          {...register("subjectBranchId")}
                          className="rounded-[10px] border border-warm-border bg-warm-surface px-3 py-2.5 text-text-primary outline-none transition-all duration-200 focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20"
                        >
                          <option value="">Aucune sous-branche</option>
                          {(selectedSubject?.branches ?? []).map((branch) => (
                            <option key={branch.id} value={branch.id}>
                              {branch.name}
                            </option>
                          ))}
                        </select>
                      </FormField>

                      <FormField
                        label="Type d'evaluation"
                        htmlFor="evaluation-type"
                        error={createEvaluationErrors.evaluationTypeId?.message}
                      >
                        <select
                          id="evaluation-type"
                          aria-invalid={
                            createEvaluationErrors.evaluationTypeId
                              ? "true"
                              : "false"
                          }
                          {...register("evaluationTypeId")}
                          className="rounded-[10px] border border-warm-border bg-warm-surface px-3 py-2.5 text-text-primary outline-none transition-all duration-200 focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20"
                        >
                          {context.evaluationTypes.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </FormField>

                      <FormField
                        label="Periode"
                        htmlFor="evaluation-term"
                        error={createEvaluationErrors.term?.message}
                      >
                        <select
                          id="evaluation-term"
                          aria-invalid={
                            createEvaluationErrors.term ? "true" : "false"
                          }
                          {...register("term")}
                          className="rounded-[10px] border border-warm-border bg-warm-surface px-3 py-2.5 text-text-primary outline-none transition-all duration-200 focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20"
                        >
                          <option value="TERM_1">1er trimestre</option>
                          <option value="TERM_2">2eme trimestre</option>
                          <option value="TERM_3">3eme trimestre</option>
                        </select>
                      </FormField>

                      <FormField
                        label="Titre"
                        htmlFor="evaluation-title"
                        error={createEvaluationErrors.title?.message}
                        className="md:col-span-2"
                      >
                        <input
                          id="evaluation-title"
                          aria-invalid={
                            createEvaluationErrors.title ? "true" : "false"
                          }
                          {...register("title")}
                          className="rounded-[10px] border border-warm-border bg-warm-surface px-3 py-2.5 text-text-primary outline-none transition-all duration-200 focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20"
                          placeholder="Ex. Composition sur les fractions"
                        />
                      </FormField>

                      <FormField
                        label="Contenu / consignes"
                        htmlFor="evaluation-description"
                        error={createEvaluationErrors.description?.message}
                        className="md:col-span-2"
                      >
                        <textarea
                          id="evaluation-description"
                          aria-invalid={
                            createEvaluationErrors.description
                              ? "true"
                              : "false"
                          }
                          {...register("description")}
                          className="min-h-[120px] rounded-[10px] border border-warm-border bg-warm-surface px-3 py-2.5 text-text-primary outline-none transition-all duration-200 focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20"
                          placeholder="Precisions, notions travaillees, attentes..."
                        />
                      </FormField>

                      <FormField
                        label="Coefficient"
                        htmlFor="evaluation-coefficient"
                        error={createEvaluationErrors.coefficient?.message}
                      >
                        <input
                          id="evaluation-coefficient"
                          type="number"
                          min="0.1"
                          step="0.1"
                          aria-invalid={
                            createEvaluationErrors.coefficient
                              ? "true"
                              : "false"
                          }
                          {...register("coefficient", { valueAsNumber: true })}
                          className="rounded-[10px] border border-warm-border bg-warm-surface px-3 py-2.5 text-text-primary outline-none transition-all duration-200 focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20"
                        />
                      </FormField>

                      <FormField
                        label="Bareme"
                        htmlFor="evaluation-max-score"
                        error={createEvaluationErrors.maxScore?.message}
                      >
                        <input
                          id="evaluation-max-score"
                          type="number"
                          min="0.1"
                          step="0.1"
                          aria-invalid={
                            createEvaluationErrors.maxScore ? "true" : "false"
                          }
                          {...register("maxScore", { valueAsNumber: true })}
                          className="rounded-[10px] border border-warm-border bg-warm-surface px-3 py-2.5 text-text-primary outline-none transition-all duration-200 focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20"
                        />
                      </FormField>

                      <FormField
                        label="Date prevue"
                        htmlFor="evaluation-scheduled-at"
                        error={createEvaluationErrors.scheduledAt?.message}
                      >
                        <input
                          id="evaluation-scheduled-at"
                          type="datetime-local"
                          aria-invalid={
                            createEvaluationErrors.scheduledAt
                              ? "true"
                              : "false"
                          }
                          {...register("scheduledAt")}
                          className="rounded-[10px] border border-warm-border bg-warm-surface px-3 py-2.5 text-text-primary outline-none transition-all duration-200 focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20"
                        />
                      </FormField>

                      <FormField
                        label="Publication"
                        htmlFor="evaluation-status"
                        error={createEvaluationErrors.status?.message}
                      >
                        <select
                          id="evaluation-status"
                          aria-invalid={
                            createEvaluationErrors.status ? "true" : "false"
                          }
                          {...register("status")}
                          className="rounded-[10px] border border-warm-border bg-warm-surface px-3 py-2.5 text-text-primary outline-none transition-all duration-200 focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20"
                        >
                          <option value="DRAFT">Brouillon</option>
                          <option value="PUBLISHED">Publie</option>
                        </select>
                      </FormField>
                    </div>

                    <div className="rounded-[18px] border border-warm-border bg-background/80 p-4 shadow-[0_10px_24px_rgba(77,56,32,0.06)]">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-text-primary">
                            Piece jointe
                          </p>
                          <p className="text-xs text-text-secondary">
                            Support de cours, enonce, PDF ou image.
                          </p>
                        </div>
                        <label className="rounded-[14px] border border-warm-border bg-warm-surface px-3 py-2 text-sm font-semibold text-primary shadow-sm transition-colors hover:bg-warm-highlight">
                          {uploadingAttachment
                            ? "Televersement..."
                            : "Ajouter un fichier"}
                          <input
                            type="file"
                            className="hidden"
                            onChange={(event) =>
                              void handleAttachmentSelection(event.target.files)
                            }
                          />
                        </label>
                      </div>

                      <div className="mt-3 grid gap-2">
                        {attachments.length === 0 ? (
                          <p className="text-sm text-text-secondary">
                            Aucune piece jointe.
                          </p>
                        ) : (
                          attachments.map((attachment) => (
                            <div
                              key={`${attachment.fileName}-${attachment.fileUrl ?? "local"}`}
                              className="flex items-center justify-between rounded-[16px] border border-warm-border bg-surface px-3 py-2 text-sm shadow-sm"
                            >
                              <div>
                                <p className="font-medium text-text-primary">
                                  {attachment.fileName}
                                </p>
                                <p className="text-xs text-text-secondary">
                                  {attachment.sizeLabel ?? "-"}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setAttachments((prev) =>
                                    prev.filter(
                                      (entry) => entry !== attachment,
                                    ),
                                  )
                                }
                                className="text-xs font-semibold text-notification"
                              >
                                Retirer
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {success ? (
                      <p className="text-sm text-accent-teal">{success}</p>
                    ) : null}
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="submit"
                        disabled={submitting || !isCreateFormValid}
                        className="rounded-[10px] bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(12,95,168,0.18)] disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {submitting
                          ? "Enregistrement..."
                          : "Creer l'evaluation"}
                      </button>
                      {selectedEvaluation ? (
                        <BackButton
                          onClick={() => setEvaluationPanelMode("details")}
                        >
                          Annuler
                        </BackButton>
                      ) : null}
                    </div>
                  </form>
                </div>
              ) : !selectedEvaluation ? (
                <div className="grid min-h-[420px] place-items-center rounded-[20px] border border-dashed border-warm-border bg-warm-surface/60 p-6 text-center">
                  <div className="max-w-md">
                    <p className="font-heading text-xl font-semibold text-text-primary">
                      Aucune evaluation selectionnee
                    </p>
                    <p className="mt-2 text-sm text-text-secondary">
                      Choisissez une evaluation dans la liste ou creez-en une
                      nouvelle pour commencer.
                    </p>
                  </div>
                </div>
              ) : (
                <div
                  data-testid="evaluation-detail-panel"
                  className="grid gap-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="font-heading text-2xl font-semibold text-text-primary">
                          {selectedEvaluation.title}
                        </p>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            selectedEvaluation.status === "PUBLISHED"
                              ? "bg-accent-teal/10 text-accent-teal-dark"
                              : "bg-primary/10 text-primary"
                          }`}
                        >
                          {selectedEvaluation.status === "PUBLISHED"
                            ? "Publiee"
                            : "Brouillon"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-text-secondary">
                        {selectedEvaluation.subject.name}
                        {selectedEvaluation.subjectBranch
                          ? ` - ${selectedEvaluation.subjectBranch.name}`
                          : ""}{" "}
                        • {selectedEvaluation.evaluationType.label}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setTab("scores")}
                        className="inline-flex items-center gap-2 rounded-[14px] bg-primary px-3 py-2 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(12,95,168,0.18)]"
                      >
                        <ClipboardCheck className="h-4 w-4" />
                        Saisir les notes
                      </button>
                      <button
                        type="button"
                        onClick={startCreateEvaluation}
                        className="inline-flex items-center gap-2 rounded-[14px] border border-warm-border bg-warm-surface px-3 py-2 text-sm font-semibold text-text-primary"
                      >
                        <Plus className="h-4 w-4" />
                        Nouvelle
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-[18px] border border-warm-border bg-background/80 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-text-secondary">
                        Periode
                      </p>
                      <p className="mt-2 text-lg font-semibold text-text-primary">
                        {selectedEvaluation.term === "TERM_1"
                          ? "1er trimestre"
                          : selectedEvaluation.term === "TERM_2"
                            ? "2eme trimestre"
                            : "3eme trimestre"}
                      </p>
                    </div>
                    <div className="rounded-[18px] border border-warm-border bg-background/80 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-text-secondary">
                        Bareme
                      </p>
                      <p className="mt-2 text-lg font-semibold text-text-primary">
                        {selectedEvaluation.maxScore}
                      </p>
                    </div>
                    <div className="rounded-[18px] border border-warm-border bg-background/80 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-text-secondary">
                        Coefficient
                      </p>
                      <p className="mt-2 text-lg font-semibold text-text-primary">
                        {selectedEvaluation.coefficient}
                      </p>
                    </div>
                    <div className="rounded-[18px] border border-warm-border bg-background/80 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-text-secondary">
                        Notes saisies
                      </p>
                      <p className="mt-2 text-lg font-semibold text-text-primary">
                        {selectedEvaluationScoresCount}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="grid gap-4">
                      <div className="rounded-[18px] border border-warm-border bg-background/80 p-4 shadow-[0_10px_24px_rgba(77,56,32,0.06)]">
                        <p className="text-sm font-semibold text-text-primary">
                          Contenu / consignes
                        </p>
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-text-secondary">
                          {selectedEvaluation.description?.trim() ||
                            "Aucune consigne detaillee pour cette evaluation."}
                        </p>
                      </div>

                      <div className="rounded-[18px] border border-warm-border bg-background/80 p-4 shadow-[0_10px_24px_rgba(77,56,32,0.06)]">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <p className="text-sm font-semibold text-text-primary">
                            Pieces jointes
                          </p>
                        </div>
                        <div className="mt-3 grid gap-2">
                          {selectedEvaluation.attachments.length === 0 ? (
                            <p className="text-sm text-text-secondary">
                              Aucune piece jointe.
                            </p>
                          ) : (
                            selectedEvaluation.attachments.map((attachment) => (
                              <div
                                key={attachment.id}
                                className="rounded-[16px] border border-warm-border bg-surface px-3 py-2"
                              >
                                <p className="text-sm font-medium text-text-primary">
                                  {attachment.fileName}
                                </p>
                                <p className="text-xs text-text-secondary">
                                  {attachment.sizeLabel ??
                                    attachment.mimeType ??
                                    "-"}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4">
                      <div className="rounded-[18px] border border-warm-border bg-background/80 p-4 shadow-[0_10px_24px_rgba(77,56,32,0.06)]">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-primary" />
                          <p className="text-sm font-semibold text-text-primary">
                            Planification
                          </p>
                        </div>
                        <p className="mt-3 text-sm text-text-secondary">
                          {selectedEvaluation.scheduledAt
                            ? new Date(
                                selectedEvaluation.scheduledAt,
                              ).toLocaleString("fr-FR")
                            : "Aucune date planifiee."}
                        </p>
                      </div>

                      <div className="rounded-[18px] border border-warm-border bg-background/80 p-4 shadow-[0_10px_24px_rgba(77,56,32,0.06)]">
                        <p className="text-sm font-semibold text-text-primary">
                          Suivi de saisie
                        </p>
                        <div className="mt-3 grid gap-2 text-sm text-text-secondary">
                          <p>
                            {
                              selectedEvaluation.students.filter(
                                (student) => student.scoreStatus === "ENTERED",
                              ).length
                            }{" "}
                            note(s) renseignee(s)
                          </p>
                          <p>
                            {
                              selectedEvaluation.students.filter(
                                (student) => student.scoreStatus === "ABSENT",
                              ).length
                            }{" "}
                            absence(s)
                          </p>
                          <p>
                            {
                              selectedEvaluation.students.filter(
                                (student) => student.scoreStatus === "EXCUSED",
                              ).length
                            }{" "}
                            dispense(s)
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        ) : tab === "scores" ? (
          <div className="grid gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <label className="grid gap-1 text-sm">
                <span className="text-text-secondary">Evaluation</span>
                <select
                  value={selectedEvaluationId}
                  onChange={(event) =>
                    setSelectedEvaluationId(event.target.value)
                  }
                  className="rounded-[14px] border border-warm-border bg-warm-surface px-3 py-2.5 text-text-primary outline-none transition-all duration-200 focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Selectionner</option>
                  {evaluations.map((evaluation) => (
                    <option key={evaluation.id} value={evaluation.id}>
                      {evaluation.title} - {evaluation.subject.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {!selectedEvaluation ? (
              <div className="content-panel p-4 text-sm text-text-secondary">
                Selectionnez une evaluation pour saisir les notes.
              </div>
            ) : (
              <div className="grid gap-4">
                <div className="content-panel p-4">
                  <p className="font-heading text-xl font-semibold text-text-primary">
                    {selectedEvaluation.title}
                  </p>
                  <p className="mt-1 text-sm text-text-secondary">
                    {selectedEvaluation.subject.name}
                    {selectedEvaluation.subjectBranch
                      ? ` - ${selectedEvaluation.subjectBranch.name}`
                      : ""}{" "}
                    • {selectedEvaluation.evaluationType.label} • Coef.{" "}
                    {selectedEvaluation.coefficient} • Bareme{" "}
                    {selectedEvaluation.maxScore}
                  </p>
                </div>

                <div className="overflow-x-auto rounded-[18px] border border-warm-border bg-surface p-2 shadow-[0_10px_24px_rgba(77,56,32,0.06)]">
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-text-secondary">
                        <th className="px-3 py-2 font-medium">Eleve</th>
                        <th className="px-3 py-2 font-medium">Statut</th>
                        <th className="px-3 py-2 font-medium">Note</th>
                        <th className="px-3 py-2 font-medium">Commentaire</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedEvaluation.students.map((student) => (
                        <tr
                          key={student.id}
                          className="border-b border-border/70"
                        >
                          <td className="px-3 py-2 font-medium text-text-primary">
                            {student.lastName} {student.firstName}
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={
                                scoreDrafts[student.id]?.status ?? "NOT_GRADED"
                              }
                              onChange={(event) =>
                                setScoreDrafts((prev) => ({
                                  ...prev,
                                  [student.id]: {
                                    ...(prev[student.id] ?? {
                                      score: "",
                                      comment: "",
                                    }),
                                    status: event.target.value,
                                  },
                                }))
                              }
                              className="rounded-[14px] border border-warm-border bg-warm-surface px-3 py-2.5 text-text-primary outline-none transition-all duration-200 focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20"
                            >
                              <option value="ENTERED">Note saisie</option>
                              <option value="ABSENT">Absent</option>
                              <option value="EXCUSED">Dispense</option>
                              <option value="NOT_GRADED">Non note</option>
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0"
                              max={selectedEvaluation.maxScore}
                              step="0.1"
                              value={scoreDrafts[student.id]?.score ?? ""}
                              onChange={(event) =>
                                setScoreDrafts((prev) => ({
                                  ...prev,
                                  [student.id]: {
                                    ...(prev[student.id] ?? {
                                      status: "ENTERED",
                                      comment: "",
                                    }),
                                    score: event.target.value,
                                  },
                                }))
                              }
                              disabled={
                                (scoreDrafts[student.id]?.status ??
                                  "ENTERED") !== "ENTERED"
                              }
                              className="w-28 rounded-[14px] border border-warm-border bg-warm-surface px-3 py-2.5 text-text-primary outline-none transition-all duration-200 focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={scoreDrafts[student.id]?.comment ?? ""}
                              onChange={(event) =>
                                setScoreDrafts((prev) => ({
                                  ...prev,
                                  [student.id]: {
                                    ...(prev[student.id] ?? {
                                      score: "",
                                      status: "NOT_GRADED",
                                    }),
                                    comment: event.target.value,
                                  },
                                }))
                              }
                              className="min-w-[220px] rounded-[14px] border border-warm-border bg-warm-surface px-3 py-2.5 text-text-primary outline-none transition-all duration-200 placeholder:text-text-secondary/70 focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20"
                              placeholder="Commentaire optionnel"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {success ? (
                  <p className="text-sm text-accent-teal">{success}</p>
                ) : null}
                <button
                  type="button"
                  onClick={() => void handleSaveScores()}
                  disabled={savingScores}
                  className="w-fit rounded-[14px] bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(12,95,168,0.18)] disabled:opacity-70"
                >
                  {savingScores ? "Enregistrement..." : "Enregistrer les notes"}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-[180px_220px_180px]">
              <label className="grid gap-1 text-sm">
                <span className="text-text-secondary">Trimestre</span>
                <select
                  value={councilTerm}
                  onChange={(event) => setCouncilTerm(event.target.value)}
                  className="rounded-[14px] border border-warm-border bg-warm-surface px-3 py-2.5 text-text-primary outline-none transition-all duration-200 focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20"
                >
                  <option value="TERM_1">1er trimestre</option>
                  <option value="TERM_2">2eme trimestre</option>
                  <option value="TERM_3">3eme trimestre</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-text-secondary">Date du conseil</span>
                <input
                  type="datetime-local"
                  value={councilHeldAt}
                  onChange={(event) => setCouncilHeldAt(event.target.value)}
                  className="rounded-[14px] border border-warm-border bg-warm-surface px-3 py-2.5 text-text-primary outline-none transition-all duration-200 focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-text-secondary">Publication</span>
                <select
                  value={councilStatus}
                  onChange={(event) =>
                    setCouncilStatus(
                      event.target.value as "DRAFT" | "PUBLISHED",
                    )
                  }
                  className="rounded-[14px] border border-warm-border bg-warm-surface px-3 py-2.5 text-text-primary outline-none transition-all duration-200 focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20"
                >
                  <option value="DRAFT">Brouillon</option>
                  <option value="PUBLISHED">Publie</option>
                </select>
              </label>
            </div>

            <div className="grid gap-4">
              {context.students.map((student) => (
                <div key={student.id} className="content-panel p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-heading text-lg font-semibold text-text-primary">
                        {student.lastName} {student.firstName}
                      </p>
                      <p className="text-xs text-text-secondary">
                        Appreciations de fin de trimestre
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    <label className="grid gap-1 text-sm">
                      <span className="text-text-secondary">
                        Appreciation generale
                      </span>
                      <textarea
                        value={
                          councilDrafts[student.id]?.generalAppreciation ?? ""
                        }
                        onChange={(event) =>
                          setCouncilDrafts((prev) => ({
                            ...prev,
                            [student.id]: {
                              generalAppreciation: event.target.value,
                              subjects:
                                prev[student.id]?.subjects ??
                                Object.fromEntries(
                                  context.subjects.map((subject) => [
                                    subject.id,
                                    "",
                                  ]),
                                ),
                            },
                          }))
                        }
                        className="min-h-[90px] rounded-[14px] border border-warm-border bg-warm-surface px-3 py-2.5 text-text-primary outline-none transition-all duration-200 focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20"
                        placeholder="Synthese generale du trimestre..."
                      />
                    </label>

                    <div className="grid gap-3 lg:grid-cols-2">
                      {context.subjects.map((subject) => (
                        <label key={subject.id} className="grid gap-1 text-sm">
                          <span className="text-text-secondary">
                            {subject.name}
                          </span>
                          <textarea
                            value={
                              councilDrafts[student.id]?.subjects[subject.id] ??
                              ""
                            }
                            onChange={(event) =>
                              setCouncilDrafts((prev) => ({
                                ...prev,
                                [student.id]: {
                                  generalAppreciation:
                                    prev[student.id]?.generalAppreciation ?? "",
                                  subjects: {
                                    ...(prev[student.id]?.subjects ?? {}),
                                    [subject.id]: event.target.value,
                                  },
                                },
                              }))
                            }
                            className="min-h-[88px] rounded-[14px] border border-warm-border bg-warm-surface px-3 py-2.5 text-text-primary outline-none transition-all duration-200 focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20"
                            placeholder={`Appreciation ${subject.name.toLowerCase()}...`}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {success ? (
              <p className="text-sm text-accent-teal">{success}</p>
            ) : null}
            <button
              type="button"
              onClick={() => void handleSaveCouncilReports()}
              disabled={savingCouncil}
              className="w-fit rounded-[14px] bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(12,95,168,0.18)] disabled:opacity-70"
            >
              {savingCouncil
                ? "Enregistrement..."
                : councilStatus === "PUBLISHED"
                  ? "Publier le conseil de classe"
                  : "Enregistrer le brouillon"}
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}
