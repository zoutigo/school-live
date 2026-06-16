import { Download, X } from "lucide-react";
import type { MessageAttachment } from "./types";
import { useTranslation } from "../../i18n/useTranslation";

type Props = {
  attachment: MessageAttachment | null;
  onClose: () => void;
};

export function MessagingAttachmentPreviewModal({
  attachment,
  onClose,
}: Props) {
  const { t } = useTranslation();

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
              onClick={() => {
                if (attachment.downloadUrl) {
                  window.open(
                    attachment.downloadUrl,
                    "_blank",
                    "noopener,noreferrer",
                  );
                }
              }}
              className="inline-flex items-center gap-2 rounded-card border border-border bg-background px-3 py-1.5 text-sm text-text-primary transition hover:bg-primary/10"
            >
              <Download className="h-4 w-4" />
              {t("messaging.attachments.modalDownload")}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-card border border-border bg-background text-text-secondary transition hover:bg-notification/10 hover:text-notification"
              aria-label={t("messaging.attachments.modalClose")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="grid place-items-center bg-slate-100 p-4">
          <div className="h-full w-full max-w-4xl overflow-hidden rounded-card border border-slate-300 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
              <span>{t("messaging.attachments.previewLabel")}</span>
              <span>{attachment.mimeType}</span>
            </div>
            <div className="grid h-[calc(100%-33px)] place-items-center p-4">
              <div className="w-full max-w-[700px] rounded border border-dashed border-slate-300 bg-slate-50 p-6 text-slate-700">
                <p className="mb-3 text-sm font-semibold">
                  {attachment.fileName}
                </p>
                <p className="text-sm">
                  {t("messaging.attachments.previewPlaceholder")}
                </p>
                <p className="mt-4 text-xs text-slate-500">
                  {t("messaging.attachments.previewHint")}
                </p>
              </div>
            </div>
          </div>
        </div>

        <footer className="border-t border-border px-4 py-2 text-xs text-text-secondary">
          {t("messaging.attachments.addedOn")}
        </footer>
      </div>
    </div>
  );
}
