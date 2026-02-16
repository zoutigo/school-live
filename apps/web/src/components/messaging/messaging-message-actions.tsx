"use client";

import { Archive, ArchiveRestore, Mail, MailOpen, Trash2 } from "lucide-react";
import { ActionIconButton } from "../ui/action-icon-button";

type Props = {
  archivedView: boolean;
  busy?: boolean;
  onArchiveToggle: () => void;
  onDelete: () => void;
  unread?: boolean;
  onToggleRead?: () => void;
};

export function MessagingMessageActions({
  archivedView,
  busy = false,
  onArchiveToggle,
  onDelete,
  unread = false,
  onToggleRead,
}: Props) {
  return (
    <div className="flex items-center gap-2">
      {onToggleRead ? (
        <ActionIconButton
          icon={unread ? MailOpen : Mail}
          label={unread ? "Marquer comme lu" : "Marquer comme non lu"}
          variant="neutral"
          onClick={onToggleRead}
          disabled={busy}
        />
      ) : null}
      <ActionIconButton
        icon={archivedView ? ArchiveRestore : Archive}
        label={archivedView ? "Desarchiver" : "Archiver"}
        variant="primary"
        onClick={onArchiveToggle}
        disabled={busy}
      />
      <ActionIconButton
        icon={Trash2}
        label="Supprimer"
        variant="destructive"
        onClick={onDelete}
        disabled={busy}
      />
    </div>
  );
}
