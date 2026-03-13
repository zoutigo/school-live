import type { ReactNode } from "react";
import { FileText } from "lucide-react";
import type { MessageAttachment, MessagingMessage } from "./types";

type Props = {
  message: MessagingMessage | null;
  onOpenAttachment: (attachment: MessageAttachment) => void;
  desktopOnly?: boolean;
  topActions?: ReactNode;
};

export function MessagingReader({
  message,
  onOpenAttachment,
  desktopOnly = false,
  topActions,
}: Props) {
  return (
    <section
      className={`${desktopOnly ? "hidden lg:flex " : "flex "}h-full min-h-0 flex-col rounded-[20px] border border-warm-border bg-[linear-gradient(180deg,rgba(255,253,252,1)_0%,rgba(255,248,240,0.9)_100%)] p-0 shadow-[0_14px_30px_rgba(77,56,32,0.07)]`}
    >
      {!message ? (
        <div className="m-4 flex h-full min-h-[380px] items-center justify-center rounded-[18px] border border-dashed border-warm-border bg-warm-surface">
          <p className="text-sm text-text-secondary">
            Selectionnez un message pour le lire.
          </p>
        </div>
      ) : (
        <div className="flex h-full min-h-0 flex-col">
          {topActions ? (
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 pb-2 pt-2">
              {topActions}
            </div>
          ) : null}
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
            <div className="grid gap-4">
              <header className="border-b border-border pb-3 pt-3">
                <h4 className="font-heading text-lg font-semibold text-text-primary">
                  {message.subject}
                </h4>
                <p className="mt-1 text-xs text-text-secondary">
                  {message.sender} - {message.createdAt}
                </p>
              </header>

              <div className="grid gap-3 text-sm text-text-primary">
                {message.bodyHtml ? (
                  <div
                    className="messaging-html space-y-2"
                    dangerouslySetInnerHTML={{ __html: message.bodyHtml }}
                  />
                ) : (
                  message.body.map((line, index) => (
                    <p key={`${line}-${index}`}>{line}</p>
                  ))
                )}
              </div>

              <div className="rounded-[18px] border border-warm-border bg-warm-surface p-4 shadow-sm">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                  Pieces jointes
                </p>
                {message.attachments.length === 0 ? (
                  <p className="text-sm text-text-secondary">
                    Aucune piece jointe.
                  </p>
                ) : (
                  <div className="grid gap-2">
                    {message.attachments.map((attachment) => (
                      <button
                        key={attachment.id}
                        type="button"
                        onClick={() => onOpenAttachment(attachment)}
                        className="flex w-full items-center justify-between rounded-[16px] border border-warm-border bg-surface px-3 py-2.5 text-left transition hover:border-primary/40 hover:bg-warm-highlight/60"
                      >
                        <span className="inline-flex items-center gap-2 text-sm font-medium text-text-primary">
                          <FileText className="h-4 w-4 text-primary" />
                          {attachment.fileName}
                        </span>
                        <span className="text-xs text-text-secondary">
                          {attachment.sizeLabel}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
