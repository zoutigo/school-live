import { PencilLine } from "lucide-react";
import type { MessagingFolder, FolderKey } from "./types";

type Props = {
  folders: MessagingFolder[];
  activeFolder: FolderKey;
  onSelectFolder: (folder: FolderKey) => void;
  inboxUnreadCount?: number;
  draftsCount?: number;
  archiveCount?: number;
  showComposeButton?: boolean;
  onCompose?: () => void;
};

export function MessagingFoldersPanel({
  folders,
  activeFolder,
  onSelectFolder,
  inboxUnreadCount = 0,
  draftsCount = 0,
  archiveCount = 0,
  showComposeButton = false,
  onCompose,
}: Props) {
  return (
    <aside className="flex h-full min-h-0 flex-col rounded-card border border-border bg-background p-2">
      <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
        Dossiers
      </p>
      <div className="min-h-0 overflow-y-auto">
        <div className="grid gap-1">
          {folders.map((item) => {
            const Icon = item.icon;
            const active = activeFolder === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onSelectFolder(item.key)}
                className={`flex items-center gap-2 rounded-card px-3 py-2 text-sm text-left transition ${
                  active
                    ? "border border-primary/30 bg-primary/10 text-primary"
                    : "text-text-secondary hover:bg-primary/5 hover:text-text-primary"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
                {item.key === "inbox" && inboxUnreadCount > 0 ? (
                  <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-xs font-semibold text-white">
                    {inboxUnreadCount}
                  </span>
                ) : null}
                {item.key === "drafts" && draftsCount > 0 ? (
                  <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full border border-border bg-background px-1.5 py-0.5 text-xs font-semibold text-text-secondary">
                    {draftsCount}
                  </span>
                ) : null}
                {item.key === "archive" && archiveCount > 0 ? (
                  <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full border border-border bg-background px-1.5 py-0.5 text-xs font-semibold text-text-secondary">
                    {archiveCount}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
      {showComposeButton ? (
        <button
          type="button"
          onClick={onCompose}
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-card bg-primary px-3 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
        >
          <PencilLine className="h-4 w-4" />
          Nouveau message
        </button>
      ) : null}
    </aside>
  );
}
