"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Forward, Reply } from "lucide-react";
import { Card } from "../../../../../../../../components/ui/card";
import {
  archiveSchoolMessage,
  deleteSchoolMessage,
  getSchoolMessage,
  markSchoolMessageRead,
} from "../../../../../../../../components/messaging/messaging-api";
import { MessagingAttachmentPreviewModal } from "../../../../../../../../components/messaging/messaging-attachment-preview-modal";
import { buildComposeQueryFromMessage } from "../../../../../../../../components/messaging/messaging-compose-logic";
import { MessagingMessageActions } from "../../../../../../../../components/messaging/messaging-message-actions";
import { MessagingMessageDetail } from "../../../../../../../../components/messaging/messaging-message-detail";
import type {
  MessageAttachment,
  MessagingMessage,
} from "../../../../../../../../components/messaging/types";
import { ConfirmDialog } from "../../../../../../../../components/ui/confirm-dialog";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type ParentChild = {
  id: string;
  firstName: string;
  lastName: string;
};

export default function ChildMessagerieMessagePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams<{
    schoolSlug: string;
    childId: string;
    messageId: string;
  }>();
  const schoolSlug = params.schoolSlug;
  const childId = params.childId;
  const messageId = params.messageId;

  const folderParam = searchParams.get("folder") ?? "inbox";
  const searchParam = searchParams.get("q") ?? "";
  const backUrl = useMemo(() => {
    const query = new URLSearchParams({ folder: folderParam });
    if (searchParam) {
      query.set("q", searchParam);
    }
    return `/schools/${schoolSlug}/children/${childId}/messagerie?${query.toString()}`;
  }, [childId, folderParam, schoolSlug, searchParam]);

  const [children, setChildren] = useState<ParentChild[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<MessagingMessage | null>(null);
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
      const details = await getSchoolMessage(currentSchoolSlug, messageId);
      setMessage(details);
      if (folderParam === "inbox") {
        await markSchoolMessageRead(currentSchoolSlug, messageId, true);
        window.dispatchEvent(new Event("messaging:updated"));
      }
    } catch {
      setError("Impossible de charger le message.");
    } finally {
      setLoading(false);
    }
  }

  async function handleArchiveToggle() {
    if (!schoolSlug) {
      return;
    }
    setActionBusy(true);
    setError(null);
    try {
      await archiveSchoolMessage(
        schoolSlug,
        messageId,
        folderParam !== "archive",
      );
      window.dispatchEvent(new Event("messaging:updated"));
      router.push(backUrl);
    } catch {
      setError("Impossible de mettre a jour l'archivage.");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleDelete() {
    if (!schoolSlug) {
      return;
    }
    setActionBusy(true);
    setError(null);
    try {
      await deleteSchoolMessage(schoolSlug, messageId);
      setDeleteConfirmOpen(false);
      window.dispatchEvent(new Event("messaging:updated"));
      router.push(backUrl);
    } catch {
      setError("Impossible de supprimer le message.");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleToggleRead() {
    if (!schoolSlug || folderParam !== "inbox") {
      return;
    }
    setActionBusy(true);
    setError(null);
    try {
      const nextRead = message?.unread ? true : false;
      await markSchoolMessageRead(schoolSlug, messageId, nextRead);
      setMessage((prev) => (prev ? { ...prev, unread: !nextRead } : prev));
      window.dispatchEvent(new Event("messaging:updated"));
    } catch {
      setError("Impossible de mettre a jour l'etat de lecture.");
    } finally {
      setActionBusy(false);
    }
  }

  function openComposeFromMessage(mode: "reply" | "forward") {
    if (!message) {
      return;
    }
    const query = buildComposeQueryFromMessage(mode, message);
    router.push(
      `/schools/${schoolSlug}/messagerie/nouveau?${query.toString()}`,
    );
  }

  const currentChild = useMemo(
    () => children.find((entry) => entry.id === childId) ?? null,
    [children, childId],
  );

  return (
    <div className="grid gap-4">
      <Card
        title="Messagerie"
        subtitle={
          currentChild
            ? `${currentChild.firstName} ${currentChild.lastName}`
            : "Lecture du message"
        }
      >
        {loading ? (
          <p className="text-sm text-text-secondary">Chargement...</p>
        ) : error ? (
          <p className="text-sm text-notification">{error}</p>
        ) : (
          <MessagingMessageDetail
            message={message}
            onBack={() => router.push(backUrl)}
            onOpenAttachment={setPreviewAttachment}
            topActions={
              message ? (
                <div className="flex w-full flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openComposeFromMessage("reply")}
                      className="inline-flex items-center gap-2 rounded-card bg-primary px-3 py-1.5 text-sm font-medium text-white transition hover:bg-primary/90"
                    >
                      <Reply className="h-4 w-4" />
                      Repondre
                    </button>
                    <button
                      type="button"
                      onClick={() => openComposeFromMessage("forward")}
                      className="inline-flex items-center gap-2 rounded-card bg-primary px-3 py-1.5 text-sm font-medium text-white transition hover:bg-primary/90"
                    >
                      <Forward className="h-4 w-4" />
                      Transferer
                    </button>
                  </div>
                  <MessagingMessageActions
                    archivedView={folderParam === "archive"}
                    busy={actionBusy}
                    onArchiveToggle={() => void handleArchiveToggle()}
                    onDelete={() => setDeleteConfirmOpen(true)}
                    unread={message.unread}
                    onToggleRead={
                      folderParam === "inbox"
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
