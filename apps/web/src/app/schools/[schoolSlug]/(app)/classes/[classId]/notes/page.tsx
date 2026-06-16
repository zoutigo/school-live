"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CalendarDays,
  ClipboardCheck,
  FileText,
  Pencil,
  Plus,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Card } from "../../../../../../../components/ui/card";
import { BackButton } from "../../../../../../../components/ui/form-buttons";
import {
  FormDateTimeInput,
  FormFileInput,
  FormNumberInput,
  FormSelect,
  FormSubmitHint,
  FormTextInput,
  FormTextarea,
} from "../../../../../../../components/ui/form-controls";
import { FormField } from "../../../../../../../components/ui/form-field";
import { FormRichTextEditor } from "../../../../../../../components/ui/form-rich-text-editor";
import { ModuleHelpTab } from "../../../../../../../components/ui/module-help-tab";
import { PaginationControls } from "../../../../../../../components/ui/pagination-controls";
import { getCsrfTokenCookie } from "../../../../../../../lib/auth-cookies";
import {
  useTranslation,
  type TranslateFn,
} from "../../../../../../../i18n/useTranslation";
import {
  getCreateEvaluationDefaults,
  getEvaluationListMeta,
  hasMeaningfulRichTextContent,
  normalizeOptionalRichTextHtml,
  paginateEvaluations,
  type CreateEvaluationFormValues,
} from "./page-logic";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
const EVALUATION_ATTACHMENT_ACCEPT =
  ".jpg,.jpeg,.png,.webp,.pdf,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx";

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

function createEvaluationSchema(t: TranslateFn) {
  return z.object({
    subjectId: z.string().min(1, t("notes.teacher.validation.subjectRequired")),
    subjectBranchId: z.string(),
    evaluationTypeId: z
      .string()
      .min(1, t("notes.teacher.validation.evaluationTypeRequired")),
    title: z
      .string()
      .trim()
      .min(3, t("notes.teacher.validation.titleMinLength")),
    description: z.string(),
    coefficient: z
      .number()
      .gt(0, t("notes.teacher.validation.coefficientPositive")),
    maxScore: z.number().gt(0, t("notes.teacher.validation.maxScorePositive")),
    term: z.enum(["TERM_1", "TERM_2", "TERM_3"]),
    scheduledAt: z
      .string()
      .min(1, t("notes.teacher.validation.scheduledAtRequired")),
    status: z.enum(["DRAFT", "PUBLISHED"]),
  });
}

export default function TeacherClassNotesPage() {
  const { schoolSlug, classId } = useParams<{
    schoolSlug: string;
    classId: string;
  }>();
  const router = useRouter();
  const { t } = useTranslation();

  const [tab, setTab] = useState<TabKey>("evaluations");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingScores, setSavingScores] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [context, setContext] = useState<TeacherContext | null>(null);
  const [evaluations, setEvaluations] = useState<EvaluationRow[]>([]);
  const [selectedEvaluationId, setSelectedEvaluationId] = useState("");
  const [selectedEvaluation, setSelectedEvaluation] =
    useState<EvaluationDetail | null>(null);
  const [evaluationPage, setEvaluationPage] = useState(1);
  const [evaluationPanelMode, setEvaluationPanelMode] = useState<
    "details" | "create" | "edit"
  >("details");
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);
  const [descriptionEditorInitialHtml, setDescriptionEditorInitialHtml] =
    useState("");
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
  const evaluationSchema = useMemo(() => createEvaluationSchema(t), [t]);
  const createEvaluationForm = useForm<CreateEvaluationFormValues>({
    resolver: zodResolver(evaluationSchema),
    mode: "onChange",
    defaultValues: getCreateEvaluationDefaults(),
  });
  const {
    register,
    handleSubmit,
    trigger,
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
    resetDescriptionEditor("");
  }, [context, reset]);

  useEffect(() => {
    if (evaluationPanelMode !== "create" && evaluationPanelMode !== "edit") {
      return;
    }
    void trigger();
  }, [evaluationPanelMode, trigger]);

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
    setPageError(null);
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
      setPageError(t("notes.teacher.errors.loadModule"));
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
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message = Array.isArray(payload?.message)
          ? payload.message.join(", ")
          : payload?.message;
        throw new Error(message ?? t("notes.teacher.errors.uploadAttachment"));
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
    } catch (err) {
      setError(
        err instanceof Error && err.message.trim().length > 0
          ? err.message
          : t("notes.teacher.errors.uploadAttachment"),
      );
    } finally {
      setUploadingAttachment(false);
    }
  }

  async function handleDownloadAttachment(url: string, fileName: string) {
    setError(null);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(t("notes.teacher.errors.downloadAttachment"));
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setError(
        err instanceof Error && err.message.trim().length > 0
          ? err.message
          : t("notes.teacher.errors.downloadAttachment"),
      );
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
            description: normalizeOptionalRichTextHtml(values.description),
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
        throw new Error(message ?? t("notes.teacher.errors.createEvaluation"));
      }

      const createdEvaluation = (await response.json()) as {
        id?: string;
      } | null;
      setSuccess(t("notes.teacher.success.evaluationCreated"));
      reset(
        getCreateEvaluationDefaults(context, {
          subjectId: values.subjectId,
          subjectBranchId: values.subjectBranchId,
          evaluationTypeId: values.evaluationTypeId,
          term: values.term,
        }),
      );
      resetDescriptionEditor("");
      setAttachments([]);
      setEvaluationPanelMode("details");
      await loadEvaluations();
      if (createdEvaluation?.id) {
        setSelectedEvaluationId(createdEvaluation.id);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("notes.common.networkError"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateEvaluation(values: CreateEvaluationFormValues) {
    if (!selectedEvaluation) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const csrfToken = getCsrfTokenCookie();
      const response = await fetch(
        `${API_URL}/schools/${schoolSlug}/classes/${classId}/evaluations/${selectedEvaluation.id}`,
        {
          method: "PATCH",
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
            description: normalizeOptionalRichTextHtml(values.description),
            coefficient: values.coefficient,
            maxScore: values.maxScore,
            term: values.term,
            scheduledAt: values.scheduledAt
              ? new Date(values.scheduledAt).toISOString()
              : null,
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
        throw new Error(message ?? t("notes.teacher.errors.updateEvaluation"));
      }

      setSuccess(t("notes.teacher.success.evaluationUpdated"));
      setEvaluationPanelMode("details");
      await loadEvaluations();
      await loadEvaluationDetail(selectedEvaluation.id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("notes.common.networkError"),
      );
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
        throw new Error(t("notes.teacher.errors.saveScores"));
      }

      await loadEvaluationDetail(selectedEvaluation.id);
      await loadEvaluations();
      setSuccess(t("notes.teacher.success.scoresUpdated"));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("notes.common.networkError"),
      );
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
        throw new Error(t("notes.teacher.errors.saveCouncil"));
      }

      await loadCouncilReports(councilTerm);
      setSuccess(
        councilStatus === "PUBLISHED"
          ? t("notes.teacher.success.councilPublished")
          : t("notes.teacher.success.councilDraftSaved"),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("notes.common.networkError"),
      );
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
    if (context) {
      reset(getCreateEvaluationDefaults(context));
    }
    setAttachments([]);
    resetDescriptionEditor("");
    setEvaluationPanelMode("create");
    setSuccess(null);
    setError(null);
  }

  function startEditEvaluation() {
    if (!context || !selectedEvaluation) {
      return;
    }

    reset(
      getCreateEvaluationDefaults(context, {
        subjectId: selectedEvaluation.subject.id,
        subjectBranchId: selectedEvaluation.subjectBranch?.id ?? "",
        evaluationTypeId: selectedEvaluation.evaluationType.id,
        title: selectedEvaluation.title,
        description: selectedEvaluation.description ?? "",
        coefficient: selectedEvaluation.coefficient,
        maxScore: selectedEvaluation.maxScore,
        term: selectedEvaluation.term as CreateEvaluationFormValues["term"],
        scheduledAt: new Date(
          selectedEvaluation.scheduledAt ?? selectedEvaluation.createdAt,
        )
          .toISOString()
          .slice(0, 16),
        status:
          selectedEvaluation.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
      }),
    );
    resetDescriptionEditor(selectedEvaluation.description ?? "");
    setAttachments(
      selectedEvaluation.attachments.map((attachment) => ({
        fileName: attachment.fileName,
        fileUrl: attachment.fileUrl ?? undefined,
        sizeLabel: attachment.sizeLabel ?? undefined,
        mimeType: attachment.mimeType ?? undefined,
      })),
    );
    setEvaluationPanelMode("edit");
    setSuccess(null);
    setError(null);
  }

  function openEvaluationDetails(evaluationId: string) {
    setEvaluationPanelMode("details");
    setSelectedEvaluationId(evaluationId);
    setSuccess(null);
  }

  function resetDescriptionEditor(nextHtml: string) {
    setDescriptionEditorInitialHtml(nextHtml);
  }

  useEffect(() => {
    if (evaluationPage > totalEvaluationPages) {
      setEvaluationPage(totalEvaluationPages);
    }
  }, [evaluationPage, totalEvaluationPages]);

  return (
    <div className="grid gap-4">
      <Card
        title={t("notes.teacher.card.title").replace(
          "{className}",
          context?.class.name ?? t("notes.teacher.card.defaultClassName"),
        )}
        subtitle={t("notes.teacher.card.subtitle")}
      >
        <div className="section-tabs mb-4">
          {[
            { key: "evaluations", label: t("notes.teacher.tabs.evaluations") },
            { key: "scores", label: t("notes.teacher.tabs.scores") },
            { key: "council", label: t("notes.teacher.tabs.council") },
            { key: "help", label: t("notes.teacher.tabs.help") },
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
          <p className="text-sm text-text-secondary">
            {t("notes.common.loading")}
          </p>
        ) : pageError ? (
          <p className="text-sm text-notification">{pageError}</p>
        ) : !context ? (
          <p className="text-sm text-notification">
            {t("notes.teacher.page.classNotAccessible")}
          </p>
        ) : tab === "help" ? (
          <ModuleHelpTab
            moduleName={t("notes.teacher.help.moduleName")}
            moduleSummary={t("notes.teacher.help.summary")}
            actions={[
              {
                name: t("notes.teacher.help.create.name"),
                purpose: t("notes.teacher.help.create.purpose"),
                howTo: t("notes.teacher.help.create.howTo"),
                moduleImpact: t("notes.teacher.help.create.moduleImpact"),
                crossModuleImpact: t(
                  "notes.teacher.help.create.crossModuleImpact",
                ),
              },
              {
                name: t("notes.teacher.help.enter.name"),
                purpose: t("notes.teacher.help.enter.purpose"),
                howTo: t("notes.teacher.help.enter.howTo"),
                moduleImpact: t("notes.teacher.help.enter.moduleImpact"),
                crossModuleImpact: t(
                  "notes.teacher.help.enter.crossModuleImpact",
                ),
              },
              {
                name: t("notes.teacher.help.council.name"),
                purpose: t("notes.teacher.help.council.purpose"),
                howTo: t("notes.teacher.help.council.howTo"),
                moduleImpact: t("notes.teacher.help.council.moduleImpact"),
                crossModuleImpact: t(
                  "notes.teacher.help.council.crossModuleImpact",
                ),
              },
            ]}
          />
        ) : tab === "evaluations" ? (
          <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
            <aside className="content-panel min-w-0 p-3 sm:p-4">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="font-heading text-lg font-semibold text-text-primary">
                    {t("notes.teacher.list.title")}
                  </p>
                  <p className="text-sm text-text-secondary">
                    {t("notes.teacher.list.subtitle")}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={t("notes.teacher.list.addAria")}
                  onClick={startCreateEvaluation}
                  className="group inline-flex h-10 shrink-0 items-center gap-2 overflow-hidden rounded-full bg-primary px-3 text-white shadow-[0_12px_24px_rgba(12,95,168,0.18)] transition-all duration-200 hover:bg-primary-dark"
                >
                  <Plus className="h-5 w-5 shrink-0" />
                  <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold opacity-0 transition-all duration-200 group-hover:max-w-40 group-hover:opacity-100">
                    {t("notes.teacher.list.addLabel")}
                  </span>
                </button>
              </div>

              <div className="grid gap-3">
                {evaluations.length === 0 ? (
                  <div className="rounded-[18px] border border-dashed border-warm-border bg-warm-surface/70 p-4 text-sm text-text-secondary">
                    {t("notes.teacher.list.empty")}
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
                              ? t("notes.teacher.status.published")
                              : t("notes.teacher.status.draft")}
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
              {evaluationPanelMode === "create" ||
              evaluationPanelMode === "edit" ? (
                <div className="grid gap-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-heading text-xl font-semibold text-text-primary">
                        {evaluationPanelMode === "edit"
                          ? t("notes.teacher.form.editTitle")
                          : t("notes.teacher.form.createTitle")}
                      </p>
                      <p className="text-sm text-text-secondary">
                        {evaluationPanelMode === "edit"
                          ? t("notes.teacher.form.editSubtitle")
                          : t("notes.teacher.form.createSubtitle")}
                      </p>
                    </div>
                    {selectedEvaluation ? (
                      <BackButton
                        onClick={() => setEvaluationPanelMode("details")}
                      >
                        {t("notes.teacher.detail.backToDetail")}
                      </BackButton>
                    ) : null}
                  </div>

                  <form
                    className="grid gap-4"
                    noValidate
                    onSubmit={handleSubmit(
                      evaluationPanelMode === "edit"
                        ? handleUpdateEvaluation
                        : handleCreateEvaluation,
                    )}
                  >
                    <div className="grid gap-3 md:grid-cols-2">
                      <FormField
                        label={t("notes.teacher.form.subject")}
                        htmlFor="evaluation-subject"
                        error={createEvaluationErrors.subjectId?.message}
                      >
                        <FormSelect
                          id="evaluation-subject"
                          {...register("subjectId")}
                          invalid={Boolean(createEvaluationErrors.subjectId)}
                        >
                          {context.subjects.map((subject) => (
                            <option key={subject.id} value={subject.id}>
                              {subject.name}
                            </option>
                          ))}
                        </FormSelect>
                      </FormField>

                      <FormField
                        label={t("notes.teacher.form.subjectBranch")}
                        htmlFor="evaluation-subject-branch"
                        error={createEvaluationErrors.subjectBranchId?.message}
                      >
                        <FormSelect
                          id="evaluation-subject-branch"
                          {...register("subjectBranchId")}
                          invalid={Boolean(
                            createEvaluationErrors.subjectBranchId,
                          )}
                        >
                          <option value="">
                            {t("notes.teacher.form.noSubjectBranch")}
                          </option>
                          {(selectedSubject?.branches ?? []).map((branch) => (
                            <option key={branch.id} value={branch.id}>
                              {branch.name}
                            </option>
                          ))}
                        </FormSelect>
                      </FormField>

                      <FormField
                        label={t("notes.teacher.form.evaluationType")}
                        htmlFor="evaluation-type"
                        error={createEvaluationErrors.evaluationTypeId?.message}
                      >
                        <FormSelect
                          id="evaluation-type"
                          {...register("evaluationTypeId")}
                          invalid={Boolean(
                            createEvaluationErrors.evaluationTypeId,
                          )}
                        >
                          {context.evaluationTypes.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.label}
                            </option>
                          ))}
                        </FormSelect>
                      </FormField>

                      <FormField
                        label={t("notes.teacher.form.term")}
                        htmlFor="evaluation-term"
                        error={createEvaluationErrors.term?.message}
                      >
                        <FormSelect
                          id="evaluation-term"
                          {...register("term")}
                          invalid={Boolean(createEvaluationErrors.term)}
                        >
                          <option value="TERM_1">
                            {t("notes.teacher.terms.term1")}
                          </option>
                          <option value="TERM_2">
                            {t("notes.teacher.terms.term2")}
                          </option>
                          <option value="TERM_3">
                            {t("notes.teacher.terms.term3")}
                          </option>
                        </FormSelect>
                      </FormField>

                      <FormField
                        label={t("notes.teacher.form.title")}
                        htmlFor="evaluation-title"
                        error={createEvaluationErrors.title?.message}
                        className="md:col-span-2"
                      >
                        <FormTextInput
                          id="evaluation-title"
                          {...register("title")}
                          invalid={Boolean(createEvaluationErrors.title)}
                          placeholder={t("notes.teacher.form.titlePlaceholder")}
                        />
                      </FormField>

                      <FormRichTextEditor
                        label={t("notes.teacher.form.content")}
                        error={createEvaluationErrors.description?.message}
                        invalid={Boolean(createEvaluationErrors.description)}
                        className="md:col-span-2"
                        editorTestId="evaluation-description-editor"
                        value={descriptionEditorInitialHtml}
                        allowInlineImages={false}
                        minHeightClassName="min-h-[180px]"
                        hint={t("notes.teacher.form.contentHint")}
                        onChange={(html) => {
                          setValue("description", html, {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                        }}
                      />

                      <FormField
                        label={t("notes.teacher.form.coefficient")}
                        htmlFor="evaluation-coefficient"
                        error={createEvaluationErrors.coefficient?.message}
                      >
                        <FormNumberInput
                          id="evaluation-coefficient"
                          min="0.1"
                          step="0.1"
                          {...register("coefficient", { valueAsNumber: true })}
                          invalid={Boolean(createEvaluationErrors.coefficient)}
                        />
                      </FormField>

                      <FormField
                        label={t("notes.teacher.form.maxScore")}
                        htmlFor="evaluation-max-score"
                        error={createEvaluationErrors.maxScore?.message}
                      >
                        <FormNumberInput
                          id="evaluation-max-score"
                          min="0.1"
                          step="0.1"
                          {...register("maxScore", { valueAsNumber: true })}
                          invalid={Boolean(createEvaluationErrors.maxScore)}
                        />
                      </FormField>

                      <FormField
                        label={t("notes.teacher.form.scheduledAt")}
                        htmlFor="evaluation-scheduled-at"
                        error={createEvaluationErrors.scheduledAt?.message}
                      >
                        <FormDateTimeInput
                          id="evaluation-scheduled-at"
                          {...register("scheduledAt")}
                          invalid={Boolean(createEvaluationErrors.scheduledAt)}
                        />
                      </FormField>

                      <FormField
                        label={t("notes.teacher.form.status")}
                        htmlFor="evaluation-status"
                        error={createEvaluationErrors.status?.message}
                      >
                        <FormSelect
                          id="evaluation-status"
                          {...register("status")}
                          invalid={Boolean(createEvaluationErrors.status)}
                        >
                          <option value="DRAFT">
                            {t("notes.teacher.form.statusDraft")}
                          </option>
                          <option value="PUBLISHED">
                            {t("notes.teacher.form.statusPublished")}
                          </option>
                        </FormSelect>
                      </FormField>
                    </div>

                    <div className="rounded-[18px] border border-warm-border bg-background/80 p-4 shadow-[0_10px_24px_rgba(77,56,32,0.06)]">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-text-primary">
                            {t("notes.teacher.form.attachment")}
                          </p>
                          <p className="text-xs text-text-secondary">
                            {t("notes.teacher.form.attachmentHint")}
                          </p>
                        </div>
                        <label className="rounded-[14px] border border-warm-border bg-warm-surface px-3 py-2 text-sm font-semibold text-primary shadow-sm transition-colors hover:bg-warm-highlight">
                          {uploadingAttachment
                            ? t("notes.teacher.form.attachmentUploading")
                            : t("notes.teacher.form.attachmentAdd")}
                          <FormFileInput
                            className="hidden"
                            accept={EVALUATION_ATTACHMENT_ACCEPT}
                            onChange={(event) =>
                              void handleAttachmentSelection(event.target.files)
                            }
                          />
                        </label>
                      </div>

                      <div className="mt-3">
                        {attachments.length === 0 ? (
                          <p className="text-sm text-text-secondary">
                            {t("notes.teacher.detail.noAttachment")}
                          </p>
                        ) : (
                          <ul className="list-disc space-y-2 pl-5 text-sm text-text-primary">
                            {attachments.map((attachment) => (
                              <li
                                key={`${attachment.fileName}-${attachment.fileUrl ?? "local"}`}
                                className="flex items-start justify-between gap-3"
                              >
                                <div className="min-w-0">
                                  <p className="break-words font-medium text-text-primary">
                                    {attachment.fileName}
                                  </p>
                                  <p className="text-xs text-text-secondary">
                                    {attachment.sizeLabel ?? "-"}
                                  </p>
                                </div>
                                <div className="flex shrink-0 items-center gap-3">
                                  {attachment.fileUrl ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void handleDownloadAttachment(
                                          attachment.fileUrl!,
                                          attachment.fileName,
                                        )
                                      }
                                      className="text-xs font-semibold text-primary underline underline-offset-2"
                                    >
                                      {t("notes.teacher.detail.download")}
                                    </button>
                                  ) : null}
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
                                    {t("notes.teacher.detail.remove")}
                                  </button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>

                    {error ? (
                      <p className="text-sm text-notification">{error}</p>
                    ) : null}
                    {success ? (
                      <p className="text-sm text-accent-teal">{success}</p>
                    ) : null}
                    <FormSubmitHint visible={!isCreateFormValid} />
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="submit"
                        disabled={submitting || !isCreateFormValid}
                        className="rounded-[10px] bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(12,95,168,0.18)] disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {submitting
                          ? t("notes.teacher.form.submitSaving")
                          : evaluationPanelMode === "edit"
                            ? t("notes.teacher.form.submitEdit")
                            : t("notes.teacher.form.submitCreate")}
                      </button>
                      {selectedEvaluation ? (
                        <BackButton
                          onClick={() => setEvaluationPanelMode("details")}
                        >
                          {t("notes.teacher.detail.cancel")}
                        </BackButton>
                      ) : null}
                    </div>
                  </form>
                </div>
              ) : !selectedEvaluation ? (
                <div className="grid min-h-[420px] place-items-center rounded-[20px] border border-dashed border-warm-border bg-warm-surface/60 p-6 text-center">
                  <div className="max-w-md">
                    <p className="font-heading text-xl font-semibold text-text-primary">
                      {t("notes.teacher.detail.noEvaluationTitle")}
                    </p>
                    <p className="mt-2 text-sm text-text-secondary">
                      {t("notes.teacher.detail.noEvaluationSubtitle")}
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
                            ? t("notes.teacher.status.published")
                            : t("notes.teacher.status.draft")}
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
                        {t("notes.teacher.detail.enterScores")}
                      </button>
                      <button
                        type="button"
                        aria-label={t("notes.teacher.detail.editAria")}
                        onClick={startEditEvaluation}
                        className="group inline-flex h-10 items-center gap-2 overflow-hidden rounded-full border border-warm-border bg-warm-surface px-3 text-text-primary shadow-[0_10px_22px_rgba(77,56,32,0.08)] transition-all duration-200 hover:border-primary/30 hover:bg-warm-highlight"
                      >
                        <Pencil className="h-4 w-4 shrink-0" />
                        <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold opacity-0 transition-all duration-200 group-hover:max-w-40 group-hover:opacity-100">
                          {t("notes.teacher.detail.editLabel")}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-[10px] border border-warm-border bg-background/80 px-4 py-2.5">
                      <p className="flex items-center justify-between gap-3 text-sm leading-tight">
                        <span className="text-[10px] uppercase tracking-[0.18em] text-text-secondary">
                          {t("notes.teacher.detail.period")}
                        </span>
                        <span className="font-semibold text-text-primary">
                          {selectedEvaluation.term === "TERM_1"
                            ? t("notes.teacher.terms.term1")
                            : selectedEvaluation.term === "TERM_2"
                              ? t("notes.teacher.terms.term2")
                              : t("notes.teacher.terms.term3")}
                        </span>
                      </p>
                    </div>
                    <div className="rounded-[10px] border border-warm-border bg-background/80 px-4 py-2.5">
                      <p className="flex items-center justify-between gap-3 text-sm leading-tight">
                        <span className="text-[10px] uppercase tracking-[0.18em] text-text-secondary">
                          {t("notes.teacher.detail.maxScore")}
                        </span>
                        <span className="font-semibold text-text-primary">
                          {selectedEvaluation.maxScore}
                        </span>
                      </p>
                    </div>
                    <div className="rounded-[10px] border border-warm-border bg-background/80 px-4 py-2.5">
                      <p className="flex items-center justify-between gap-3 text-sm leading-tight">
                        <span className="text-[10px] uppercase tracking-[0.18em] text-text-secondary">
                          {t("notes.teacher.detail.coefficient")}
                        </span>
                        <span className="font-semibold text-text-primary">
                          {selectedEvaluation.coefficient}
                        </span>
                      </p>
                    </div>
                    <div className="rounded-[10px] border border-warm-border bg-background/80 px-4 py-2.5">
                      <p className="flex items-center justify-between gap-3 text-sm leading-tight">
                        <span className="text-[10px] uppercase tracking-[0.18em] text-text-secondary">
                          {t("notes.teacher.detail.scoresEntered")}
                        </span>
                        <span className="font-semibold text-text-primary">
                          {selectedEvaluationScoresCount}/{studentCount}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="grid gap-4">
                      <div className="rounded-[18px] border border-warm-border bg-background/80 p-4 shadow-[0_10px_24px_rgba(77,56,32,0.06)]">
                        <p className="text-sm font-semibold text-text-primary">
                          {t("notes.teacher.detail.contentTitle")}
                        </p>
                        {hasMeaningfulRichTextContent(
                          selectedEvaluation.description,
                        ) ? (
                          <div
                            className="mt-3 space-y-3 text-sm leading-6 text-text-secondary [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-warm-border [&_blockquote]:pl-3 [&_h1]:font-heading [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:font-heading [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:whitespace-pre-wrap [&_ul]:list-disc [&_ul]:pl-5"
                            dangerouslySetInnerHTML={{
                              __html: selectedEvaluation.description ?? "",
                            }}
                          />
                        ) : (
                          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-text-secondary">
                            {t("notes.teacher.detail.noInstructions")}
                          </p>
                        )}
                      </div>

                      <div className="rounded-[18px] border border-warm-border bg-background/80 p-4 shadow-[0_10px_24px_rgba(77,56,32,0.06)]">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <p className="text-sm font-semibold text-text-primary">
                            {t("notes.teacher.detail.attachments")}
                          </p>
                        </div>
                        <div className="mt-3">
                          {selectedEvaluation.attachments.length === 0 ? (
                            <p className="text-sm text-text-secondary">
                              {t("notes.teacher.detail.noAttachment")}
                            </p>
                          ) : (
                            <ul className="list-disc space-y-2 pl-5 text-sm text-text-primary">
                              {selectedEvaluation.attachments.map(
                                (attachment) => (
                                  <li key={attachment.id}>
                                    {attachment.fileUrl ? (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          void handleDownloadAttachment(
                                            attachment.fileUrl!,
                                            attachment.fileName,
                                          )
                                        }
                                        className="font-medium text-primary underline underline-offset-2"
                                      >
                                        {attachment.fileName}
                                      </button>
                                    ) : (
                                      <span className="font-medium text-text-primary">
                                        {attachment.fileName}
                                      </span>
                                    )}{" "}
                                    <span className="text-xs text-text-secondary">
                                      (
                                      {attachment.sizeLabel ??
                                        attachment.mimeType ??
                                        "-"}
                                      )
                                    </span>
                                  </li>
                                ),
                              )}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4">
                      <div className="rounded-[18px] border border-warm-border bg-background/80 p-4 shadow-[0_10px_24px_rgba(77,56,32,0.06)]">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-primary" />
                          <p className="text-sm font-semibold text-text-primary">
                            {t("notes.teacher.detail.planning")}
                          </p>
                        </div>
                        <p className="mt-3 text-sm text-text-secondary">
                          {new Date(
                            selectedEvaluation.scheduledAt ??
                              selectedEvaluation.createdAt,
                          ).toLocaleString("fr-FR")}
                        </p>
                      </div>

                      <div className="rounded-[18px] border border-warm-border bg-background/80 p-4 shadow-[0_10px_24px_rgba(77,56,32,0.06)]">
                        <p className="text-sm font-semibold text-text-primary">
                          {t("notes.teacher.detail.trackingTitle")}
                        </p>
                        <div className="mt-3 grid gap-2 text-sm text-text-secondary">
                          <p>
                            {
                              selectedEvaluation.students.filter(
                                (student) => student.scoreStatus === "ENTERED",
                              ).length
                            }{" "}
                            {t("notes.teacher.detail.scoresEnteredCount")}
                          </p>
                          <p>
                            {
                              selectedEvaluation.students.filter(
                                (student) => student.scoreStatus === "ABSENT",
                              ).length
                            }{" "}
                            {t("notes.teacher.detail.absencesCount")}
                          </p>
                          <p>
                            {
                              selectedEvaluation.students.filter(
                                (student) => student.scoreStatus === "EXCUSED",
                              ).length
                            }{" "}
                            {t("notes.teacher.detail.excusedCount")}
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
                <span className="text-text-secondary">
                  {t("notes.teacher.scores.evaluationLabel")}
                </span>
                <FormSelect
                  value={selectedEvaluationId}
                  onChange={(event) =>
                    setSelectedEvaluationId(event.target.value)
                  }
                >
                  <option value="">{t("notes.common.select")}</option>
                  {evaluations.map((evaluation) => (
                    <option key={evaluation.id} value={evaluation.id}>
                      {evaluation.title} - {evaluation.subject.name}
                    </option>
                  ))}
                </FormSelect>
              </label>
            </div>

            {!selectedEvaluation ? (
              <div className="content-panel p-4 text-sm text-text-secondary">
                {t("notes.teacher.scores.selectPrompt")}
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
                    •{" "}
                    {t("notes.teacher.scores.summaryLine")
                      .replace(
                        "{evaluationType}",
                        selectedEvaluation.evaluationType.label,
                      )
                      .replace(
                        "{coefficient}",
                        String(selectedEvaluation.coefficient),
                      )
                      .replace(
                        "{maxScore}",
                        String(selectedEvaluation.maxScore),
                      )}
                  </p>
                </div>

                <div className="overflow-x-auto rounded-[18px] border border-warm-border bg-surface p-2 shadow-[0_10px_24px_rgba(77,56,32,0.06)]">
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-text-secondary">
                        <th className="px-3 py-2 font-medium">
                          {t("notes.teacher.scores.columnStudent")}
                        </th>
                        <th className="px-3 py-2 font-medium">
                          {t("notes.teacher.scores.columnStatus")}
                        </th>
                        <th className="px-3 py-2 font-medium">
                          {t("notes.teacher.scores.columnScore")}
                        </th>
                        <th className="px-3 py-2 font-medium">
                          {t("notes.teacher.scores.columnComment")}
                        </th>
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
                            <FormSelect
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
                            >
                              <option value="ENTERED">
                                {t("notes.teacher.scores.statusEntered")}
                              </option>
                              <option value="ABSENT">
                                {t("notes.teacher.scores.statusAbsent")}
                              </option>
                              <option value="EXCUSED">
                                {t("notes.teacher.scores.statusExcused")}
                              </option>
                              <option value="NOT_GRADED">
                                {t("notes.teacher.scores.statusNotGraded")}
                              </option>
                            </FormSelect>
                          </td>
                          <td className="px-3 py-2">
                            <FormNumberInput
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
                              className="w-28"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <FormTextInput
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
                              className="min-w-[220px]"
                              placeholder={t(
                                "notes.teacher.scores.commentPlaceholder",
                              )}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {error ? (
                  <p className="text-sm text-notification">{error}</p>
                ) : null}
                {success ? (
                  <p className="text-sm text-accent-teal">{success}</p>
                ) : null}
                <button
                  type="button"
                  onClick={() => void handleSaveScores()}
                  disabled={savingScores}
                  className="w-fit rounded-[14px] bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(12,95,168,0.18)] disabled:opacity-70"
                >
                  {savingScores
                    ? t("notes.teacher.scores.saving")
                    : t("notes.teacher.scores.save")}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-[180px_220px_180px]">
              <label className="grid gap-1 text-sm">
                <span className="text-text-secondary">
                  {t("notes.teacher.council.term")}
                </span>
                <FormSelect
                  value={councilTerm}
                  onChange={(event) => setCouncilTerm(event.target.value)}
                >
                  <option value="TERM_1">
                    {t("notes.teacher.terms.term1")}
                  </option>
                  <option value="TERM_2">
                    {t("notes.teacher.terms.term2")}
                  </option>
                  <option value="TERM_3">
                    {t("notes.teacher.terms.term3")}
                  </option>
                </FormSelect>
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-text-secondary">
                  {t("notes.teacher.council.heldAt")}
                </span>
                <FormDateTimeInput
                  value={councilHeldAt}
                  onChange={(event) => setCouncilHeldAt(event.target.value)}
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-text-secondary">
                  {t("notes.teacher.council.publication")}
                </span>
                <FormSelect
                  value={councilStatus}
                  onChange={(event) =>
                    setCouncilStatus(
                      event.target.value as "DRAFT" | "PUBLISHED",
                    )
                  }
                >
                  <option value="DRAFT">
                    {t("notes.teacher.form.statusDraft")}
                  </option>
                  <option value="PUBLISHED">
                    {t("notes.teacher.form.statusPublished")}
                  </option>
                </FormSelect>
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
                        {t("notes.teacher.council.appreciationsSubtitle")}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    <label className="grid gap-1 text-sm">
                      <span className="text-text-secondary">
                        {t("notes.teacher.council.generalAppreciation")}
                      </span>
                      <FormTextarea
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
                        className="min-h-[90px]"
                        placeholder={t(
                          "notes.teacher.council.generalAppreciationPlaceholder",
                        )}
                      />
                    </label>

                    <div className="grid gap-3 lg:grid-cols-2">
                      {context.subjects.map((subject) => (
                        <label key={subject.id} className="grid gap-1 text-sm">
                          <span className="text-text-secondary">
                            {subject.name}
                          </span>
                          <FormTextarea
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
                            className="min-h-[88px]"
                            placeholder={t(
                              "notes.teacher.council.subjectAppreciationPlaceholder",
                            ).replace("{subject}", subject.name.toLowerCase())}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {error ? (
              <p className="text-sm text-notification">{error}</p>
            ) : null}
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
                ? t("notes.teacher.council.saving")
                : councilStatus === "PUBLISHED"
                  ? t("notes.teacher.council.publish")
                  : t("notes.teacher.council.saveDraft")}
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}
