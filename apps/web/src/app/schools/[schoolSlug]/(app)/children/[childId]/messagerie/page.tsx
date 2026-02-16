"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  Inbox,
  Mail,
  MailOpen,
  Send,
} from "lucide-react";
import { Card } from "../../../../../../../components/ui/card";
import {
  archiveSchoolMessage,
  deleteSchoolMessage,
  getSchoolMessage,
  listSchoolMessages,
  markSchoolMessageRead,
} from "../../../../../../../components/messaging/messaging-api";
import { MessagingAttachmentPreviewModal } from "../../../../../../../components/messaging/messaging-attachment-preview-modal";
import { MessagingMessageActions } from "../../../../../../../components/messaging/messaging-message-actions";
import { MessagingFoldersPanel } from "../../../../../../../components/messaging/messaging-folders-panel";
import { MessagingMessagesList } from "../../../../../../../components/messaging/messaging-messages-list";
import { MessagingReader } from "../../../../../../../components/messaging/messaging-reader";
import { MessagingToolbar } from "../../../../../../../components/messaging/messaging-toolbar";
import { ConfirmDialog } from "../../../../../../../components/ui/confirm-dialog";
import { ActionIconButton } from "../../../../../../../components/ui/action-icon-button";
import type {
  FolderKey,
  MessageAttachment,
  MessagingFolder,
  MessagingMessage,
} from "../../../../../../../components/messaging/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type ParentChild = {
  id: string;
  firstName: string;
  lastName: string;
};

const FOLDERS: MessagingFolder[] = [
  { key: "inbox", label: "Boite de reception", icon: Inbox },
  { key: "sent", label: "Envoyes", icon: Send },
  { key: "archive", label: "Archives", icon: Archive },
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

export default function ChildMessageriePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams<{ schoolSlug: string; childId: string }>();
  const schoolSlug = params.schoolSlug;
  const childId = params.childId;

  const initialFolder = searchParams.get("folder");
  const [folder, setFolder] = useState<FolderKey>(
    initialFolder === "sent" || initialFolder === "archive"
      ? initialFolder
      : "inbox",
  );
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [isCompactDevice, setIsCompactDevice] = useState(false);

  const [children, setChildren] = useState<ParentChild[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessagingMessage[]>([]);
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
    void loadParentContext(schoolSlug, childId);
  }, [schoolSlug, childId]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const onChange = () => setIsCompactDevice(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  async function loadParentContext(
    currentSchoolSlug: string,
    currentChildId: string,
  ) {
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

      const payload = (await response.json()) as {
        role?: string;
        linkedStudents?: ParentChild[];
      };

      if (payload.role !== "PARENT") {
        router.replace(`/schools/${currentSchoolSlug}/dashboard`);
        return;
      }

      const linked = payload.linkedStudents ?? [];
      setChildren(linked);

      if (
        linked.length > 0 &&
        !linked.some((entry) => entry.id === currentChildId)
      ) {
        router.replace(
          `/schools/${currentSchoolSlug}/children/${linked[0].id}/messagerie`,
        );
      }
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

  async function loadMessages(
    currentSchoolSlug: string,
    nextFolder: FolderKey,
    nextSearch: string,
  ) {
    setMessagesLoading(true);
    try {
      const payload = await listSchoolMessages(currentSchoolSlug, {
        folder: nextFolder,
        q: nextSearch,
        page: 1,
        limit: 50,
      });
      setMessages(payload.items);
      setError(null);
    } catch {
      setError("Impossible de charger la messagerie.");
    } finally {
      setMessagesLoading(false);
    }
  }

  const currentChild = useMemo(
    () => children.find((entry) => entry.id === childId) ?? null,
    [children, childId],
  );

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
      const nextQuery = new URLSearchParams({ folder });
      if (search.trim()) {
        nextQuery.set("q", search.trim());
      }
      router.push(
        `/schools/${schoolSlug}/children/${childId}/messagerie/${messageId}?${nextQuery.toString()}`,
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

  return (
    <div className="grid gap-4">
      <Card
        title="Messagerie"
        subtitle={
          currentChild
            ? `${currentChild.firstName} ${currentChild.lastName}`
            : "Echanges parents-etablissement"
        }
      >
        {loading ? (
          <p className="text-sm text-text-secondary">Chargement...</p>
        ) : error ? (
          <p className="text-sm text-notification">{error}</p>
        ) : (
          <div className="grid gap-4">
            <MessagingToolbar search={search} onSearchChange={setSearch} />

            <div className="grid gap-3 lg:grid-cols-[230px_320px_minmax(0,1fr)]">
              <MessagingFoldersPanel
                folders={FOLDERS}
                activeFolder={folder}
                onSelectFolder={setFolder}
              />
              <MessagingMessagesList
                panelLabel={getFolderLabel(folder)}
                messages={messages}
                selectedMessageId={selectedMessageId}
                onSelectMessage={handleMessageClick}
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
              <div className="hidden gap-2 lg:grid">
                {selectedMessageId ? (
                  <div className="flex justify-end">
                    <MessagingMessageActions
                      archivedView={folder === "archive"}
                      busy={actionBusy}
                      onArchiveToggle={() => void handleArchiveToggle()}
                      onDelete={() => setDeleteConfirmOpen(true)}
                      unread={selectedMessage?.unread}
                      onToggleRead={
                        folder === "inbox" && selectedMessageId
                          ? () =>
                              void handleToggleRead(
                                selectedMessageId,
                                selectedMessage?.unread ?? false,
                              )
                          : undefined
                      }
                    />
                  </div>
                ) : null}
                <MessagingReader
                  desktopOnly
                  message={selectedMessage}
                  onOpenAttachment={setPreviewAttachment}
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
