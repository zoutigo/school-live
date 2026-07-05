"use client";

import { useEffect, useState } from "react";
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
import { Card } from "../ui/card";
import { MessagingAttachmentPreviewModal } from "./messaging-attachment-preview-modal";
import { MessagingMessageActions } from "./messaging-message-actions";
import { MessagingFoldersPanel } from "./messaging-folders-panel";
import { MessagingMessagesList } from "./messaging-messages-list";
import { MessagingReader } from "./messaging-reader";
import { MessagingToolbar } from "./messaging-toolbar";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { ActionIconButton } from "../ui/action-icon-button";
import { useTranslation } from "../../i18n/useTranslation";
import type { TranslateFn } from "../../i18n/useTranslation";
import type {
  FolderKey,
  MessageAttachment,
  MessagingFolder,
  MessagingMessage,
} from "./types";

/**
 * Read/write surface a mailbox view needs — implemented once per messaging
 * scope (a single school vs the aggregated platform-admin mailbox) and
 * handed down here so the list/reader/actions UI is written only once.
 */
export type MessagingMailboxClient = {
  list: (params: {
    folder: FolderKey;
    q?: string;
    page?: number;
    limit?: number;
  }) => Promise<{
    items: MessagingMessage[];
    meta: { total: number };
  }>;
  get: (messageId: string) => Promise<MessagingMessage>;
  markRead: (messageId: string, read: boolean) => Promise<void>;
  archive: (messageId: string, archived: boolean) => Promise<void>;
  remove: (messageId: string) => Promise<void>;
  unreadCount: () => Promise<number>;
};

type Props = {
  client: MessagingMailboxClient;
  contextLabel: string;
  canCompose: boolean;
  initialFolder?: FolderKey;
  initialSearch?: string;
  onOpenCompose: () => void;
  onOpenComposeFromMessage: (
    mode: "reply" | "forward",
    message: MessagingMessage,
  ) => void;
  /** Only invoked on compact/mobile viewports — desktop uses the inline reader. */
  onOpenMessage: (messageId: string, folder: FolderKey, search: string) => void;
};

function buildFolders(t: TranslateFn): MessagingFolder[] {
  return [
    { key: "inbox", label: t("messaging.folders.inbox"), icon: Inbox },
    { key: "sent", label: t("messaging.folders.sent"), icon: Send },
    { key: "drafts", label: t("messaging.folders.drafts"), icon: FileText },
    { key: "archive", label: t("messaging.folders.archive"), icon: Archive },
  ];
}

function getFolderLabel(folder: FolderKey, t: TranslateFn) {
  if (folder === "inbox") {
    return t("messaging.list.panelLabel.inbox");
  }
  if (folder === "sent") {
    return t("messaging.list.panelLabel.sent");
  }
  if (folder === "drafts") {
    return t("messaging.list.panelLabel.drafts");
  }
  return t("messaging.list.panelLabel.archive");
}

export function MessagingMailboxView({
  client,
  contextLabel,
  canCompose,
  initialFolder = "inbox",
  initialSearch = "",
  onOpenCompose,
  onOpenComposeFromMessage,
  onOpenMessage,
}: Props) {
  const { t } = useTranslation();

  const [folder, setFolder] = useState<FolderKey>(initialFolder);
  const [search, setSearch] = useState(initialSearch);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [isCompactDevice, setIsCompactDevice] = useState(false);

  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    void loadMessages(folder, search);
    // Runs once on mount; folder/search-triggered reloads are handled below.
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const onChange = () => setIsCompactDevice(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (loading) {
      return;
    }
    void loadMessages(folder, search);
  }, [folder, search]);

  useEffect(() => {
    if (folder !== "inbox" && unreadOnly) {
      setUnreadOnly(false);
    }
  }, [folder, unreadOnly]);

  async function loadMessages(nextFolder: FolderKey, nextSearch: string) {
    setMessagesLoading(true);
    try {
      const [payload, unreadCount, draftsPayload, archivePayload] =
        await Promise.all([
          client.list({
            folder: nextFolder,
            q: nextSearch,
            page: 1,
            limit: 50,
          }),
          client.unreadCount(),
          client.list({ folder: "drafts", page: 1, limit: 1 }),
          client.list({ folder: "archive", page: 1, limit: 1 }),
        ]);
      setMessages(payload.items);
      setInboxUnreadCount(unreadCount);
      setDraftsCount(draftsPayload.meta.total);
      setArchiveCount(archivePayload.meta.total);
      setError(null);
    } catch {
      setError(t("messaging.page.loadError"));
    } finally {
      setMessagesLoading(false);
      setLoading(false);
    }
  }

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
    if (!selectedMessageId || isCompactDevice) {
      return;
    }
    void loadSelectedMessage(selectedMessageId);
  }, [selectedMessageId, isCompactDevice]);

  async function loadSelectedMessage(messageId: string) {
    try {
      const details = await client.get(messageId);
      setSelectedMessage(details);
      if (folder === "inbox") {
        await client.markRead(messageId, true);
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
      onOpenMessage(messageId, folder, search);
      return;
    }
    setSelectedMessageId(messageId);
  }

  async function handleArchiveToggle() {
    if (!selectedMessageId) {
      return;
    }
    setActionBusy(true);
    setError(null);
    try {
      const isCurrentlyArchived = folder === "archive";
      await client.archive(selectedMessageId, !isCurrentlyArchived);
      setMessages((prev) =>
        prev.filter((entry) => entry.id !== selectedMessageId),
      );
      setSelectedMessageId(null);
      setSelectedMessage(null);
      window.dispatchEvent(new Event("messaging:updated"));
      if (isCurrentlyArchived) {
        // Désarchivage : bascule sur le dossier d'origine du message.
        // mapDetailToUi hardcode folder:"inbox", on lit donc le folder depuis la liste.
        const listEntry = messages.find((m) => m.id === selectedMessageId);
        const targetFolder = listEntry?.folder === "sent" ? "sent" : "inbox";
        setFolder(targetFolder);
        await loadMessages(targetFolder, search);
      } else {
        await loadMessages(folder, search);
      }
    } catch {
      setError(t("messaging.page.archiveError"));
    } finally {
      setActionBusy(false);
    }
  }

  async function handleDelete() {
    if (!selectedMessageId) {
      return;
    }
    setActionBusy(true);
    setError(null);
    try {
      await client.remove(selectedMessageId);
      setMessages((prev) =>
        prev.filter((entry) => entry.id !== selectedMessageId),
      );
      setSelectedMessageId(null);
      setSelectedMessage(null);
      setDeleteConfirmOpen(false);
      window.dispatchEvent(new Event("messaging:updated"));
      await loadMessages(folder, search);
    } catch {
      setError(t("messaging.page.deleteError"));
    } finally {
      setActionBusy(false);
    }
  }

  async function handleToggleRead(messageId: string, read: boolean) {
    try {
      await client.markRead(messageId, read);
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
      setError(t("messaging.page.toggleReadError"));
    }
  }

  async function handleRestoreFromArchive(messageId: string) {
    try {
      const messageInList = messages.find((m) => m.id === messageId);
      await client.archive(messageId, false);
      setMessages((prev) => prev.filter((entry) => entry.id !== messageId));
      if (selectedMessageId === messageId) {
        setSelectedMessageId(null);
        setSelectedMessage(null);
      }
      window.dispatchEvent(new Event("messaging:updated"));
      const targetFolder = messageInList?.folder === "sent" ? "sent" : "inbox";
      setFolder(targetFolder);
      await loadMessages(targetFolder, search);
    } catch {
      setError(t("messaging.page.restoreError"));
    }
  }

  return (
    <div className="grid gap-4 lg:h-[calc(100vh-10rem)]">
      <Card
        title={undefined}
        subtitle={undefined}
        className="h-full overflow-hidden"
      >
        {loading ? (
          <p className="text-sm text-text-secondary">
            {t("messaging.page.loading")}
          </p>
        ) : error ? (
          <p className="text-sm text-notification">{error}</p>
        ) : (
          <div className="flex h-full min-h-0 flex-col gap-3">
            <MessagingToolbar
              title={t("messaging.toolbar.title")}
              contextLabel={contextLabel}
              search={search}
              onSearchChange={setSearch}
              onCompose={canCompose ? onOpenCompose : undefined}
            />

            <div className="grid gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-[240px_320px_minmax(0,1fr)]">
              <div className="lg:min-h-0">
                <MessagingFoldersPanel
                  folders={buildFolders(t)}
                  activeFolder={folder}
                  onSelectFolder={setFolder}
                  inboxUnreadCount={inboxUnreadCount}
                  draftsCount={draftsCount}
                  archiveCount={archiveCount}
                  showComposeButton={canCompose}
                  onCompose={onOpenCompose}
                />
              </div>
              <div className="lg:min-h-0">
                <MessagingMessagesList
                  panelLabel={getFolderLabel(folder, t)}
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
                              ? t("messaging.actions.markAsRead")
                              : t("messaging.actions.markAsUnread")
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
                          label={t("messaging.actions.restoreFromArchive")}
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
                              onOpenComposeFromMessage("reply", selectedMessage)
                            }
                            className="inline-flex items-center gap-2 rounded-card bg-primary px-3 py-1.5 text-sm font-medium text-white transition hover:bg-primary/90"
                          >
                            <Reply className="h-4 w-4" />
                            {t("messaging.detail.reply")}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onOpenComposeFromMessage(
                                "forward",
                                selectedMessage,
                              )
                            }
                            className="inline-flex items-center gap-2 rounded-card bg-primary px-3 py-1.5 text-sm font-medium text-white transition hover:bg-primary/90"
                          >
                            <Forward className="h-4 w-4" />
                            {t("messaging.detail.forward")}
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
              <p className="text-xs text-text-secondary">
                {t("messaging.page.refreshing")}
              </p>
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
        title={t("messaging.page.deleteConfirmTitle")}
        message={t("messaging.page.deleteConfirmMessage")}
        confirmLabel={t("messaging.page.deleteConfirmAction")}
        loading={actionBusy}
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={() => {
          void handleDelete();
        }}
      />
    </div>
  );
}
