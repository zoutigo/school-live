"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card } from "../../../../../../../components/ui/card";
import { ModuleHelpTab } from "../../../../../../../components/ui/module-help-tab";
import { FormRichTextEditor } from "../../../../../../../components/ui/form-rich-text-editor";
import {
  useTranslation,
  type TranslateFn,
} from "../../../../../../../i18n/useTranslation";
import {
  API_URL,
  type GradesContext,
  getClassContext,
  type MeResponse,
  type Role,
} from "../_shared";
import {
  listClassHomework,
  getHomeworkDetail,
  createHomework,
  updateHomework,
  deleteHomework,
  addComment,
  setCompletion,
  uploadHomeworkInlineImage,
  uploadHomeworkAttachment,
  type HomeworkRow,
  type HomeworkDetail,
  type HomeworkAttachment,
} from "../../../../../../../components/homework/homework-api";

type TabKey = "list" | "view" | "help";

type SubjectOption = { id: string; name: string };

function buildFormSchema(t: TranslateFn) {
  return z.object({
    subjectId: z
      .string()
      .min(1, t("homework.form.errors.subjectRequired")),
    title: z.string().trim().min(1, t("homework.form.errors.titleRequired")),
    expectedAt: z
      .string()
      .min(1, t("homework.form.errors.expectedAtRequired"))
      .refine((v) => !Number.isNaN(new Date(v).getTime()), {
        message: t("homework.form.errors.invalidDate"),
      }),
  });
}

type FormValues = z.infer<ReturnType<typeof buildFormSchema>>;

function buildCommentSchema(t: TranslateFn) {
  return z.object({
    body: z.string().trim().min(1, t("homework.comment.errorEmpty")),
  });
}

type CommentFormValues = z.infer<ReturnType<typeof buildCommentSchema>>;

function computeStatus(
  homework: HomeworkRow,
  role: Role | null,
): "done" | "late" | "todo" {
  const isStudentOrParent = role === "STUDENT" || role === "PARENT";
  if (isStudentOrParent && homework.myDoneAt) return "done";
  if (new Date(homework.expectedAt) < new Date()) return "late";
  return "todo";
}

function statusPill(status: "done" | "late" | "todo") {
  if (status === "done") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "late") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-sky-200 bg-sky-50 text-sky-700";
}

function statusLabel(status: "done" | "late" | "todo", t: TranslateFn) {
  if (status === "done") return t("homework.status.done");
  if (status === "late") return t("homework.status.late");
  return t("homework.status.todo");
}

function formatDate(isoString: string) {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
}

function formatDateForInput(isoString: string) {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

export default function TeacherClassHomeworkPage() {
  const { t } = useTranslation();
  const { schoolSlug, classId } = useParams<{
    schoolSlug: string;
    classId: string;
  }>();
  const router = useRouter();

  const [tab, setTab] = useState<TabKey>("list");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<GradesContext | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [homeworks, setHomeworks] = useState<HomeworkRow[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<HomeworkDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingHomework, setEditingHomework] = useState<HomeworkRow | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSaving, setFormSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<HomeworkRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<HomeworkAttachment[]>([]);
  const [contentHtml, setContentHtml] = useState("");
  const [completionLoading, setCompletionLoading] = useState(false);
  const [commentSaving, setCommentSaving] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  const formSchema = useMemo(() => buildFormSchema(t), [t]);
  const commentSchema = useMemo(() => buildCommentSchema(t), [t]);

  const {
    register,
    handleSubmit,
    reset: resetForm,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    reValidateMode: "onChange",
  });

  const {
    register: registerComment,
    handleSubmit: handleCommentSubmit,
    reset: resetComment,
    formState: { errors: commentErrors },
  } = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
    mode: "onChange",
    reValidateMode: "onChange",
  });

  const classCtx = useMemo(
    () => getClassContext(context, classId),
    [context, classId],
  );

  const canManage =
    role === "TEACHER" ||
    role === "SCHOOL_ADMIN" ||
    role === "SCHOOL_MANAGER" ||
    role === "SUPERVISOR" ||
    role === "SUPER_ADMIN";

  const isStudentOrParent = role === "STUDENT" || role === "PARENT";

  const subjectOptions: SubjectOption[] = useMemo(() => {
    if (!context) return [];
    const seen = new Set<string>();
    const result: SubjectOption[] = [];
    for (const a of context.assignments) {
      if (a.classId === classId && !seen.has(a.subjectId)) {
        seen.add(a.subjectId);
        result.push({ id: a.subjectId, name: a.subjectName });
      }
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [context, classId]);

  const loadHomeworks = useCallback(async () => {
    if (!schoolSlug || !classId) return;
    try {
      const items = await listClassHomework(schoolSlug, classId);
      setHomeworks(items.sort(
        (a, b) =>
          new Date(a.expectedAt).getTime() - new Date(b.expectedAt).getTime(),
      ));
    } catch {
      setError(t("homework.errors.loadFailed"));
    }
  }, [schoolSlug, classId, t]);

  useEffect(() => {
    void bootstrap();
  }, [schoolSlug, classId]);

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

      const me = (await meResponse.json()) as MeResponse;
      setRole(me.role);

      const contextResponse = await fetch(
        `${API_URL}/schools/${schoolSlug}/student-grades/context`,
        { credentials: "include" },
      );

      if (!contextResponse.ok) {
        setError(t("homework.errors.loadFailed"));
        return;
      }

      const contextPayload = (await contextResponse.json()) as GradesContext;
      setContext(contextPayload);

      await loadHomeworks();
    } catch {
      setError(t("homework.errors.networkError"));
    } finally {
      setLoading(false);
    }
  }

  async function openDetail(homework: HomeworkRow) {
    setSelectedDetail(null);
    setDetailLoading(true);
    resetComment({ body: "" });
    setCommentError(null);
    try {
      const detail = await getHomeworkDetail(schoolSlug, classId, homework.id);
      setSelectedDetail(detail);
    } catch {
      setError(t("homework.errors.loadFailed"));
    } finally {
      setDetailLoading(false);
    }
  }

  function openCreateForm() {
    setEditingHomework(null);
    setAttachments([]);
    setContentHtml("");
    setFormError(null);
    resetForm({ subjectId: subjectOptions[0]?.id ?? "", title: "", expectedAt: "" });
    setShowForm(true);
  }

  function openEditForm(homework: HomeworkRow) {
    setEditingHomework(homework);
    setAttachments(homework.attachments ?? []);
    setContentHtml(homework.contentHtml ?? "");
    setFormError(null);
    resetForm({
      subjectId: homework.subject.id,
      title: homework.title,
      expectedAt: formatDateForInput(homework.expectedAt),
    });
    setShowForm(true);
    setSelectedDetail(null);
  }

  const handleSave = handleSubmit(async (values) => {
    setFormSaving(true);
    setFormError(null);
    try {
      const payload = {
        subjectId: values.subjectId,
        title: values.title.trim(),
        expectedAt: new Date(values.expectedAt).toISOString(),
        contentHtml: contentHtml || undefined,
        attachments: attachments.map((a) => ({
          fileName: a.fileName,
          fileUrl: a.fileUrl ?? undefined,
          sizeLabel: a.sizeLabel ?? undefined,
          mimeType: a.mimeType ?? undefined,
        })),
      };

      if (editingHomework) {
        const updated = await updateHomework(
          schoolSlug,
          classId,
          editingHomework.id,
          payload,
        );
        setHomeworks((prev) =>
          prev.map((hw) => (hw.id === updated.id ? updated : hw)),
        );
      } else {
        const created = await createHomework(schoolSlug, classId, payload);
        setHomeworks((prev) =>
          [...prev, created].sort(
            (a, b) =>
              new Date(a.expectedAt).getTime() -
              new Date(b.expectedAt).getTime(),
          ),
        );
      }
      setShowForm(false);
      setEditingHomework(null);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : t("homework.form.errors.saveFailed"),
      );
    } finally {
      setFormSaving(false);
    }
  });

  async function handleDelete(homework: HomeworkRow) {
    setDeleteError(null);
    try {
      await deleteHomework(schoolSlug, classId, homework.id);
      setHomeworks((prev) => prev.filter((hw) => hw.id !== homework.id));
      if (selectedDetail?.id === homework.id) setSelectedDetail(null);
      setPendingDelete(null);
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : t("homework.form.errors.deleteFailed"),
      );
    }
  }

  async function handleToggleDone(detail: HomeworkDetail) {
    if (!isStudentOrParent) return;
    setCompletionLoading(true);
    try {
      const updated = await setCompletion(schoolSlug, classId, detail.id, {
        done: !detail.myDoneAt,
      });
      setSelectedDetail(updated);
      setHomeworks((prev) =>
        prev.map((hw) =>
          hw.id === detail.id ? { ...hw, myDoneAt: updated.myDoneAt } : hw,
        ),
      );
    } catch {
      setError(t("homework.errors.loadFailed"));
    } finally {
      setCompletionLoading(false);
    }
  }

  const handleAddComment = handleCommentSubmit(async (values) => {
    if (!selectedDetail) return;
    setCommentSaving(true);
    setCommentError(null);
    try {
      const updated = await addComment(schoolSlug, classId, selectedDetail.id, {
        body: values.body.trim(),
      });
      setSelectedDetail(updated);
      setHomeworks((prev) =>
        prev.map((hw) =>
          hw.id === updated.id
            ? { ...hw, commentsCount: updated.comments.length }
            : hw,
        ),
      );
      resetComment({ body: "" });
    } catch (err) {
      setCommentError(
        err instanceof Error ? err.message : t("homework.form.errors.saveFailed"),
      );
    } finally {
      setCommentSaving(false);
    }
  });

  async function handleAttachmentFile(file: File) {
    try {
      const uploaded = await uploadHomeworkAttachment(schoolSlug, file);
      setAttachments((prev) => [...prev, uploaded]);
    } catch {
      setFormError(t("homework.form.errors.uploadFailed"));
    }
  }

  const listItems = useMemo(() => {
    const now = new Date();
    return homeworks.map((hw) => ({
      ...hw,
      status: computeStatus(hw, role),
    }));
  }, [homeworks, role]);

  const summaryStats = useMemo(() => {
    const total = listItems.length;
    const done = listItems.filter((hw) => hw.status === "done").length;
    const late = listItems.filter((hw) => hw.status === "late").length;
    const todo = listItems.filter((hw) => hw.status === "todo").length;
    return { total, done, late, todo };
  }, [listItems]);

  return (
    <div className="grid gap-4">
      <Card
        title={`${t("homework.page.title")} - ${classCtx?.className ?? t("homework.page.defaultClassName")}`}
        subtitle={t("homework.page.subtitle")}
      >
        <div className="mb-4 flex items-end gap-2 border-b border-border">
          <button
            type="button"
            onClick={() => setTab("list")}
            className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
              tab === "list"
                ? "border border-border border-b-surface bg-surface text-primary"
                : "text-text-secondary"
            }`}
          >
            {t("homework.tabs.list")}
          </button>
          <button
            type="button"
            onClick={() => setTab("view")}
            className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
              tab === "view"
                ? "border border-border border-b-surface bg-surface text-primary"
                : "text-text-secondary"
            }`}
          >
            {t("homework.tabs.view")}
          </button>
          <button
            type="button"
            onClick={() => setTab("help")}
            className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
              tab === "help"
                ? "border border-border border-b-surface bg-surface text-primary"
                : "text-text-secondary"
            }`}
          >
            {t("homework.tabs.help")}
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-text-secondary">{t("homework.common.loading")}</p>
        ) : error ? (
          <p className="text-sm text-notification">{error}</p>
        ) : !classCtx ? (
          <p className="text-sm text-notification">
            {t("homework.page.classNotAccessible")}
          </p>
        ) : tab === "help" ? (
          <ModuleHelpTab
            moduleName={t("homework.page.title")}
            moduleSummary={t("homework.help.summary")}
            actions={[
              {
                name: t("homework.help.list.name"),
                purpose: t("homework.help.list.purpose"),
                howTo: t("homework.help.list.howTo"),
                moduleImpact: t("homework.help.list.moduleImpact"),
                crossModuleImpact: t("homework.help.list.crossModuleImpact"),
              },
              {
                name: t("homework.help.view.name"),
                purpose: t("homework.help.view.purpose"),
                howTo: t("homework.help.view.howTo"),
                moduleImpact: t("homework.help.view.moduleImpact"),
                crossModuleImpact: t("homework.help.view.crossModuleImpact"),
              },
            ]}
          />
        ) : tab === "list" ? (
          <div>
            {canManage && (
              <div className="mb-4 flex justify-end">
                <button
                  type="button"
                  onClick={openCreateForm}
                  className="rounded-card bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                  data-testid="homework-add-button"
                >
                  + {t("homework.list.addButton")}
                </button>
              </div>
            )}

            {listItems.length === 0 ? (
              <p className="text-sm text-text-secondary">{t("homework.list.empty")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-text-secondary">
                      <th className="px-3 py-2 font-medium">{t("homework.table.title")}</th>
                      <th className="px-3 py-2 font-medium">{t("homework.table.subject")}</th>
                      <th className="px-3 py-2 font-medium">{t("homework.table.dueDate")}</th>
                      <th className="px-3 py-2 font-medium">{t("homework.table.status")}</th>
                      <th className="px-3 py-2 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {listItems.map((hw) => (
                      <tr
                        key={hw.id}
                        className="border-b border-border hover:bg-background cursor-pointer"
                        onClick={() => void openDetail(hw)}
                        data-testid={`homework-row-${hw.id}`}
                      >
                        <td className="px-3 py-2 font-medium text-text-primary">
                          {hw.title}
                        </td>
                        <td className="px-3 py-2 text-text-secondary">{hw.subject.name}</td>
                        <td className="px-3 py-2 text-text-secondary">{formatDate(hw.expectedAt)}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${statusPill(hw.status)}`}
                          >
                            {statusLabel(hw.status, t)}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {canManage && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditForm(hw);
                              }}
                              className="text-xs text-primary hover:underline mr-2"
                              data-testid={`homework-edit-${hw.id}`}
                            >
                              {t("homework.detail.edit")}
                            </button>
                          )}
                          {canManage && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPendingDelete(hw);
                                setDeleteError(null);
                              }}
                              className="text-xs text-notification hover:underline"
                              data-testid={`homework-delete-${hw.id}`}
                            >
                              {t("homework.detail.delete")}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-card border border-border bg-background p-3">
              <p className="text-xs text-text-secondary">{t("homework.summary.class")}</p>
              <p className="text-sm font-semibold text-text-primary">{classCtx.className}</p>
            </div>
            <div className="rounded-card border border-border bg-background p-3">
              <p className="text-xs text-text-secondary">{t("homework.summary.total")}</p>
              <p className="text-sm font-semibold text-text-primary">{summaryStats.total}</p>
            </div>
            <div className="rounded-card border border-border bg-background p-3">
              <p className="text-xs text-text-secondary">{t("homework.summary.todo")}</p>
              <p className="text-sm font-semibold text-text-primary">{summaryStats.todo}</p>
            </div>
            <div className="rounded-card border border-border bg-background p-3">
              <p className="text-xs text-text-secondary">{t("homework.summary.late")}</p>
              <p className="text-sm font-semibold text-text-primary">{summaryStats.late}</p>
            </div>
          </div>
        )}
      </Card>

      {/* ── Detail panel ─────────────────────────────────────────── */}
      {(selectedDetail || detailLoading) && (
        <Card title={t("homework.detail.title")} subtitle={selectedDetail?.subject.name ?? ""}>
          {detailLoading ? (
            <p className="text-sm text-text-secondary">{t("homework.common.loading")}</p>
          ) : selectedDetail ? (
            <div className="grid gap-6">
              {/* Meta */}
              <div>
                <p className="text-lg font-bold text-text-primary">{selectedDetail.title}</p>
                <p className="text-sm text-text-secondary">
                  {t("homework.list.duePrefix")} {formatDate(selectedDetail.expectedAt)} · {t("homework.list.author")} {selectedDetail.authorDisplayName}
                </p>
              </div>

              {/* Mark done (student/parent) */}
              {isStudentOrParent && (
                <button
                  type="button"
                  disabled={completionLoading}
                  onClick={() => void handleToggleDone(selectedDetail)}
                  className={`rounded-card px-4 py-2 text-sm font-semibold text-white ${
                    selectedDetail.myDoneAt ? "bg-emerald-600 hover:bg-emerald-700" : "bg-primary hover:opacity-90"
                  } disabled:opacity-60`}
                  data-testid="homework-toggle-done"
                >
                  {completionLoading
                    ? t("homework.common.loading")
                    : selectedDetail.myDoneAt
                      ? t("homework.detail.markUndone")
                      : t("homework.detail.markDone")}
                </button>
              )}

              {/* Instructions */}
              <div>
                <p className="mb-2 text-sm font-semibold text-text-primary">
                  {t("homework.detail.instructionsTitle")}
                </p>
                {selectedDetail.contentHtml ? (
                  <div
                    className="prose prose-sm max-w-none text-text-primary"
                    dangerouslySetInnerHTML={{ __html: selectedDetail.contentHtml }}
                  />
                ) : (
                  <p className="text-sm text-text-secondary">
                    {t("homework.detail.noInstructions")}
                  </p>
                )}
              </div>

              {/* Attachments */}
              <div>
                <p className="mb-2 text-sm font-semibold text-text-primary">
                  {t("homework.detail.attachmentsTitle")}
                </p>
                {selectedDetail.attachments.length === 0 ? (
                  <p className="text-sm text-text-secondary">
                    {t("homework.detail.noAttachments")}
                  </p>
                ) : (
                  <div className="grid gap-2">
                    {selectedDetail.attachments.map((att, idx) => (
                      <div
                        key={`${att.fileName}-${idx}`}
                        className="flex items-center justify-between rounded-card border border-border bg-background p-3"
                      >
                        <div>
                          <p className="text-sm font-semibold text-text-primary">{att.fileName}</p>
                          <p className="text-xs text-text-secondary">
                            {att.mimeType ?? ""}
                            {att.sizeLabel ? ` · ${att.sizeLabel}` : ""}
                          </p>
                        </div>
                        {att.fileUrl && (
                          <a
                            href={att.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            download={att.fileName}
                            className="text-xs font-semibold text-primary hover:underline"
                            data-testid={`homework-attachment-download-${idx}`}
                          >
                            ↓ Télécharger
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Students completion (teacher view) */}
              {canManage && selectedDetail.completionStatuses.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-semibold text-text-primary">
                    {t("homework.detail.studentsTitle")}
                    {selectedDetail.summary && (
                      <span className="ml-2 text-xs font-normal text-text-secondary">
                        {selectedDetail.summary.doneStudents}/{selectedDetail.summary.totalStudents} {t("homework.detail.summarySuffix")}
                      </span>
                    )}
                  </p>
                  <div className="grid gap-1">
                    {selectedDetail.completionStatuses.map((status) => (
                      <div
                        key={status.studentId}
                        className="flex items-center justify-between rounded-card border border-border bg-background px-3 py-2"
                      >
                        <p className="text-sm text-text-primary">
                          {status.lastName} {status.firstName}
                        </p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold text-white ${
                            status.doneAt ? "bg-emerald-600" : "bg-amber-500"
                          }`}
                        >
                          {status.doneAt ? t("homework.status.done") : t("homework.status.todo")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments */}
              <div>
                <p className="mb-2 text-sm font-semibold text-text-primary">
                  {t("homework.detail.commentsTitle")}
                </p>
                {selectedDetail.comments.length === 0 ? (
                  <p className="mb-3 text-sm text-text-secondary">{t("homework.comment.empty")}</p>
                ) : (
                  <div className="mb-3 grid gap-2">
                    {selectedDetail.comments.map((comment) => (
                      <div
                        key={comment.id}
                        className="rounded-card border border-border bg-background p-3"
                      >
                        <p className="text-xs font-semibold text-text-primary">
                          {comment.authorDisplayName}
                        </p>
                        <p className="mt-1 text-sm text-text-primary">{comment.body}</p>
                        <p className="mt-1 text-xs text-text-secondary">
                          {formatDate(comment.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                <form
                  onSubmit={(e) => void handleAddComment(e)}
                  className="flex gap-2"
                >
                  <input
                    {...registerComment("body")}
                    placeholder={t("homework.comment.placeholder")}
                    className="flex-1 rounded-card border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
                    data-testid="homework-comment-input"
                  />
                  <button
                    type="submit"
                    disabled={commentSaving}
                    className="rounded-card bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                    data-testid="homework-comment-submit"
                  >
                    {commentSaving ? "..." : t("homework.comment.submit")}
                  </button>
                </form>
                {commentErrors.body?.message && (
                  <p className="mt-1 text-xs text-notification">{commentErrors.body.message}</p>
                )}
                {commentError && (
                  <p className="mt-1 text-xs text-notification">{commentError}</p>
                )}
              </div>

              {/* Edit/delete actions */}
              {canManage && (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => openEditForm(selectedDetail)}
                    className="rounded-card border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5"
                    data-testid="homework-detail-edit"
                  >
                    {t("homework.detail.edit")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPendingDelete(selectedDetail);
                      setDeleteError(null);
                    }}
                    className="rounded-card bg-notification px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                    data-testid="homework-detail-delete"
                  >
                    {t("homework.detail.delete")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDetail(null)}
                    className="ml-auto text-sm text-text-secondary hover:underline"
                  >
                    {t("homework.detail.close")}
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </Card>
      )}

      {/* ── Create/Edit Form ────────────────────────────────────── */}
      {showForm && (
        <Card
          title={editingHomework ? t("homework.form.editTitle") : t("homework.form.createTitle")}
          subtitle={classCtx?.className ?? ""}
        >
          <form onSubmit={(e) => void handleSave(e)} className="grid gap-5">
            {/* Subject */}
            <div>
              <label className="mb-1 block text-sm font-semibold text-text-primary">
                {t("homework.form.subjectLabel")}
              </label>
              <select
                {...register("subjectId")}
                className="w-full rounded-card border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                data-testid="homework-form-subject"
              >
                <option value="">{t("homework.form.subjectPlaceholder")}</option>
                {subjectOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {errors.subjectId?.message && (
                <p className="mt-1 text-xs text-notification">{errors.subjectId.message}</p>
              )}
            </div>

            {/* Title */}
            <div>
              <label className="mb-1 block text-sm font-semibold text-text-primary">
                {t("homework.form.titleLabel")}
              </label>
              <input
                {...register("title")}
                placeholder={t("homework.form.titlePlaceholder")}
                className="w-full rounded-card border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
                data-testid="homework-form-title"
              />
              {errors.title?.message && (
                <p className="mt-1 text-xs text-notification">{errors.title.message}</p>
              )}
            </div>

            {/* Expected at */}
            <div>
              <label className="mb-1 block text-sm font-semibold text-text-primary">
                {t("homework.form.expectedAtLabel")}
              </label>
              <input
                {...register("expectedAt")}
                type="datetime-local"
                className="w-full rounded-card border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                data-testid="homework-form-expected-at"
              />
              {errors.expectedAt?.message && (
                <p className="mt-1 text-xs text-notification">{errors.expectedAt.message}</p>
              )}
            </div>

            {/* Rich text content */}
            <FormRichTextEditor
              label={t("homework.form.contentLabel")}
              value={contentHtml}
              onChange={setContentHtml}
              allowInlineImages
              onUploadInlineImage={(file) =>
                uploadHomeworkInlineImage(schoolSlug, file)
              }
              editorTestId="homework-form-editor"
            />

            {/* Attachments */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-text-primary">
                {t("homework.form.attachmentsLabel")}
              </label>
              {attachments.length > 0 && (
                <div className="mb-2 grid gap-2">
                  {attachments.map((att, idx) => (
                    <div
                      key={`${att.fileName}-${idx}`}
                      className="flex items-center justify-between rounded-card border border-border bg-background px-3 py-2"
                      data-testid={`homework-form-attachment-${idx}`}
                    >
                      <div>
                        <p className="text-sm font-semibold text-text-primary">{att.fileName}</p>
                        <p className="text-xs text-text-secondary">
                          {att.mimeType ?? ""}
                          {att.sizeLabel ? ` · ${att.sizeLabel}` : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setAttachments((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="text-xs text-notification hover:underline"
                        data-testid={`homework-form-remove-attachment-${idx}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <input
                ref={attachmentInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={async (e) => {
                  const files = Array.from(e.target.files ?? []);
                  for (const file of files) {
                    await handleAttachmentFile(file);
                  }
                  if (attachmentInputRef.current) {
                    attachmentInputRef.current.value = "";
                  }
                }}
                data-testid="homework-form-attachment-input"
              />
              <button
                type="button"
                onClick={() => attachmentInputRef.current?.click()}
                className="rounded-card border border-border px-3 py-2 text-sm text-text-secondary hover:border-primary hover:text-primary"
                data-testid="homework-form-add-attachment"
              >
                + {t("homework.form.addAttachment")}
              </button>
            </div>

            {formError && (
              <p className="text-sm text-notification">{formError}</p>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={formSaving}
                className="rounded-card bg-primary px-6 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                data-testid="homework-form-submit"
              >
                {formSaving ? t("homework.form.saving") : t("homework.form.save")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingHomework(null);
                  setFormError(null);
                }}
                className="rounded-card border border-border px-6 py-2 text-sm font-semibold text-text-secondary hover:border-primary hover:text-primary"
              >
                {t("homework.form.cancel")}
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* ── Delete confirmation ──────────────────────────────────── */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-lg">
            <p className="mb-2 text-base font-bold text-text-primary">
              {t("homework.confirm.deleteTitle")}
            </p>
            <p className="mb-5 text-sm text-text-secondary">
              {t("homework.confirm.deleteMessage")}
            </p>
            {deleteError && (
              <p className="mb-3 text-sm text-notification">{deleteError}</p>
            )}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="rounded-card border border-border px-4 py-2 text-sm text-text-secondary hover:border-primary hover:text-primary"
                data-testid="homework-delete-cancel"
              >
                {t("homework.confirm.cancel")}
              </button>
              <button
                type="button"
                onClick={() => void handleDelete(pendingDelete)}
                className="rounded-card bg-notification px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                data-testid="homework-delete-confirm"
              >
                {t("homework.confirm.deleteConfirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
