"use client";

import { ImageUp, LoaderCircle, X } from "lucide-react";
import { ChangeEvent, useMemo, useRef, useState } from "react";
import { getCsrfTokenCookie } from "../../lib/auth-cookies";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
const API_ORIGIN = API_URL.replace(/\/api\/?$/, "");
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

type UploadKind = "school-logo" | "user-avatar";

type Props = {
  kind: UploadKind;
  label: string;
  helperText: string;
  value?: string | null;
  onChange: (value: string | null) => void;
};

export function ImageUploadField({
  kind,
  label,
  helperText,
  value,
  onChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewUrl = useMemo(() => {
    if (!value) {
      return null;
    }

    if (value.startsWith("http://") || value.startsWith("https://")) {
      return value;
    }

    return `${API_ORIGIN}${value}`;
  }, [value]);

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setError(null);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Type invalide. Utilisez JPG, PNG ou WEBP.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("Image trop lourde. Maximum 5MB.");
      event.target.value = "";
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError("Session invalide. Reconnectez-vous.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_URL}/system/uploads/${kind}`, {
        method: "POST",
        credentials: "include",
        headers: {
          "X-CSRF-Token": csrfToken,
        },
        body: formData,
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          payload?.message && Array.isArray(payload.message)
            ? payload.message.join(", ")
            : (payload?.message ?? "Echec de l'upload");
        setError(String(message));
        return;
      }

      const payload = (await response.json()) as { url: string };
      onChange(payload.url);
      event.target.value = "";
    } catch {
      setError("Erreur reseau durant upload.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="grid gap-2 text-sm">
      <span className="text-text-secondary">{label}</span>

      <div className="rounded-card border border-dashed border-border bg-background p-3">
        {previewUrl ? (
          <div className="grid gap-2">
            <img
              src={previewUrl}
              alt={label}
              className="h-36 w-full rounded-card border border-border object-cover"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-card border border-border bg-surface px-2 py-1 text-xs text-text-primary"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
              >
                <ImageUp className="h-3.5 w-3.5" />
                Remplacer
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-card border border-border bg-surface px-2 py-1 text-xs text-notification"
                onClick={() => onChange(null)}
                disabled={uploading}
              >
                <X className="h-3.5 w-3.5" />
                Retirer
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-card border border-border bg-surface px-3 py-6 text-sm text-text-secondary hover:bg-background"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <ImageUp className="h-4 w-4" />
            )}
            {uploading ? "Upload..." : "Cliquez pour televerser une image"}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onFileChange}
      />

      <p className="text-xs text-text-secondary">{helperText}</p>
      {error ? <p className="text-xs text-notification">{error}</p> : null}
    </div>
  );
}
