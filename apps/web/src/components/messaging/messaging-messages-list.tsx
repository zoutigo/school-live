import type { ReactNode } from "react";
import { Paperclip } from "lucide-react";
import type { MessagingMessage } from "./types";

type Props = {
  panelLabel: string;
  messages: MessagingMessage[];
  selectedMessageId: string | null;
  onSelectMessage: (messageId: string) => void;
  renderActions?: (message: MessagingMessage) => ReactNode;
};

export function MessagingMessagesList({
  panelLabel,
  messages,
  selectedMessageId,
  onSelectMessage,
  renderActions,
}: Props) {
  return (
    <section className="rounded-card border border-border bg-background">
      <header className="border-b border-border px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
          {panelLabel}
        </p>
      </header>
      <div className="max-h-[520px] overflow-y-auto">
        {messages.length === 0 ? (
          <p className="px-3 py-4 text-sm text-text-secondary">
            Aucun message pour ce filtre.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {messages.map((message) => {
              const selected = selectedMessageId === message.id;
              return (
                <li key={message.id}>
                  <button
                    type="button"
                    onClick={() => onSelectMessage(message.id)}
                    className={`w-full px-3 py-3 text-left transition ${
                      selected ? "bg-primary/10" : "hover:bg-primary/5"
                    }`}
                  >
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-text-primary">
                        {message.sender}
                      </p>
                      <div className="flex items-center gap-2">
                        {message.unread ? (
                          <span className="rounded-full bg-notification px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
                            Nouveau
                          </span>
                        ) : null}
                        {renderActions ? (
                          <span
                            onClick={(event) => event.stopPropagation()}
                            className="inline-flex items-center gap-1"
                          >
                            {renderActions(message)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <p className="line-clamp-1 text-sm font-medium text-text-primary">
                      {message.subject}
                    </p>
                    <p className="line-clamp-2 text-xs text-text-secondary">
                      {message.preview}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-text-secondary">
                      <span>{message.createdAt}</span>
                      {message.attachments.length > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5">
                          <Paperclip className="h-3 w-3" />
                          {message.attachments.length}
                        </span>
                      ) : null}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
