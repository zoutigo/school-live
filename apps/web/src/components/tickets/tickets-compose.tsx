"use client";

import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Bug, Lightbulb, Paperclip, Send, X } from "lucide-react";
import { Button } from "../ui/button";
import { FormField } from "../ui/form-field";
import { FormTextInput, FormTextarea } from "../ui/form-controls";
import { createTicket } from "./tickets-api";

const schema = z.object({
  type: z.enum(["BUG", "FEATURE_REQUEST"]),
  title: z
    .string()
    .min(5, "Minimum 5 caractères")
    .max(120, "Maximum 120 caractères"),
  description: z
    .string()
    .min(10, "Minimum 10 caractères")
    .max(4000, "Maximum 4000 caractères"),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  schoolSlug?: string;
  onSuccess: () => void;
  onError: (msg: string) => void;
  onCancel: () => void;
};

export function TicketsCompose({
  schoolSlug,
  onSuccess,
  onError,
  onCancel,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: "BUG", title: "", description: "" },
  });

  const selectedType = watch("type");

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    setFiles((prev) => {
      const combined = [...prev, ...picked];
      return combined.slice(0, 5);
    });
    if (fileRef.current) fileRef.current.value = "";
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      await createTicket({
        type: values.type,
        title: values.title,
        description: values.description,
        schoolSlug,
        platform: "web",
        screenPath:
          typeof window !== "undefined" ? window.location.pathname : undefined,
        attachments: files,
      });
      onSuccess();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex min-h-0 flex-col gap-5 overflow-y-auto rounded-[20px] border border-warm-border bg-surface p-5 shadow-card"
      data-testid="tickets-compose"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-text-primary">
          Nouveau ticket
        </h2>
        <button
          type="button"
          aria-label="Annuler"
          onClick={onCancel}
          className="rounded-full p-1.5 text-text-secondary transition hover:bg-warm-highlight"
          data-testid="compose-cancel-btn"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Type */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
          Type
        </p>
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  {
                    value: "BUG",
                    label: "Bug",
                    desc: "Quelque chose ne fonctionne pas",
                    Icon: Bug,
                  },
                  {
                    value: "FEATURE_REQUEST",
                    label: "Suggestion",
                    desc: "Une idée d'amélioration",
                    Icon: Lightbulb,
                  },
                ] as const
              ).map(({ value, label, desc, Icon }) => (
                <button
                  key={value}
                  type="button"
                  data-testid={`type-option-${value}`}
                  onClick={() => field.onChange(value)}
                  className={`flex flex-col items-start gap-1 rounded-[14px] border p-3 text-left transition ${
                    field.value === value
                      ? "border-primary/30 bg-[linear-gradient(135deg,rgba(12,95,168,0.07),rgba(255,248,240,0.9))] text-primary shadow-[0_8px_18px_rgba(12,95,168,0.1)]"
                      : "border-warm-border bg-warm-surface text-text-secondary hover:border-primary/20 hover:text-text-primary"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-xs font-semibold">{label}</span>
                  <span className="text-[10px] leading-tight opacity-75">
                    {desc}
                  </span>
                </button>
              ))}
            </div>
          )}
        />
      </div>

      {/* Titre */}
      <FormField label="Titre" error={errors.title?.message}>
        <Controller
          control={control}
          name="title"
          render={({ field }) => (
            <FormTextInput
              {...field}
              invalid={!!errors.title}
              placeholder={
                selectedType === "BUG"
                  ? "Ex : Impossible de sauvegarder une note"
                  : "Ex : Ajouter un mode sombre"
              }
              data-testid="title-input"
            />
          )}
        />
      </FormField>

      {/* Description */}
      <FormField
        label="Description"
        error={errors.description?.message}
        hint={
          selectedType === "BUG"
            ? "Étapes pour reproduire, comportement attendu vs observé."
            : "En quoi cette fonctionnalité améliorerait votre usage ?"
        }
      >
        <Controller
          control={control}
          name="description"
          render={({ field }) => (
            <FormTextarea
              {...field}
              invalid={!!errors.description}
              rows={5}
              placeholder="Votre description…"
              data-testid="description-textarea"
            />
          )}
        />
      </FormField>

      {/* Pièces jointes */}
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-text-secondary">
          Pièces jointes{" "}
          <span className="font-normal lowercase">(optionnel, max 5)</span>
        </p>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx"
          onChange={handleFileChange}
          className="hidden"
          data-testid="file-input"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 rounded-[12px] border border-warm-border bg-warm-surface px-3 py-2 text-xs text-text-secondary transition hover:border-primary/30 hover:text-primary"
          data-testid="pick-file-btn"
        >
          <Paperclip className="h-3.5 w-3.5" />
          Ajouter un fichier
        </button>

        {files.length > 0 && (
          <ul className="mt-2 flex flex-col gap-1">
            {files.map((file, idx) => (
              <li
                key={`${file.name}-${idx}`}
                className="flex items-center gap-2 rounded-[10px] border border-warm-border bg-warm-surface px-3 py-1.5"
              >
                <Paperclip className="h-3 w-3 shrink-0 text-text-secondary" />
                <span className="min-w-0 flex-1 truncate text-xs text-text-secondary">
                  {file.name}
                </span>
                <button
                  type="button"
                  aria-label="Supprimer"
                  onClick={() => removeFile(idx)}
                  data-testid={`remove-file-${idx}`}
                >
                  <X className="h-3.5 w-3.5 text-text-secondary hover:text-notification" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Soumettre */}
      <Button
        type="submit"
        disabled={submitting}
        iconLeft={<Send className="h-4 w-4" />}
        data-testid="submit-btn"
      >
        {submitting ? "Envoi…" : "Envoyer le ticket"}
      </Button>
    </form>
  );
}
