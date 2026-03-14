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
    <div className="flex items-center gap-1.5 min-[360px]:gap-2">
      {onToggleRead ? (
        <ActionIconButton
          icon={unread ? MailOpen : Mail}
          label={unread ? "Marquer comme lu" : "Marquer comme non lu"}
          variant="neutral"
          onClick={onToggleRead}
          disabled={busy}
          className="h-8 w-8 min-[360px]:h-9 min-[360px]:w-9"
        />
      ) : null}
      <ActionIconButton
        icon={archivedView ? ArchiveRestore : Archive}
        label={archivedView ? "Desarchiver" : "Archiver"}
        variant="primary"
        onClick={onArchiveToggle}
        disabled={busy}
        className="h-8 w-8 min-[360px]:h-9 min-[360px]:w-9"
      />
      <ActionIconButton
        icon={Trash2}
        label="Supprimer"
        variant="destructive"
        onClick={onDelete}
        disabled={busy}
        className="h-8 w-8 min-[360px]:h-9 min-[360px]:w-9"
      />
    </div>
  );
}
