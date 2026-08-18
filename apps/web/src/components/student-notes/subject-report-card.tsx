"use client";

import { useEffect, useMemo } from "react";
import { MessageCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormTextarea } from "../ui/form-controls";
import { useTranslation, type TranslateFn } from "../../i18n/useTranslation";
import type {
  StudentNotesSequence,
  StudentSubjectNotes,
} from "./student-notes.types";

function createAppreciationSchema(t: TranslateFn) {
  return z.object({
    value: z
      .string()
      .trim()
      .min(1, t("notes.teacher.reports.appreciationRequired")),
  });
}
type AppreciationFormInput = { value: string };

function formatScore(value: number | null) {
  if (value === null) {
    return "-";
  }
  return value % 1 === 0 ? `${value}` : value.toFixed(2).replace(".", ",");
}

/**
 * Éditeur d'appréciation partagé entre le bulletin enseignant (éditable,
 * réservé au prof référent/de la matière) et le bulletin parent/élève
 * (toujours lecture seule, `editable={false}`).
 */
export function AppreciationEditor(props: {
  value: string;
  editable: boolean;
  editing?: boolean;
  onStartEdit?: () => void;
  onCancel?: () => void;
  onSave?: (value: string) => void | Promise<void>;
  isSaving?: boolean;
  testIdPrefix: string;
}) {
  const { t } = useTranslation();
  const schema = useMemo(() => createAppreciationSchema(t), [t]);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AppreciationFormInput>({
    resolver: zodResolver(schema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: { value: props.value },
  });

  const editing = props.editable && props.editing === true;
  const value = props.value;
  useEffect(() => {
    if (editing) {
      reset({ value });
    }
  }, [editing, reset]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      await props.onSave?.(data.value.trim());
    } catch {
      // L'erreur est déjà notifiée par le toast global de l'écran parent ;
      // on garde le formulaire ouvert pour permettre une nouvelle tentative.
    }
  });

  if (!props.editable) {
    return (
      <p
        data-testid={`${props.testIdPrefix}-readonly`}
        className="text-sm text-text-primary"
      >
        {props.value}
      </p>
    );
  }

  if (editing) {
    return (
      <form
        data-testid={`${props.testIdPrefix}-editor`}
        className="rounded-[14px] border border-primary bg-surface p-3"
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit();
        }}
      >
        <FormTextarea
          data-testid={`${props.testIdPrefix}-input`}
          invalid={Boolean(errors.value)}
          placeholder={t("notes.teacher.reports.appreciationPlaceholder")}
          className="min-h-[80px]"
          {...register("value")}
        />
        {errors.value?.message ? (
          <p
            data-testid={`${props.testIdPrefix}-error`}
            className="mt-1 text-xs font-semibold text-mark-red"
          >
            {errors.value.message}
          </p>
        ) : null}
        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            data-testid={`${props.testIdPrefix}-cancel`}
            onClick={props.onCancel}
            className="rounded-[8px] border border-border px-3 py-1.5 text-sm font-semibold text-text-secondary"
          >
            {t("notes.teacher.reports.cancel")}
          </button>
          <button
            type="submit"
            data-testid={`${props.testIdPrefix}-save`}
            disabled={props.isSaving}
            className="rounded-[8px] bg-primary px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {t("notes.teacher.reports.saveField")}
          </button>
        </div>
      </form>
    );
  }

  return (
    <button
      type="button"
      data-testid={`${props.testIdPrefix}-display`}
      onClick={props.onStartEdit}
      className="flex w-full items-center justify-between gap-3 rounded-[14px] border border-border bg-background px-4 py-3 text-left"
    >
      <span className="line-clamp-2 text-sm text-text-primary">
        {props.value || t("notes.teacher.reports.noAppreciation")}
      </span>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-primary">
        <MessageCircle className="h-5 w-5" />
      </span>
    </button>
  );
}

export type SubjectReportSequenceRow = {
  /** Clé de séquence (bulletin trimestriel) ou de trimestre (bulletin annuel). */
  sequence: StudentNotesSequence | string;
  label: string;
  studentAverage: number | null;
};

/**
 * Carte "bulletin" d'une matière : rang, moyennes par séquence, moyenne du
 * trimestre, appréciation. `editable=false` masque toute action (bulletin
 * parent/élève, lecture seule) ; `editable=true` branche l'éditeur
 * d'appréciation (bulletin enseignant).
 */
export function SubjectReportCard(props: {
  subject: StudentSubjectNotes;
  sequenceRows: SubjectReportSequenceRow[];
  editable: boolean;
  editing?: boolean;
  onStartEdit?: () => void;
  onCancelEdit?: () => void;
  onSaveAppreciation?: (value: string) => void | Promise<void>;
  isSaving?: boolean;
  appreciationValue: string;
  testId: string;
  testIdPrefix: string;
}) {
  const { t } = useTranslation();
  const { subject } = props;
  const showAppreciation = props.editable || props.appreciationValue;

  return (
    <div
      data-testid={props.testId}
      className="content-panel grid gap-2.5 p-3.5"
    >
      <div className="flex items-center justify-between">
        <p className="font-heading text-sm font-bold text-text-primary">
          {subject.subjectLabel.toUpperCase()}
        </p>
        <p className="text-xs font-semibold text-text-secondary">
          {t("notes.student.table.coefficient")} {subject.coefficient}
        </p>
      </div>

      {subject.rank != null && subject.classSize != null ? (
        <p
          data-testid={`${props.testIdPrefix}-rank`}
          className="-mt-1.5 text-[10px] text-text-secondary opacity-75"
        >
          {t("notes.teacher.reports.rankAndClassAverage")
            .replace("{rank}", String(subject.rank))
            .replace("{total}", String(subject.classSize))
            .replace("{classAverage}", formatScore(subject.classAverage))}
        </p>
      ) : null}

      <div className="flex items-start justify-between gap-2 border-t border-warm-border pt-2">
        {props.sequenceRows.map((row) => (
          <div
            key={row.sequence}
            data-testid={`${props.testIdPrefix}-sequence-${row.sequence}`}
            className="grid gap-0.5"
          >
            <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
              {row.label}
            </span>
            <span className="text-sm font-bold text-text-primary">
              {formatScore(row.studentAverage)}
            </span>
          </div>
        ))}
        <div className="grid justify-items-end gap-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
            {t("notes.teacher.reports.termAverage")}
          </span>
          <span className="text-base font-bold text-primary">
            {formatScore(subject.studentAverage)}
          </span>
        </div>
      </div>

      {showAppreciation ? (
        <AppreciationEditor
          value={props.appreciationValue}
          editable={props.editable}
          editing={props.editing}
          onStartEdit={props.onStartEdit}
          onCancel={props.onCancelEdit}
          onSave={props.onSaveAppreciation}
          isSaving={props.isSaving}
          testIdPrefix={props.testIdPrefix}
        />
      ) : null}
    </div>
  );
}
