"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ArrowLeft,
  ArrowRight,
  Eraser,
  Expand,
  Highlighter,
  ImagePlus,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link2,
  List,
  ListOrdered,
  Paperclip,
  Pilcrow,
  Plus,
  Search,
  Send,
  Strikethrough,
  Trash2,
  Type,
  UserRound,
  X,
} from "lucide-react";
import { ActionIconButton } from "../ui/action-icon-button";
import { PaginationControls } from "../ui/pagination-controls";

type RecipientOption = {
  value: string;
  label: string;
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
  onCancel: () => void;
  onSend?: (payload: {
    subject: string;
    body: string;
    recipientUserIds: string[];
  }) => Promise<void>;
  onSaveDraft?: (payload: {
    subject: string;
    body: string;
    recipientUserIds: string[];
  }) => Promise<void>;
  onUploadInlineImage?: (file: File) => Promise<string>;
};

type SelectedRecipient = {
  value: string;
  label: string;
  kind: "generic" | "teacher" | "function";
  subtitle?: string;
};

export function MessagingComposer({
  recipients = [],
  teacherRecipients = [],
  functionRecipients = [],
  onCancel,
  onSend,
  onSaveDraft,
  onUploadInlineImage,
}: Props) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const inlineImageInputRef = useRef<HTMLInputElement | null>(null);
  const textColorInputRef = useRef<HTMLInputElement | null>(null);
  const bgColorInputRef = useRef<HTMLInputElement | null>(null);
  const selectedImageWrapperRef = useRef<HTMLElement | null>(null);

  const [recipient, setRecipient] = useState("");
  const [selectedRecipients, setSelectedRecipients] = useState<
    SelectedRecipient[]
  >([]);
  const [subject, setSubject] = useState("");
  const [editorText, setEditorText] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sending, setSending] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  const [teacherModalOpen, setTeacherModalOpen] = useState(false);
  const [staffModalOpen, setStaffModalOpen] = useState(false);

  const hasRecipientGroups =
    teacherRecipients.length > 0 || functionRecipients.length > 0;

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

  function applyCommand(command: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    setEditorText(editorRef.current?.innerText ?? "");
  }

  function setBlockFormat(value: string) {
    applyCommand("formatBlock", value);
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
    if (editorRef.current) {
      editorRef.current.innerHTML = "";
    }
    selectImageWrapper(null);
    setEditorText("");
  }

  function selectImageWrapper(wrapper: HTMLElement | null) {
    if (selectedImageWrapperRef.current) {
      selectedImageWrapperRef.current.style.boxShadow = "none";
      selectedImageWrapperRef.current.style.borderColor =
        "rgba(148,163,184,0.45)";
    }
    selectedImageWrapperRef.current = wrapper;
    if (selectedImageWrapperRef.current) {
      selectedImageWrapperRef.current.style.boxShadow =
        "0 0 0 2px rgba(37,99,235,0.25)";
      selectedImageWrapperRef.current.style.borderColor = "rgba(37,99,235,0.6)";
    }
  }

  function getSelectionImageWrapper() {
    const selection = window.getSelection();
    const anchorNode = selection?.anchorNode;
    if (!anchorNode) {
      return null;
    }
    const anchorElement =
      anchorNode.nodeType === Node.ELEMENT_NODE
        ? (anchorNode as Element)
        : anchorNode.parentElement;

    if (!anchorElement) {
      return null;
    }

    return anchorElement.closest(
      '[data-messaging-image="1"]',
    ) as HTMLElement | null;
  }

  function toggleSelectedImageLayout() {
    const wrapper =
      selectedImageWrapperRef.current ?? getSelectionImageWrapper();
    if (!wrapper) {
      setError("Selectionnez une image avant de changer son habillage.");
      return;
    }

    setError(null);
    const currentLayout = wrapper.getAttribute("data-layout") ?? "block";
    if (currentLayout === "block") {
      wrapper.setAttribute("data-layout", "wrap");
      wrapper.style.float = "left";
      wrapper.style.margin = "0 12px 8px 0";
      wrapper.style.clear = "none";
    } else {
      wrapper.setAttribute("data-layout", "block");
      wrapper.style.float = "none";
      wrapper.style.margin = "8px 0";
      wrapper.style.clear = "both";
    }

    selectImageWrapper(wrapper);
  }

  async function handleSend() {
    setError(null);
    setInfo(null);
    if (hasRecipientGroups && selectedRecipients.length === 0) {
      setError("Veuillez selectionner au moins un destinataire.");
      return;
    }
    if (!hasRecipientGroups && !recipient) {
      setError("Veuillez selectionner un destinataire.");
      return;
    }
    if (!subject.trim()) {
      setError("Veuillez renseigner un sujet.");
      return;
    }
    if (!editorText.trim()) {
      setError("Veuillez saisir un message.");
      return;
    }
    if (!onSend) {
      setInfo("Envoi simule. Le branchement API sera ajoute ensuite.");
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
        body: editorRef.current?.innerHTML ?? "",
        recipientUserIds,
      });
      setInfo("Message envoye.");
    } catch {
      setError("Impossible d'envoyer le message.");
    } finally {
      setSending(false);
    }
  }

  async function handleSaveDraft() {
    setError(null);
    if (!onSaveDraft) {
      setInfo("Brouillon simule en local.");
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
        subject: subject.trim() || "Brouillon sans objet",
        body: editorRef.current?.innerHTML ?? "",
        recipientUserIds,
      });
      setInfo("Brouillon enregistre.");
    } catch {
      setError("Impossible d'enregistrer le brouillon.");
    } finally {
      setSavingDraft(false);
    }
  }

  async function handleInlineImageFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Le fichier selectionne n'est pas une image.");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setError("Image trop lourde (max 8 Mo).");
      return;
    }

    if (!onUploadInlineImage) {
      setError("Upload image indisponible.");
      return;
    }

    setError(null);
    try {
      const imageUrl = await onUploadInlineImage(file);
      insertResizableImage(imageUrl, file.name);
    } catch {
      setError("Impossible d'uploader l'image.");
    }
  }

  function insertResizableImage(src: string, alt: string) {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    editor.focus();

    const selection = window.getSelection();
    const range =
      selection && selection.rangeCount > 0
        ? selection.getRangeAt(0)
        : document.createRange();

    if (!selection || selection.rangeCount === 0) {
      range.selectNodeContents(editor);
      range.collapse(false);
    }

    const wrapper = document.createElement("span");
    wrapper.setAttribute("contenteditable", "false");
    wrapper.setAttribute("data-messaging-image", "1");
    wrapper.setAttribute("data-layout", "block");
    wrapper.style.display = "inline-block";
    wrapper.style.maxWidth = "100%";
    wrapper.style.width = "320px";
    wrapper.style.minWidth = "120px";
    wrapper.style.resize = "both";
    wrapper.style.overflow = "hidden";
    wrapper.style.verticalAlign = "top";
    wrapper.style.border = "1px solid rgba(148,163,184,0.45)";
    wrapper.style.borderRadius = "8px";
    wrapper.style.background = "#fff";
    wrapper.style.margin = "8px 0";
    wrapper.style.clear = "both";

    const image = document.createElement("img");
    image.src = src;
    image.alt = alt;
    image.style.display = "block";
    image.style.width = "100%";
    image.style.height = "auto";
    image.style.userSelect = "none";
    image.draggable = false;

    wrapper.appendChild(image);

    range.deleteContents();
    range.insertNode(wrapper);
    selectImageWrapper(wrapper);

    const spacer = document.createElement("p");
    spacer.innerHTML = "<br>";
    if (wrapper.parentNode) {
      wrapper.parentNode.insertBefore(spacer, wrapper.nextSibling);
    }

    const nextRange = document.createRange();
    nextRange.setStart(spacer, 0);
    nextRange.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(nextRange);

    setEditorText(editor.innerText ?? "");
  }

  return (
    <>
      <div
        className={`grid gap-4 ${isFullscreen ? "fixed inset-0 z-50 bg-surface p-4" : ""}`}
      >
        <div className="grid gap-4 rounded-card border border-border bg-background p-4">
          <div className="grid gap-2 md:grid-cols-[auto_minmax(0,1fr)] md:items-start">
            <label className="pt-2 text-sm font-semibold text-text-primary">
              A
            </label>
            {hasRecipientGroups ? (
              <div className="grid gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-h-9 flex-1">
                    {selectedRecipients.length === 0 ? (
                      <p className="pt-2 text-xs text-text-secondary">
                        Aucun destinataire selectionne
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
                              aria-label="Retirer ce destinataire"
                            >
                              x
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <ActionIconButton
                      icon={UserRound}
                      label="Ajouter un enseignant"
                      variant="primary"
                      onClick={() => setTeacherModalOpen(true)}
                    />
                    <ActionIconButton
                      icon={Plus}
                      label="Ajouter un personnel"
                      variant="primary"
                      onClick={() => setStaffModalOpen(true)}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <select
                value={recipient}
                onChange={(event) => setRecipient(event.target.value)}
                className="h-10 rounded-card border border-border bg-surface px-3 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Aucun destinataire selectionne</option>
                {recipients.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid gap-2 md:grid-cols-[auto_minmax(0,1fr)] md:items-start">
            <label className="pt-2 text-sm font-semibold text-text-primary">
              Sujet
            </label>
            <div className="grid gap-1">
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                className="h-10 rounded-card border border-border bg-surface px-3 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="Objet du message"
              />
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-[auto_minmax(0,1fr)] md:items-start">
            <label className="pt-2 text-sm font-semibold text-text-primary">
              Message
            </label>
            <div className="grid gap-0 rounded-card border border-border bg-surface">
              <div className="flex flex-wrap items-center gap-1 border-b border-border p-2">
                <ToolbarBtn
                  onClick={() => applyCommand("undo")}
                  icon={ArrowLeft}
                />
                <ToolbarBtn
                  onClick={() => applyCommand("redo")}
                  icon={ArrowRight}
                />
                <ToolbarDivider />
                <ToolbarBtn onClick={() => applyCommand("bold")} icon={Type} />
                <ToolbarBtn
                  onClick={() => applyCommand("italic")}
                  icon={Italic}
                />
                <ToolbarBtn
                  onClick={() => applyCommand("underline")}
                  icon={Eraser}
                />
                <ToolbarBtn
                  onClick={() => applyCommand("strikeThrough")}
                  icon={Strikethrough}
                />
                <ToolbarDivider />
                <ToolbarBtn
                  onClick={() => applyCommand("insertUnorderedList")}
                  icon={List}
                />
                <ToolbarBtn
                  onClick={() => applyCommand("insertOrderedList")}
                  icon={ListOrdered}
                />
                <ToolbarBtn
                  onClick={() => applyCommand("outdent")}
                  icon={IndentDecrease}
                />
                <ToolbarBtn
                  onClick={() => applyCommand("indent")}
                  icon={IndentIncrease}
                />
                <ToolbarDivider />
                <ToolbarBtn
                  onClick={() => {
                    const url = window.prompt("Lien");
                    if (url) {
                      applyCommand("createLink", url);
                    }
                  }}
                  icon={Link2}
                />
                <ToolbarBtn
                  onClick={() => inlineImageInputRef.current?.click()}
                  icon={ImagePlus}
                />
                <input
                  ref={inlineImageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (event) => {
                    const input = event.currentTarget;
                    const file = event.target.files?.[0];
                    if (file) {
                      await handleInlineImageFile(file);
                    }
                    input.value = "";
                  }}
                />
                <ToolbarDivider />
                <ToolbarBtn
                  onClick={() => applyCommand("justifyLeft")}
                  icon={AlignLeft}
                />
                <ToolbarBtn
                  onClick={() => applyCommand("justifyCenter")}
                  icon={AlignCenter}
                />
                <ToolbarBtn
                  onClick={() => applyCommand("justifyRight")}
                  icon={AlignRight}
                />
                <ToolbarBtn
                  onClick={() => applyCommand("justifyFull")}
                  icon={AlignJustify}
                />
                <ToolbarDivider />
                <label className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-xs text-text-secondary">
                  <Pilcrow className="h-3.5 w-3.5" />
                  <select
                    defaultValue="P"
                    onChange={(event) => setBlockFormat(event.target.value)}
                    className="bg-transparent text-xs text-text-secondary outline-none"
                  >
                    <option value="P">Paragraphe</option>
                    <option value="H1">Titre 1</option>
                    <option value="H2">Titre 2</option>
                    <option value="H3">Titre 3</option>
                    <option value="BLOCKQUOTE">Citation</option>
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => textColorInputRef.current?.click()}
                  className="inline-flex h-8 w-8 items-center justify-center rounded border border-border text-text-secondary transition hover:bg-primary/10 hover:text-primary"
                  title="Couleur du texte"
                >
                  <Type className="h-4 w-4" />
                </button>
                <input
                  ref={textColorInputRef}
                  type="color"
                  className="hidden"
                  onChange={(event) =>
                    applyCommand("foreColor", event.target.value)
                  }
                />
                <button
                  type="button"
                  onClick={() => bgColorInputRef.current?.click()}
                  className="inline-flex h-8 w-8 items-center justify-center rounded border border-border text-text-secondary transition hover:bg-primary/10 hover:text-primary"
                  title="Surlignage"
                >
                  <Highlighter className="h-4 w-4" />
                </button>
                <input
                  ref={bgColorInputRef}
                  type="color"
                  className="hidden"
                  onChange={(event) =>
                    applyCommand("hiliteColor", event.target.value)
                  }
                />
                <ToolbarDivider />
                <ToolbarBtn
                  onClick={() => applyCommand("removeFormat")}
                  icon={Trash2}
                />
                <ToolbarBtn
                  onClick={() => setIsFullscreen((prev) => !prev)}
                  icon={Expand}
                />
                <button
                  type="button"
                  onClick={toggleSelectedImageLayout}
                  className="rounded border border-border px-2 py-1 text-xs text-text-secondary transition hover:bg-primary/10 hover:text-primary"
                  title="Basculer entre mode bloc et texte autour"
                >
                  Habillage
                </button>
              </div>
              <div
                ref={editorRef}
                contentEditable
                onClick={(event) => {
                  const target = event.target as HTMLElement;
                  const wrapper = target.closest(
                    '[data-messaging-image="1"]',
                  ) as HTMLElement | null;
                  selectImageWrapper(wrapper);
                }}
                onInput={() =>
                  setEditorText(editorRef.current?.innerText ?? "")
                }
                className="min-h-[220px] p-3 text-sm text-text-primary outline-none"
              />
              <p className="border-t border-border px-3 py-2 text-xs text-text-secondary">
                Astuce: apres insertion, redimensionnez l'image en tirant le
                coin inferieur droit du cadre.
              </p>
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-[auto_minmax(0,1fr)] md:items-start">
            <label className="pt-2 text-sm font-semibold text-text-primary">
              Pieces jointes
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
              className={`rounded-card border border-dashed p-4 transition ${
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-border bg-surface"
              }`}
            >
              <p className="text-sm text-text-secondary">
                Deposez vos fichiers ici, ou selectionnez un fichier.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-card border border-border bg-background px-3 py-2 text-sm text-text-primary transition hover:bg-primary/10"
                >
                  <ImagePlus className="h-4 w-4" />
                  Depuis mon ordinateur
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
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
                      className="flex items-center justify-between rounded-card border border-border bg-background px-3 py-2"
                    >
                      <span className="inline-flex items-center gap-2 text-sm text-text-primary">
                        <Paperclip className="h-4 w-4 text-primary" />
                        {file.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile(file.name)}
                        className="rounded border border-border px-2 py-1 text-xs text-text-secondary transition hover:bg-notification/10 hover:text-notification"
                      >
                        Supprimer
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
              onClick={onCancel}
              className="rounded-card border border-border bg-background px-3 py-2 text-sm text-text-primary transition hover:bg-primary/10"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={sending || savingDraft}
              className="rounded-card border border-border bg-primary/10 px-3 py-2 text-sm text-primary transition hover:bg-primary/20"
            >
              {savingDraft ? "Enregistrement..." : "Enregistrer en brouillon"}
            </button>
            <button
              type="button"
              onClick={clearEditor}
              className="rounded-card border border-border bg-background px-3 py-2 text-sm text-text-secondary transition hover:bg-surface"
            >
              Effacer
            </button>
          </div>

          <button
            type="button"
            onClick={handleSend}
            disabled={sending || savingDraft}
            className="inline-flex items-center gap-2 rounded-card bg-primary px-3 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
          >
            <Send className="h-4 w-4" />
            {sending ? "Envoi..." : "Envoyer"}
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

function ToolbarBtn({
  onClick,
  icon: Icon,
}: {
  onClick: () => void;
  icon: typeof Type;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded border border-border text-text-secondary transition hover:bg-primary/10 hover:text-primary"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function ToolbarDivider() {
  return <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />;
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
        aria-label="Fermer la recherche des enseignants"
        className="absolute inset-0 bg-text-primary/45"
        onClick={onClose}
      />
      <section className="relative flex max-h-[90vh] w-full max-w-5xl flex-col rounded-card border border-border bg-surface p-4 shadow-soft">
        <header className="mb-3 flex items-center justify-between border-b border-border pb-2">
          <h3 className="font-heading text-base font-semibold text-text-primary">
            Recherchez des enseignants
          </h3>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-card border border-border text-text-secondary transition hover:bg-primary/10 hover:text-primary"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="mb-3 grid gap-2 md:grid-cols-3">
          <label className="grid gap-1 text-xs text-text-secondary">
            Nom de l'enseignant
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
              <input
                value={nameFilter}
                onChange={(event) => setNameFilter(event.target.value)}
                className="h-10 w-full rounded-card border border-border bg-background pl-8 pr-3 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </label>
          <label className="grid gap-1 text-xs text-text-secondary">
            Nom de la matiere
            <input
              value={subjectFilter}
              onChange={(event) => setSubjectFilter(event.target.value)}
              className="h-10 rounded-card border border-border bg-background px-3 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <label className="grid gap-1 text-xs text-text-secondary">
            Classe
            <input
              value={classFilter}
              onChange={(event) => setClassFilter(event.target.value)}
              className="h-10 rounded-card border border-border bg-background px-3 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
        </div>

        <div className="overflow-auto rounded-card border border-border">
          <table className="min-w-full text-sm">
            <thead className="bg-primary text-white">
              <tr>
                <th className="w-12 px-2 py-2 text-left" />
                <th className="px-2 py-2 text-left">Nom</th>
                <th className="px-2 py-2 text-left">Matiere(s)</th>
                <th className="px-2 py-2 text-left">Classe(s)</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row, index) => (
                <tr
                  key={row.value}
                  className={index % 2 === 0 ? "bg-background/60" : ""}
                >
                  <td className="px-2 py-2">
                    <input
                      type="checkbox"
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
                    Aucun enseignant pour ce filtre.
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
            className="rounded-card border border-border bg-background px-3 py-2 text-sm text-text-primary transition hover:bg-primary/10"
            onClick={onClose}
          >
            Fermer
          </button>
          <button
            type="button"
            className="rounded-card bg-primary px-3 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
            onClick={() => onConfirm(selectedRows)}
            disabled={selectedRows.length === 0}
          >
            Ajouter la selection
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
        aria-label="Fermer la recherche des personnels"
        className="absolute inset-0 bg-text-primary/45"
        onClick={onClose}
      />
      <section className="relative flex max-h-[90vh] w-full max-w-5xl flex-col rounded-card border border-border bg-surface p-4 shadow-soft">
        <header className="mb-3 flex items-center justify-between border-b border-border pb-2">
          <h3 className="font-heading text-base font-semibold text-text-primary">
            Recherchez des personnels
          </h3>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-card border border-border text-text-secondary transition hover:bg-primary/10 hover:text-primary"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="mb-3 grid gap-2 md:grid-cols-2">
          <label className="grid gap-1 text-xs text-text-secondary">
            Nom
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
              <input
                value={nameFilter}
                onChange={(event) => setNameFilter(event.target.value)}
                className="h-10 w-full rounded-card border border-border bg-background pl-8 pr-3 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </label>
          <label className="grid gap-1 text-xs text-text-secondary">
            Fonction
            <select
              value={functionFilter}
              onChange={(event) => setFunctionFilter(event.target.value)}
              className="h-10 rounded-card border border-border bg-background px-3 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Toutes les fonctions</option>
              {functionOptions.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="overflow-auto rounded-card border border-border">
          <table className="min-w-full text-sm">
            <thead className="bg-primary text-white">
              <tr>
                <th className="w-12 px-2 py-2 text-left" />
                <th className="px-2 py-2 text-left">Nom</th>
                <th className="px-2 py-2 text-left">Fonction</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row, index) => {
                const key = `${row.functionId}:${row.value}`;
                return (
                  <tr
                    key={key}
                    className={index % 2 === 0 ? "bg-background/60" : ""}
                  >
                    <td className="px-2 py-2">
                      <input
                        type="checkbox"
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
                    Aucun personnel pour ce filtre.
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
            className="rounded-card border border-border bg-background px-3 py-2 text-sm text-text-primary transition hover:bg-primary/10"
            onClick={onClose}
          >
            Fermer
          </button>
          <button
            type="button"
            className="rounded-card bg-primary px-3 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
            onClick={() => onConfirm(selectedRows)}
            disabled={selectedRows.length === 0}
          >
            Ajouter la selection
          </button>
        </footer>
      </section>
    </div>
  );
}
