"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { ConfirmDialog } from "../ui/confirm-dialog";
import {
  FormCheckbox,
  FormDateTimeInput,
  FormNumberInput,
  FormSubmitHint,
  FormTextInput,
  FormTextarea,
} from "../ui/form-controls";
import { FormField } from "../ui/form-field";
import { SearchableSelect } from "../ui/searchable-select";
import {
  LifeEventsList,
  lifeEventTypeLabel,
  type LifeEventRow,
  type LifeEventType,
} from "../life-events/life-events-list";
import { SubmitButton } from "../ui/form-buttons";
import { getCsrfTokenCookie } from "../../lib/auth-cookies";
import { useTranslation, type TranslateFn } from "../../i18n/useTranslation";
import { OnboardingTarget } from "../onboarding/onboarding-target";
import { usePageHelp } from "../../store/page-help";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export type ClassDisciplineStudent = {
  id: string;
  firstName: string;
  lastName: string;
};

export type ClassDisciplinePanelProps = {
  schoolSlug: string;
  classId: string;
  className: string;
  students: ClassDisciplineStudent[];
  tourTargets: {
    tabs: string;
    studentSelect: string;
  };
};

function formatShortDateTime(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString(locale === "en" ? "en-GB" : "fr-FR");
}

type TabKey = "entry" | "history";
type EventType = LifeEventType;

function createEventSchema(t: TranslateFn) {
  return z.object({
    type: z.enum(["ABSENCE", "RETARD", "SANCTION", "PUNITION"]),
    occurredAt: z
      .string()
      .trim()
      .min(1, t("discipline.validation.dateRequired")),
    reason: z.string().trim().min(1, t("discipline.validation.reasonRequired")),
    durationMinutes: z
      .string()
      .trim()
      .refine(
        (value) =>
          value.length === 0 ||
          (/^\d+$/.test(value) && Number.parseInt(value, 10) >= 0),
        {
          message: t("discipline.validation.durationPositive"),
        },
      ),
    justified: z.boolean().optional(),
    comment: z.string().trim().optional(),
  });
}

type EventFormValues = z.infer<ReturnType<typeof createEventSchema>>;

function toDateTimeLocalInput(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

/**
 * Panneau CRUD discipline pour une classe donnée — partagé entre la page
 * professeur (`classes/[classId]/discipline`) et la page admin d'école
 * (`discipline`, sélection de classe). La logique de bootstrap (rôle, tour
 * d'onboarding, résolution de la classe/liste d'élèves) reste dans chaque
 * page appelante, qui fournit ici `className`/`students` déjà résolus.
 */
export function ClassDisciplinePanel({
  schoolSlug,
  classId,
  className,
  students,
  tourTargets,
}: ClassDisciplinePanelProps) {
  const { locale, t } = useTranslation();
  const router = useRouter();

  const [tab, setTab] = useState<TabKey>("entry");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [events, setEvents] = useState<LifeEventRow[]>([]);
  const eventSchema = useMemo(() => createEventSchema(t), [t]);
  const createEventForm = useForm<
    z.input<typeof eventSchema>,
    unknown,
    z.output<typeof eventSchema>
  >({
    resolver: zodResolver(eventSchema),
    mode: "onChange",
    defaultValues: {
      type: "ABSENCE",
      occurredAt: "",
      reason: "",
      durationMinutes: "",
      justified: false,
      comment: "",
    },
  });
  const editEventForm = useForm<
    z.input<typeof eventSchema>,
    unknown,
    z.output<typeof eventSchema>
  >({
    resolver: zodResolver(eventSchema),
    mode: "onChange",
    defaultValues: {
      type: "ABSENCE",
      occurredAt: "",
      reason: "",
      durationMinutes: "",
      justified: false,
      comment: "",
    },
  });
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [updatingEventId, setUpdatingEventId] = useState<string | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LifeEventRow | null>(null);

  usePageHelp(
    tab === "history"
      ? {
          title: t("discipline.pageHelp.history.title"),
          sections: [
            {
              title: t("discipline.pageHelp.history.section1Title"),
              body: [t("discipline.pageHelp.history.section1Body")],
            },
          ],
        }
      : {
          title: t("discipline.pageHelp.entry.title"),
          sections: [
            {
              title: t("discipline.pageHelp.entry.section1Title"),
              body: [t("discipline.pageHelp.entry.section1Body")],
            },
            {
              title: t("discipline.pageHelp.entry.section2Title"),
              body: [t("discipline.pageHelp.entry.section2Body")],
            },
          ],
        },
  );

  useEffect(() => {
    if (createEventForm.getValues("occurredAt")) {
      return;
    }

    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    createEventForm.setValue("occurredAt", local.toISOString().slice(0, 16), {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: true,
    });
  }, [createEventForm]);

  useEffect(() => {
    if (students.length === 0) {
      setSelectedStudentId("");
      return;
    }

    const exists = students.some((entry) => entry.id === selectedStudentId);
    if (!exists) {
      setSelectedStudentId(students[0].id);
    }
  }, [students, selectedStudentId]);

  useEffect(() => {
    if (!schoolSlug || !selectedStudentId) {
      setEvents([]);
      return;
    }

    void loadStudentEvents(schoolSlug, selectedStudentId);
  }, [schoolSlug, selectedStudentId]);

  useEffect(() => {
    setEditingEventId(null);
    setTab("entry");
  }, [classId]);

  useEffect(() => {
    setEditingEventId(null);
  }, [selectedStudentId]);

  const createEventValues = createEventForm.watch();
  const editEventValues = editEventForm.watch();
  const createOccurredAtInvalid =
    !!createEventForm.formState.errors.occurredAt ||
    !(createEventValues.occurredAt ?? "").trim();
  const createReasonInvalid =
    !!createEventForm.formState.errors.reason ||
    !(createEventValues.reason ?? "").trim();
  const createDurationInvalid =
    !!createEventForm.formState.errors.durationMinutes;
  const editOccurredAtInvalid =
    !!editEventForm.formState.errors.occurredAt ||
    !(editEventValues.occurredAt ?? "").trim();
  const editReasonInvalid =
    !!editEventForm.formState.errors.reason ||
    !(editEventValues.reason ?? "").trim();
  const editDurationInvalid = !!editEventForm.formState.errors.durationMinutes;

  useEffect(() => {
    if (
      createEventValues.type === "SANCTION" ||
      createEventValues.type === "PUNITION"
    ) {
      createEventForm.setValue("justified", false, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    }
  }, [createEventForm, createEventValues.type]);

  useEffect(() => {
    if (
      editEventValues.type === "SANCTION" ||
      editEventValues.type === "PUNITION"
    ) {
      editEventForm.setValue("justified", false, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    }
  }, [editEventForm, editEventValues.type]);

  async function loadStudentEvents(
    currentSchoolSlug: string,
    studentId: string,
  ) {
    try {
      const response = await fetch(
        `${API_URL}/schools/${currentSchoolSlug}/students/${studentId}/life-events?scope=current&classId=${encodeURIComponent(classId)}&limit=100`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        setError(t("discipline.errors.loadHistory"));
        setEvents([]);
        return;
      }

      const payload = (await response.json()) as LifeEventRow[];
      setEvents(payload);
    } catch {
      setEvents([]);
    }
  }

  async function createEvent(values: EventFormValues) {
    if (!schoolSlug || !selectedStudentId) {
      return;
    }

    const occurredAtIso = values.occurredAt
      ? new Date(values.occurredAt).toISOString()
      : "";
    const durationValue = values.durationMinutes.trim();
    let durationMinutes: number | undefined;
    if (durationValue.length > 0) {
      durationMinutes = Number.parseInt(durationValue, 10);
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError(t("discipline.common.csrfInvalid"));
      router.replace(`/schools/${schoolSlug}/login`);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        `${API_URL}/schools/${schoolSlug}/students/${selectedStudentId}/life-events`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({
            type: values.type,
            occurredAt: occurredAtIso,
            reason: values.reason,
            durationMinutes,
            justified:
              values.type === "SANCTION" || values.type === "PUNITION"
                ? undefined
                : values.justified,
            comment: values.comment || undefined,
            classId,
          }),
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          payload?.message && Array.isArray(payload.message)
            ? payload.message.join(", ")
            : (payload?.message ?? t("discipline.errors.createFailed"));
        setError(String(message));
        return;
      }

      createEventForm.reset({
        type: values.type,
        occurredAt: values.occurredAt,
        reason: "",
        durationMinutes: "",
        justified: false,
        comment: "",
      });
      setSuccess(t("discipline.success.eventCreated"));
      await loadStudentEvents(schoolSlug, selectedStudentId);
      setTab("history");
    } catch {
      setError(t("discipline.common.networkError"));
    } finally {
      setSaving(false);
    }
  }

  function startEditEvent(row: LifeEventRow) {
    setEditingEventId(row.id);
    editEventForm.reset({
      type: row.type,
      occurredAt: toDateTimeLocalInput(row.occurredAt),
      reason: row.reason,
      durationMinutes:
        typeof row.durationMinutes === "number"
          ? String(row.durationMinutes)
          : "",
      justified: Boolean(row.justified),
      comment: row.comment ?? "",
    });
    setError(null);
    setSuccess(null);
  }

  function cancelEditEvent() {
    setEditingEventId(null);
    editEventForm.reset({
      type: "ABSENCE",
      occurredAt: "",
      reason: "",
      durationMinutes: "",
      justified: false,
      comment: "",
    });
  }

  async function saveEditedEvent(values: EventFormValues) {
    if (!schoolSlug || !selectedStudentId || !editingEventId) {
      return;
    }

    const occurredAtIso = values.occurredAt
      ? new Date(values.occurredAt).toISOString()
      : "";
    const durationValue = values.durationMinutes.trim();
    let durationMinutes: number | undefined;
    if (durationValue.length > 0) {
      const parsedDurationMinutes = Number.parseInt(durationValue, 10);
      if (
        !Number.isFinite(parsedDurationMinutes) ||
        parsedDurationMinutes < 0
      ) {
        setError(t("discipline.validation.durationPositive"));
        return;
      }
      durationMinutes = parsedDurationMinutes;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError(t("discipline.common.csrfInvalid"));
      router.replace(`/schools/${schoolSlug}/login`);
      return;
    }

    setUpdatingEventId(editingEventId);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(
        `${API_URL}/schools/${schoolSlug}/students/${selectedStudentId}/life-events/${editingEventId}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({
            type: values.type,
            occurredAt: occurredAtIso,
            reason: values.reason,
            durationMinutes,
            justified:
              values.type === "SANCTION" || values.type === "PUNITION"
                ? undefined
                : values.justified,
            comment: values.comment || undefined,
            classId,
          }),
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          payload?.message && Array.isArray(payload.message)
            ? payload.message.join(", ")
            : (payload?.message ?? t("discipline.errors.editFailed"));
        setError(String(message));
        return;
      }

      setEditingEventId(null);
      editEventForm.reset({
        type: "ABSENCE",
        occurredAt: "",
        reason: "",
        durationMinutes: "",
        justified: false,
        comment: "",
      });
      setSuccess(t("discipline.success.eventUpdated"));
      await loadStudentEvents(schoolSlug, selectedStudentId);
    } catch {
      setError(t("discipline.common.networkError"));
    } finally {
      setUpdatingEventId(null);
    }
  }

  async function deleteEvent(eventId: string) {
    if (!schoolSlug || !selectedStudentId) {
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError(t("discipline.common.csrfInvalid"));
      router.replace(`/schools/${schoolSlug}/login`);
      return;
    }

    setDeletingEventId(eventId);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(
        `${API_URL}/schools/${schoolSlug}/students/${selectedStudentId}/life-events/${eventId}`,
        {
          method: "DELETE",
          credentials: "include",
          headers: {
            "X-CSRF-Token": csrfToken,
          },
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          payload?.message && Array.isArray(payload.message)
            ? payload.message.join(", ")
            : (payload?.message ?? t("discipline.errors.deleteFailed"));
        setError(String(message));
        return;
      }

      if (editingEventId === eventId) {
        setEditingEventId(null);
      }
      setDeleteTarget(null);
      setSuccess(t("discipline.success.eventDeleted"));
      await loadStudentEvents(schoolSlug, selectedStudentId);
    } catch {
      setError(t("discipline.common.networkError"));
    } finally {
      setDeletingEventId(null);
    }
  }

  return (
    <div className="grid gap-4">
      <Card
        title={`${t("discipline.sidebar.discipline")} - ${className}`}
        subtitle={t("discipline.page.subtitle")}
      >
        <OnboardingTarget
          id={tourTargets.tabs}
          className="mb-4 flex items-end gap-2 border-b border-border"
        >
          <button
            type="button"
            onClick={() => setTab("entry")}
            className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
              tab === "entry"
                ? "border border-border border-b-surface bg-surface text-primary"
                : "text-text-secondary"
            }`}
          >
            {t("discipline.page.tabs.entry")}
          </button>
          <button
            type="button"
            onClick={() => setTab("history")}
            className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
              tab === "history"
                ? "border border-border border-b-surface bg-surface text-primary"
                : "text-text-secondary"
            }`}
          >
            {t("discipline.page.tabs.history")}
          </button>
        </OnboardingTarget>

        {students.length === 0 ? (
          <p className="text-sm text-text-secondary">
            {t("discipline.empty.noStudents")}
          </p>
        ) : (
          <div className="grid gap-4">
            <OnboardingTarget
              id={tourTargets.studentSelect}
              className="grid gap-1 text-sm md:max-w-[420px]"
            >
              <label className="grid gap-1 text-sm">
                <span className="text-text-secondary">
                  {t("discipline.page.studentLabel")}
                </span>
                <SearchableSelect
                  ariaLabel={t("discipline.page.studentLabel")}
                  value={selectedStudentId}
                  onChange={setSelectedStudentId}
                  searchPlaceholder={t("settings.form.searchPlaceholder")}
                  noResultsLabel={t("settings.form.noResults")}
                  data-testid="discipline-student-select"
                  options={students.map((entry) => ({
                    value: entry.id,
                    label: `${entry.lastName} ${entry.firstName}`,
                  }))}
                />
              </label>
            </OnboardingTarget>

            {error ? (
              <p className="text-sm text-notification">{error}</p>
            ) : null}
            {success ? <p className="text-sm text-success">{success}</p> : null}

            {tab === "entry" ? (
              <form
                className="grid gap-3 md:grid-cols-2"
                onSubmit={createEventForm.handleSubmit(createEvent)}
                noValidate
              >
                <FormField
                  label={t("discipline.form.type")}
                  htmlFor="discipline-type"
                >
                  <SearchableSelect
                    id="discipline-type"
                    ariaLabel={t("discipline.form.type")}
                    value={createEventValues.type}
                    onChange={(value) =>
                      createEventForm.setValue("type", value as EventType, {
                        shouldDirty: true,
                        shouldTouch: true,
                        shouldValidate: true,
                      })
                    }
                    data-testid="discipline-type-select"
                    options={[
                      {
                        value: "ABSENCE",
                        label: t("discipline.types.absence"),
                      },
                      { value: "RETARD", label: t("discipline.types.retard") },
                      {
                        value: "SANCTION",
                        label: t("discipline.types.sanction"),
                      },
                      {
                        value: "PUNITION",
                        label: t("discipline.types.punition"),
                      },
                    ]}
                  />
                </FormField>

                <FormField
                  label={t("discipline.form.dateTime")}
                  error={createEventForm.formState.errors.occurredAt?.message}
                >
                  <FormDateTimeInput
                    invalid={createOccurredAtInvalid}
                    value={createEventValues.occurredAt}
                    onChange={(event) =>
                      createEventForm.setValue(
                        "occurredAt",
                        event.target.value,
                        {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        },
                      )
                    }
                  />
                </FormField>

                <FormField
                  label={t("discipline.form.reason")}
                  error={createEventForm.formState.errors.reason?.message}
                  className="md:col-span-2"
                >
                  <FormTextInput
                    invalid={createReasonInvalid}
                    value={createEventValues.reason}
                    onChange={(event) =>
                      createEventForm.setValue("reason", event.target.value, {
                        shouldDirty: true,
                        shouldTouch: true,
                        shouldValidate: true,
                      })
                    }
                    placeholder={t("discipline.form.reasonPlaceholder")}
                  />
                </FormField>

                <FormField
                  label={t("discipline.form.duration")}
                  error={
                    createEventForm.formState.errors.durationMinutes?.message
                  }
                >
                  <FormNumberInput
                    invalid={createDurationInvalid}
                    min={0}
                    value={createEventValues.durationMinutes}
                    onChange={(event) =>
                      createEventForm.setValue(
                        "durationMinutes",
                        event.target.value,
                        {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        },
                      )
                    }
                  />
                </FormField>

                <FormField
                  label={t("discipline.form.comment")}
                  className="md:col-span-2"
                >
                  <FormTextarea
                    value={createEventValues.comment}
                    onChange={(event) =>
                      createEventForm.setValue("comment", event.target.value, {
                        shouldDirty: true,
                        shouldTouch: true,
                        shouldValidate: true,
                      })
                    }
                    rows={3}
                  />
                </FormField>

                <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
                  <FormCheckbox
                    checked={createEventValues.justified ?? false}
                    onChange={(event) =>
                      createEventForm.setValue(
                        "justified",
                        event.target.checked,
                        {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        },
                      )
                    }
                    disabled={
                      createEventValues.type === "SANCTION" ||
                      createEventValues.type === "PUNITION"
                    }
                  />
                  {t("discipline.form.justified")}
                </label>

                <div className="md:col-span-2">
                  <FormSubmitHint
                    visible={!createEventForm.formState.isValid}
                    className="mb-2"
                  />
                  <SubmitButton
                    disabled={
                      saving ||
                      !selectedStudentId ||
                      !createEventForm.formState.isValid
                    }
                  >
                    {saving
                      ? t("discipline.form.saving")
                      : t("discipline.form.submitCreate")}
                  </SubmitButton>
                </div>
              </form>
            ) : (
              <div className="grid gap-3">
                {editingEventId ? (
                  <div className="grid gap-3 rounded-card border border-border bg-background p-3 md:grid-cols-2">
                    <FormField
                      label={t("discipline.form.typeEditAria")}
                      error={editEventForm.formState.errors.type?.message}
                    >
                      <SearchableSelect
                        ariaLabel={t("discipline.form.typeEditAria")}
                        value={editEventValues.type ?? "ABSENCE"}
                        onChange={(value) =>
                          editEventForm.setValue("type", value as EventType, {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                          })
                        }
                        data-testid="discipline-edit-type-select"
                        options={[
                          {
                            value: "ABSENCE",
                            label: t("discipline.types.absence"),
                          },
                          {
                            value: "RETARD",
                            label: t("discipline.types.retard"),
                          },
                          {
                            value: "SANCTION",
                            label: t("discipline.types.sanction"),
                          },
                          {
                            value: "PUNITION",
                            label: t("discipline.types.punition"),
                          },
                        ]}
                      />
                    </FormField>

                    <FormField
                      label={t("discipline.form.dateTimeEditAria")}
                      error={editEventForm.formState.errors.occurredAt?.message}
                    >
                      <FormDateTimeInput
                        aria-label={t("discipline.form.dateTimeEditAria")}
                        invalid={editOccurredAtInvalid}
                        value={editEventValues.occurredAt ?? ""}
                        onChange={(event) =>
                          editEventForm.setValue(
                            "occurredAt",
                            event.target.value,
                            {
                              shouldDirty: true,
                              shouldTouch: true,
                              shouldValidate: true,
                            },
                          )
                        }
                      />
                    </FormField>

                    <FormField
                      label={t("discipline.form.reasonEditAria")}
                      className="md:col-span-2"
                      error={editEventForm.formState.errors.reason?.message}
                    >
                      <FormTextInput
                        aria-label={t("discipline.form.reasonEditAria")}
                        invalid={editReasonInvalid}
                        value={editEventValues.reason ?? ""}
                        onChange={(event) =>
                          editEventForm.setValue("reason", event.target.value, {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                          })
                        }
                      />
                    </FormField>

                    <FormField
                      label={t("discipline.form.durationEditAria")}
                      error={
                        editEventForm.formState.errors.durationMinutes?.message
                      }
                    >
                      <FormNumberInput
                        aria-label={t("discipline.form.durationEditAria")}
                        invalid={editDurationInvalid}
                        min={0}
                        value={editEventValues.durationMinutes ?? ""}
                        onChange={(event) =>
                          editEventForm.setValue(
                            "durationMinutes",
                            event.target.value,
                            {
                              shouldDirty: true,
                              shouldTouch: true,
                              shouldValidate: true,
                            },
                          )
                        }
                      />
                    </FormField>

                    <FormField
                      label={t("discipline.form.commentEditAria")}
                      className="md:col-span-2"
                    >
                      <FormTextarea
                        aria-label={t("discipline.form.commentEditAria")}
                        value={editEventValues.comment ?? ""}
                        onChange={(event) =>
                          editEventForm.setValue(
                            "comment",
                            event.target.value,
                            {
                              shouldDirty: true,
                              shouldTouch: true,
                              shouldValidate: true,
                            },
                          )
                        }
                        rows={3}
                      />
                    </FormField>

                    <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
                      <FormCheckbox
                        checked={editEventValues.justified ?? false}
                        onChange={(event) =>
                          editEventForm.setValue(
                            "justified",
                            event.target.checked,
                            {
                              shouldDirty: true,
                              shouldTouch: true,
                              shouldValidate: true,
                            },
                          )
                        }
                        disabled={
                          editEventValues.type === "SANCTION" ||
                          editEventValues.type === "PUNITION"
                        }
                      />
                      {t("discipline.form.justified")}
                    </label>

                    <div className="flex gap-2 md:col-span-2">
                      <FormSubmitHint
                        visible={!editEventForm.formState.isValid}
                        className="self-center"
                      />
                      <Button
                        type="button"
                        disabled={
                          updatingEventId === editingEventId ||
                          !editEventForm.formState.isValid
                        }
                        onClick={() =>
                          void editEventForm.handleSubmit(saveEditedEvent)()
                        }
                      >
                        {updatingEventId === editingEventId
                          ? t("discipline.form.saving")
                          : t("discipline.form.submitUpdate")}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={cancelEditEvent}
                      >
                        {t("discipline.form.cancel")}
                      </Button>
                    </div>
                  </div>
                ) : null}

                <LifeEventsList
                  events={events}
                  emptyLabel={t("discipline.empty.studentEvents")}
                  formatDate={(iso) => formatShortDateTime(iso, locale)}
                  deletingEventId={deletingEventId}
                  onEdit={startEditEvent}
                  onDelete={(row) => setDeleteTarget(row)}
                />
              </div>
            )}
          </div>
        )}
      </Card>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={t("discipline.delete.title")}
        message={
          deleteTarget
            ? t("discipline.delete.message").replace(
                "{label}",
                `${lifeEventTypeLabel(t, deleteTarget.type)} - ${deleteTarget.reason}`,
              )
            : ""
        }
        confirmLabel={t("discipline.delete.confirm")}
        cancelLabel={t("discipline.form.cancel")}
        loading={Boolean(deleteTarget) && deletingEventId === deleteTarget?.id}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) {
            return;
          }
          void deleteEvent(deleteTarget.id);
        }}
      />
    </div>
  );
}
