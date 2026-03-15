"use client";

import { useEffect } from "react";
import { Button } from "./button";

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Supprimer",
  cancelLabel = "Annuler",
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCancel();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Fermer la confirmation"
        className="absolute inset-0 bg-[#2f2418]/40 backdrop-blur-[3px]"
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="relative w-full max-w-md rounded-[24px] border border-warm-border bg-[linear-gradient(180deg,rgba(255,253,252,1)_0%,rgba(255,248,240,1)_100%)] p-6 shadow-[0_24px_60px_rgba(47,36,24,0.18)]"
      >
        <div className="mb-4 inline-flex rounded-full border border-[#efcfaa] bg-[#fff3e4] px-3 py-1 text-xs font-heading font-semibold uppercase tracking-[0.18em] text-[#b7793a]">
          Confirmation
        </div>
        <h2
          id="confirm-dialog-title"
          className="font-heading text-lg font-semibold text-text-primary"
        >
          {title}
        </h2>
        <p className="mt-2 text-sm text-text-secondary">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            className="border border-[#f3b3b8] bg-[#c94c4c] shadow-[0_12px_24px_rgba(201,76,76,0.2)] hover:bg-[#b63f3f]"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Suppression..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
