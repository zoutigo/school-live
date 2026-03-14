import { Plus, RefreshCw, Search } from "lucide-react";

type Props = {
  title: string;
  contextLabel?: string;
  search: string;
  onSearchChange: (value: string) => void;
  onCompose?: () => void;
};

export function MessagingToolbar({
  title,
  contextLabel,
  search,
  onSearchChange,
  onCompose,
}: Props) {
  return (
    <div
      data-testid="messaging-toolbar"
      className="grid min-w-0 gap-2.5 rounded-card border border-border bg-background px-3 py-3 sm:px-4 lg:grid-cols-[minmax(220px,auto)_minmax(260px,1fr)_auto] lg:items-center lg:gap-3"
    >
      <div className="grid min-w-0 gap-2 lg:block">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-heading text-base font-semibold text-text-primary min-[360px]:text-lg">
              {title}
            </p>
          </div>
          {onCompose ? (
            <button
              type="button"
              onClick={onCompose}
              aria-label="Nouveau message"
              title="Nouveau message"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-primary text-white shadow-[0_10px_22px_rgba(12,95,168,0.18)] transition hover:bg-primary-dark lg:hidden"
            >
              <Plus className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <div className="min-w-0">
          {contextLabel ? (
            <p className="mt-1 hidden truncate text-xs text-text-secondary min-[360px]:text-sm lg:block">
              {contextLabel}
            </p>
          ) : null}
        </div>
        <div className="flex lg:hidden">
          <select className="h-8 min-w-0 w-full rounded-card border border-border bg-surface px-3 text-xs text-text-secondary outline-none">
            <option>Annee en cours</option>
            <option>Annee precedente</option>
          </select>
        </div>
      </div>

      <div data-testid="messaging-toolbar-search" className="min-w-0">
        <label className="relative w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Rechercher un message..."
            className="h-10 w-full rounded-card border border-border bg-surface pl-9 pr-12 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="button"
            className="absolute right-1.5 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background text-text-secondary transition hover:bg-primary/10 hover:text-primary"
            aria-label="Rafraichir"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </label>
      </div>

      <div className="hidden lg:block">
        <select className="h-9 min-w-0 w-auto max-w-full rounded-card border border-border bg-surface px-3 text-sm text-text-secondary outline-none lg:min-w-[170px] lg:h-10 lg:w-auto">
          <option>Annee en cours</option>
          <option>Annee precedente</option>
        </select>
      </div>
    </div>
  );
}
