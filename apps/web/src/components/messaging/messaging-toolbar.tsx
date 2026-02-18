import { RefreshCw, Search } from "lucide-react";

type Props = {
  search: string;
  onSearchChange: (value: string) => void;
};

export function MessagingToolbar({ search, onSearchChange }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-background px-3 py-2">
      <div className="flex min-w-[220px] flex-1 items-center gap-2">
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-card border border-border bg-surface text-text-secondary transition hover:bg-primary/10 hover:text-primary"
          aria-label="Rafraichir"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
        <label className="relative w-full max-w-[360px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Rechercher un message..."
            className="h-9 w-full rounded-card border border-border bg-surface pl-9 pr-3 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>
      </div>
      <select className="h-9 rounded-card border border-border bg-surface px-3 text-sm text-text-secondary outline-none">
        <option>Annee en cours</option>
        <option>Annee precedente</option>
      </select>
    </div>
  );
}
