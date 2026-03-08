"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { CalendarDays, Pencil, Plus, Trash2 } from "lucide-react";
import { Card } from "../../../../../../../components/ui/card";
import { Button } from "../../../../../../../components/ui/button";
import { ConfirmDialog } from "../../../../../../../components/ui/confirm-dialog";
import { ModuleHelpTab } from "../../../../../../../components/ui/module-help-tab";
import { getCsrfTokenCookie } from "../../../../../../../lib/auth-cookies";
import { API_URL, type MeResponse } from "../_shared";

type TabKey = "slots" | "vacations" | "help";
type AllowedRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "SCHOOL_ADMIN"
  | "SCHOOL_MANAGER"
  | "SUPERVISOR"
  | "TEACHER";

type TimetableContextResponse = {
  class: {
    id: string;
    name: string;
    schoolYearId: string;
    academicLevelId: string | null;
    referentTeacherUserId: string | null;
  };
  allowedSubjects: Array<{
    id: string;
    name: string;
  }>;
  assignments: Array<{
    teacherUserId: string;
    subjectId: string;
    subject: { id: string; name: string };
    teacherUser: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  }>;
  subjectStyles: Array<{
    subjectId: string;
    colorHex: string;
  }>;
  schoolYears: Array<{
    id: string;
    label: string;
    isActive: boolean;
  }>;
  selectedSchoolYearId: string | null;
};

type SlotRow = {
  id: string;
  weekday: number;
  startMinute: number;
  endMinute: number;
  room: string | null;
  subject: { id: string; name: string };
  teacherUser: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
};

type CalendarEventRow = {
  id: string;
  type: "HOLIDAY";
  scope: "SCHOOL" | "ACADEMIC_LEVEL" | "CLASS";
  label: string;
  startDate: string;
  endDate: string;
  classId: string | null;
  academicLevelId: string | null;
};

type TimetableResponse = {
  class: {
    id: string;
    schoolYearId: string;
    academicLevelId: string | null;
  };
  slots: SlotRow[];
  calendarEvents: CalendarEventRow[];
  subjectStyles: Array<{
    subjectId: string;
    colorHex: string;
  }>;
};

const ALLOWED_ROLES: AllowedRole[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "SCHOOL_ADMIN",
  "SCHOOL_MANAGER",
  "SUPERVISOR",
  "TEACHER",
];

const CAN_MANAGE_CALENDAR_ROLES: AllowedRole[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "SCHOOL_ADMIN",
  "SCHOOL_MANAGER",
  "SUPERVISOR",
];

const WEEKDAY_OPTIONS = [
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
  { value: 7, label: "Dimanche" },
];

function parseApiError(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const withMessage = payload as { message?: string | string[] };
  if (Array.isArray(withMessage.message)) {
    return withMessage.message.join(", ");
  }
  if (typeof withMessage.message === "string") {
    return withMessage.message;
  }
  return fallback;
}

function minutesToTimeValue(totalMinutes: number) {
  const normalized = Number.isFinite(totalMinutes)
    ? Math.max(0, Math.min(1439, totalMinutes))
    : 0;
  const hours = Math.floor(normalized / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (normalized % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function timeValueToMinutes(value: string) {
  const [hoursRaw, minutesRaw] = value.split(":");
  const hours = Number.parseInt(hoursRaw ?? "", 10);
  const minutes = Number.parseInt(minutesRaw ?? "", 10);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return Number.NaN;
  }
  return hours * 60 + minutes;
}

function formatDateRange(startIso: string, endIso: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "-";
  }
  const formatter = new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

function toDateInputValue(isoDate: string) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function scopeLabel(scope: CalendarEventRow["scope"]) {
  if (scope === "SCHOOL") {
    return "Ecole";
  }
  if (scope === "ACADEMIC_LEVEL") {
    return "Niveau";
  }
  return "Classe";
}

export default function TeacherClassAgendaPage() {
  const { schoolSlug, classId } = useParams<{
    schoolSlug: string;
    classId: string;
  }>();
  const router = useRouter();

  const [tab, setTab] = useState<TabKey>("slots");
  const [loading, setLoading] = useState(true);
  const [savingSlot, setSavingSlot] = useState(false);
  const [savingVacation, setSavingVacation] = useState(false);
  const [deletingSlotId, setDeletingSlotId] = useState<string | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [savingSubjectStyleId, setSavingSubjectStyleId] = useState<
    string | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [meRole, setMeRole] = useState<AllowedRole | null>(null);
  const [context, setContext] = useState<TimetableContextResponse | null>(null);
  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventRow[]>([]);
  const [subjectColorsBySubjectId, setSubjectColorsBySubjectId] = useState<
    Record<string, string>
  >({});
  const [selectedSchoolYearId, setSelectedSchoolYearId] = useState<
    string | null
  >(null);

  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [slotWeekday, setSlotWeekday] = useState("1");
  const [slotStart, setSlotStart] = useState("08:45");
  const [slotEnd, setSlotEnd] = useState("09:40");
  const [slotSubjectId, setSlotSubjectId] = useState("");
  const [slotTeacherUserId, setSlotTeacherUserId] = useState("");
  const [slotRoom, setSlotRoom] = useState("");

  const [vacationLabel, setVacationLabel] = useState("Vacances scolaires");
  const [vacationScope, setVacationScope] = useState<
    "SCHOOL" | "ACADEMIC_LEVEL" | "CLASS"
  >("CLASS");
  const [vacationStartDate, setVacationStartDate] = useState("");
  const [vacationEndDate, setVacationEndDate] = useState("");
  const [editingVacationId, setEditingVacationId] = useState<string | null>(
    null,
  );

  const [slotToDelete, setSlotToDelete] = useState<SlotRow | null>(null);
  const [eventToDelete, setEventToDelete] = useState<CalendarEventRow | null>(
    null,
  );

  const canManageCalendar =
    meRole !== null && CAN_MANAGE_CALENDAR_ROLES.includes(meRole);

  useEffect(() => {
    void bootstrap();
  }, [schoolSlug, classId]);

  useEffect(() => {
    if (context?.allowedSubjects.length) {
      const subjectStillExists = context.allowedSubjects.some(
        (subject) => subject.id === slotSubjectId,
      );
      if (!subjectStillExists) {
        setSlotSubjectId(context.allowedSubjects[0].id);
      }
      return;
    }
    setSlotSubjectId("");
  }, [context, slotSubjectId]);

  const teacherChoices = useMemo(() => {
    if (!context || !slotSubjectId) {
      return [] as Array<{ id: string; label: string }>;
    }

    const rows = context.assignments.filter(
      (entry) => entry.subjectId === slotSubjectId,
    );

    const seen = new Set<string>();
    const options: Array<{ id: string; label: string }> = [];

    rows.forEach((entry) => {
      if (seen.has(entry.teacherUser.id)) {
        return;
      }
      seen.add(entry.teacherUser.id);
      options.push({
        id: entry.teacherUser.id,
        label: `${entry.teacherUser.lastName.toUpperCase()} ${entry.teacherUser.firstName}`,
      });
    });

    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, [context, slotSubjectId]);

  useEffect(() => {
    if (teacherChoices.length === 0) {
      setSlotTeacherUserId("");
      return;
    }

    const stillExists = teacherChoices.some(
      (entry) => entry.id === slotTeacherUserId,
    );
    if (!stillExists) {
      setSlotTeacherUserId(teacherChoices[0].id);
    }
  }, [teacherChoices, slotTeacherUserId]);

  const slotsByWeekday = useMemo(() => {
    const map = new Map<number, SlotRow[]>();
    WEEKDAY_OPTIONS.forEach((weekday) => map.set(weekday.value, []));

    slots.forEach((slot) => {
      const current = map.get(slot.weekday) ?? [];
      current.push(slot);
      map.set(slot.weekday, current);
    });

    map.forEach((weekdaySlots, key) => {
      map.set(
        key,
        [...weekdaySlots].sort((a, b) => a.startMinute - b.startMinute),
      );
    });

    return map;
  }, [slots]);

  const sortedVacations = useMemo(
    () =>
      [...calendarEvents]
        .filter((event) => event.type === "HOLIDAY")
        .sort(
          (a, b) =>
            new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
        ),
    [calendarEvents],
  );

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
      const role = me.role as AllowedRole;

      if (!ALLOWED_ROLES.includes(role)) {
        router.replace(`/schools/${schoolSlug}/dashboard`);
        return;
      }

      setMeRole(role);
      await loadContextAndTimetable();
    } catch (caught) {
      if (caught instanceof Error) {
        setError(caught.message);
      } else {
        setError("Erreur reseau.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadContextAndTimetable(
    requestedSchoolYearId?: string | null,
  ) {
    const schoolYearQuery = requestedSchoolYearId
      ? `?schoolYearId=${encodeURIComponent(requestedSchoolYearId)}`
      : "";
    const [contextResponse, timetableResponse] = await Promise.all([
      fetch(
        `${API_URL}/schools/${schoolSlug}/timetable/classes/${classId}/context${schoolYearQuery}`,
        {
          credentials: "include",
        },
      ),
      fetch(
        `${API_URL}/schools/${schoolSlug}/timetable/classes/${classId}${schoolYearQuery}`,
        {
          credentials: "include",
        },
      ),
    ]);

    if (!contextResponse.ok || !timetableResponse.ok) {
      const contextPayload = await contextResponse.json().catch(() => null);
      const timetablePayload = await timetableResponse.json().catch(() => null);
      const message =
        parseApiError(contextPayload, "") ||
        parseApiError(timetablePayload, "") ||
        "Impossible de charger l'emploi du temps de la classe.";
      throw new Error(message);
    }

    const contextPayload =
      (await contextResponse.json()) as TimetableContextResponse;
    const timetablePayload =
      (await timetableResponse.json()) as TimetableResponse;
    setContext(contextPayload);
    setSlots(timetablePayload.slots);
    setCalendarEvents(timetablePayload.calendarEvents);
    setSubjectColorsBySubjectId(
      Object.fromEntries(
        contextPayload.subjectStyles.map((entry) => [
          entry.subjectId,
          entry.colorHex,
        ]),
      ),
    );
    setSelectedSchoolYearId(contextPayload.selectedSchoolYearId);
  }

  async function refreshTimetable() {
    const schoolYearQuery = selectedSchoolYearId
      ? `?schoolYearId=${encodeURIComponent(selectedSchoolYearId)}`
      : "";
    const response = await fetch(
      `${API_URL}/schools/${schoolSlug}/timetable/classes/${classId}${schoolYearQuery}`,
      {
        credentials: "include",
      },
    );

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(
        parseApiError(payload, "Impossible d'actualiser l'emploi du temps."),
      );
    }

    const data = (await response.json()) as TimetableResponse;
    setSlots(data.slots);
    setCalendarEvents(data.calendarEvents);
    setSubjectColorsBySubjectId(
      Object.fromEntries(
        data.subjectStyles.map((entry) => [entry.subjectId, entry.colorHex]),
      ),
    );
  }

  function resetSlotForm() {
    setEditingSlotId(null);
    setSlotWeekday("1");
    setSlotStart("08:45");
    setSlotEnd("09:40");
    setSlotRoom("");
  }

  function onEditSlot(slot: SlotRow) {
    setEditingSlotId(slot.id);
    setSlotWeekday(String(slot.weekday));
    setSlotStart(minutesToTimeValue(slot.startMinute));
    setSlotEnd(minutesToTimeValue(slot.endMinute));
    setSlotSubjectId(slot.subject.id);
    setSlotTeacherUserId(slot.teacherUser.id);
    setSlotRoom(slot.room ?? "");
    setTab("slots");
    setSuccess(null);
    setError(null);
  }

  async function saveSubjectStyle(subjectId: string, colorHex: string) {
    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError("Session CSRF invalide. Reconnectez-vous.");
      router.replace(`/schools/${schoolSlug}/login`);
      return;
    }

    setSavingSubjectStyleId(subjectId);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(
        `${API_URL}/schools/${schoolSlug}/timetable/classes/${classId}/subjects/${subjectId}/style`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({
            schoolYearId: selectedSchoolYearId ?? undefined,
            colorHex,
          }),
        },
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setError(
          parseApiError(payload, "Mise a jour de la couleur impossible."),
        );
        return;
      }

      setSubjectColorsBySubjectId((current) => ({
        ...current,
        [subjectId]: colorHex.toUpperCase(),
      }));
      setSuccess("Couleur de matiere enregistree.");
    } catch {
      setError("Erreur reseau.");
    } finally {
      setSavingSubjectStyleId(null);
    }
  }

  async function onSubmitSlot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!slotSubjectId) {
      setError("Selectionnez une matiere.");
      return;
    }

    if (!slotTeacherUserId) {
      setError("Selectionnez un enseignant.");
      return;
    }

    const weekday = Number.parseInt(slotWeekday, 10);
    const startMinute = timeValueToMinutes(slotStart);
    const endMinute = timeValueToMinutes(slotEnd);

    if (!Number.isFinite(weekday) || weekday < 1 || weekday > 7) {
      setError("Jour invalide.");
      return;
    }

    if (!Number.isFinite(startMinute) || !Number.isFinite(endMinute)) {
      setError("Horaire invalide.");
      return;
    }

    if (startMinute >= endMinute) {
      setError("L'heure de debut doit etre avant l'heure de fin.");
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError("Session CSRF invalide. Reconnectez-vous.");
      router.replace(`/schools/${schoolSlug}/login`);
      return;
    }

    setSavingSlot(true);
    setError(null);
    setSuccess(null);

    try {
      const endpoint = editingSlotId
        ? `${API_URL}/schools/${schoolSlug}/timetable/slots/${editingSlotId}`
        : `${API_URL}/schools/${schoolSlug}/timetable/classes/${classId}/slots`;
      const method = editingSlotId ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          schoolYearId: selectedSchoolYearId ?? undefined,
          weekday,
          startMinute,
          endMinute,
          subjectId: slotSubjectId,
          teacherUserId: slotTeacherUserId,
          room: slotRoom.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setError(
          parseApiError(
            payload,
            editingSlotId
              ? "Mise a jour du creneau impossible."
              : "Creation du creneau impossible.",
          ),
        );
        return;
      }

      await refreshTimetable();
      setSuccess(editingSlotId ? "Creneau mis a jour." : "Creneau ajoute.");
      if (!editingSlotId) {
        setSlotRoom("");
      } else {
        resetSlotForm();
      }
    } catch {
      setError("Erreur reseau.");
    } finally {
      setSavingSlot(false);
    }
  }

  async function onDeleteSlot() {
    if (!slotToDelete) {
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError("Session CSRF invalide. Reconnectez-vous.");
      router.replace(`/schools/${schoolSlug}/login`);
      return;
    }

    setDeletingSlotId(slotToDelete.id);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        `${API_URL}/schools/${schoolSlug}/timetable/slots/${slotToDelete.id}`,
        {
          method: "DELETE",
          credentials: "include",
          headers: {
            "X-CSRF-Token": csrfToken,
          },
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setError(parseApiError(payload, "Suppression du creneau impossible."));
        return;
      }

      if (editingSlotId === slotToDelete.id) {
        resetSlotForm();
      }

      await refreshTimetable();
      setSuccess("Creneau supprime.");
      setSlotToDelete(null);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setDeletingSlotId(null);
    }
  }

  async function onSubmitVacation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canManageCalendar) {
      setError("Vous ne pouvez pas modifier les vacances.");
      return;
    }

    if (!vacationLabel.trim()) {
      setError("Le libelle est obligatoire.");
      return;
    }

    if (!vacationStartDate || !vacationEndDate) {
      setError("Les dates de debut et fin sont obligatoires.");
      return;
    }

    const start = new Date(vacationStartDate);
    const end = new Date(vacationEndDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setError("Dates invalides.");
      return;
    }
    if (start > end) {
      setError("La date de debut doit etre avant la date de fin.");
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError("Session CSRF invalide. Reconnectez-vous.");
      router.replace(`/schools/${schoolSlug}/login`);
      return;
    }

    setSavingVacation(true);
    setError(null);
    setSuccess(null);

    try {
      const isEdition = editingVacationId !== null;
      const response = await fetch(
        isEdition
          ? `${API_URL}/schools/${schoolSlug}/timetable/calendar-events/${editingVacationId}`
          : `${API_URL}/schools/${schoolSlug}/timetable/calendar-events`,
        {
          method: isEdition ? "PATCH" : "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({
            schoolYearId: selectedSchoolYearId ?? undefined,
            type: "HOLIDAY",
            scope: vacationScope,
            label: vacationLabel.trim(),
            startDate: vacationStartDate,
            endDate: vacationEndDate,
            classId: vacationScope === "CLASS" ? classId : undefined,
            academicLevelId:
              vacationScope === "ACADEMIC_LEVEL"
                ? (context?.class.academicLevelId ?? undefined)
                : undefined,
          }),
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setError(
          parseApiError(
            payload,
            isEdition
              ? "Mise a jour des vacances impossible."
              : "Creation des vacances impossible.",
          ),
        );
        return;
      }

      await refreshTimetable();
      setSuccess(
        isEdition
          ? "Periode de vacances mise a jour."
          : "Periode de vacances enregistree.",
      );
      setVacationLabel("Vacances scolaires");
      setVacationScope("CLASS");
      setVacationStartDate("");
      setVacationEndDate("");
      setEditingVacationId(null);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setSavingVacation(false);
    }
  }

  async function onDeleteVacation() {
    if (!eventToDelete) {
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError("Session CSRF invalide. Reconnectez-vous.");
      router.replace(`/schools/${schoolSlug}/login`);
      return;
    }

    setDeletingEventId(eventToDelete.id);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        `${API_URL}/schools/${schoolSlug}/timetable/calendar-events/${eventToDelete.id}`,
        {
          method: "DELETE",
          credentials: "include",
          headers: {
            "X-CSRF-Token": csrfToken,
          },
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setError(
          parseApiError(payload, "Suppression de la periode impossible."),
        );
        return;
      }

      await refreshTimetable();
      setSuccess("Periode supprimee.");
      if (editingVacationId === eventToDelete.id) {
        setEditingVacationId(null);
        setVacationLabel("Vacances scolaires");
        setVacationScope("CLASS");
        setVacationStartDate("");
        setVacationEndDate("");
      }
      setEventToDelete(null);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setDeletingEventId(null);
    }
  }

  function onEditVacation(event: CalendarEventRow) {
    setEditingVacationId(event.id);
    setVacationLabel(event.label);
    setVacationScope(event.scope);
    setVacationStartDate(toDateInputValue(event.startDate));
    setVacationEndDate(toDateInputValue(event.endDate));
    setTab("vacations");
    setSuccess(null);
    setError(null);
  }

  return (
    <div className="grid gap-4">
      <Card
        title={`Emploi du temps - ${context?.class.name ?? "Classe"}`}
        subtitle="Creation et gestion de l'emploi du temps annuel"
      >
        <div className="mb-4 flex items-end gap-2 border-b border-border">
          <button
            type="button"
            onClick={() => setTab("slots")}
            className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
              tab === "slots"
                ? "border border-border border-b-surface bg-surface text-primary"
                : "text-text-secondary"
            }`}
          >
            Creneaux
          </button>
          <button
            type="button"
            onClick={() => setTab("vacations")}
            className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
              tab === "vacations"
                ? "border border-border border-b-surface bg-surface text-primary"
                : "text-text-secondary"
            }`}
          >
            Vacances
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
        ) : error ? (
          <p className="text-sm text-notification">{error}</p>
        ) : !context ? (
          <p className="text-sm text-notification">Classe non accessible.</p>
        ) : tab === "help" ? (
          <ModuleHelpTab
            moduleName="Emploi du temps"
            moduleSummary="ce module permet de planifier les cours hebdomadaires et les vacances scolaires par classe."
            actions={[
              {
                name: "Creer un creneau",
                purpose: "ajouter un cours recurrent",
                howTo:
                  "selectionner jour, horaires, matiere, enseignant et salle puis enregistrer.",
                moduleImpact:
                  "structure la semaine de la classe sur l'annee scolaire.",
                crossModuleImpact:
                  "alimente les vues eleve/parent et facilite la coordination pedagogique.",
              },
              {
                name: "Declarer des vacances",
                purpose: "bloquer des periodes sans cours",
                howTo:
                  "choisir la portee (ecole, niveau ou classe), saisir les dates puis valider.",
                moduleImpact: "evite les conflits de planification.",
                crossModuleImpact:
                  "les vacances remontent dans les agendas de classes et niveaux concernes.",
              },
            ]}
          />
        ) : (
          <div className="grid gap-4">
            {context.schoolYears.length > 0 ? (
              <div className="rounded-card border border-border bg-background p-3">
                <label className="grid gap-1 text-sm md:max-w-[320px]">
                  <span className="text-text-secondary">Annee scolaire</span>
                  <select
                    value={selectedSchoolYearId ?? ""}
                    onChange={async (event) => {
                      const nextSchoolYearId = event.target.value || null;
                      setSelectedSchoolYearId(nextSchoolYearId);
                      setError(null);
                      setSuccess(null);
                      try {
                        setLoading(true);
                        await loadContextAndTimetable(nextSchoolYearId);
                      } catch (caught) {
                        if (caught instanceof Error) {
                          setError(caught.message);
                        } else {
                          setError("Impossible de changer d'annee scolaire.");
                        }
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="rounded-card border border-border bg-surface px-3 py-2 text-sm"
                  >
                    {context.schoolYears.map((schoolYear) => (
                      <option key={schoolYear.id} value={schoolYear.id}>
                        {schoolYear.label}
                        {schoolYear.isActive ? " (en cours)" : ""}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}

            {success ? (
              <p className="rounded-card border border-[#B8E3C3] bg-[#F1FAF3] px-3 py-2 text-sm text-[#1F6A34]">
                {success}
              </p>
            ) : null}

            {tab === "slots" ? (
              <>
                <section className="rounded-card border border-border bg-background p-4">
                  <h3 className="mb-2 text-sm font-semibold text-text-primary">
                    Couleurs des matieres (classe + annee)
                  </h3>
                  <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {context.allowedSubjects.map((subject) => {
                      const currentColor =
                        subjectColorsBySubjectId[subject.id] ?? "#2563EB";
                      return (
                        <article
                          key={subject.id}
                          className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-text-primary">
                              {subject.name}
                            </p>
                            <p className="text-xs text-text-secondary">
                              {currentColor.toUpperCase()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={currentColor}
                              onChange={(event) => {
                                setSubjectColorsBySubjectId((current) => ({
                                  ...current,
                                  [subject.id]:
                                    event.target.value.toUpperCase(),
                                }));
                              }}
                              className="h-8 w-10 cursor-pointer rounded border border-border bg-surface p-0.5"
                              aria-label={`Couleur ${subject.name}`}
                            />
                            <Button
                              type="button"
                              variant="secondary"
                              className="px-2 py-1 text-xs"
                              disabled={savingSubjectStyleId === subject.id}
                              onClick={() => {
                                void saveSubjectStyle(subject.id, currentColor);
                              }}
                            >
                              {savingSubjectStyleId === subject.id
                                ? "..."
                                : "Sauver"}
                            </Button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>

                <form
                  className="grid gap-3 rounded-card border border-border bg-background p-4"
                  onSubmit={onSubmitSlot}
                >
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <label className="grid gap-1 text-sm">
                      <span className="text-text-secondary">Jour</span>
                      <select
                        value={slotWeekday}
                        onChange={(event) => setSlotWeekday(event.target.value)}
                        className="rounded-card border border-border bg-surface px-3 py-2 text-sm"
                      >
                        {WEEKDAY_OPTIONS.map((weekday) => (
                          <option key={weekday.value} value={weekday.value}>
                            {weekday.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-1 text-sm">
                      <span className="text-text-secondary">Debut</span>
                      <input
                        type="time"
                        value={slotStart}
                        onChange={(event) => setSlotStart(event.target.value)}
                        className="rounded-card border border-border bg-surface px-3 py-2 text-sm"
                      />
                    </label>

                    <label className="grid gap-1 text-sm">
                      <span className="text-text-secondary">Fin</span>
                      <input
                        type="time"
                        value={slotEnd}
                        onChange={(event) => setSlotEnd(event.target.value)}
                        className="rounded-card border border-border bg-surface px-3 py-2 text-sm"
                      />
                    </label>

                    <label className="grid gap-1 text-sm">
                      <span className="text-text-secondary">Matiere</span>
                      <select
                        value={slotSubjectId}
                        onChange={(event) =>
                          setSlotSubjectId(event.target.value)
                        }
                        className="rounded-card border border-border bg-surface px-3 py-2 text-sm"
                      >
                        {context.allowedSubjects.length === 0 ? (
                          <option value="">Aucune matiere disponible</option>
                        ) : null}
                        {context.allowedSubjects.map((subject) => (
                          <option key={subject.id} value={subject.id}>
                            {subject.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-1 text-sm">
                      <span className="text-text-secondary">Enseignant</span>
                      <select
                        value={slotTeacherUserId}
                        onChange={(event) =>
                          setSlotTeacherUserId(event.target.value)
                        }
                        className="rounded-card border border-border bg-surface px-3 py-2 text-sm"
                      >
                        {teacherChoices.length === 0 ? (
                          <option value="">
                            Aucun enseignant affecte a cette matiere
                          </option>
                        ) : null}
                        {teacherChoices.map((teacher) => (
                          <option key={teacher.id} value={teacher.id}>
                            {teacher.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-1 text-sm">
                      <span className="text-text-secondary">
                        Salle (optionnel)
                      </span>
                      <input
                        type="text"
                        value={slotRoom}
                        onChange={(event) => setSlotRoom(event.target.value)}
                        placeholder="ex: B14"
                        className="rounded-card border border-border bg-surface px-3 py-2 text-sm"
                      />
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="submit"
                      disabled={
                        savingSlot || context.allowedSubjects.length === 0
                      }
                      iconLeft={
                        editingSlotId ? (
                          <Pencil size={14} />
                        ) : (
                          <Plus size={14} />
                        )
                      }
                    >
                      {savingSlot
                        ? editingSlotId
                          ? "Mise a jour..."
                          : "Enregistrement..."
                        : editingSlotId
                          ? "Mettre a jour"
                          : "Ajouter le creneau"}
                    </Button>
                    {editingSlotId ? (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={resetSlotForm}
                        disabled={savingSlot}
                      >
                        Annuler la modification
                      </Button>
                    ) : null}
                  </div>
                </form>

                <div className="grid gap-3">
                  {WEEKDAY_OPTIONS.map((weekday) => {
                    const weekdaySlots =
                      slotsByWeekday.get(weekday.value) ?? [];
                    return (
                      <section
                        key={weekday.value}
                        className="rounded-card border border-border bg-background p-3"
                      >
                        <h3 className="mb-2 text-sm font-semibold text-text-primary">
                          {weekday.label}
                        </h3>
                        {weekdaySlots.length === 0 ? (
                          <p className="text-sm text-text-secondary">
                            Aucun creneau.
                          </p>
                        ) : (
                          <div className="grid gap-2">
                            {weekdaySlots.map((slot) => (
                              <article
                                key={slot.id}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-border bg-surface px-3 py-2"
                              >
                                <div className="grid gap-0.5">
                                  <p className="text-sm font-semibold text-text-primary">
                                    {minutesToTimeValue(slot.startMinute)} -{" "}
                                    {minutesToTimeValue(slot.endMinute)} ·{" "}
                                    {slot.subject.name}
                                  </p>
                                  <p className="text-xs text-text-secondary">
                                    {slot.teacherUser.lastName.toUpperCase()}{" "}
                                    {slot.teacherUser.firstName}
                                    {slot.room ? ` · Salle ${slot.room}` : ""}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => onEditSlot(slot)}
                                    className="px-2 py-1 text-xs"
                                    iconLeft={<Pencil size={14} />}
                                  >
                                    Modifier
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setSlotToDelete(slot)}
                                    className="px-2 py-1 text-xs text-notification hover:bg-[#FEECEC]"
                                    iconLeft={<Trash2 size={14} />}
                                  >
                                    Supprimer
                                  </Button>
                                </div>
                              </article>
                            ))}
                          </div>
                        )}
                      </section>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                {canManageCalendar ? (
                  <form
                    className="grid gap-3 rounded-card border border-border bg-background p-4"
                    onSubmit={onSubmitVacation}
                  >
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <label className="grid gap-1 text-sm md:col-span-2 xl:col-span-2">
                        <span className="text-text-secondary">Libelle</span>
                        <input
                          type="text"
                          value={vacationLabel}
                          onChange={(event) =>
                            setVacationLabel(event.target.value)
                          }
                          className="rounded-card border border-border bg-surface px-3 py-2 text-sm"
                        />
                      </label>

                      <label className="grid gap-1 text-sm">
                        <span className="text-text-secondary">Portee</span>
                        <select
                          value={vacationScope}
                          onChange={(event) =>
                            setVacationScope(
                              event.target.value as
                                | "SCHOOL"
                                | "ACADEMIC_LEVEL"
                                | "CLASS",
                            )
                          }
                          className="rounded-card border border-border bg-surface px-3 py-2 text-sm"
                        >
                          <option value="CLASS">Classe</option>
                          {context.class.academicLevelId ? (
                            <option value="ACADEMIC_LEVEL">Niveau</option>
                          ) : null}
                          <option value="SCHOOL">Ecole</option>
                        </select>
                      </label>

                      <div className="hidden xl:block" />

                      <label className="grid gap-1 text-sm">
                        <span className="text-text-secondary">Debut</span>
                        <input
                          type="date"
                          value={vacationStartDate}
                          onChange={(event) =>
                            setVacationStartDate(event.target.value)
                          }
                          className="rounded-card border border-border bg-surface px-3 py-2 text-sm"
                        />
                      </label>

                      <label className="grid gap-1 text-sm">
                        <span className="text-text-secondary">Fin</span>
                        <input
                          type="date"
                          value={vacationEndDate}
                          onChange={(event) =>
                            setVacationEndDate(event.target.value)
                          }
                          className="rounded-card border border-border bg-surface px-3 py-2 text-sm"
                        />
                      </label>
                    </div>

                    <div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="submit"
                          disabled={savingVacation}
                          iconLeft={
                            editingVacationId ? (
                              <Pencil size={14} />
                            ) : (
                              <CalendarDays size={14} />
                            )
                          }
                        >
                          {savingVacation
                            ? "Enregistrement..."
                            : editingVacationId
                              ? "Mettre a jour la periode"
                              : "Ajouter la periode"}
                        </Button>
                        {editingVacationId ? (
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                              setEditingVacationId(null);
                              setVacationLabel("Vacances scolaires");
                              setVacationScope("CLASS");
                              setVacationStartDate("");
                              setVacationEndDate("");
                            }}
                            disabled={savingVacation}
                          >
                            Annuler la modification
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </form>
                ) : (
                  <p className="rounded-card border border-border bg-background px-3 py-2 text-sm text-text-secondary">
                    Seuls le responsable pedagogique et les admins peuvent
                    modifier les vacances.
                  </p>
                )}

                <div className="grid gap-2">
                  {sortedVacations.length === 0 ? (
                    <div className="rounded-card border border-dashed border-border bg-background p-4 text-sm text-text-secondary">
                      Aucune periode de vacances enregistree.
                    </div>
                  ) : (
                    sortedVacations.map((event) => (
                      <article
                        key={event.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-border bg-background p-3"
                      >
                        <div className="grid gap-0.5">
                          <p className="text-sm font-semibold text-text-primary">
                            {event.label}
                          </p>
                          <p className="text-xs text-text-secondary">
                            {formatDateRange(event.startDate, event.endDate)} ·{" "}
                            {scopeLabel(event.scope)}
                          </p>
                        </div>
                        {canManageCalendar ? (
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => onEditVacation(event)}
                              className="px-2 py-1 text-xs"
                              iconLeft={<Pencil size={14} />}
                            >
                              Modifier
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => setEventToDelete(event)}
                              className="px-2 py-1 text-xs text-notification hover:bg-[#FEECEC]"
                              iconLeft={<Trash2 size={14} />}
                            >
                              Supprimer
                            </Button>
                          </div>
                        ) : null}
                      </article>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={slotToDelete !== null}
        title="Supprimer ce creneau ?"
        message={
          slotToDelete
            ? `${minutesToTimeValue(slotToDelete.startMinute)} - ${minutesToTimeValue(slotToDelete.endMinute)} · ${slotToDelete.subject.name}`
            : ""
        }
        loading={deletingSlotId !== null}
        onCancel={() => {
          if (deletingSlotId) {
            return;
          }
          setSlotToDelete(null);
        }}
        onConfirm={() => {
          void onDeleteSlot();
        }}
      />

      <ConfirmDialog
        open={eventToDelete !== null}
        title="Supprimer cette periode ?"
        message={
          eventToDelete
            ? `${eventToDelete.label} · ${formatDateRange(eventToDelete.startDate, eventToDelete.endDate)}`
            : ""
        }
        loading={deletingEventId !== null}
        onCancel={() => {
          if (deletingEventId) {
            return;
          }
          setEventToDelete(null);
        }}
        onConfirm={() => {
          void onDeleteVacation();
        }}
      />
    </div>
  );
}
