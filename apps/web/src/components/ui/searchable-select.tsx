"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

export type SearchableSelectOption = { value: string; label: string };

const SEARCH_THRESHOLD = 5;

function normalizeForSearch(value: string) {
  return value.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

type Props = {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  searchPlaceholder?: string;
  noResultsLabel?: string;
  id?: string;
  "data-testid"?: string;
  className?: string;
  ariaLabel?: string;
};

/**
 * Combobox reutilisable : liste deroulante avec champ de recherche inline
 * des que le nombre d'options depasse SEARCH_THRESHOLD (5), pour retrouver
 * rapidement une valeur dans une longue liste. Toujours utiliser ce
 * composant plutot qu'un <select> natif ou une liste de radios des que la
 * liste d'options peut depasser 5 elements.
 */
export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Selectionner",
  disabled = false,
  invalid = false,
  searchPlaceholder = "Rechercher...",
  noResultsLabel = "Aucun resultat",
  id,
  "data-testid": testId,
  className = "",
  ariaLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((option) => option.value === value) ?? null;
  const searchable = options.length > SEARCH_THRESHOLD;

  const filteredOptions = useMemo(() => {
    const needle = normalizeForSearch(search);
    if (!searchable || !needle) {
      return options;
    }
    return options.filter((option) =>
      normalizeForSearch(option.label).includes(needle),
    );
  }, [options, search, searchable]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setSearch("");
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setSearch("");
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open && searchable) {
      searchInputRef.current?.focus();
    }
  }, [open, searchable]);

  function handleTriggerClick() {
    if (disabled) {
      return;
    }
    if (open) {
      setOpen(false);
      setSearch("");
    } else {
      setOpen(true);
    }
  }

  function handleSelect(optionValue: string) {
    onChange(optionValue);
    setOpen(false);
    setSearch("");
  }

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        id={id}
        data-testid={testId}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={invalid ? "true" : "false"}
        disabled={disabled}
        onClick={handleTriggerClick}
        className={`flex h-11 w-full items-center justify-between gap-2 rounded-[14px] border bg-warm-surface px-3.5 text-left text-sm text-text-primary outline-none transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${
          invalid
            ? "border-notification"
            : open
              ? "border-primary ring-2 ring-primary/20"
              : "border-warm-border hover:border-primary/50"
        }`}
      >
        <span
          className={`truncate ${
            selected ? "font-medium text-text-primary" : "text-text-secondary"
          }`}
        >
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-text-secondary transition-transform ${
            open ? "rotate-180 text-primary" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div
          role="listbox"
          data-testid={testId ? `${testId}-panel` : undefined}
          className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-card border border-warm-border bg-surface shadow-card"
        >
          {searchable ? (
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <Search
                size={14}
                className="shrink-0 text-text-secondary"
                aria-hidden="true"
              />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={searchPlaceholder}
                autoComplete="off"
                data-testid={testId ? `${testId}-search` : undefined}
                className="w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-secondary"
              />
            </div>
          ) : null}
          <div className="max-h-56 overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-text-secondary">
                {noResultsLabel}
              </p>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    data-testid={
                      testId ? `${testId}-option-${option.value}` : undefined
                    }
                    onClick={() => handleSelect(option.value)}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                      isSelected
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-text-primary hover:bg-warm-highlight"
                    }`}
                  >
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                      {isSelected ? (
                        <Check size={14} aria-hidden="true" />
                      ) : null}
                    </span>
                    <span className="truncate">{option.label}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
