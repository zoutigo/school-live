"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { AppShell } from "../../../components/layout/app-shell";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { useTranslation } from "../../../i18n/useTranslation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type ResourcePart = "statement" | "correction";

type Attachment = {
  id?: string;
  part?: "STATEMENT" | "CORRECTION";
  fileName: string;
  fileUrl?: string | null;
};

type ResourceDetail = {
  id: string;
  title: string;
  examType: string;
  sequence: string | null;
  academicYearLabel: string;
  school: { id: string; name: string } | null;
  academicLevel: { id: string; label: string };
  subject: { id: string; name: string };
  statementContent: string | null;
  statementStatus: "PENDING" | "APPROVED" | "REJECTED";
  attachments: Attachment[];
};

type Submission = {
  id: string;
  content: string;
  authorUser: { id: string; firstName: string; lastName: string };
  attachments: Attachment[];
};

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default function AdminResourceModerationReviewPage() {
  return (
    <Suspense fallback={null}>
      <AdminResourceModerationReviewPageContent />
    </Suspense>
  );
}

function AdminResourceModerationReviewPageContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams<{ submissionId: string }>();
  const searchParams = useSearchParams();
  const submissionId = params.submissionId;
  const resourceId = searchParams.get("resourceId") ?? "";
  const part = (searchParams.get("part") ?? "statement") as ResourcePart;

  const [ready, setReady] = useState(false);
  const [detail, setDetail] = useState<ResourceDetail | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isActing, setIsActing] = useState(false);

  const load = useCallback(async () => {
    if (!resourceId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [resourceRes, submissionsRes] = await Promise.all([
        fetch(`${API_URL}/resources/${resourceId}`, {
          credentials: "include",
        }),
        fetch(`${API_URL}/resources/${resourceId}/submissions?part=${part}`, {
          credentials: "include",
        }),
      ]);
      if (!resourceRes.ok || !submissionsRes.ok) {
        throw new Error("LOAD_FAILED");
      }
      const resourceData = (await resourceRes.json()) as ResourceDetail;
      const submissions = (await submissionsRes.json()) as Submission[];
      setDetail(resourceData);
      setSubmission(
        submissions.find((item) => item.id === submissionId) ?? null,
      );
    } catch {
      setError(t("resourcesModeration.errors.loadFailed"));
    } finally {
      setIsLoading(false);
    }
  }, [resourceId, part, submissionId, t]);

  useEffect(() => {
    void boot();
  }, []);

  useEffect(() => {
    if (!ready) return;
    void load();
  }, [ready, load]);

  async function boot() {
    try {
      const meRes = await fetch(`${API_URL}/me`, { credentials: "include" });
      if (!meRes.ok) {
        router.replace("/");
        return;
      }
      const me = (await meRes.json()) as { activeRole?: string | null };
      if (!["SUPER_ADMIN", "ADMIN"].includes(me.activeRole ?? "")) {
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

  function goBack() {
    router.push("/admin-resources");
  }

  function startEdit() {
    if (!submission) return;
    setEditContent(submission.content);
    setIsEditing(true);
  }

  async function saveEdit() {
    if (!submission) return;
    setIsSavingEdit(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_URL}/admin/resources/submissions/${submission.id}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: editContent,
            attachments: submission.attachments,
          }),
        },
      );
      if (!res.ok) {
        throw new Error(res.status === 409 ? "CONFLICT" : "EDIT_FAILED");
      }
      const updated = (await res.json()) as Submission;
      setSubmission(updated);
      setIsEditing(false);
    } catch (err) {
      await load();
      setError(
        err instanceof Error && err.message === "CONFLICT"
          ? t("resourcesModeration.errors.conflict")
          : t("resourcesModeration.editFailed"),
      );
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function act(action: "approve" | "reject") {
    if (!submission) return;
    setIsActing(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_URL}/admin/resources/submissions/${submission.id}/${action}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body:
            action === "reject"
              ? JSON.stringify({ reason: rejectReason || undefined })
              : undefined,
        },
      );
      if (!res.ok) {
        throw new Error(res.status === 409 ? "CONFLICT" : "ACTION_FAILED");
      }
      goBack();
    } catch (err) {
      await load();
      setError(
        err instanceof Error && err.message === "CONFLICT"
          ? t("resourcesModeration.errors.conflict")
          : t("resourcesModeration.errors.actionFailed"),
      );
    } finally {
      setIsActing(false);
    }
  }

  if (!ready) {
    return (
      <AppShell schoolName="Scolive Platform">
        <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
          {t("common.loading")}
        </div>
      </AppShell>
    );
  }

  const referenceStatement =
    part === "correction" && detail?.statementStatus === "APPROVED"
      ? detail.statementContent
      : null;
  const referenceAttachments =
    part === "correction"
      ? (detail?.attachments ?? []).filter((a) => a.part === "STATEMENT")
      : [];

  return (
    <AppShell schoolName="Scolive Platform">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <button
          type="button"
          onClick={goBack}
          className="flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
          data-testid="admin-resources-review-back"
        >
          <ChevronLeft size={16} />
          {t("resourcesModeration.back")}
        </button>

        {error ? (
          <div className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="text-sm text-muted-foreground">
            {t("common.loading")}
          </div>
        ) : !detail || !submission ? (
          <div
            className="text-sm text-muted-foreground"
            data-testid="admin-resources-review-notfound"
          >
            {t("resourcesModeration.notFound")}
          </div>
        ) : (
          <Card>
            <p className="font-heading text-xl font-semibold">{detail.title}</p>
            <p className="text-sm text-muted-foreground">
              {detail.subject.name} • {detail.academicLevel.label}
              {detail.school ? ` • ${detail.school.name}` : ""}
            </p>
            <p
              className="mt-1 text-xs font-semibold text-primary"
              data-testid="admin-resources-review-author"
            >
              {t("resourcesModeration.authorPrefix")}
              {submission.authorUser.firstName} {submission.authorUser.lastName}
            </p>

            {part === "correction" ? (
              <div className="mt-4">
                <p className="text-sm font-semibold">
                  {t("resourcesModeration.referenceStatementLabel")}
                </p>
                <div className="mt-2 rounded-card border border-border bg-background p-4 text-sm">
                  {referenceStatement ? (
                    <p data-testid="admin-resources-review-reference">
                      {stripHtml(referenceStatement)}
                    </p>
                  ) : (
                    <p className="italic text-muted-foreground">
                      {t("resourcesModeration.statementNotApproved")}
                    </p>
                  )}
                </div>
                {referenceAttachments.length > 0 ? (
                  <ul className="mt-2 space-y-1">
                    {referenceAttachments.map((attachment, idx) => (
                      <li key={attachment.id ?? idx}>
                        <a
                          href={attachment.fileUrl ?? undefined}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-primary underline"
                          data-testid={`admin-resources-review-reference-attachment-${idx}`}
                        >
                          {attachment.fileName}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}

            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm font-semibold">
                {t("resourcesModeration.submissionContentLabel")}
              </p>
              {!isEditing ? (
                <button
                  type="button"
                  onClick={startEdit}
                  className="text-sm font-semibold text-primary"
                  data-testid="admin-resources-review-edit-start"
                >
                  {t("resourcesModeration.editContent")}
                </button>
              ) : null}
            </div>

            {isEditing ? (
              <div className="mt-2 space-y-2">
                <textarea
                  className="w-full rounded-card border border-warm-border p-2 text-sm"
                  rows={8}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  data-testid="admin-resources-review-edit-textarea"
                />
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => setIsEditing(false)}
                    disabled={isSavingEdit}
                    data-testid="admin-resources-review-edit-cancel"
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button
                    onClick={saveEdit}
                    disabled={isSavingEdit}
                    data-testid="admin-resources-review-edit-save"
                  >
                    {t("resourcesModeration.saveEdit")}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="mt-2 rounded-card border border-border bg-background p-4 text-sm">
                  <p data-testid="admin-resources-review-content">
                    {stripHtml(submission.content)}
                  </p>
                </div>
                {submission.attachments.length > 0 ? (
                  <ul className="mt-2 space-y-1">
                    {submission.attachments.map((attachment, idx) => (
                      <li key={attachment.id ?? idx}>
                        <a
                          href={attachment.fileUrl ?? undefined}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-primary underline"
                          data-testid={`admin-resources-review-attachment-${idx}`}
                        >
                          {attachment.fileName}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            )}

            <textarea
              className="mt-4 w-full rounded-card border border-warm-border p-2 text-sm"
              placeholder={t("resourcesModeration.rejectReasonPlaceholder")}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              data-testid="admin-resources-review-reject-reason"
            />

            <div className="mt-4 flex gap-2">
              <Button
                onClick={() => act("approve")}
                disabled={isActing || isEditing}
                data-testid="admin-resources-review-approve"
              >
                {t("resourcesModeration.approve")}
              </Button>
              <Button
                variant="secondary"
                onClick={() => act("reject")}
                disabled={isActing || isEditing}
                data-testid="admin-resources-review-reject"
              >
                {t("resourcesModeration.reject")}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
