"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "../../../../../../../components/ui/card";
import { ModuleHelpTab } from "../../../../../../../components/ui/module-help-tab";
import { getCsrfTokenCookie } from "../../../../../../../lib/auth-cookies";

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

  const [subjectId, setSubjectId] = useState("");
  const [subjectBranchId, setSubjectBranchId] = useState("");
  const [evaluationTypeId, setEvaluationTypeId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coefficient, setCoefficient] = useState("1");
  const [maxScore, setMaxScore] = useState("20");
  const [term, setTerm] = useState("TERM_1");
  const [scheduledAt, setScheduledAt] = useState("");
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED">("DRAFT");
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

  useEffect(() => {
    void bootstrap();
  }, [schoolSlug, classId]);

  useEffect(() => {
    if (!context) {
      return;
    }

    if (!subjectId && context.subjects[0]) {
      setSubjectId(context.subjects[0].id);
    }
    if (!evaluationTypeId && context.evaluationTypes[0]) {
      setEvaluationTypeId(context.evaluationTypes[0].id);
    }
  }, [context, subjectId, evaluationTypeId]);

  useEffect(() => {
    if (!subjectId) {
      setSubjectBranchId("");
      return;
    }
    const subject = context?.subjects.find((entry) => entry.id === subjectId);
    if (!subject || subject.branches.length === 0) {
      setSubjectBranchId("");
      return;
    }
    if (!subject.branches.some((branch) => branch.id === subjectBranchId)) {
      setSubjectBranchId(subject.branches[0].id);
    }
  }, [context, subjectId, subjectBranchId]);

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
    if (!selectedEvaluationId && payload[0]) {
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

  async function handleCreateEvaluation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
            subjectId,
            subjectBranchId: subjectBranchId || undefined,
            evaluationTypeId,
            title,
            description,
            coefficient: Number(coefficient),
            maxScore: Number(maxScore),
            term,
            scheduledAt: scheduledAt
              ? new Date(scheduledAt).toISOString()
              : undefined,
            status,
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

      setSuccess("Evaluation enregistree.");
      setTitle("");
      setDescription("");
      setCoefficient("1");
      setMaxScore("20");
      setScheduledAt("");
      setStatus("DRAFT");
      setAttachments([]);
      await loadEvaluations();
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
    () => context?.subjects.find((entry) => entry.id === subjectId) ?? null,
    [context, subjectId],
  );

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
          <div className="grid gap-5 xl:grid-cols-[1.05fr_1.25fr]">
            <form className="grid gap-4" onSubmit={handleCreateEvaluation}>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-1 text-sm">
                  <span className="text-text-secondary">Matiere</span>
                  <select
                    value={subjectId}
                    onChange={(event) => setSubjectId(event.target.value)}
                    className="rounded-[14px] border border-warm-border bg-warm-surface px-3 py-2.5 text-text-primary outline-none transition-all duration-200 focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20"
                  >
                    {context.subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1 text-sm">
                  <span className="text-text-secondary">Sous-branche</span>
                  <select
                    value={subjectBranchId}
                    onChange={(event) => setSubjectBranchId(event.target.value)}
                    className="rounded-[14px] border border-warm-border bg-warm-surface px-3 py-2.5 text-text-primary outline-none transition-all duration-200 focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Aucune sous-branche</option>
                    {(selectedSubject?.branches ?? []).map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1 text-sm">
                  <span className="text-text-secondary">Type d'evaluation</span>
                  <select
                    value={evaluationTypeId}
                    onChange={(event) =>
                      setEvaluationTypeId(event.target.value)
                    }
                    className="rounded-[14px] border border-warm-border bg-warm-surface px-3 py-2.5 text-text-primary outline-none transition-all duration-200 focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20"
                  >
                    {context.evaluationTypes.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1 text-sm">
                  <span className="text-text-secondary">Periode</span>
                  <select
                    value={term}
                    onChange={(event) => setTerm(event.target.value)}
                    className="rounded-[14px] border border-warm-border bg-warm-surface px-3 py-2.5 text-text-primary outline-none transition-all duration-200 focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="TERM_1">1er trimestre</option>
                    <option value="TERM_2">2eme trimestre</option>
                    <option value="TERM_3">3eme trimestre</option>
                  </select>
                </label>

                <label className="grid gap-1 text-sm md:col-span-2">
                  <span className="text-text-secondary">Titre</span>
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="rounded-[14px] border border-warm-border bg-warm-surface px-3 py-2.5 text-text-primary outline-none transition-all duration-200 focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20"
                    placeholder="Ex. Composition sur les fractions"
                    required
                  />
                </label>

                <label className="grid gap-1 text-sm md:col-span-2">
                  <span className="text-text-secondary">
                    Contenu / consignes
                  </span>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    className="min-h-[120px] rounded-[14px] border border-warm-border bg-warm-surface px-3 py-2.5 text-text-primary outline-none transition-all duration-200 focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20"
                    placeholder="Precisions, notions travaillees, attentes..."
                  />
                </label>

                <label className="grid gap-1 text-sm">
                  <span className="text-text-secondary">Coefficient</span>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={coefficient}
                    onChange={(event) => setCoefficient(event.target.value)}
                    className="rounded-[14px] border border-warm-border bg-warm-surface px-3 py-2.5 text-text-primary outline-none transition-all duration-200 focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </label>

                <label className="grid gap-1 text-sm">
                  <span className="text-text-secondary">Bareme</span>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={maxScore}
                    onChange={(event) => setMaxScore(event.target.value)}
                    className="rounded-[14px] border border-warm-border bg-warm-surface px-3 py-2.5 text-text-primary outline-none transition-all duration-200 focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </label>

                <label className="grid gap-1 text-sm">
                  <span className="text-text-secondary">Date prevue</span>
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(event) => setScheduledAt(event.target.value)}
                    className="rounded-[14px] border border-warm-border bg-warm-surface px-3 py-2.5 text-text-primary outline-none transition-all duration-200 focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20"
                  />
                </label>

                <label className="grid gap-1 text-sm">
                  <span className="text-text-secondary">Publication</span>
                  <select
                    value={status}
                    onChange={(event) =>
                      setStatus(event.target.value as "DRAFT" | "PUBLISHED")
                    }
                    className="rounded-[14px] border border-warm-border bg-warm-surface px-3 py-2.5 text-text-primary outline-none transition-all duration-200 focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="DRAFT">Brouillon</option>
                    <option value="PUBLISHED">Publie</option>
                  </select>
                </label>
              </div>

              <div className="content-panel p-4">
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
                              prev.filter((entry) => entry !== attachment),
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
              <button
                type="submit"
                disabled={submitting}
                className="rounded-[14px] bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(12,95,168,0.18)] disabled:opacity-70"
              >
                {submitting ? "Enregistrement..." : "Creer l'evaluation"}
              </button>
            </form>

            <div className="grid gap-3">
              {evaluations.length === 0 ? (
                <div className="content-panel p-4 text-sm text-text-secondary">
                  Aucune evaluation pour cette classe.
                </div>
              ) : (
                evaluations.map((evaluation) => (
                  <button
                    key={evaluation.id}
                    type="button"
                    onClick={() => {
                      setSelectedEvaluationId(evaluation.id);
                      setTab("scores");
                    }}
                    className={`grid gap-2 rounded-[18px] border p-4 text-left transition ${
                      selectedEvaluationId === evaluation.id
                        ? "border-primary bg-[linear-gradient(180deg,rgba(12,95,168,0.08)_0%,rgba(255,248,240,0.9)_100%)] shadow-[0_12px_24px_rgba(12,95,168,0.12)]"
                        : "border-warm-border bg-surface hover:border-primary/30 hover:shadow-[0_10px_22px_rgba(77,56,32,0.08)]"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-heading text-lg font-semibold text-text-primary">
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
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          evaluation.status === "PUBLISHED"
                            ? "bg-accent-teal/10 text-accent-teal-dark"
                            : "bg-primary/10 text-primary"
                        }`}
                      >
                        {evaluation.status === "PUBLISHED"
                          ? "Publiee"
                          : "Brouillon"}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-3 text-xs text-text-secondary">
                      <span>Coef. {evaluation.coefficient}</span>
                      <span>Bareme {evaluation.maxScore}</span>
                      <span>Periode {evaluation.term}</span>
                      <span>{evaluation._count.scores} notes saisies</span>
                    </div>
                  </button>
                ))
              )}
            </div>
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
