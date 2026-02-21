import type { ReactNode } from "react";
import { Paperclip } from "lucide-react";
import type { FolderKey, MessagingMessage } from "./types";
import {
  formatSenderForList,
  getSubjectClass,
  shouldShowPreview,
} from "./messaging-messages-list.logic";

type Props = {
  panelLabel: string;
  folder: FolderKey;
  messages: MessagingMessage[];
  selectedMessageId: string | null;
  onSelectMessage: (messageId: string) => void;
  unreadOnly?: boolean;
  onUnreadOnlyChange?: (checked: boolean) => void;
  renderActions?: (message: MessagingMessage) => ReactNode;
};

export function MessagingMessagesList({
  panelLabel,
  folder,
  messages,
  selectedMessageId,
  onSelectMessage,
  unreadOnly = false,
  onUnreadOnlyChange,
  renderActions,
}: Props) {
  const filteredMessages =
    folder === "inbox" && unreadOnly
      ? messages.filter((message) => message.unread)
      : messages;

  return (
    <section className="flex h-full min-h-0 flex-col rounded-card border border-border bg-background">
      <header className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
          {panelLabel}
        </p>
        {folder === "inbox" && onUnreadOnlyChange ? (
          <label className="inline-flex items-center gap-2 text-xs font-medium text-text-secondary">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(event) => onUnreadOnlyChange(event.target.checked)}
              className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary"
            />
            Non lus
          </label>
        ) : null}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {filteredMessages.length === 0 ? (
          <p className="px-3 py-4 text-sm text-text-secondary">
            Aucun message pour ce filtre.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {filteredMessages.map((message) => {
              const selected = selectedMessageId === message.id;
              return (
                <li key={message.id}>
                  <div
                    className={`flex items-start gap-2 px-3 py-3 transition ${
                      selected ? "bg-primary/10" : "hover:bg-primary/5"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectMessage(message.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="mb-1 flex items-start justify-between gap-2">
                        <p className="text-sm font-normal uppercase text-text-secondary">
                          {formatSenderForList(message.sender)}
                        </p>
                      </div>
                      <p className={getSubjectClass(message.unread)}>
                        {message.subject}
                      </p>
                      {shouldShowPreview(folder) ? (
                        <p className="line-clamp-2 text-xs text-text-secondary">
                          {message.preview}
                        </p>
                      ) : null}
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
                    {renderActions ? (
                      <div className="inline-flex shrink-0 items-center gap-1">
                        {renderActions(message)}
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
