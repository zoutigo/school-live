import { Download, X } from "lucide-react";
import type { MessageAttachment } from "./types";

type Props = {
  attachment: MessageAttachment | null;
  onClose: () => void;
};

export function MessagingAttachmentPreviewModal({
  attachment,
  onClose,
}: Props) {
  if (!attachment) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 p-4">
      <div className="mx-auto grid h-full w-full max-w-6xl grid-rows-[auto_1fr_auto] overflow-hidden rounded-card border border-border bg-surface shadow-card">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="truncate text-sm font-semibold text-text-primary">
            {attachment.fileName.toUpperCase()}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-card border border-border bg-background px-3 py-1.5 text-sm text-text-primary transition hover:bg-primary/10"
            >
              <Download className="h-4 w-4" />
              Telecharger
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-card border border-border bg-background text-text-secondary transition hover:bg-notification/10 hover:text-notification"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="grid place-items-center bg-slate-100 p-4">
          <div className="h-full w-full max-w-4xl overflow-hidden rounded-card border border-slate-300 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
              <span>Apercu document</span>
              <span>{attachment.mimeType}</span>
            </div>
            <div className="grid h-[calc(100%-33px)] place-items-center p-4">
              <div className="w-full max-w-[700px] rounded border border-dashed border-slate-300 bg-slate-50 p-6 text-slate-700">
                <p className="mb-3 text-sm font-semibold">
                  {attachment.fileName}
                </p>
                <p className="text-sm">
                  Apercu factice. Le lecteur PDF reel sera branche quand l'API
                  de fichiers sera connectee.
                </p>
                <p className="mt-4 text-xs text-slate-500">
                  Vous pourrez ici zoomer, naviguer entre les pages et
                  telecharger.
                </p>
              </div>
            </div>
          </div>
        </div>

        <footer className="border-t border-border px-4 py-2 text-xs text-text-secondary">
          Ajoute le 07 fev. 2026
        </footer>
      </div>
    </div>
  );
}
