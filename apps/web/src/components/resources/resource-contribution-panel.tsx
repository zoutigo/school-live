"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FormRichTextEditor } from "../ui/form-rich-text-editor";
import { useTranslation } from "../../i18n/useTranslation";
import {
  getResource,
  listSubmissions,
  saveSubmissionDraft,
  submitSubmission,
  uploadAttachment,
  uploadInlineImage,
  type ResourceAttachment,
  type ResourceDetail,
  type ResourceSubmission,
  type ResourceSubmissionPart,
} from "./resources-api";

const ACTIVE_STATUSES = new Set(["DRAFT", "AWAITING"]);

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasMeaningfulContent(html: string): boolean {
  return stripHtml(html).length > 0 || /<img[\s>]/i.test(html);
}

function ContributionSection(props: {
  resourceId: string;
  part: ResourceSubmissionPart;
  approvedContent: string | null;
  approvedStatus: string | undefined;
  attachments: ResourceAttachment[];
  locked: boolean;
  onResourceChanged: () => void;
}) {
  const { t } = useTranslation();
  const { resourceId, part } = props;
  const partKey = part === "statement" ? "STATEMENT" : "CORRECTION";
  const hasApprovedContent =
    props.approvedStatus === "APPROVED" && !!props.approvedContent;

  const [submissions, setSubmissions] = useState<ResourceSubmission[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [draftContent, setDraftContent] = useState("");
  const [draftAttachments, setDraftAttachments] = useState<
    ResourceAttachment[]
  >([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contentError, setContentError] = useState<string | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (props.locked) return;
    try {
      const result = await listSubmissions(resourceId, part);
      setSubmissions(result);
      const active = result.find((s) => ACTIVE_STATUSES.has(s.status));
      if (active && active.status === "DRAFT") {
        setDraftContent(active.content);
        setDraftAttachments(active.attachments);
      }
    } catch {
      setError(t("resourcesMine.contribution.errors.loadFailed"));
    } finally {
      setLoaded(true);
    }
  }, [resourceId, part, props.locked, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeSubmission = submissions.find((s) =>
    ACTIVE_STATUSES.has(s.status),
  );
  const lastResolvedSubmission = submissions
    .slice()
    .reverse()
    .find((s) => s.status === "REJECTED" || s.status === "DISCARDED");

  const showContributionForm =
    !hasApprovedContent &&
    !props.locked &&
    (!activeSubmission || activeSubmission.status === "DRAFT");

  function statusLabel(status: ResourceSubmission["status"]) {
    return t(`resourcesMine.contribution.status.${status}`);
  }

  async function handleAttachmentFiles(files: File[]) {
    for (const file of files) {
      try {
        const uploaded = await uploadAttachment(file);
        setDraftAttachments((current) => [...current, uploaded]);
      } catch {
        setError(t("resourcesMine.contribution.errors.attachmentFailed"));
      }
    }
  }

  async function handleSaveDraft() {
    setIsSaving(true);
    setError(null);
    try {
      const submission = await saveSubmissionDraft(resourceId, part, {
        content: draftContent.trim(),
        attachments: draftAttachments,
      });
      setSubmissions((current) => [
        ...current.filter((s) => s.id !== submission.id),
        submission,
      ]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("resourcesMine.contribution.errors.saveFailed"),
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmitForReview() {
    if (!hasMeaningfulContent(draftContent)) {
      setContentError(t("resourcesMine.contribution.errors.contentRequired"));
      return;
    }
    setContentError(null);
    setIsSaving(true);
    setError(null);
    try {
      const submission = await saveSubmissionDraft(resourceId, part, {
        content: draftContent.trim(),
        attachments: draftAttachments,
      });
      await submitSubmission(resourceId, submission.id);
      await load();
      props.onResourceChanged();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("resourcesMine.contribution.errors.submitFailed"),
      );
    } finally {
      setIsSaving(false);
    }
  }

  const partLabel =
    part === "statement"
      ? t("resourcesMine.contribution.statementTitle")
      : t("resourcesMine.contribution.correctionTitle");

  return (
    <div
      className="rounded-card border border-border bg-background p-4"
      data-testid={`resources-mine-contribution-${part}`}
    >
      <p className="mb-2 text-sm font-bold text-text-primary">{partLabel}</p>

      {props.locked ? (
        <p
          className="text-sm text-text-secondary"
          data-testid={`resources-mine-contribution-${part}-locked`}
        >
          {t("resourcesMine.contribution.correctionLocked")}
        </p>
      ) : (
        <>
          <p className="mb-1 text-xs font-semibold text-text-secondary">
            {t("resourcesMine.contribution.approvedLabel")}
          </p>
          {hasApprovedContent ? (
            <div className="mb-3">
              <p
                className="rounded-card border border-border bg-surface p-3 text-sm text-text-primary"
                data-testid={`resources-mine-contribution-${part}-approved`}
              >
                {stripHtml(props.approvedContent ?? "")}
              </p>
              {props.attachments.length > 0 && (
                <div className="mt-2 grid gap-1">
                  {props.attachments
                    .filter((a) => a.part === partKey)
                    .map((att, idx) => (
                      <a
                        key={att.id ?? idx}
                        href={att.fileUrl ?? undefined}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        {att.fileName}
                      </a>
                    ))}
                </div>
              )}
            </div>
          ) : (
            <p className="mb-3 text-sm italic text-text-secondary">
              {t("resourcesMine.contribution.noApprovedYet")}
            </p>
          )}

          {loaded && (activeSubmission || lastResolvedSubmission) && (
            <div className="mb-3 grid gap-1">
              {activeSubmission && activeSubmission.status === "AWAITING" && (
                <p
                  className="rounded-card border border-border bg-surface px-3 py-2 text-xs font-semibold text-text-primary"
                  data-testid={`resources-mine-contribution-${part}-my-status`}
                >
                  {statusLabel(activeSubmission.status)}
                </p>
              )}
              {lastResolvedSubmission &&
                (!activeSubmission || activeSubmission.status === "DRAFT") && (
                  <div
                    className="rounded-card border border-border bg-surface px-3 py-2"
                    data-testid={`resources-mine-contribution-${part}-last-resolved`}
                  >
                    <p className="text-xs font-semibold text-text-primary">
                      {statusLabel(lastResolvedSubmission.status)}
                    </p>
                    {lastResolvedSubmission.status === "REJECTED" &&
                      lastResolvedSubmission.reason && (
                        <p className="text-xs text-text-secondary">
                          {t("resourcesMine.contribution.rejectedReasonLabel")}{" "}
                          {lastResolvedSubmission.reason}
                        </p>
                      )}
                  </div>
                )}
            </div>
          )}

          {showContributionForm && (
            <>
              <FormRichTextEditor
                label={t("resourcesMine.contribution.myContributionLabel")}
                value={draftContent}
                onChange={(html) => {
                  setDraftContent(html);
                  if (contentError) setContentError(null);
                }}
                allowInlineImages
                onUploadInlineImage={uploadInlineImage}
                editorTestId={`resources-mine-contribution-${part}-editor`}
                error={contentError}
                invalid={!!contentError}
              />

              <div className="mt-2">
                {draftAttachments.length > 0 && (
                  <div className="mb-2 grid gap-2">
                    {draftAttachments.map((att, idx) => (
                      <div
                        key={`${att.fileName}-${idx}`}
                        className="flex items-center justify-between rounded-card border border-border bg-surface px-3 py-2"
                        data-testid={`resources-mine-contribution-${part}-attachment-${idx}`}
                      >
                        <p className="text-sm text-text-primary">
                          {att.fileName}
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            setDraftAttachments((current) =>
                              current.filter((_, i) => i !== idx),
                            )
                          }
                          className="text-xs text-notification hover:underline"
                          data-testid={`resources-mine-contribution-${part}-remove-attachment-${idx}`}
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
                    await handleAttachmentFiles(files);
                    if (attachmentInputRef.current) {
                      attachmentInputRef.current.value = "";
                    }
                  }}
                  data-testid={`resources-mine-contribution-${part}-attachment-input`}
                />
                <button
                  type="button"
                  onClick={() => attachmentInputRef.current?.click()}
                  className="rounded-card border border-border px-3 py-1.5 text-xs font-semibold text-text-secondary hover:border-primary hover:text-primary"
                  data-testid={`resources-mine-contribution-${part}-add-attachment`}
                >
                  + {t("resourcesMine.contribution.addAttachment")}
                </button>
              </div>

              {error && (
                <p className="mt-2 text-sm text-notification">{error}</p>
              )}

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => void handleSaveDraft()}
                  className="rounded-card border border-border px-4 py-2 text-sm font-semibold text-text-secondary hover:border-primary hover:text-primary disabled:opacity-60"
                  data-testid={`resources-mine-contribution-${part}-save-draft`}
                >
                  {t("resourcesMine.contribution.saveDraft")}
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => void handleSubmitForReview()}
                  className="rounded-card bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                  data-testid={`resources-mine-contribution-${part}-submit`}
                >
                  {t("resourcesMine.contribution.submit")}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

export function ResourceContributionPanel(props: {
  resourceId: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [detail, setDetail] = useState<ResourceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getResource(props.resourceId);
      setDetail(result);
    } catch {
      setError(t("resourcesMine.contribution.errors.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [props.resourceId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const correctionLocked = detail?.statementStatus !== "APPROVED";

  return (
    <div
      className="rounded-card border border-border bg-surface p-4"
      data-testid="resources-mine-contribution-panel"
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-lg font-bold text-text-primary">
          {detail?.title ?? t("resourcesMine.contribution.title")}
        </p>
        <button
          type="button"
          onClick={props.onClose}
          className="text-sm text-text-secondary hover:underline"
          data-testid="resources-mine-contribution-close"
        >
          {t("resourcesMine.contribution.close")}
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-text-secondary">{t("common.loading")}</p>
      ) : error || !detail ? (
        <p className="text-sm text-notification">
          {error ?? t("resourcesMine.contribution.errors.loadFailed")}
        </p>
      ) : (
        <div className="grid gap-4">
          <ContributionSection
            resourceId={detail.id}
            part="statement"
            approvedContent={detail.statementContent}
            approvedStatus={detail.statementStatus}
            attachments={detail.attachments}
            locked={false}
            onResourceChanged={() => void load()}
          />
          <ContributionSection
            resourceId={detail.id}
            part="correction"
            approvedContent={detail.correctionContent}
            approvedStatus={detail.correctionStatus}
            attachments={detail.attachments}
            locked={correctionLocked}
            onResourceChanged={() => void load()}
          />
        </div>
      )}
    </div>
  );
}
