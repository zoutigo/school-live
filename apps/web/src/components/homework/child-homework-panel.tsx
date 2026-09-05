"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card } from "../ui/card";
import { useTranslation, type TranslateFn } from "../../i18n/useTranslation";
import {
  listClassHomework,
  getHomeworkDetail,
  addComment,
  setCompletion,
  type HomeworkRow,
  type HomeworkDetail,
} from "./homework-api";

type Props = {
  schoolSlug: string;
  classId: string | null | undefined;
  studentId: string;
  childFullName: string;
  className?: string | null;
};

function buildCommentSchema(t: TranslateFn) {
  return z.object({
    body: z.string().trim().min(1, t("homework.comment.errorEmpty")),
  });
}

type CommentFormValues = z.infer<ReturnType<typeof buildCommentSchema>>;

function computeStatus(homework: HomeworkRow): "done" | "late" | "todo" {
  if (homework.myDoneAt) return "done";
  if (new Date(homework.expectedAt) < new Date()) return "late";
  return "todo";
}

function statusPill(status: "done" | "late" | "todo") {
  if (status === "done")
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
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

export function ChildHomeworkPanel({
  schoolSlug,
  classId,
  studentId,
  childFullName,
  className,
}: Props) {
  const { t } = useTranslation();
  const [homeworks, setHomeworks] = useState<HomeworkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<HomeworkDetail | null>(
    null,
  );
  const [detailLoading, setDetailLoading] = useState(false);
  const [completionLoading, setCompletionLoading] = useState(false);
  const [commentSaving, setCommentSaving] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  const commentSchema = useMemo(() => buildCommentSchema(t), [t]);
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

  const loadHomeworks = useCallback(async () => {
    if (!schoolSlug || !classId) return;
    setLoading(true);
    setError(null);
    try {
      const items = await listClassHomework(schoolSlug, classId, {
        studentId,
      });
      setHomeworks(
        items.sort(
          (a, b) =>
            new Date(a.expectedAt).getTime() - new Date(b.expectedAt).getTime(),
        ),
      );
    } catch {
      setError(t("homework.errors.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [schoolSlug, classId, studentId, t]);

  useEffect(() => {
    void loadHomeworks();
  }, [loadHomeworks]);

  async function openDetail(homework: HomeworkRow) {
    if (!classId) return;
    resetComment({ body: "" });
    setCommentError(null);
    setSelectedDetail(null);
    setDetailLoading(true);
    try {
      const detail = await getHomeworkDetail(
        schoolSlug,
        classId,
        homework.id,
        studentId,
      );
      setSelectedDetail(detail);
    } catch {
      setError(t("homework.errors.loadFailed"));
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleToggleDone(detail: HomeworkDetail) {
    if (!classId) return;
    setCompletionLoading(true);
    try {
      const updated = await setCompletion(schoolSlug, classId, detail.id, {
        done: !detail.myDoneAt,
        studentId,
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
    if (!selectedDetail || !classId) return;
    setCommentSaving(true);
    setCommentError(null);
    try {
      const updated = await addComment(schoolSlug, classId, selectedDetail.id, {
        body: values.body.trim(),
        studentId,
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
        err instanceof Error
          ? err.message
          : t("homework.form.errors.saveFailed"),
      );
    } finally {
      setCommentSaving(false);
    }
  });

  const listItems = useMemo(
    () => homeworks.map((hw) => ({ ...hw, status: computeStatus(hw) })),
    [homeworks],
  );

  const subtitle = className
    ? `${childFullName} - ${className}`
    : childFullName;

  return (
    <div className="grid gap-4">
      <Card
        title={t("homework.cahierDeTexte.title")}
        subtitle={subtitle}
        className="min-w-0"
      >
        {loading ? (
          <p className="text-sm text-text-secondary">
            {t("homework.common.loading")}
          </p>
        ) : error ? (
          <p className="text-sm text-notification">{error}</p>
        ) : listItems.length === 0 ? (
          <p className="text-sm text-text-secondary">
            {t("homework.list.empty")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-text-secondary">
                  <th className="px-3 py-2 font-medium">
                    {t("homework.table.title")}
                  </th>
                  <th className="px-3 py-2 font-medium">
                    {t("homework.table.subject")}
                  </th>
                  <th className="px-3 py-2 font-medium">
                    {t("homework.table.dueDate")}
                  </th>
                  <th className="px-3 py-2 font-medium">
                    {t("homework.table.status")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {listItems.map((hw) => (
                  <tr
                    key={hw.id}
                    className="cursor-pointer border-b border-border hover:bg-background"
                    onClick={() => void openDetail(hw)}
                    data-testid={`homework-row-${hw.id}`}
                  >
                    <td className="px-3 py-2 font-medium text-text-primary">
                      {hw.title}
                    </td>
                    <td className="px-3 py-2 text-text-secondary">
                      {hw.subject.name}
                    </td>
                    <td className="px-3 py-2 text-text-secondary">
                      {formatDate(hw.expectedAt)}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${statusPill(hw.status)}`}
                      >
                        {statusLabel(hw.status, t)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {(selectedDetail || detailLoading) && (
        <Card
          title={t("homework.detail.title")}
          subtitle={selectedDetail?.subject.name ?? ""}
          className="min-w-0"
        >
          {detailLoading ? (
            <p className="text-sm text-text-secondary">
              {t("homework.common.loading")}
            </p>
          ) : selectedDetail ? (
            <div className="grid gap-6">
              <div>
                <p className="text-lg font-bold text-text-primary">
                  {selectedDetail.title}
                </p>
                <p className="text-sm text-text-secondary">
                  {t("homework.list.duePrefix")}{" "}
                  {formatDate(selectedDetail.expectedAt)} ·{" "}
                  {t("homework.list.author")} {selectedDetail.authorDisplayName}
                </p>
              </div>

              <button
                type="button"
                disabled={completionLoading}
                onClick={() => void handleToggleDone(selectedDetail)}
                className={`w-fit rounded-card px-4 py-2 text-sm font-semibold text-white ${
                  selectedDetail.myDoneAt
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-primary hover:opacity-90"
                } disabled:opacity-60`}
                data-testid="homework-toggle-done"
              >
                {completionLoading
                  ? t("homework.common.loading")
                  : selectedDetail.myDoneAt
                    ? t("homework.detail.markUndone")
                    : t("homework.detail.markDone")}
              </button>

              <div>
                <p className="mb-2 text-sm font-semibold text-text-primary">
                  {t("homework.detail.instructionsTitle")}
                </p>
                {selectedDetail.contentHtml ? (
                  <div
                    className="prose prose-sm max-w-none text-text-primary"
                    dangerouslySetInnerHTML={{
                      __html: selectedDetail.contentHtml,
                    }}
                  />
                ) : (
                  <p className="text-sm text-text-secondary">
                    {t("homework.detail.noInstructions")}
                  </p>
                )}
              </div>

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
                          <p className="text-sm font-semibold text-text-primary">
                            {att.fileName}
                          </p>
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

              <div>
                <p className="mb-2 text-sm font-semibold text-text-primary">
                  {t("homework.detail.commentsTitle")}
                </p>
                {selectedDetail.comments.length === 0 ? (
                  <p className="mb-3 text-sm text-text-secondary">
                    {t("homework.comment.empty")}
                  </p>
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
                        <p className="mt-1 text-sm text-text-primary">
                          {comment.body}
                        </p>
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
                  <p className="mt-1 text-xs text-notification">
                    {commentErrors.body.message}
                  </p>
                )}
                {commentError && (
                  <p className="mt-1 text-xs text-notification">
                    {commentError}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedDetail(null)}
                className="w-fit text-sm text-text-secondary hover:underline"
                data-testid="homework-detail-close"
              >
                {t("homework.detail.close")}
              </button>
            </div>
          ) : null}
        </Card>
      )}
    </div>
  );
}
