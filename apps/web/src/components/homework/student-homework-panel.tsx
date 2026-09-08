"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card } from "../ui/card";
import { ModuleHelpTab } from "../ui/module-help-tab";
import { OnboardingTarget } from "../onboarding/onboarding-target";
import { useOnboardingTourStore } from "../../store/onboarding-tour";
import { usePageHelp } from "../../store/page-help";
import {
  HOMEWORK_TOUR_ID,
  HOMEWORK_TOUR_TARGETS,
} from "./homework-tour.config";
import { useTranslation, type TranslateFn } from "../../i18n/useTranslation";
import {
  listClassHomework,
  getHomeworkDetail,
  addComment,
  setCompletion,
  type HomeworkRow,
  type HomeworkDetail,
} from "./homework-api";

const HOMEWORK_TOUR_FALLBACK_ID = "homework-tour-fallback";

type TabKey = "list" | "view" | "help";

type Props = {
  schoolSlug: string;
  /** null = pas encore de classe resolue pour ce profil (message "non accessible"). */
  classId: string | null;
  /** absent = le devoir du compte connecte (eleve) ; sinon devoirs de cet enfant (parent). */
  studentId?: string;
  cardTitle: string;
  cardSubtitle: string;
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

/**
 * Vue Liste/Resume/Aide + panneau de detail (lecture seule, marquer fait,
 * commentaires, pieces jointes) partagee entre l'eleve consultant ses propres
 * devoirs (`classes/[classId]/devoirs`, `studentId` absent) et le parent
 * consultant ceux d'un enfant (`children/[childId]/cahier-de-texte`,
 * `studentId = childId`) — miroir web de `ClassHomeworkScreen` mobile, qui
 * sert deja les deux roles via son parametre `childId` optionnel.
 */
export function StudentHomeworkPanel({
  schoolSlug,
  classId,
  studentId,
  cardTitle,
  cardSubtitle,
}: Props) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabKey>("list");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [homeworks, setHomeworks] = useState<HomeworkRow[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<HomeworkDetail | null>(
    null,
  );
  const [detailLoading, setDetailLoading] = useState(false);
  const [completionLoading, setCompletionLoading] = useState(false);
  const [commentSaving, setCommentSaving] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  const homeworkTourActiveTourId = useOnboardingTourStore(
    (state) => state.activeTourId,
  );
  const homeworkTourActiveTargetKey = useOnboardingTourStore((state) =>
    state.activeTourId ? state.steps[state.stepIndex]?.targetKey : undefined,
  );
  const isHomeworkTourActive = homeworkTourActiveTourId === HOMEWORK_TOUR_ID;

  // The row/mark-done tour steps only exist in the "list" tab. Force it back
  // if the tour reaches one of those steps while another tab is active, so
  // the step's target actually mounts instead of leaving the tour stuck.
  useEffect(() => {
    if (
      (homeworkTourActiveTargetKey === HOMEWORK_TOUR_TARGETS.row ||
        homeworkTourActiveTargetKey === HOMEWORK_TOUR_TARGETS.markDone) &&
      tab !== "list"
    ) {
      setTab("list");
    }
  }, [homeworkTourActiveTargetKey, tab]);

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
    resetComment({ body: "" });
    setCommentError(null);
    if (homework.id === HOMEWORK_TOUR_FALLBACK_ID) {
      setSelectedDetail({ ...homework, comments: [], completionStatuses: [] });
      setDetailLoading(false);
      return;
    }
    if (!classId) return;
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
    if (!classId || detail.id === HOMEWORK_TOUR_FALLBACK_ID) return;
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
    if (
      !selectedDetail ||
      !classId ||
      selectedDetail.id === HOMEWORK_TOUR_FALLBACK_ID
    ) {
      return;
    }
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

  // A demo row is always shown while the tour is on the "list" tab, whether
  // the real list is empty or not: it keeps the row/mark-done steps
  // deterministic instead of depending on mutable real data (order, done
  // state). It disappears as soon as the tour ends. Never mixed into
  // `listItems`/`summaryStats`, which stay driven by real data for the
  // "View" tab summary.
  const fallbackHomeworkItem = useMemo(
    () => ({
      id: HOMEWORK_TOUR_FALLBACK_ID,
      classId: classId ?? "",
      title: t("homework.tourFallback.title"),
      contentHtml: null,
      expectedAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      authorUserId: "",
      authorDisplayName: t("homework.tourFallback.author"),
      subject: {
        id: "homework-tour-fallback-subject",
        name: t("homework.tourFallback.subject"),
        colorHex: null,
      },
      attachments: [],
      commentsCount: 0,
      summary: null,
      myDoneAt: null,
      status: "todo" as const,
    }),
    [classId, t],
  );
  const showFallbackHomeworkRow = isHomeworkTourActive && tab === "list";
  const displayedListRows = showFallbackHomeworkRow
    ? [fallbackHomeworkItem]
    : listItems;

  const summaryStats = useMemo(() => {
    const total = listItems.length;
    const done = listItems.filter((hw) => hw.status === "done").length;
    const late = listItems.filter((hw) => hw.status === "late").length;
    const todo = listItems.filter((hw) => hw.status === "todo").length;
    return { total, done, late, todo };
  }, [listItems]);

  usePageHelp({
    title:
      tab === "view"
        ? t("homework.studentHelp.view.title")
        : t("homework.studentHelp.list.title"),
    sections: [
      tab === "view"
        ? {
            title: t("homework.studentHelp.view.section1Title"),
            body: [t("homework.studentHelp.view.section1Body")],
          }
        : {
            title: t("homework.studentHelp.list.section1Title"),
            body: [t("homework.studentHelp.list.section1Body")],
          },
      {
        title: t("homework.studentHelp.section2Title"),
        body: [t("homework.studentHelp.body2")],
      },
      {
        title: t("homework.studentHelp.section3Title"),
        body: [t("homework.studentHelp.body3")],
      },
    ],
  });

  return (
    <div className="grid gap-4">
      <Card title={cardTitle} subtitle={cardSubtitle}>
        <OnboardingTarget id={HOMEWORK_TOUR_TARGETS.tabs}>
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
        </OnboardingTarget>

        {!classId ? (
          <p className="text-sm text-notification">
            {t("homework.page.classNotAccessible")}
          </p>
        ) : loading ? (
          <p className="text-sm text-text-secondary">
            {t("homework.common.loading")}
          </p>
        ) : error ? (
          <p className="text-sm text-notification">{error}</p>
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
            {displayedListRows.length === 0 ? (
              <p className="text-sm text-text-secondary">
                {t("homework.list.empty")}
              </p>
            ) : (
              <OnboardingTarget id={HOMEWORK_TOUR_TARGETS.row}>
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
                      {displayedListRows.map((hw) => (
                        <tr
                          key={hw.id}
                          className="border-b border-border hover:bg-background cursor-pointer"
                          onClick={() => {
                            void openDetail(hw);
                            useOnboardingTourStore
                              .getState()
                              .advanceIfTarget(HOMEWORK_TOUR_TARGETS.row);
                          }}
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
              </OnboardingTarget>
            )}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-card border border-border bg-background p-3">
              <p className="text-xs text-text-secondary">
                {t("homework.summary.total")}
              </p>
              <p className="text-sm font-semibold text-text-primary">
                {summaryStats.total}
              </p>
            </div>
            <div className="rounded-card border border-border bg-background p-3">
              <p className="text-xs text-text-secondary">
                {t("homework.summary.todo")}
              </p>
              <p className="text-sm font-semibold text-text-primary">
                {summaryStats.todo}
              </p>
            </div>
            <div className="rounded-card border border-border bg-background p-3">
              <p className="text-xs text-text-secondary">
                {t("homework.summary.late")}
              </p>
              <p className="text-sm font-semibold text-text-primary">
                {summaryStats.late}
              </p>
            </div>
            <div className="rounded-card border border-border bg-background p-3">
              <p className="text-xs text-text-secondary">
                {t("homework.status.done")}
              </p>
              <p className="text-sm font-semibold text-text-primary">
                {summaryStats.done}
              </p>
            </div>
          </div>
        )}
      </Card>

      {(selectedDetail || detailLoading) && (
        <Card
          title={t("homework.detail.title")}
          subtitle={selectedDetail?.subject.name ?? ""}
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

              <OnboardingTarget id={HOMEWORK_TOUR_TARGETS.markDone}>
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
              </OnboardingTarget>

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
