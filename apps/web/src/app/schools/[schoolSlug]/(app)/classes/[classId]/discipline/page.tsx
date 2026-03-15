"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Card } from "../../../../../../../components/ui/card";
import { Button } from "../../../../../../../components/ui/button";
import { ConfirmDialog } from "../../../../../../../components/ui/confirm-dialog";
import { FormField } from "../../../../../../../components/ui/form-field";
import {
  LifeEventsList,
  lifeEventTypeLabel,
  type LifeEventRow,
  type LifeEventType,
} from "../../../../../../../components/life-events/life-events-list";
import { ModuleHelpTab } from "../../../../../../../components/ui/module-help-tab";
import { SubmitButton } from "../../../../../../../components/ui/form-buttons";
import { getCsrfTokenCookie } from "../../../../../../../lib/auth-cookies";
import {
  API_URL,
  type GradesContext,
  getClassContext,
  type MeResponse,
  formatShortDateTime,
} from "../_shared";

type TabKey = "entry" | "history" | "help";
type EventType = LifeEventType;

const createEventSchema = z.object({
  type: z.enum(["ABSENCE", "RETARD", "SANCTION", "PUNITION"]),
  occurredAt: z.string().trim().min(1, "La date est obligatoire."),
  reason: z.string().trim().min(1, "Le motif est obligatoire."),
  durationMinutes: z
    .string()
    .trim()
    .refine(
      (value) =>
        value.length === 0 ||
        (/^\d+$/.test(value) && Number.parseInt(value, 10) >= 0),
      {
        message: "La duree doit etre un entier positif.",
      },
    ),
  justified: z.boolean().optional(),
  comment: z.string().trim().optional(),
});

function toDateTimeLocalInput(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export default function TeacherClassDisciplinePage() {
  const { schoolSlug, classId } = useParams<{
    schoolSlug: string;
    classId: string;
  }>();
  const router = useRouter();

  const [tab, setTab] = useState<TabKey>("entry");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [context, setContext] = useState<GradesContext | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [events, setEvents] = useState<LifeEventRow[]>([]);
  const createEventForm = useForm<
    z.input<typeof createEventSchema>,
    unknown,
    z.output<typeof createEventSchema>
  >({
    resolver: zodResolver(createEventSchema),
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
    z.input<typeof createEventSchema>,
    unknown,
    z.output<typeof createEventSchema>
  >({
    resolver: zodResolver(createEventSchema),
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
    void bootstrap();
  }, [schoolSlug, classId]);

  const classContext = useMemo(
    () => getClassContext(context, classId),
    [context, classId],
  );

  useEffect(() => {
    if (!classContext || classContext.students.length === 0) {
      setSelectedStudentId("");
      return;
    }

    const exists = classContext.students.some(
      (entry) => entry.id === selectedStudentId,
    );
    if (!exists) {
      setSelectedStudentId(classContext.students[0].id);
    }
  }, [classContext, selectedStudentId]);

  useEffect(() => {
    if (!schoolSlug || !selectedStudentId) {
      setEvents([]);
      return;
    }

    void loadStudentEvents(schoolSlug, selectedStudentId);
  }, [schoolSlug, selectedStudentId]);

  useEffect(() => {
    setEditingEventId(null);
  }, [selectedStudentId]);

  const createEventValues = createEventForm.watch();
  const editEventValues = editEventForm.watch();

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

  async function bootstrap() {
    setLoading(true);
    setError(null);

    try {
      const meResponse = await fetch(`${API_URL}/schools/${schoolSlug}/me`, {
        credentials: "include",
      });

      if (!meResponse.ok) {
        router.replace(`/schools/${schoolSlug}/login`);
        return;
      }

      const me = (await meResponse.json()) as MeResponse;
      if (me.role !== "TEACHER") {
        router.replace(`/schools/${schoolSlug}/dashboard`);
        return;
      }

      const contextResponse = await fetch(
        `${API_URL}/schools/${schoolSlug}/student-grades/context`,
        {
          credentials: "include",
        },
      );

      if (!contextResponse.ok) {
        setError("Impossible de charger la classe.");
        return;
      }

      const contextPayload = (await contextResponse.json()) as GradesContext;
      setContext(contextPayload);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setLoading(false);
    }
  }

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
        setError("Impossible de charger l'historique discipline.");
        setEvents([]);
        return;
      }

      const payload = (await response.json()) as LifeEventRow[];
      setEvents(payload);
    } catch {
      setEvents([]);
    }
  }

  async function createEvent(values: z.output<typeof createEventSchema>) {
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
      setError("Session CSRF invalide. Reconnectez-vous.");
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
            : (payload?.message ?? "Creation impossible.");
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
      setSuccess("Evenement discipline enregistre.");
      await loadStudentEvents(schoolSlug, selectedStudentId);
      setTab("history");
    } catch {
      setError("Erreur reseau.");
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

  async function saveEditedEvent(values: z.output<typeof createEventSchema>) {
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
        setError("La duree doit etre un entier positif.");
        return;
      }
      durationMinutes = parsedDurationMinutes;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError("Session CSRF invalide. Reconnectez-vous.");
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
            : (payload?.message ?? "Modification impossible.");
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
      setSuccess("Evenement modifie.");
      await loadStudentEvents(schoolSlug, selectedStudentId);
    } catch {
      setError("Erreur reseau.");
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
      setError("Session CSRF invalide. Reconnectez-vous.");
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
            : (payload?.message ?? "Suppression impossible.");
        setError(String(message));
        return;
      }

      if (editingEventId === eventId) {
        setEditingEventId(null);
      }
      setDeleteTarget(null);
      setSuccess("Evenement supprime.");
      await loadStudentEvents(schoolSlug, selectedStudentId);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setDeletingEventId(null);
    }
  }

  return (
    <div className="grid gap-4">
      <Card
        title={`Discipline - ${classContext?.className ?? "Classe"}`}
        subtitle="Absences, retards, sanctions et punitions"
      >
        <div className="mb-4 flex items-end gap-2 border-b border-border">
          <button
            type="button"
            onClick={() => setTab("entry")}
            className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
              tab === "entry"
                ? "border border-border border-b-surface bg-surface text-primary"
                : "text-text-secondary"
            }`}
          >
            Saisie
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
            Historique
          </button>
          <button
            type="button"
            onClick={() => setTab("help")}
            className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
              tab === "help"
                ? "border border-border border-b-surface bg-surface text-primary"
                : "text-text-secondary"
            }`}
          >
            Aide
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-text-secondary">Chargement...</p>
        ) : !classContext ? (
          <p className="text-sm text-notification">
            Classe non accessible avec vos affectations.
          </p>
        ) : tab === "help" ? (
          <ModuleHelpTab
            moduleName="Discipline"
            moduleSummary="ce module permet a l'enseignant de declarer des absences, retards, sanctions et punitions sur ses classes affectees."
            actions={[
              {
                name: "Saisir",
                purpose: "enregistrer rapidement un evenement de vie scolaire.",
                howTo:
                  "selectionner l'eleve puis renseigner type, date et motif.",
                moduleImpact:
                  "l'evenement est visible au parent sur Vie scolaire (annee en cours).",
                crossModuleImpact:
                  "alimente ensuite la page Cursus pour l'historique global.",
              },
              {
                name: "Verifier",
                purpose: "consulter le journal discipline de l'eleve.",
                howTo: "ouvrir Historique pour voir les evenements existants.",
                moduleImpact: "evite les doublons de saisie.",
                crossModuleImpact:
                  "facilite la coordination avec SCHOOL_MANAGER/SUPERVISOR.",
              },
            ]}
          />
        ) : (
          <div className="grid gap-4">
            <label className="grid gap-1 text-sm md:max-w-[420px]">
              <span className="text-text-secondary">Eleve</span>
              <select
                value={selectedStudentId}
                onChange={(event) => setSelectedStudentId(event.target.value)}
                className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
              >
                {classContext.students.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.lastName} {entry.firstName}
                  </option>
                ))}
              </select>
            </label>

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
                <FormField label="Type d'evenement" htmlFor="discipline-type">
                  <select
                    id="discipline-type"
                    value={createEventValues.type}
                    onChange={(event) =>
                      createEventForm.setValue(
                        "type",
                        event.target.value as EventType,
                        {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        },
                      )
                    }
                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="ABSENCE">Absence</option>
                    <option value="RETARD">Retard</option>
                    <option value="SANCTION">Sanction</option>
                    <option value="PUNITION">Punition</option>
                  </select>
                </FormField>

                <FormField
                  label="Date et heure"
                  error={createEventForm.formState.errors.occurredAt?.message}
                >
                  <input
                    type="datetime-local"
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
                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  />
                </FormField>

                <FormField
                  label="Motif"
                  error={createEventForm.formState.errors.reason?.message}
                  className="md:col-span-2"
                >
                  <input
                    type="text"
                    value={createEventValues.reason}
                    onChange={(event) =>
                      createEventForm.setValue("reason", event.target.value, {
                        shouldDirty: true,
                        shouldTouch: true,
                        shouldValidate: true,
                      })
                    }
                    placeholder="Ex: travail non rendu, absence non justifiee"
                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  />
                </FormField>

                <FormField
                  label="Duree (minutes, optionnel)"
                  error={
                    createEventForm.formState.errors.durationMinutes?.message
                  }
                >
                  <input
                    type="number"
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
                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  />
                </FormField>

                <FormField
                  label="Commentaire (optionnel)"
                  className="md:col-span-2"
                >
                  <textarea
                    value={createEventValues.comment}
                    onChange={(event) =>
                      createEventForm.setValue("comment", event.target.value, {
                        shouldDirty: true,
                        shouldTouch: true,
                        shouldValidate: true,
                      })
                    }
                    rows={3}
                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  />
                </FormField>

                <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
                  <input
                    type="checkbox"
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
                  Justifie (absence / retard)
                </label>

                <div className="md:col-span-2">
                  <SubmitButton
                    disabled={
                      saving ||
                      !selectedStudentId ||
                      !createEventForm.formState.isValid
                    }
                  >
                    {saving ? "Enregistrement..." : "Enregistrer l'evenement"}
                  </SubmitButton>
                </div>
              </form>
            ) : (
              <div className="grid gap-3">
                {editingEventId ? (
                  <div className="grid gap-3 rounded-card border border-border bg-background p-3 md:grid-cols-2">
                    <FormField
                      label="Type d'evenement edition"
                      error={editEventForm.formState.errors.type?.message}
                    >
                      <select
                        aria-label="Type d'evenement edition"
                        value={editEventValues.type ?? "ABSENCE"}
                        onChange={(event) =>
                          editEventForm.setValue(
                            "type",
                            event.target.value as EventType,
                            {
                              shouldDirty: true,
                              shouldTouch: true,
                              shouldValidate: true,
                            },
                          )
                        }
                        className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="ABSENCE">Absence</option>
                        <option value="RETARD">Retard</option>
                        <option value="SANCTION">Sanction</option>
                        <option value="PUNITION">Punition</option>
                      </select>
                    </FormField>

                    <FormField
                      label="Date et heure edition"
                      error={editEventForm.formState.errors.occurredAt?.message}
                    >
                      <input
                        aria-label="Date et heure edition"
                        type="datetime-local"
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
                        className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                      />
                    </FormField>

                    <FormField
                      label="Motif edition"
                      className="md:col-span-2"
                      error={editEventForm.formState.errors.reason?.message}
                    >
                      <input
                        aria-label="Motif edition"
                        type="text"
                        value={editEventValues.reason ?? ""}
                        onChange={(event) =>
                          editEventForm.setValue("reason", event.target.value, {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                          })
                        }
                        className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                      />
                    </FormField>

                    <FormField
                      label="Duree edition (minutes, optionnel)"
                      error={
                        editEventForm.formState.errors.durationMinutes?.message
                      }
                    >
                      <input
                        aria-label="Duree edition (minutes, optionnel)"
                        type="number"
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
                        className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                      />
                    </FormField>

                    <FormField
                      label="Commentaire edition (optionnel)"
                      className="md:col-span-2"
                    >
                      <textarea
                        aria-label="Commentaire edition (optionnel)"
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
                        className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                      />
                    </FormField>

                    <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
                      <input
                        type="checkbox"
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
                      Justifie (absence / retard)
                    </label>

                    <div className="flex gap-2 md:col-span-2">
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
                          ? "Enregistrement..."
                          : "Enregistrer les modifications"}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={cancelEditEvent}
                      >
                        Annuler
                      </Button>
                    </div>
                  </div>
                ) : null}

                <LifeEventsList
                  events={events}
                  emptyLabel="Aucun evenement pour cet eleve."
                  formatDate={formatShortDateTime}
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
        title="Supprimer cet evenement ?"
        message={
          deleteTarget
            ? `Cette action est irreversible. L'evenement "${lifeEventTypeLabel(deleteTarget.type)} - ${deleteTarget.reason}" sera supprime definitivement.`
            : ""
        }
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
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
