import { Button } from "./button";

type Props = {
  page: number;
  totalPages: number;
  totalItems?: number;
  disabled?: boolean;
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
  onPageChange,
  pageSize,
  pageSizeOptions = [10, 20, 50],
  onPageSizeChange,
}: Props) {
  const safeTotalPages = Math.max(1, totalPages);
  const safePage = Math.min(Math.max(1, page), safeTotalPages);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-text-secondary">
      <p>
        {typeof totalItems === "number" ? `${totalItems} resultat(s) - ` : ""}
        page {safePage}/{safeTotalPages}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {onPageSizeChange && typeof pageSize === "number" ? (
          <label className="inline-flex items-center gap-2">
            <span>Par page</span>
            <select
              value={pageSize}
              disabled={disabled}
              onChange={(event) =>
                onPageSizeChange(Number.parseInt(event.target.value, 10))
              }
              className="h-9 rounded-card border border-border bg-surface px-2 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
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
          disabled={disabled || safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
        >
          Precedent
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={disabled || safePage >= safeTotalPages}
          onClick={() => onPageChange(safePage + 1)}
        >
          Suivant
        </Button>
      </div>
    </div>
  );
}
