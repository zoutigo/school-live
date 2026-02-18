import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import type { MessageAttachment, MessagingMessage } from "./types";
import { MessagingReader } from "./messaging-reader";

type Props = {
  message: MessagingMessage | null;
  onBack: () => void;
  onOpenAttachment: (attachment: MessageAttachment) => void;
  actions?: ReactNode;
};

export function MessagingMessageDetail({
  message,
  onBack,
  onOpenAttachment,
  actions,
}: Props) {
  if (!message) {
    return (
      <div className="grid gap-3">
        <p className="text-sm text-text-secondary">Message introuvable.</p>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex w-fit items-center gap-2 rounded-card border border-border bg-background px-3 py-2 text-sm text-text-primary transition hover:bg-primary/10"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour a la liste
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-card border border-border bg-background px-3 py-2 text-sm text-text-primary transition hover:bg-primary/10"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour a la liste
        </button>
        {actions}
      </div>

      <MessagingReader message={message} onOpenAttachment={onOpenAttachment} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-card border border-border bg-background px-3 py-2 text-sm text-text-primary transition hover:bg-primary/10"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour a la liste
        </button>
        {actions}
      </div>
    </div>
  );
}
