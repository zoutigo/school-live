"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  FileText,
  Forward,
  Inbox,
  Mail,
  MailOpen,
  Reply,
  Send,
} from "lucide-react";
import { Card } from "../../../../../components/ui/card";
import {
  archiveSchoolMessage,
  deleteSchoolMessage,
  getSchoolMessage,
  getSchoolMessagesUnreadCount,
  listSchoolMessages,
  markSchoolMessageRead,
} from "../../../../../components/messaging/messaging-api";
import { MessagingAttachmentPreviewModal } from "../../../../../components/messaging/messaging-attachment-preview-modal";
import { buildComposeQueryFromMessage } from "../../../../../components/messaging/messaging-compose-logic";
import { MessagingMessageActions } from "../../../../../components/messaging/messaging-message-actions";
import { MessagingFoldersPanel } from "../../../../../components/messaging/messaging-folders-panel";
import { MessagingMessagesList } from "../../../../../components/messaging/messaging-messages-list";
import { MessagingReader } from "../../../../../components/messaging/messaging-reader";
import { MessagingToolbar } from "../../../../../components/messaging/messaging-toolbar";
import { ConfirmDialog } from "../../../../../components/ui/confirm-dialog";
import { ActionIconButton } from "../../../../../components/ui/action-icon-button";
import type {
  FolderKey,
  MessageAttachment,
  MessagingFolder,
  MessagingMessage,
} from "../../../../../components/messaging/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type SchoolRole =
  | "SCHOOL_ADMIN"
  | "SCHOOL_MANAGER"
  | "SUPERVISOR"
  | "SCHOOL_ACCOUNTANT"
  | "SCHOOL_STAFF"
  | "TEACHER"
  | "PARENT"
  | "STUDENT";

type MePayload = {
  role?: SchoolRole;
  schoolName?: string;
};

const FOLDERS: MessagingFolder[] = [
  { key: "inbox", label: "Boite de reception", icon: Inbox },
  { key: "sent", label: "Envoyes", icon: Send },
  { key: "drafts", label: "Brouillons", icon: FileText },
  { key: "archive", label: "Archives", icon: Archive },
];

const COMPOSER_ALLOWED_ROLES: SchoolRole[] = [
  "SCHOOL_ADMIN",
  "SCHOOL_MANAGER",
  "SUPERVISOR",
  "SCHOOL_ACCOUNTANT",
  "SCHOOL_STAFF",
  "TEACHER",
  "PARENT",
];

function getFolderLabel(folder: FolderKey) {
  if (folder === "inbox") {
    return "Boite de reception";
  }
  if (folder === "sent") {
    return "Messages envoyes";
  }
  if (folder === "drafts") {
    return "Brouillons";
  }
  return "Messages archives";
}

export default function SchoolMessageriePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams<{ schoolSlug: string }>();
  const schoolSlug = params.schoolSlug;

  const initialFolder = searchParams.get("folder");
  const [folder, setFolder] = useState<FolderKey>(
    initialFolder === "sent" ||
      initialFolder === "drafts" ||
      initialFolder === "archive"
      ? initialFolder
      : "inbox",
  );
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [isCompactDevice, setIsCompactDevice] = useState(false);

  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState<string | null>(null);
  const [role, setRole] = useState<SchoolRole | null>(null);
  const [messages, setMessages] = useState<MessagingMessage[]>([]);
  const [inboxUnreadCount, setInboxUnreadCount] = useState(0);
  const [draftsCount, setDraftsCount] = useState(0);
  const [archiveCount, setArchiveCount] = useState(0);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    null,
  );
  const [selectedMessage, setSelectedMessage] =
    useState<MessagingMessage | null>(null);
  const [previewAttachment, setPreviewAttachment] =
    useState<MessageAttachment | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    if (!schoolSlug) {
      return;
    }
    void loadProfile(schoolSlug);
  }, [schoolSlug]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const onChange = () => setIsCompactDevice(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  async function loadProfile(currentSchoolSlug: string) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${API_URL}/schools/${currentSchoolSlug}/me`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        router.replace(`/schools/${currentSchoolSlug}/login`);
        return;
      }

      const payload = (await response.json()) as MePayload;
      setRole(payload.role ?? null);
      setSchoolName(payload.schoolName ?? null);
      await loadMessages(currentSchoolSlug, folder, search);
    } catch {
      setError("Impossible de charger la messagerie.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!schoolSlug || loading) {
      return;
    }
    void loadMessages(schoolSlug, folder, search);
  }, [schoolSlug, folder, search]);

  useEffect(() => {
    if (folder !== "inbox" && unreadOnly) {
      setUnreadOnly(false);
    }
  }, [folder, unreadOnly]);

  async function loadMessages(
    currentSchoolSlug: string,
    nextFolder: FolderKey,
    nextSearch: string,
  ) {
    setMessagesLoading(true);
    try {
      const [payload, unreadCount, draftsPayload, archivePayload] =
        await Promise.all([
          listSchoolMessages(currentSchoolSlug, {
            folder: nextFolder,
            q: nextSearch,
            page: 1,
            limit: 50,
          }),
          getSchoolMessagesUnreadCount(currentSchoolSlug),
          listSchoolMessages(currentSchoolSlug, {
            folder: "drafts",
            page: 1,
            limit: 1,
          }),
          listSchoolMessages(currentSchoolSlug, {
            folder: "archive",
            page: 1,
            limit: 1,
          }),
        ]);
      setMessages(payload.items);
      setInboxUnreadCount(unreadCount);
      setDraftsCount(draftsPayload.meta.total);
      setArchiveCount(archivePayload.meta.total);
      setError(null);
    } catch {
      setError("Impossible de charger la messagerie.");
    } finally {
      setMessagesLoading(false);
    }
  }

  const canCompose = role ? COMPOSER_ALLOWED_ROLES.includes(role) : false;

  useEffect(() => {
    if (messages.length === 0) {
      setSelectedMessageId(null);
      setSelectedMessage(null);
      return;
    }
    if (
      !selectedMessageId ||
      !messages.some((message) => message.id === selectedMessageId)
    ) {
      setSelectedMessageId(messages[0].id);
    }
  }, [messages, selectedMessageId]);

  useEffect(() => {
    if (!schoolSlug || !selectedMessageId || isCompactDevice) {
      return;
    }
    void loadSelectedMessage(schoolSlug, selectedMessageId);
  }, [schoolSlug, selectedMessageId, isCompactDevice]);

  async function loadSelectedMessage(
    currentSchoolSlug: string,
    messageId: string,
  ) {
    try {
      const details = await getSchoolMessage(currentSchoolSlug, messageId);
      setSelectedMessage(details);
      if (folder === "inbox") {
        await markSchoolMessageRead(currentSchoolSlug, messageId, true);
        setMessages((prev) =>
          prev.map((entry) =>
            entry.id === messageId ? { ...entry, unread: false } : entry,
          ),
        );
        window.dispatchEvent(new Event("messaging:updated"));
      }
    } catch {
      setSelectedMessage(null);
    }
  }

  function handleMessageClick(messageId: string) {
    if (isCompactDevice) {
      const query = new URLSearchParams({ folder });
      if (search.trim()) {
        query.set("q", search.trim());
      }
      router.push(
        `/schools/${schoolSlug}/messagerie/${messageId}?${query.toString()}`,
      );
      return;
    }
    setSelectedMessageId(messageId);
  }

  async function handleArchiveToggle() {
    if (!schoolSlug || !selectedMessageId) {
      return;
    }
    setActionBusy(true);
    setError(null);
    try {
      const archiveFlag = folder !== "archive";
      await archiveSchoolMessage(schoolSlug, selectedMessageId, archiveFlag);
      setMessages((prev) =>
        prev.filter((entry) => entry.id !== selectedMessageId),
      );
      setSelectedMessageId(null);
      setSelectedMessage(null);
      window.dispatchEvent(new Event("messaging:updated"));
      await loadMessages(schoolSlug, folder, search);
    } catch {
      setError("Impossible de mettre a jour l'archivage.");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleDelete() {
    if (!schoolSlug || !selectedMessageId) {
      return;
    }
    setActionBusy(true);
    setError(null);
    try {
      await deleteSchoolMessage(schoolSlug, selectedMessageId);
      setMessages((prev) =>
        prev.filter((entry) => entry.id !== selectedMessageId),
      );
      setSelectedMessageId(null);
      setSelectedMessage(null);
      setDeleteConfirmOpen(false);
      window.dispatchEvent(new Event("messaging:updated"));
      await loadMessages(schoolSlug, folder, search);
    } catch {
      setError("Impossible de supprimer le message.");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleToggleRead(messageId: string, read: boolean) {
    if (!schoolSlug) {
      return;
    }
    try {
      await markSchoolMessageRead(schoolSlug, messageId, read);
      setMessages((prev) =>
        prev.map((entry) =>
          entry.id === messageId ? { ...entry, unread: !read } : entry,
        ),
      );
      if (selectedMessageId === messageId) {
        setSelectedMessage((prev) =>
          prev ? { ...prev, unread: !read } : prev,
        );
      }
      window.dispatchEvent(new Event("messaging:updated"));
    } catch {
      setError("Impossible de mettre a jour l'etat de lecture.");
    }
  }

  async function handleRestoreFromArchive(messageId: string) {
    if (!schoolSlug) {
      return;
    }
    try {
      await archiveSchoolMessage(schoolSlug, messageId, false);
      setMessages((prev) => prev.filter((entry) => entry.id !== messageId));
      if (selectedMessageId === messageId) {
        setSelectedMessageId(null);
        setSelectedMessage(null);
      }
      window.dispatchEvent(new Event("messaging:updated"));
    } catch {
      setError("Impossible de restaurer le message.");
    }
  }

  function openComposeFromMessage(
    mode: "reply" | "forward",
    message: MessagingMessage,
  ) {
    const query = buildComposeQueryFromMessage(mode, message);
    router.push(
      `/schools/${schoolSlug}/messagerie/nouveau?${query.toString()}`,
    );
  }

  return (
    <div className="grid gap-4 lg:h-[calc(100vh-10rem)]">
      <Card
        title={undefined}
        subtitle={undefined}
        className="h-full overflow-hidden"
      >
        {loading ? (
          <p className="text-sm text-text-secondary">Chargement...</p>
        ) : error ? (
          <p className="text-sm text-notification">{error}</p>
        ) : (
          <div className="flex h-full min-h-0 flex-col gap-3">
            <MessagingToolbar
              title="Messagerie"
              contextLabel={schoolName ?? "Echanges internes et familles"}
              search={search}
              onSearchChange={setSearch}
            />

            <div className="grid gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-[240px_320px_minmax(0,1fr)]">
              <div className="lg:min-h-0">
                <MessagingFoldersPanel
                  folders={FOLDERS}
                  activeFolder={folder}
                  onSelectFolder={setFolder}
                  inboxUnreadCount={inboxUnreadCount}
                  draftsCount={draftsCount}
                  archiveCount={archiveCount}
                  showComposeButton={canCompose}
                  onCompose={() =>
                    router.push(`/schools/${schoolSlug}/messagerie/nouveau`)
                  }
                />
              </div>
              <div className="lg:min-h-0">
                <MessagingMessagesList
                  panelLabel={getFolderLabel(folder)}
                  folder={folder}
                  messages={messages}
                  selectedMessageId={selectedMessageId}
                  onSelectMessage={handleMessageClick}
                  unreadOnly={unreadOnly}
                  onUnreadOnlyChange={setUnreadOnly}
                  renderActions={(message) => {
                    if (folder === "inbox") {
                      return (
                        <ActionIconButton
                          icon={message.unread ? MailOpen : Mail}
                          label={
                            message.unread
                              ? "Marquer comme lu"
                              : "Marquer comme non lu"
                          }
                          onClick={() =>
                            void handleToggleRead(message.id, message.unread)
                          }
                          variant="neutral"
                        />
                      );
                    }
                    if (folder === "archive") {
                      return (
                        <ActionIconButton
                          icon={ArchiveRestore}
                          label="Restaurer depuis archives"
                          onClick={() =>
                            void handleRestoreFromArchive(message.id)
                          }
                          variant="primary"
                        />
                      );
                    }
                    return null;
                  }}
                />
              </div>
              <div className="hidden gap-2 lg:grid lg:min-h-0">
                <MessagingReader
                  desktopOnly
                  message={selectedMessage}
                  onOpenAttachment={setPreviewAttachment}
                  topActions={
                    selectedMessage ? (
                      <div className="flex w-full flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              openComposeFromMessage("reply", selectedMessage)
                            }
                            className="inline-flex items-center gap-2 rounded-card bg-primary px-3 py-1.5 text-sm font-medium text-white transition hover:bg-primary/90"
                          >
                            <Reply className="h-4 w-4" />
                            Repondre
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              openComposeFromMessage("forward", selectedMessage)
                            }
                            className="inline-flex items-center gap-2 rounded-card bg-primary px-3 py-1.5 text-sm font-medium text-white transition hover:bg-primary/90"
                          >
                            <Forward className="h-4 w-4" />
                            Transferer
                          </button>
                        </div>
                        <MessagingMessageActions
                          archivedView={folder === "archive"}
                          busy={actionBusy}
                          onArchiveToggle={() => void handleArchiveToggle()}
                          onDelete={() => setDeleteConfirmOpen(true)}
                          unread={selectedMessage.unread}
                          onToggleRead={
                            folder === "inbox" && selectedMessageId
                              ? () =>
                                  void handleToggleRead(
                                    selectedMessageId,
                                    selectedMessage.unread,
                                  )
                              : undefined
                          }
                        />
                      </div>
                    ) : undefined
                  }
                />
              </div>
            </div>
            {messagesLoading ? (
              <p className="text-xs text-text-secondary">Actualisation...</p>
            ) : null}
          </div>
        )}
      </Card>

      <MessagingAttachmentPreviewModal
        attachment={previewAttachment}
        onClose={() => setPreviewAttachment(null)}
      />
      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Confirmer la suppression"
        message="Cette action est destructive. Le message sera supprime de votre boite."
        confirmLabel="Supprimer"
        loading={actionBusy}
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={() => {
          void handleDelete();
        }}
      />
    </div>
  );
}
