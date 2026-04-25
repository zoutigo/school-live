"use client";

import { Bug, CheckCircle, Clock, Layers } from "lucide-react";
import type { TicketFolder, TicketFolderKey } from "./types";
import { TICKET_FOLDERS } from "./types";

const FOLDER_ICONS: Record<
  TicketFolderKey,
  React.ComponentType<{ className?: string }>
> = {
  open: Clock,
  answered: CheckCircle,
  resolved: Layers,
  all: Bug,
};

type Props = {
  activeFolder: TicketFolderKey;
  onSelectFolder: (folder: TicketFolderKey) => void;
  counts?: Partial<Record<TicketFolderKey, number>>;
  onCompose?: () => void;
  showCompose?: boolean;
};

export function TicketsTabPanel({
  activeFolder,
  onSelectFolder,
  counts = {},
  onCompose,
  showCompose = true,
}: Props) {
  return (
    <aside
      data-testid="tickets-tab-panel"
      className="flex h-full min-h-0 min-w-0 flex-col rounded-[20px] border border-warm-border bg-[linear-gradient(180deg,rgba(255,253,252,1)_0%,rgba(255,248,240,0.94)_100%)] p-2 shadow-[0_14px_30px_rgba(77,56,32,0.07)]"
    >
      <p className="mb-2 hidden px-2 text-xs font-semibold uppercase tracking-wide text-text-secondary sm:block">
        Filtrer
      </p>

      <div className="min-h-0 overflow-x-auto overflow-y-hidden sm:overflow-y-auto">
        <div className="flex min-w-max gap-1 sm:grid sm:min-w-0">
          {TICKET_FOLDERS.map((folder: TicketFolder) => {
            const Icon = FOLDER_ICONS[folder.key];
            const active = activeFolder === folder.key;
            const count = counts[folder.key];

            return (
              <button
                key={folder.key}
                type="button"
                data-testid={`tab-${folder.key}`}
                onClick={() => onSelectFolder(folder.key)}
                className={`relative flex shrink-0 items-center gap-2 rounded-[16px] px-3 py-2 text-left text-sm transition sm:w-full ${
                  active
                    ? "border border-primary/25 bg-[linear-gradient(180deg,rgba(12,95,168,0.08)_0%,rgba(255,248,240,0.9)_100%)] text-primary shadow-[0_10px_22px_rgba(12,95,168,0.1)]"
                    : "text-text-secondary hover:bg-warm-highlight/70 hover:text-text-primary"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="hidden min-[360px]:inline sm:inline">
                  {folder.label}
                </span>
                {typeof count === "number" && count > 0 ? (
                  <span
                    className={`ml-auto inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                      active
                        ? "bg-primary text-white shadow-[0_8px_18px_rgba(12,95,168,0.18)]"
                        : "border border-warm-border bg-warm-surface text-text-secondary"
                    }`}
                  >
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {showCompose && onCompose ? (
        <button
          type="button"
          onClick={onCompose}
          data-testid="compose-ticket-btn"
          className="mt-2 hidden w-full items-center justify-center gap-2 rounded-[16px] bg-primary px-3 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(12,95,168,0.18)] transition hover:bg-primary-dark sm:inline-flex"
        >
          <Bug className="h-4 w-4" />
          <span className="hidden min-[360px]:inline sm:inline">
            Nouveau ticket
          </span>
        </button>
      ) : null}
    </aside>
  );
}
