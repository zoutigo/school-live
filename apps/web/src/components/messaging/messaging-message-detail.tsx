import type { ReactNode } from "react";
import type { MessageAttachment, MessagingMessage } from "./types";
import { MessagingReader } from "./messaging-reader";
import { BackButton } from "../ui/form-buttons";

type Props = {
  message: MessagingMessage | null;
  onBack: () => void;
  onOpenAttachment: (attachment: MessageAttachment) => void;
  topActions?: ReactNode;
};

export function MessagingMessageDetail({
  message,
  onBack,
  onOpenAttachment,
  topActions,
}: Props) {
  if (!message) {
    return (
      <div className="grid gap-3">
        <p className="text-sm text-text-secondary">Message introuvable.</p>
        <BackButton onClick={onBack}>Retour a la liste</BackButton>
      </div>
    );
  }

  return (
    <MessagingReader
      message={message}
      onOpenAttachment={onOpenAttachment}
      topActions={
        <div className="flex w-full flex-wrap items-center gap-2">
          <BackButton onClick={onBack}>Retour a la liste</BackButton>
          {topActions ? (
            <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
              {topActions}
            </div>
          ) : null}
        </div>
      }
    />
  );
}
