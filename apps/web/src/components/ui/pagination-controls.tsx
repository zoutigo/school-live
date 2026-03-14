import { ChevronLeft, ChevronRight } from "lucide-react";
import { ActionIconButton } from "./action-icon-button";
import { Button } from "./button";

type Props = {
  page: number;
  totalPages: number;
  totalItems?: number;
  disabled?: boolean;
  compact?: boolean;
  onPageChange: (nextPage: number) => void;
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageSizeChange?: (nextPageSize: number) => void;
};

export function PaginationControls({
  page,
  totalPages,
  totalItems,
  disabled = false,
  compact = false,
  onPageChange,
  pageSize,
  pageSizeOptions = [10, 20, 50],
  onPageSizeChange,
}: Props) {
  const safeTotalPages = Math.max(1, totalPages);
  const safePage = Math.min(Math.max(1, page), safeTotalPages);
  const summary = compact
    ? `${safePage}/${safeTotalPages}`
    : `${typeof totalItems === "number" ? `${totalItems} resultat(s) - ` : ""}page ${safePage}/${safeTotalPages}`;

  return (
    <div className="flex items-center justify-between gap-2 text-sm text-text-secondary">
      {compact ? (
        <div className="flex w-full items-center justify-center gap-3 rounded-[16px] border border-warm-border/70 bg-background/70 px-3 py-2">
          <ActionIconButton
            icon={ChevronLeft}
            label="Page precedente"
            variant="neutral"
            className="h-10 w-10 rounded-[12px]"
            disabled={disabled || safePage <= 1}
            onClick={() => onPageChange(safePage - 1)}
          />

          <p className="min-w-[3rem] text-center font-semibold text-text-primary whitespace-nowrap">
            {summary}
          </p>

          <ActionIconButton
            icon={ChevronRight}
            label="Page suivante"
            variant="neutral"
            className="h-10 w-10 rounded-[12px]"
            disabled={disabled || safePage >= safeTotalPages}
            onClick={() => onPageChange(safePage + 1)}
          />
        </div>
      ) : (
        <p className="min-w-0 whitespace-nowrap">{summary}</p>
      )}

      <div
        className={`flex shrink-0 items-center gap-2 ${compact ? "hidden" : ""}`}
      >
        {onPageSizeChange && typeof pageSize === "number" ? (
          <label className="inline-flex shrink-0 items-center gap-2">
            <span>Par page</span>
            <select
              value={pageSize}
              disabled={disabled}
              onChange={(event) =>
                onPageSizeChange(Number.parseInt(event.target.value, 10))
              }
              className="h-9 rounded-[12px] border border-warm-border bg-surface px-3 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <Button
          type="button"
          variant="secondary"
          className="px-3 py-1.5"
          disabled={disabled || safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
        >
          Precedent
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="px-3 py-1.5"
          disabled={disabled || safePage >= safeTotalPages}
          onClick={() => onPageChange(safePage + 1)}
        >
          Suivant
        </Button>
      </div>
    </div>
  );
}
