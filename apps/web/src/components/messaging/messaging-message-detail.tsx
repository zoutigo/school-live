import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import type { MessageAttachment, MessagingMessage } from "./types";
import { MessagingReader } from "./messaging-reader";
import { Button } from "../ui/button";

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
        <Button
          type="button"
          variant="secondary"
          onClick={onBack}
          iconLeft={<ArrowLeft className="h-4 w-4" />}
          aria-label="Retour a la liste"
          className="justify-self-start"
        >
          Retour a la liste
        </Button>
      </div>
    );
  }

  return (
    <MessagingReader
      message={message}
      onOpenAttachment={onOpenAttachment}
      topActions={
        <div className="flex w-full flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onBack}
            iconLeft={<ArrowLeft className="h-4 w-4" />}
            aria-label="Retour a la liste"
            className="px-2.5 min-[360px]:px-4"
          >
            <span className="hidden min-[360px]:inline">Retour a la liste</span>
          </Button>
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
