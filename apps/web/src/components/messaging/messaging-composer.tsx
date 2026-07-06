"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ImagePlus,
  Paperclip,
  Plus,
  Search,
  Send,
  UserRound,
  X,
} from "lucide-react";
import {
  RichTextEditor,
  type RichTextEditorRef,
} from "../editor/rich-text-editor";
import { ActionIconButton } from "../ui/action-icon-button";
import { PaginationControls } from "../ui/pagination-controls";
import {
  FormCheckbox,
  FormFileInput,
  FormSelect,
  FormTextInput,
} from "../ui/form-controls";
import {
  buildDraftSnapshot,
  canSendMessage,
  hasUnsavedDraftChanges,
} from "./messaging-compose-logic";
import { useTranslation } from "../../i18n/useTranslation";

type RecipientOption = {
  value: string;
  label: string;
};

export type SearchRecipientOption = RecipientOption & {
  schoolSlug?: string | null;
  schoolName?: string | null;
};

type TeacherRecipientOption = {
  value: string;
  label: string;
  email?: string;
  classes: string[];
  subjects: string[];
};

type FunctionRecipientOption = {
  value: string;
  label: string;
  email?: string;
  functionId: string;
  functionLabel: string;
};

type Props = {
  recipients?: RecipientOption[];
  teacherRecipients?: TeacherRecipientOption[];
  functionRecipients?: FunctionRecipientOption[];
  initialSubject?: string;
  initialBody?: string;
  initialRecipientUserIds?: string[];
  onCancel: () => void;
  onRequestBackToList?: () => void;
  onUnsavedChange?: (hasUnsavedChanges: boolean) => void;
  onSend?: (payload: {
    subject: string;
    body: string;
    recipientUserIds: string[];
    attachments: File[];
  }) => Promise<void>;
  onSaveDraft?: (payload: {
    subject: string;
    body: string;
    recipientUserIds: string[];
    attachments: File[];
  }) => Promise<void>;
  onUploadInlineImage?: (file: File) => Promise<string>;
  /**
   * Platform-wide compose mode (SUPER_ADMIN/ADMIN): recipients are searched
   * across every school instead of picked from a preloaded list, since the
   * candidate pool is the whole platform. When provided, takes over the
   * recipient picker in place of `recipients`/`teacherRecipients`/
   * `functionRecipients`.
   */
  onSearchRecipients?: (query: string) => Promise<SearchRecipientOption[]>;
};

type SelectedRecipient = {
  value: string;
  label: string;
  kind: "generic" | "teacher" | "function";
  subtitle?: string;
  schoolSlug?: string | null;
};

export function MessagingComposer({
  recipients = [],
  teacherRecipients = [],
  functionRecipients = [],
  initialSubject = "",
  initialBody = "",
  initialRecipientUserIds = [],
  onCancel,
  onRequestBackToList,
  onUnsavedChange,
  onSend,
  onSaveDraft,
  onUploadInlineImage,
  onSearchRecipients,
}: Props) {
  const { t } = useTranslation();
  const editorApiRef = useRef<RichTextEditorRef | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [recipient, setRecipient] = useState("");
  const [selectedRecipients, setSelectedRecipients] = useState<
    SelectedRecipient[]
  >([]);
  const [subject, setSubject] = useState(initialSubject);
  const [editorText, setEditorText] = useState("");
  const [editorHtml, setEditorHtml] = useState(initialBody);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [sending, setSending] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [lastSavedDraftSnapshot, setLastSavedDraftSnapshot] = useState<
    string | null
  >(null);

  const [teacherModalOpen, setTeacherModalOpen] = useState(false);
  const [staffModalOpen, setStaffModalOpen] = useState(false);

  const hasRecipientGroups =
    teacherRecipients.length > 0 ||
    functionRecipients.length > 0 ||
    Boolean(onSearchRecipients);
  const [initialRecipientsApplied, setInitialRecipientsApplied] =
    useState(false);

  const [recipientSearchTerm, setRecipientSearchTerm] = useState("");
  const [recipientSearchResults, setRecipientSearchResults] = useState<
    SearchRecipientOption[]
  >([]);
  const [recipientSearchLoading, setRecipientSearchLoading] = useState(false);

  useEffect(() => {
    if (!onSearchRecipients) {
      return;
    }
    const query = recipientSearchTerm.trim();
    if (query.length < 2) {
      setRecipientSearchResults([]);
      return;
    }

    let cancelled = false;
    setRecipientSearchLoading(true);
    const timeout = setTimeout(() => {
      void onSearchRecipients(query)
        .then((results) => {
          if (!cancelled) {
            setRecipientSearchResults(results);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setRecipientSearchResults([]);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setRecipientSearchLoading(false);
          }
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [recipientSearchTerm, onSearchRecipients]);

  const selectedSchoolSlugs = useMemo(
    () =>
      Array.from(
        new Set(
          selectedRecipients
            .map((entry) => entry.schoolSlug)
            .filter((slug): slug is string => Boolean(slug)),
        ),
      ),
    [selectedRecipients],
  );
  const spansMultipleSchools = selectedSchoolSlugs.length > 1;

  useEffect(() => {
    if (initialRecipientsApplied) {
      return;
    }

    const ids = Array.from(
      new Set(
        initialRecipientUserIds
          .map((value) => value.trim())
          .filter((value) => value.length > 0),
      ),
    );
    if (ids.length === 0) {
      setInitialRecipientsApplied(true);
      return;
    }

    if (hasRecipientGroups) {
      const teacherById = new Map(
        teacherRecipients.map((row) => [row.value, row]),
      );
      const functionById = new Map(
        functionRecipients.map((row) => [row.value, row]),
      );
      if (teacherById.size === 0 && functionById.size === 0) {
        return;
      }

      for (const id of ids) {
        const teacher = teacherById.get(id);
        if (teacher) {
          addRecipient({
            kind: "teacher",
            value: teacher.value,
            label: teacher.label,
            subtitle: teacher.subjects.slice(0, 2).join(", "),
          });
          continue;
        }

        const staff = functionById.get(id);
        if (staff) {
          addRecipient({
            kind: "function",
            value: staff.value,
            label: staff.label,
            subtitle: staff.functionLabel,
          });
        }
      }
      setInitialRecipientsApplied(true);
      return;
    }

    if (recipients.length === 0) {
      return;
    }
    const firstMatch = ids.find((id) =>
      recipients.some((row) => row.value === id),
    );
    if (firstMatch) {
      setRecipient(firstMatch);
    }
    setInitialRecipientsApplied(true);
  }, [
    addRecipient,
    functionRecipients,
    hasRecipientGroups,
    initialRecipientUserIds,
    initialRecipientsApplied,
    recipients,
    teacherRecipients,
  ]);

  const sendEnabled = canSendMessage({
    hasRecipientGroups,
    selectedRecipientsCount: selectedRecipients.length,
    recipient,
    subject,
    bodyText: editorText,
    sending,
    savingDraft,
  });

  const currentDraftSnapshot = buildDraftSnapshot({
    hasRecipientGroups,
    recipient,
    selectedRecipientIds: selectedRecipients.map((entry) => entry.value),
    subject,
    bodyText: editorText,
  });
  const hasUnsavedChanges = hasUnsavedDraftChanges({
    currentSnapshot: currentDraftSnapshot,
    lastSavedDraftSnapshot,
  });

  useEffect(() => {
    onUnsavedChange?.(hasUnsavedChanges);
  }, [hasUnsavedChanges, onUnsavedChange]);

  function addRecipient(next: SelectedRecipient) {
    setSelectedRecipients((prev) => {
      if (
        prev.some(
          (entry) => entry.kind === next.kind && entry.value === next.value,
        )
      ) {
        return prev;
      }
      return [...prev, next];
    });
  }

  function removeRecipient(kind: SelectedRecipient["kind"], value: string) {
    setSelectedRecipients((prev) =>
      prev.filter((entry) => !(entry.kind === kind && entry.value === value)),
    );
  }

  function addFiles(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }
    const rows = Array.from(files);
    setAttachments((prev) => {
      const next = [...prev];
      for (const file of rows) {
        if (!next.some((entry) => entry.name === file.name)) {
          next.push(file);
        }
      }
      return next;
    });
  }

  function removeFile(fileName: string) {
    setAttachments((prev) => prev.filter((file) => file.name !== fileName));
  }

  function clearEditor() {
    editorApiRef.current?.clear();
    setEditorText("");
    setEditorHtml("");
  }

  async function handleSend() {
    setError(null);
    setInfo(null);
    if (hasRecipientGroups && selectedRecipients.length === 0) {
      setError(t("messaging.compose.errors.noRecipientGroup"));
      return;
    }
    if (!hasRecipientGroups && !recipient) {
      setError(t("messaging.compose.errors.noRecipient"));
      return;
    }
    if (!subject.trim()) {
      setError(t("messaging.compose.errors.noSubject"));
      return;
    }
    if (!editorText.trim()) {
      setError(t("messaging.compose.errors.noBody"));
      return;
    }
    if (!onSend) {
      setInfo(t("messaging.compose.info.sendSimulated"));
      return;
    }

    const recipientUserIds = Array.from(
      new Set(
        hasRecipientGroups
          ? selectedRecipients.map((entry) => entry.value)
          : recipient
            ? [recipient]
            : [],
      ),
    );

    setSending(true);
    try {
      await onSend({
        subject: subject.trim(),
        body: editorHtml,
        recipientUserIds,
        attachments,
      });
      setInfo(t("messaging.compose.info.sent"));
    } catch {
      setError(t("messaging.compose.errors.sendFailed"));
    } finally {
      setSending(false);
    }
  }

  async function handleSaveDraft() {
    setError(null);
    if (!onSaveDraft) {
      setInfo(t("messaging.compose.info.draftSimulated"));
      return;
    }

    const recipientUserIds = Array.from(
      new Set(
        hasRecipientGroups
          ? selectedRecipients.map((entry) => entry.value)
          : recipient
            ? [recipient]
            : [],
      ),
    );

    setSavingDraft(true);
    try {
      await onSaveDraft({
        subject: subject.trim() || t("messaging.compose.draftDefaultSubject"),
        body: editorHtml,
        recipientUserIds,
        attachments,
      });
      setLastSavedDraftSnapshot(currentDraftSnapshot);
      setInfo(t("messaging.compose.info.draftSaved"));
    } catch {
      setError(t("messaging.compose.errors.draftFailed"));
    } finally {
      setSavingDraft(false);
    }
  }

  return (
    <>
      <div className="grid gap-4">
        <div className="filter-panel grid gap-4">
          <div className="grid gap-2 md:grid-cols-[auto_minmax(0,1fr)] md:items-start">
            <label className="pt-2 text-sm font-semibold text-text-primary">
              {t("messaging.compose.to")}
            </label>
            {hasRecipientGroups ? (
              <div className="grid gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-h-9 flex-1">
                    {selectedRecipients.length === 0 ? (
                      <p className="pt-2 text-xs text-text-secondary">
                        {t("messaging.compose.noRecipientSelected")}
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {selectedRecipients.map((entry) => (
                          <span
                            key={`${entry.kind}-${entry.value}`}
                            className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                          >
                            {entry.label}
                            {entry.subtitle ? (
                              <span className="text-[10px] text-primary/75">
                                ({entry.subtitle})
                              </span>
                            ) : null}
                            <button
                              type="button"
                              onClick={() =>
                                removeRecipient(entry.kind, entry.value)
                              }
                              className="rounded-full border border-primary/30 px-1 leading-none transition hover:bg-primary/20"
                              aria-label={t(
                                "messaging.compose.removeRecipient",
                              )}
                            >
                              x
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {onSearchRecipients ? null : (
                    <div className="flex shrink-0 items-center gap-2">
                      <ActionIconButton
                        icon={UserRound}
                        label={t("messaging.compose.addTeacher")}
                        variant="primary"
                        onClick={() => setTeacherModalOpen(true)}
                      />
                      <ActionIconButton
                        icon={Plus}
                        label={t("messaging.compose.addStaff")}
                        variant="primary"
                        onClick={() => setStaffModalOpen(true)}
                      />
                    </div>
                  )}
                </div>

                {onSearchRecipients ? (
                  <div className="relative">
                    <div className="flex items-center gap-2 rounded-[14px] border border-warm-border bg-surface px-3 py-2">
                      <Search className="h-4 w-4 text-text-secondary" />
                      <input
                        type="text"
                        value={recipientSearchTerm}
                        onChange={(event) =>
                          setRecipientSearchTerm(event.target.value)
                        }
                        placeholder={t(
                          "messaging.compose.searchRecipientsPlaceholder",
                        )}
                        className="w-full bg-transparent text-sm text-text-primary outline-none"
                      />
                    </div>
                    {recipientSearchTerm.trim().length >= 2 ? (
                      <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-[14px] border border-warm-border bg-surface shadow-lg">
                        {recipientSearchLoading ? (
                          <p className="px-3 py-2 text-xs text-text-secondary">
                            {t("messaging.compose.searchingRecipients")}
                          </p>
                        ) : recipientSearchResults.length === 0 ? (
                          <p className="px-3 py-2 text-xs text-text-secondary">
                            {t("messaging.compose.noRecipientMatch")}
                          </p>
                        ) : (
                          recipientSearchResults.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => {
                                addRecipient({
                                  kind: "generic",
                                  value: option.value,
                                  label: option.label,
                                  subtitle: option.schoolName ?? undefined,
                                  schoolSlug: option.schoolSlug,
                                });
                                setRecipientSearchTerm("");
                                setRecipientSearchResults([]);
                              }}
                              className="flex w-full flex-col items-start px-3 py-2 text-left text-sm text-text-primary transition hover:bg-warm-highlight/60"
                            >
                              <span>{option.label}</span>
                              {option.schoolName ? (
                                <span className="text-[11px] text-text-secondary">
                                  {option.schoolName}
                                </span>
                              ) : null}
                            </button>
                          ))
                        )}
                      </div>
                    ) : null}
                    {spansMultipleSchools ? (
                      <p className="mt-1 text-[11px] text-text-secondary">
                        {t("messaging.compose.multiSchoolDraftNotice")}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : (
              <FormSelect
                value={recipient}
                onChange={(event) => setRecipient(event.target.value)}
                className="h-10 text-sm"
              >
                <option value="">
                  {t("messaging.compose.noRecipientOption")}
                </option>
                {recipients.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </FormSelect>
            )}
          </div>

          <div className="grid gap-2 md:grid-cols-[auto_minmax(0,1fr)] md:items-start">
            <label className="pt-2 text-sm font-semibold text-text-primary">
              {t("messaging.compose.subject")}
            </label>
            <div className="grid gap-1">
              <FormTextInput
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                className="h-10 text-sm"
                placeholder={t("messaging.compose.subjectPlaceholder")}
              />
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-[auto_minmax(0,1fr)] md:items-start">
            <label className="pt-2 text-sm font-semibold text-text-primary">
              {t("messaging.compose.message")}
            </label>
            <RichTextEditor
              ref={editorApiRef}
              initialHtml={initialBody}
              onTextChange={setEditorText}
              onHtmlChange={setEditorHtml}
              onUploadInlineImage={onUploadInlineImage}
              hint={t("messaging.compose.editorHint")}
            />
          </div>

          <div className="grid gap-2 md:grid-cols-[auto_minmax(0,1fr)] md:items-start">
            <label className="pt-2 text-sm font-semibold text-text-primary">
              {t("messaging.compose.attachments")}
            </label>
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragOver(false);
                addFiles(event.dataTransfer.files);
              }}
              className={`rounded-[18px] border border-dashed p-4 transition ${
                dragOver
                  ? "border-primary bg-[linear-gradient(180deg,rgba(12,95,168,0.08)_0%,rgba(255,248,240,0.92)_100%)]"
                  : "border-warm-border bg-warm-surface"
              }`}
            >
              <p className="text-sm text-text-secondary">
                {t("messaging.compose.dropzoneHint")}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-[14px] border border-warm-border bg-surface px-3 py-2 text-sm text-text-primary transition hover:bg-warm-highlight/60"
                >
                  <ImagePlus className="h-4 w-4" />
                  {t("messaging.compose.fromComputer")}
                </button>
                <FormFileInput
                  ref={fileInputRef}
                  multiple
                  className="hidden"
                  onChange={(event) => addFiles(event.target.files)}
                />
              </div>

              {attachments.length > 0 ? (
                <ul className="mt-3 grid gap-2">
                  {attachments.map((file) => (
                    <li
                      key={file.name}
                      className="flex items-center justify-between rounded-[14px] border border-warm-border bg-surface px-3 py-2"
                    >
                      <span className="inline-flex items-center gap-2 text-sm text-text-primary">
                        <Paperclip className="h-4 w-4 text-primary" />
                        {file.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile(file.name)}
                        className="rounded border border-warm-border px-2 py-1 text-xs text-text-secondary transition hover:bg-notification/10 hover:text-notification"
                      >
                        {t("messaging.compose.removeAttachment")}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </div>

        {error ? <p className="text-sm text-notification">{error}</p> : null}
        {info ? <p className="text-sm text-success">{info}</p> : null}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                onRequestBackToList ? onRequestBackToList() : onCancel()
              }
              className="rounded-[14px] border border-warm-border bg-surface px-3 py-2 text-sm text-text-primary transition hover:bg-warm-highlight/60"
            >
              {t("messaging.compose.cancel")}
            </button>
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={sending || savingDraft || spansMultipleSchools}
              title={
                spansMultipleSchools
                  ? t("messaging.compose.multiSchoolDraftNotice")
                  : undefined
              }
              className="rounded-[14px] border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary transition hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingDraft
                ? t("messaging.compose.savingDraft")
                : t("messaging.compose.saveDraft")}
            </button>
            <button
              type="button"
              onClick={clearEditor}
              className="rounded-[14px] border border-warm-border bg-surface px-3 py-2 text-sm text-text-secondary transition hover:bg-warm-highlight/60"
            >
              {t("messaging.compose.clear")}
            </button>
          </div>

          <button
            type="button"
            onClick={handleSend}
            disabled={!sendEnabled}
            className="inline-flex items-center gap-2 rounded-[14px] bg-primary px-3 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(12,95,168,0.18)] transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {sending
              ? t("messaging.compose.sending")
              : t("messaging.compose.send")}
          </button>
        </div>
      </div>

      <TeacherRecipientsModal
        open={teacherModalOpen}
        rows={teacherRecipients}
        onClose={() => setTeacherModalOpen(false)}
        onConfirm={(rows) => {
          for (const row of rows) {
            addRecipient({
              kind: "teacher",
              value: row.value,
              label: row.label,
              subtitle: row.subjects.slice(0, 2).join(", "),
            });
          }
          setTeacherModalOpen(false);
        }}
      />

      <StaffRecipientsModal
        open={staffModalOpen}
        rows={functionRecipients}
        onClose={() => setStaffModalOpen(false)}
        onConfirm={(rows) => {
          for (const row of rows) {
            addRecipient({
              kind: "function",
              value: row.value,
              label: row.label,
              subtitle: row.functionLabel,
            });
          }
          setStaffModalOpen(false);
        }}
      />
    </>
  );
}

type TeacherModalProps = {
  open: boolean;
  rows: TeacherRecipientOption[];
  onClose: () => void;
  onConfirm: (rows: TeacherRecipientOption[]) => void;
};

function TeacherRecipientsModal({
  open,
  rows,
  onClose,
  onConfirm,
}: TeacherModalProps) {
  const { t } = useTranslation();
  const [nameFilter, setNameFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        const byName =
          !nameFilter.trim() ||
          row.label.toLowerCase().includes(nameFilter.trim().toLowerCase());
        const bySubject =
          !subjectFilter.trim() ||
          row.subjects
            .join(" ")
            .toLowerCase()
            .includes(subjectFilter.trim().toLowerCase());
        const byClass =
          !classFilter.trim() ||
          row.classes
            .join(" ")
            .toLowerCase()
            .includes(classFilter.trim().toLowerCase());
        return byName && bySubject && byClass;
      }),
    [rows, nameFilter, subjectFilter, classFilter],
  );

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const pageRows = filteredRows.slice(start, start + pageSize);

  const selectedRows = filteredRows.filter((row) => selected[row.value]);

  useEffect(() => {
    setPage(1);
  }, [nameFilter, subjectFilter, classFilter, pageSize]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label={t("messaging.compose.teacherModal.close")}
        className="absolute inset-0 bg-text-primary/45"
        onClick={onClose}
      />
      <section className="relative flex max-h-[90vh] w-full max-w-5xl flex-col rounded-[24px] border border-warm-border bg-[linear-gradient(180deg,rgba(255,253,252,1)_0%,rgba(255,248,240,1)_100%)] p-4 shadow-[0_24px_60px_rgba(47,36,24,0.18)]">
        <header className="mb-3 flex items-center justify-between border-b border-border pb-2">
          <h3 className="font-heading text-base font-semibold text-text-primary">
            {t("messaging.compose.teacherModal.title")}
          </h3>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-[12px] border border-warm-border text-text-secondary transition hover:bg-warm-highlight hover:text-primary"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="mb-3 grid gap-2 md:grid-cols-3">
          <label className="grid gap-1 text-xs text-text-secondary">
            {t("messaging.compose.teacherModal.nameLabel")}
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
              <FormTextInput
                value={nameFilter}
                onChange={(event) => setNameFilter(event.target.value)}
                className="h-10 w-full pl-8 pr-3 text-sm"
              />
            </div>
          </label>
          <label className="grid gap-1 text-xs text-text-secondary">
            {t("messaging.compose.teacherModal.subjectLabel")}
            <FormTextInput
              value={subjectFilter}
              onChange={(event) => setSubjectFilter(event.target.value)}
              className="h-10 text-sm"
            />
          </label>
          <label className="grid gap-1 text-xs text-text-secondary">
            {t("messaging.compose.teacherModal.classLabel")}
            <FormTextInput
              value={classFilter}
              onChange={(event) => setClassFilter(event.target.value)}
              className="h-10 text-sm"
            />
          </label>
        </div>

        <div className="overflow-auto rounded-[18px] border border-warm-border bg-surface">
          <table className="min-w-full text-sm">
            <thead className="bg-primary text-white">
              <tr>
                <th className="w-12 px-2 py-2 text-left" />
                <th className="px-2 py-2 text-left">
                  {t("messaging.compose.teacherModal.colName")}
                </th>
                <th className="px-2 py-2 text-left">
                  {t("messaging.compose.teacherModal.colSubjects")}
                </th>
                <th className="px-2 py-2 text-left">
                  {t("messaging.compose.teacherModal.colClasses")}
                </th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row, index) => (
                <tr
                  key={row.value}
                  className={index % 2 === 0 ? "bg-warm-highlight/30" : ""}
                >
                  <td className="px-2 py-2">
                    <FormCheckbox
                      checked={Boolean(selected[row.value])}
                      onChange={(event) =>
                        setSelected((prev) => ({
                          ...prev,
                          [row.value]: event.target.checked,
                        }))
                      }
                    />
                  </td>
                  <td className="px-2 py-2 text-text-primary">{row.label}</td>
                  <td className="px-2 py-2 text-text-secondary">
                    {row.subjects.join(", ") || "-"}
                  </td>
                  <td className="px-2 py-2 text-text-secondary">
                    {row.classes.join(", ") || "-"}
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-2 py-3 text-text-secondary">
                    {t("messaging.compose.teacherModal.empty")}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <PaginationControls
          page={currentPage}
          totalPages={totalPages}
          totalItems={filteredRows.length}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          onPageChange={setPage}
        />

        <footer className="mt-3 flex items-center justify-between">
          <button
            type="button"
            className="rounded-[14px] border border-warm-border bg-surface px-3 py-2 text-sm text-text-primary transition hover:bg-warm-highlight/60"
            onClick={onClose}
          >
            {t("messaging.compose.teacherModal.close.action")}
          </button>
          <button
            type="button"
            className="rounded-[14px] bg-primary px-3 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(12,95,168,0.18)] transition hover:bg-primary-dark"
            onClick={() => onConfirm(selectedRows)}
            disabled={selectedRows.length === 0}
          >
            {t("messaging.compose.teacherModal.confirm")}
          </button>
        </footer>
      </section>
    </div>
  );
}

type StaffModalProps = {
  open: boolean;
  rows: FunctionRecipientOption[];
  onClose: () => void;
  onConfirm: (rows: FunctionRecipientOption[]) => void;
};

function StaffRecipientsModal({
  open,
  rows,
  onClose,
  onConfirm,
}: StaffModalProps) {
  const { t } = useTranslation();
  const [nameFilter, setNameFilter] = useState("");
  const [functionFilter, setFunctionFilter] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const functionOptions = Array.from(
    rows.reduce((acc, row) => {
      const key = row.functionLabel.trim().toLowerCase();
      if (!acc.has(key)) {
        acc.set(key, row.functionLabel.trim());
      }
      return acc;
    }, new Map<string, string>()),
  ).map(([value, label]) => ({ value, label }));

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        const byName =
          !nameFilter.trim() ||
          row.label.toLowerCase().includes(nameFilter.trim().toLowerCase());
        const byFunction =
          !functionFilter ||
          row.functionLabel.trim().toLowerCase() === functionFilter;
        return byName && byFunction;
      }),
    [rows, nameFilter, functionFilter],
  );

  const selectedRows = filteredRows.filter(
    (row) => selected[`${row.functionId}:${row.value}`],
  );
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const pageRows = filteredRows.slice(start, start + pageSize);

  useEffect(() => {
    setPage(1);
  }, [nameFilter, functionFilter, pageSize]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label={t("messaging.compose.staffModal.close")}
        className="absolute inset-0 bg-text-primary/45"
        onClick={onClose}
      />
      <section className="relative flex max-h-[90vh] w-full max-w-5xl flex-col rounded-[24px] border border-warm-border bg-[linear-gradient(180deg,rgba(255,253,252,1)_0%,rgba(255,248,240,1)_100%)] p-4 shadow-[0_24px_60px_rgba(47,36,24,0.18)]">
        <header className="mb-3 flex items-center justify-between border-b border-border pb-2">
          <h3 className="font-heading text-base font-semibold text-text-primary">
            {t("messaging.compose.staffModal.title")}
          </h3>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-[12px] border border-warm-border text-text-secondary transition hover:bg-warm-highlight hover:text-primary"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="mb-3 grid gap-2 md:grid-cols-2">
          <label className="grid gap-1 text-xs text-text-secondary">
            {t("messaging.compose.staffModal.nameLabel")}
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
              <FormTextInput
                value={nameFilter}
                onChange={(event) => setNameFilter(event.target.value)}
                className="h-10 w-full pl-8 pr-3 text-sm"
              />
            </div>
          </label>
          <label className="grid gap-1 text-xs text-text-secondary">
            {t("messaging.compose.staffModal.functionLabel")}
            <FormSelect
              value={functionFilter}
              onChange={(event) => setFunctionFilter(event.target.value)}
              className="h-10 text-sm"
            >
              <option value="">
                {t("messaging.compose.staffModal.allFunctions")}
              </option>
              {functionOptions.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </FormSelect>
          </label>
        </div>

        <div className="overflow-auto rounded-[18px] border border-warm-border bg-surface">
          <table className="min-w-full text-sm">
            <thead className="bg-primary text-white">
              <tr>
                <th className="w-12 px-2 py-2 text-left" />
                <th className="px-2 py-2 text-left">
                  {t("messaging.compose.staffModal.colName")}
                </th>
                <th className="px-2 py-2 text-left">
                  {t("messaging.compose.staffModal.colFunction")}
                </th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row, index) => {
                const key = `${row.functionId}:${row.value}`;
                return (
                  <tr
                    key={key}
                    className={index % 2 === 0 ? "bg-warm-highlight/30" : ""}
                  >
                    <td className="px-2 py-2">
                      <FormCheckbox
                        checked={Boolean(selected[key])}
                        onChange={(event) =>
                          setSelected((prev) => ({
                            ...prev,
                            [key]: event.target.checked,
                          }))
                        }
                      />
                    </td>
                    <td className="px-2 py-2 text-text-primary">{row.label}</td>
                    <td className="px-2 py-2 text-text-secondary">
                      {row.functionLabel}
                    </td>
                  </tr>
                );
              })}
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-2 py-3 text-text-secondary">
                    {t("messaging.compose.staffModal.empty")}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <PaginationControls
          page={currentPage}
          totalPages={totalPages}
          totalItems={filteredRows.length}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          onPageChange={setPage}
        />

        <footer className="mt-3 flex items-center justify-between">
          <button
            type="button"
            className="rounded-[14px] border border-warm-border bg-surface px-3 py-2 text-sm text-text-primary transition hover:bg-warm-highlight/60"
            onClick={onClose}
          >
            {t("messaging.compose.staffModal.close.action")}
          </button>
          <button
            type="button"
            className="rounded-[14px] bg-primary px-3 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(12,95,168,0.18)] transition hover:bg-primary-dark"
            onClick={() => onConfirm(selectedRows)}
            disabled={selectedRows.length === 0}
          >
            {t("messaging.compose.staffModal.confirm")}
          </button>
        </footer>
      </section>
    </div>
  );
}
