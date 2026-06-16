"use client";

import { Archive, ArchiveRestore, Mail, MailOpen, Trash2 } from "lucide-react";
import { ActionIconButton } from "../ui/action-icon-button";
import { useTranslation } from "../../i18n/useTranslation";

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
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-1.5 min-[360px]:gap-2">
      {onToggleRead ? (
        <ActionIconButton
          icon={unread ? MailOpen : Mail}
          label={
            unread
              ? t("messaging.actions.markAsRead")
              : t("messaging.actions.markAsUnread")
          }
          variant="neutral"
          onClick={onToggleRead}
          disabled={busy}
          className="h-8 w-8 min-[360px]:h-9 min-[360px]:w-9"
        />
      ) : null}
      <ActionIconButton
        icon={archivedView ? ArchiveRestore : Archive}
        label={
          archivedView
            ? t("messaging.actions.unarchive")
            : t("messaging.actions.archive")
        }
        variant="primary"
        onClick={onArchiveToggle}
        disabled={busy}
        className="h-8 w-8 min-[360px]:h-9 min-[360px]:w-9"
      />
      <ActionIconButton
        icon={Trash2}
        label={t("messaging.actions.delete")}
        variant="destructive"
        onClick={onDelete}
        disabled={busy}
        className="h-8 w-8 min-[360px]:h-9 min-[360px]:w-9"
      />
    </div>
  );
}
