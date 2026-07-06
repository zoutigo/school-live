"use client";

import { useEffect, useState } from "react";
import { Forward, Reply } from "lucide-react";
import { Card } from "../ui/card";
import { MessagingAttachmentPreviewModal } from "./messaging-attachment-preview-modal";
import { MessagingMessageActions } from "./messaging-message-actions";
import { MessagingMessageDetail } from "./messaging-message-detail";
import type { MessageAttachment, MessagingMessage } from "./types";
import { Button } from "../ui/button";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { useTranslation } from "../../i18n/useTranslation";

export type MessagingDetailClient = {
  get: (messageId: string) => Promise<MessagingMessage>;
  markRead: (messageId: string, read: boolean) => Promise<void>;
  archive: (messageId: string, archived: boolean) => Promise<void>;
  remove: (messageId: string) => Promise<void>;
};

type Props = {
  client: MessagingDetailClient;
  messageId: string;
  folder: string;
  contextLabel: string;
  onBack: () => void;
  onArchivedRedirect: (targetFolder: "inbox" | "sent") => void;
  onOpenCompose: (mode: "reply" | "forward", message: MessagingMessage) => void;
};

export function MessagingMessageDetailView({
  client,
  messageId,
  folder,
  contextLabel,
  onBack,
  onArchivedRedirect,
  onOpenCompose,
}: Props) {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<MessagingMessage | null>(null);
  const [previewAttachment, setPreviewAttachment] =
    useState<MessageAttachment | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    void loadMessage();
  }, [messageId]);

  async function loadMessage() {
    setLoading(true);
    setError(null);
    try {
      const details = await client.get(messageId);
      setMessage(details);
      if (folder === "inbox") {
        await client.markRead(messageId, true);
        window.dispatchEvent(new Event("messaging:updated"));
      }
    } catch {
      setError(t("messaging.page.loadMessageError"));
    } finally {
      setLoading(false);
    }
  }

  async function handleArchiveToggle() {
    setActionBusy(true);
    setError(null);
    try {
      const isCurrentlyArchived = folder === "archive";
      await client.archive(messageId, !isCurrentlyArchived);
      window.dispatchEvent(new Event("messaging:updated"));
      if (isCurrentlyArchived) {
        onArchivedRedirect(message?.sender ? "inbox" : "sent");
      } else {
        onBack();
      }
    } catch {
      setError(t("messaging.page.archiveError"));
    } finally {
      setActionBusy(false);
    }
  }

  async function handleDelete() {
    setActionBusy(true);
    setError(null);
    try {
      await client.remove(messageId);
      setDeleteConfirmOpen(false);
      window.dispatchEvent(new Event("messaging:updated"));
      onBack();
    } catch {
      setError(t("messaging.page.deleteError"));
    } finally {
      setActionBusy(false);
    }
  }

  async function handleToggleRead() {
    if (folder !== "inbox") {
      return;
    }
    setActionBusy(true);
    setError(null);
    try {
      const nextRead = message?.unread ? true : false;
      await client.markRead(messageId, nextRead);
      setMessage((prev) => (prev ? { ...prev, unread: !nextRead } : prev));
      window.dispatchEvent(new Event("messaging:updated"));
    } catch {
      setError(t("messaging.page.toggleReadError"));
    } finally {
      setActionBusy(false);
    }
  }

  return (
    <div className="grid gap-4">
      <Card title={t("messaging.page.title")} subtitle={contextLabel}>
        {loading ? (
          <p className="text-sm text-text-secondary">
            {t("messaging.page.loading")}
          </p>
        ) : error ? (
          <p className="text-sm text-notification">{error}</p>
        ) : (
          <MessagingMessageDetail
            message={message}
            onBack={onBack}
            onOpenAttachment={setPreviewAttachment}
            topActions={
              message ? (
                <div className="flex w-full flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      onClick={() => onOpenCompose("reply", message)}
                      iconLeft={<Reply className="h-4 w-4" />}
                      aria-label={t("messaging.detail.reply")}
                      className="px-2.5 min-[360px]:px-4"
                    >
                      <span className="hidden min-[360px]:inline">
                        {t("messaging.detail.reply")}
                      </span>
                    </Button>
                    <Button
                      type="button"
                      onClick={() => onOpenCompose("forward", message)}
                      iconLeft={<Forward className="h-4 w-4" />}
                      aria-label={t("messaging.detail.forward")}
                      className="px-2.5 min-[360px]:px-4"
                    >
                      <span className="hidden min-[360px]:inline">
                        {t("messaging.detail.forward")}
                      </span>
                    </Button>
                  </div>
                  <MessagingMessageActions
                    archivedView={folder === "archive"}
                    busy={actionBusy}
                    onArchiveToggle={() => void handleArchiveToggle()}
                    onDelete={() => setDeleteConfirmOpen(true)}
                    unread={message.unread}
                    onToggleRead={
                      folder === "inbox"
                        ? () => {
                            void handleToggleRead();
                          }
                        : undefined
                    }
                  />
                </div>
              ) : null
            }
          />
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
