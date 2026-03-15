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
    <aside
      data-testid="messaging-folders-panel"
      className="flex h-full min-h-0 min-w-0 flex-col rounded-[20px] border border-warm-border bg-[linear-gradient(180deg,rgba(255,253,252,1)_0%,rgba(255,248,240,0.94)_100%)] p-2 shadow-[0_14px_30px_rgba(77,56,32,0.07)]"
    >
      <p className="mb-2 hidden px-2 text-xs font-semibold uppercase tracking-wide text-text-secondary sm:block">
        Dossiers
      </p>
      <div className="min-h-0 overflow-x-auto overflow-y-hidden sm:overflow-y-auto">
        <div className="flex min-w-max gap-1 sm:grid sm:min-w-0">
          {folders.map((item) => {
            const Icon = item.icon;
            const active = activeFolder === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onSelectFolder(item.key)}
                className={`relative flex shrink-0 items-center gap-2 rounded-[16px] px-3 py-2 text-sm text-left transition sm:w-full ${
                  active
                    ? "border border-primary/25 bg-[linear-gradient(180deg,rgba(12,95,168,0.08)_0%,rgba(255,248,240,0.9)_100%)] text-primary shadow-[0_10px_22px_rgba(12,95,168,0.1)]"
                    : "text-text-secondary hover:bg-warm-highlight/70 hover:text-text-primary"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="hidden min-[360px]:inline sm:inline">
                  {item.label}
                </span>
                {item.key === "inbox" && inboxUnreadCount > 0 ? (
                  <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-xs font-semibold text-white shadow-[0_8px_18px_rgba(12,95,168,0.18)]">
                    {inboxUnreadCount}
                  </span>
                ) : null}
                {item.key === "drafts" && draftsCount > 0 ? (
                  <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full border border-warm-border bg-warm-surface px-1.5 py-0.5 text-xs font-semibold text-text-secondary">
                    {draftsCount}
                  </span>
                ) : null}
                {item.key === "archive" && archiveCount > 0 ? (
                  <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full border border-warm-border bg-warm-surface px-1.5 py-0.5 text-xs font-semibold text-text-secondary">
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
          className="mt-2 hidden w-full items-center justify-center gap-2 rounded-[16px] bg-primary px-3 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(12,95,168,0.18)] transition hover:bg-primary-dark sm:inline-flex"
        >
          <PencilLine className="h-4 w-4" />
          <span className="hidden min-[360px]:inline sm:inline">
            Nouveau message
          </span>
        </button>
      ) : null}
    </aside>
  );
}
