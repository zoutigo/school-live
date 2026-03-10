"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Card } from "../../../../../../../components/ui/card";
import { Button } from "../../../../../../../components/ui/button";
import { ConfirmDialog } from "../../../../../../../components/ui/confirm-dialog";
import { DateInput } from "../../../../../../../components/ui/date-input";
import { ModuleHelpTab } from "../../../../../../../components/ui/module-help-tab";
import { TimeInput } from "../../../../../../../components/ui/time-input";
import {
  TimetableViews,
  type TimetableDisplaySlot,
} from "../../../../../../../components/timetable/timetable-views";
import { getCsrfTokenCookie } from "../../../../../../../lib/auth-cookies";
import { API_URL, type MeResponse } from "../_shared";

type TabKey = "slots" | "colors" | "vacations" | "help";
type ViewMode = "day" | "week" | "month";
type AllowedRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "SCHOOL_ADMIN"
  | "SCHOOL_MANAGER"
  | "SUPERVISOR"
  | "TEACHER";
type OccurrenceModalAction =
  | "DELETE_OCCURRENCE"
  | "UPDATE_OCCURRENCE"
  | "UPDATE_SERIES"
  | "DELETE_SERIES";
type OccurrenceModalStep = "action" | "details";

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
      gender?: string | null;
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
  activeFromDate?: string | null;
  activeToDate?: string | null;
  room: string | null;
  subject: { id: string; name: string };
  teacherUser: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    gender?: string | null;
  };
};

type TimetableOccurrenceRow = {
  id: string;
  source: "RECURRING" | "EXCEPTION_OVERRIDE" | "ONE_OFF";
  status: "PLANNED" | "CANCELLED";
  occurrenceDate: string;
  weekday: number;
  startMinute: number;
  endMinute: number;
  room: string | null;
  reason: string | null;
  slotId?: string;
  oneOffSlotId?: string;
  exceptionId?: string;
  subject: { id: string; name: string };
  teacherUser: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    gender?: string | null;
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
  oneOffSlots?: Array<Record<string, unknown>>;
  slotExceptions?: Array<Record<string, unknown>>;
  occurrences?: TimetableOccurrenceRow[];
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

function formatDateLabel(iso: string | null | undefined) {
  if (!iso) {
    return null;
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
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

function stripTime(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, amount: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
}

function toWeekdayMondayFirst(date: Date) {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

function startOfWeek(date: Date) {
  const normalized = stripTime(date);
  return addDays(normalized, 1 - toWeekdayMondayFirst(normalized));
}

function toIsoDateString(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  if (!/^[0-9A-Fa-f]{6}$/.test(normalized)) {
    return null;
  }
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function rgbToHex(rgb: { r: number; g: number; b: number }) {
  const channel = (value: number) =>
    Math.max(0, Math.min(255, Math.round(value)))
      .toString(16)
      .padStart(2, "0");
  return `#${channel(rgb.r)}${channel(rgb.g)}${channel(rgb.b)}`.toUpperCase();
}

function mixHex(base: string, target: string, ratio: number) {
  const a = hexToRgb(base);
  const b = hexToRgb(target);
  if (!a || !b) {
    return base;
  }
  return rgbToHex({
    r: a.r * (1 - ratio) + b.r * ratio,
    g: a.g * (1 - ratio) + b.g * ratio,
    b: a.b * (1 - ratio) + b.b * ratio,
  });
}

function subjectVisualTone(subjectColorHex: string | undefined) {
  const base =
    subjectColorHex && /^#[0-9A-Fa-f]{6}$/.test(subjectColorHex)
      ? subjectColorHex.toUpperCase()
      : "#2563EB";
  return {
    chip: base,
    background: mixHex(base, "#FFFFFF", 0.9),
    border: mixHex(base, "#FFFFFF", 0.68),
    text: mixHex(base, "#0F172A", 0.3),
  };
}

function teacherPrefixFromGender(gender: string | null | undefined) {
  if (!gender) {
    return "Mr";
  }
  const normalized = gender.trim().toUpperCase();
  if (
    normalized === "FEMALE" ||
    normalized === "FEMININ" ||
    normalized === "FEMININE" ||
    normalized === "F"
  ) {
    return "Mme";
  }
  return "Mr";
}

function occurrenceActionLabel(action: OccurrenceModalAction) {
  switch (action) {
    case "DELETE_OCCURRENCE":
      return "Supprimer cette occurrence";
    case "UPDATE_OCCURRENCE":
      return "Modifier cette occurrence";
    case "UPDATE_SERIES":
      return "Modifier toute la serie";
    case "DELETE_SERIES":
      return "Supprimer toute la serie";
    default:
      return "Gerer l'occurrence";
  }
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
  const [slotActiveFromDate, setSlotActiveFromDate] = useState("");
  const [slotActiveToDate, setSlotActiveToDate] = useState("");
  const [slotEffectiveFromDate, setSlotEffectiveFromDate] = useState("");
  const [slotDrafts, setSlotDrafts] = useState<
    Array<{
      weekday: number;
      startMinute: number;
      endMinute: number;
      subjectId: string;
      teacherUserId: string;
      room: string;
      activeFromDate: string;
      activeToDate: string;
    }>
  >([]);
  const [occurrences, setOccurrences] = useState<TimetableOccurrenceRow[]>([]);
  const [savingOccurrenceAction, setSavingOccurrenceAction] = useState(false);
  const [occurrenceActionType, setOccurrenceActionType] =
    useState<OccurrenceModalAction>("DELETE_OCCURRENCE");
  const [occurrenceDateInput, setOccurrenceDateInput] = useState("");
  const [occurrenceSeriesEndDate, setOccurrenceSeriesEndDate] = useState("");
  const [occurrenceSubjectId, setOccurrenceSubjectId] = useState("");
  const [occurrenceTeacherUserId, setOccurrenceTeacherUserId] = useState("");
  const [occurrenceStart, setOccurrenceStart] = useState("08:45");
  const [occurrenceEnd, setOccurrenceEnd] = useState("09:40");
  const [occurrenceRoom, setOccurrenceRoom] = useState("");
  const [occurrenceModalSlot, setOccurrenceModalSlot] =
    useState<TimetableOccurrenceRow | null>(null);
  const [occurrenceModalStep, setOccurrenceModalStep] =
    useState<OccurrenceModalStep>("action");

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
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [cursorDate, setCursorDate] = useState(stripTime(new Date()));
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const [showSlotCreateForm, setShowSlotCreateForm] = useState(false);

  const canManageCalendar =
    meRole !== null && CAN_MANAGE_CALENDAR_ROLES.includes(meRole);

  useEffect(() => {
    void bootstrap();
  }, [schoolSlug, classId]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return;
    }

    const media = window.matchMedia("(max-width: 1023px)");
    const onChange = () => setIsCompactViewport(media.matches);
    onChange();

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    }

    media.addListener(onChange);
    return () => media.removeListener(onChange);
  }, []);

  useEffect(() => {
    if (!context) {
      return;
    }
    void refreshTimetable();
  }, [cursorDate, viewMode, selectedSchoolYearId, context]);

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

  const occurrenceTeacherChoices = useMemo(() => {
    if (!context || !occurrenceSubjectId) {
      return [] as Array<{ id: string; label: string }>;
    }

    const rows = context.assignments.filter(
      (entry) => entry.subjectId === occurrenceSubjectId,
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
  }, [context, occurrenceSubjectId]);

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

  useEffect(() => {
    if (!context?.allowedSubjects.length) {
      setOccurrenceSubjectId("");
      return;
    }
    const exists = context.allowedSubjects.some(
      (subject) => subject.id === occurrenceSubjectId,
    );
    if (!exists) {
      setOccurrenceSubjectId(context.allowedSubjects[0].id);
    }
  }, [context, occurrenceSubjectId]);

  useEffect(() => {
    if (occurrenceTeacherChoices.length === 0) {
      setOccurrenceTeacherUserId("");
      return;
    }
    const exists = occurrenceTeacherChoices.some(
      (entry) => entry.id === occurrenceTeacherUserId,
    );
    if (!exists) {
      setOccurrenceTeacherUserId(occurrenceTeacherChoices[0].id);
    }
  }, [occurrenceTeacherChoices, occurrenceTeacherUserId]);

  useEffect(() => {
    setOccurrenceDateInput(toIsoDateString(cursorDate));
  }, [cursorDate]);

  function openOccurrenceModal(slot: TimetableOccurrenceRow) {
    setOccurrenceModalSlot(slot);
    setOccurrenceDateInput(slot.occurrenceDate);
    setOccurrenceSeriesEndDate(
      slot.slotId
        ? (slots.find((entry) => entry.id === slot.slotId)?.activeToDate ?? "")
        : "",
    );
    setOccurrenceStart(minutesToTimeValue(slot.startMinute));
    setOccurrenceEnd(minutesToTimeValue(slot.endMinute));
    setOccurrenceSubjectId(slot.subject.id);
    setOccurrenceTeacherUserId(slot.teacherUser.id);
    setOccurrenceRoom(slot.room ?? "");
    if (slot.slotId) {
      setOccurrenceActionType(
        slot.status === "CANCELLED" ? "UPDATE_OCCURRENCE" : "DELETE_OCCURRENCE",
      );
    } else {
      setOccurrenceActionType("UPDATE_OCCURRENCE");
    }
    setOccurrenceModalStep("action");
    setError(null);
    setSuccess(null);
  }

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

  const activeRange = useMemo(() => {
    if (viewMode === "day") {
      return { from: stripTime(cursorDate), to: stripTime(cursorDate) };
    }
    if (viewMode === "week") {
      const from = startOfWeek(cursorDate);
      return { from, to: addDays(from, 6) };
    }
    const from = new Date(cursorDate.getFullYear(), cursorDate.getMonth(), 1);
    const to = new Date(cursorDate.getFullYear(), cursorDate.getMonth() + 1, 0);
    return { from, to };
  }, [cursorDate, viewMode]);

  const timetableViewSlots = useMemo<TimetableDisplaySlot[]>(
    () =>
      occurrences.map((entry) => ({
        id: entry.id,
        occurrenceDate: entry.occurrenceDate,
        weekday: entry.weekday,
        startMinute: entry.startMinute,
        endMinute: entry.endMinute,
        subjectId: entry.subject.id,
        subjectName: entry.subject.name,
        teacherName: `${entry.teacherUser.lastName.toUpperCase()} ${entry.teacherUser.firstName}`,
        teacherGender: entry.teacherUser.gender,
        room: entry.room,
        status: entry.status,
        source: entry.source,
      })),
    [occurrences],
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
    const contextParams = new URLSearchParams();
    if (requestedSchoolYearId) {
      contextParams.set("schoolYearId", requestedSchoolYearId);
    }
    const contextQuery = contextParams.toString()
      ? `?${contextParams.toString()}`
      : "";

    const timetableParams = new URLSearchParams(contextParams);
    timetableParams.set("fromDate", toIsoDateString(activeRange.from));
    timetableParams.set("toDate", toIsoDateString(activeRange.to));
    const timetableQuery = `?${timetableParams.toString()}`;
    const [contextResponse, timetableResponse] = await Promise.all([
      fetch(
        `${API_URL}/schools/${schoolSlug}/timetable/classes/${classId}/context${contextQuery}`,
        {
          credentials: "include",
        },
      ),
      fetch(
        `${API_URL}/schools/${schoolSlug}/timetable/classes/${classId}${timetableQuery}`,
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
    setOccurrences(timetablePayload.occurrences ?? []);
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
    const params = new URLSearchParams();
    if (selectedSchoolYearId) {
      params.set("schoolYearId", selectedSchoolYearId);
    }
    params.set("fromDate", toIsoDateString(activeRange.from));
    params.set("toDate", toIsoDateString(activeRange.to));
    const schoolYearQuery = `?${params.toString()}`;
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
    setOccurrences(data.occurrences ?? []);
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
    setSlotActiveFromDate("");
    setSlotActiveToDate("");
    setSlotEffectiveFromDate("");
    setSlotDrafts([]);
  }

  async function switchSchoolYear(nextSchoolYearId: string | null) {
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
  }

  const selectedSchoolYearIndex = useMemo(() => {
    if (!context?.schoolYears.length || !selectedSchoolYearId) {
      return 0;
    }
    const index = context.schoolYears.findIndex(
      (schoolYear) => schoolYear.id === selectedSchoolYearId,
    );
    return index >= 0 ? index : 0;
  }, [context?.schoolYears, selectedSchoolYearId]);

  const selectedSchoolYearLabel = useMemo(() => {
    if (!context?.schoolYears.length) {
      return "";
    }
    const selectedYear = context.schoolYears[selectedSchoolYearIndex];
    if (!selectedYear) {
      return "";
    }
    return `${selectedYear.label}${selectedYear.isActive ? " (en cours)" : ""}`;
  }, [context?.schoolYears, selectedSchoolYearIndex]);

  const canGoToPreviousSchoolYear =
    !!context?.schoolYears.length && selectedSchoolYearIndex > 0;
  const canGoToNextSchoolYear =
    !!context?.schoolYears.length &&
    selectedSchoolYearIndex < context.schoolYears.length - 1;

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
      if (editingSlotId) {
        const response = await fetch(
          `${API_URL}/schools/${schoolSlug}/timetable/slots/${editingSlotId}`,
          {
            method: "PATCH",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              "X-CSRF-Token": csrfToken,
            },
            body: JSON.stringify({
              weekday,
              startMinute,
              endMinute,
              subjectId: slotSubjectId,
              teacherUserId: slotTeacherUserId,
              room: slotRoom.trim() || undefined,
              activeFromDate: slotActiveFromDate || undefined,
              activeToDate: slotActiveToDate || undefined,
              effectiveFromDate: slotEffectiveFromDate || undefined,
            }),
          },
        );

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          setError(
            parseApiError(payload, "Mise a jour du creneau impossible."),
          );
          return;
        }
        await refreshTimetable();
        setSuccess("Creneau mis a jour.");
        resetSlotForm();
        return;
      }

      const drafts = [
        ...slotDrafts,
        {
          weekday,
          startMinute,
          endMinute,
          subjectId: slotSubjectId,
          teacherUserId: slotTeacherUserId,
          room: slotRoom.trim(),
          activeFromDate: slotActiveFromDate,
          activeToDate: slotActiveToDate,
        },
      ];

      for (const draft of drafts) {
        const response = await fetch(
          `${API_URL}/schools/${schoolSlug}/timetable/classes/${classId}/slots`,
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              "X-CSRF-Token": csrfToken,
            },
            body: JSON.stringify({
              schoolYearId: selectedSchoolYearId ?? undefined,
              weekday: draft.weekday,
              startMinute: draft.startMinute,
              endMinute: draft.endMinute,
              subjectId: draft.subjectId,
              teacherUserId: draft.teacherUserId,
              room: draft.room || undefined,
              activeFromDate: draft.activeFromDate || undefined,
              activeToDate: draft.activeToDate || undefined,
            }),
          },
        );
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          setError(parseApiError(payload, "Creation du creneau impossible."));
          return;
        }
      }

      await refreshTimetable();
      setSuccess(
        drafts.length > 1
          ? `${drafts.length} creneaux ajoutes.`
          : "Creneau ajoute.",
      );
      setSlotRoom("");
      setSlotDrafts([]);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setSavingSlot(false);
    }
  }

  function addCurrentSlotToDrafts() {
    if (!slotSubjectId || !slotTeacherUserId) {
      setError("Selectionnez une matiere et un enseignant.");
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

    setError(null);
    setSlotDrafts((current) => [
      ...current,
      {
        weekday,
        startMinute,
        endMinute,
        subjectId: slotSubjectId,
        teacherUserId: slotTeacherUserId,
        room: slotRoom.trim(),
        activeFromDate: slotActiveFromDate,
        activeToDate: slotActiveToDate,
      },
    ]);
    setSlotStart(minutesToTimeValue(endMinute));
    setSlotEnd(minutesToTimeValue(Math.min(endMinute + 55, 23 * 60 + 59)));
    setSlotRoom("");
  }

  async function onSubmitOccurrenceAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!occurrenceModalSlot) {
      setError("Aucun creneau selectionne.");
      return;
    }

    if (occurrenceActionType !== "DELETE_SERIES" && !occurrenceDateInput) {
      setError("Selectionnez la date d'occurrence.");
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError("Session CSRF invalide. Reconnectez-vous.");
      router.replace(`/schools/${schoolSlug}/login`);
      return;
    }

    setSavingOccurrenceAction(true);
    setError(null);
    setSuccess(null);

    try {
      if (occurrenceActionType === "DELETE_OCCURRENCE") {
        if (occurrenceModalSlot.oneOffSlotId) {
          const response = await fetch(
            `${API_URL}/schools/${schoolSlug}/timetable/one-off-slots/${occurrenceModalSlot.oneOffSlotId}`,
            {
              method: "DELETE",
              credentials: "include",
              headers: { "X-CSRF-Token": csrfToken },
            },
          );
          if (!response.ok) {
            const payload = await response.json().catch(() => null);
            setError(
              parseApiError(payload, "Suppression de l'occurrence impossible."),
            );
            return;
          }
        } else if (occurrenceModalSlot.slotId) {
          const response = await fetch(
            `${API_URL}/schools/${schoolSlug}/timetable/slots/${occurrenceModalSlot.slotId}/exceptions`,
            {
              method: "POST",
              credentials: "include",
              headers: {
                "Content-Type": "application/json",
                "X-CSRF-Token": csrfToken,
              },
              body: JSON.stringify({
                occurrenceDate: occurrenceDateInput,
                type: "CANCEL",
              }),
            },
          );
          if (!response.ok) {
            const body = await response.json().catch(() => null);
            setError(
              parseApiError(body, "Suppression de l'occurrence impossible."),
            );
            return;
          }
        } else {
          setError("Occurrence sans source modifiable.");
          return;
        }
        setSuccess("Occurrence supprimee.");
      } else if (occurrenceActionType === "UPDATE_OCCURRENCE") {
        const startMinute = timeValueToMinutes(occurrenceStart);
        const endMinute = timeValueToMinutes(occurrenceEnd);
        if (!occurrenceSubjectId || !occurrenceTeacherUserId) {
          setError("Selectionnez la matiere et l'enseignant.");
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
        if (occurrenceModalSlot.oneOffSlotId) {
          const response = await fetch(
            `${API_URL}/schools/${schoolSlug}/timetable/one-off-slots/${occurrenceModalSlot.oneOffSlotId}`,
            {
              method: "PATCH",
              credentials: "include",
              headers: {
                "Content-Type": "application/json",
                "X-CSRF-Token": csrfToken,
              },
              body: JSON.stringify({
                occurrenceDate: occurrenceDateInput,
                startMinute,
                endMinute,
                subjectId: occurrenceSubjectId,
                teacherUserId: occurrenceTeacherUserId,
                room: occurrenceRoom.trim() || undefined,
              }),
            },
          );
          if (!response.ok) {
            const payload = await response.json().catch(() => null);
            setError(
              parseApiError(payload, "Mise a jour de l'occurrence impossible."),
            );
            return;
          }
        } else if (occurrenceModalSlot.slotId) {
          const response = await fetch(
            `${API_URL}/schools/${schoolSlug}/timetable/slots/${occurrenceModalSlot.slotId}/exceptions`,
            {
              method: "POST",
              credentials: "include",
              headers: {
                "Content-Type": "application/json",
                "X-CSRF-Token": csrfToken,
              },
              body: JSON.stringify({
                occurrenceDate: occurrenceDateInput,
                type: "OVERRIDE",
                startMinute,
                endMinute,
                subjectId: occurrenceSubjectId,
                teacherUserId: occurrenceTeacherUserId,
                room: occurrenceRoom.trim() || undefined,
              }),
            },
          );
          if (!response.ok) {
            const body = await response.json().catch(() => null);
            setError(
              parseApiError(body, "Mise a jour de l'occurrence impossible."),
            );
            return;
          }
        } else {
          setError("Occurrence sans source modifiable.");
          return;
        }
        setSuccess("Occurrence modifiee.");
      } else if (occurrenceActionType === "UPDATE_SERIES") {
        if (!occurrenceModalSlot.slotId) {
          setError("Cette occurrence ponctuelle n'a pas de serie a modifier.");
          return;
        }
        const startMinute = timeValueToMinutes(occurrenceStart);
        const endMinute = timeValueToMinutes(occurrenceEnd);
        if (!occurrenceSubjectId || !occurrenceTeacherUserId) {
          setError("Selectionnez la matiere et l'enseignant.");
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
        const response = await fetch(
          `${API_URL}/schools/${schoolSlug}/timetable/slots/${occurrenceModalSlot.slotId}`,
          {
            method: "PATCH",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              "X-CSRF-Token": csrfToken,
            },
            body: JSON.stringify({
              weekday: occurrenceModalSlot.weekday,
              startMinute,
              endMinute,
              subjectId: occurrenceSubjectId,
              teacherUserId: occurrenceTeacherUserId,
              room: occurrenceRoom.trim() || undefined,
              effectiveFromDate: occurrenceDateInput,
              activeToDate: occurrenceSeriesEndDate || undefined,
            }),
          },
        );
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          setError(
            parseApiError(payload, "Mise a jour de la serie impossible."),
          );
          return;
        }
        setSuccess("Serie mise a jour.");
      } else if (occurrenceActionType === "DELETE_SERIES") {
        if (!occurrenceModalSlot.slotId) {
          setError("Cette occurrence ponctuelle n'a pas de serie a supprimer.");
          return;
        }
        const response = await fetch(
          `${API_URL}/schools/${schoolSlug}/timetable/slots/${occurrenceModalSlot.slotId}`,
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
            parseApiError(payload, "Suppression de la serie impossible."),
          );
          return;
        }
        setSuccess("Serie supprimee.");
      }

      await refreshTimetable();
      setOccurrenceModalSlot(null);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setSavingOccurrenceAction(false);
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
            onClick={() => setTab("colors")}
            className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
              tab === "colors"
                ? "border border-border border-b-surface bg-surface text-primary"
                : "text-text-secondary"
            }`}
          >
            Couleurs
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
            moduleSummary="ce module permet de planifier les cours hebdomadaires et les couleurs de matieres par classe."
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
                name: "Definir une couleur matiere",
                purpose: "ameliorer la lisibilite de l'emploi du temps",
                howTo:
                  "ouvrir l'onglet Couleurs, choisir une couleur puis enregistrer.",
                moduleImpact:
                  "harmonise la lecture des cours en vue jour/semaine/mois.",
                crossModuleImpact:
                  "les couleurs sont reutilisees dans les vues eleve, parent et enseignant.",
              },
            ]}
          />
        ) : (
          <div className="grid gap-4">
            {context.schoolYears.length > 0 ? (
              <div className="rounded-card border border-border bg-background p-3">
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-text-secondary">Annee scolaire</span>
                    <div className="inline-flex w-full items-center justify-between gap-2 rounded-card border border-border bg-surface px-2 py-1 sm:w-auto sm:min-w-[320px] sm:max-w-[360px]">
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={!canGoToPreviousSchoolYear || loading}
                        onClick={() => {
                          if (!context?.schoolYears.length) {
                            return;
                          }
                          const nextYear =
                            context.schoolYears[selectedSchoolYearIndex - 1];
                          if (!nextYear) {
                            return;
                          }
                          void switchSchoolYear(nextYear.id);
                        }}
                        className="h-8 w-8 px-0"
                        aria-label="Annee precedente"
                        iconLeft={<ChevronLeft size={16} />}
                      />
                      <p className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-text-primary">
                        {selectedSchoolYearLabel}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={!canGoToNextSchoolYear || loading}
                        onClick={() => {
                          if (!context?.schoolYears.length) {
                            return;
                          }
                          const nextYear =
                            context.schoolYears[selectedSchoolYearIndex + 1];
                          if (!nextYear) {
                            return;
                          }
                          void switchSchoolYear(nextYear.id);
                        }}
                        className="h-8 w-8 px-0"
                        aria-label="Annee suivante"
                        iconLeft={<ChevronRight size={16} />}
                      />
                    </div>
                  </div>
                  {tab === "slots" ? (
                    <button
                      type="button"
                      aria-label="Ajouter"
                      title="Ajouter"
                      className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-lg font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                        showSlotCreateForm
                          ? "bg-accent-teal-dark text-white"
                          : "bg-accent-teal text-white hover:bg-accent-teal-dark"
                      }`}
                      onClick={() => {
                        setShowSlotCreateForm((current) => {
                          if (current) {
                            resetSlotForm();
                          }
                          return !current;
                        });
                      }}
                    >
                      <Plus size={16} />
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}

            {success ? (
              <p className="rounded-card border border-[#B8E3C3] bg-[#F1FAF3] px-3 py-2 text-sm text-[#1F6A34]">
                {success}
              </p>
            ) : null}

            {tab === "colors" ? (
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
                                [subject.id]: event.target.value.toUpperCase(),
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
            ) : null}

            {tab === "slots" ? (
              <>
                <section className="rounded-card border border-border bg-background p-4">
                  {showSlotCreateForm ? (
                    <form
                      className="grid gap-3 rounded-card border border-border bg-background p-4"
                      onSubmit={onSubmitSlot}
                    >
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        <label className="grid gap-1 text-sm">
                          <span className="text-text-secondary">Jour</span>
                          <select
                            value={slotWeekday}
                            onChange={(event) =>
                              setSlotWeekday(event.target.value)
                            }
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
                          <TimeInput
                            value={slotStart}
                            onChange={(event) =>
                              setSlotStart(event.target.value)
                            }
                            className="rounded-card border border-border bg-surface px-3 py-2 text-sm"
                          />
                        </label>

                        <label className="grid gap-1 text-sm">
                          <span className="text-text-secondary">Fin</span>
                          <TimeInput
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
                              <option value="">
                                Aucune matiere disponible
                              </option>
                            ) : null}
                            {context.allowedSubjects.map((subject) => (
                              <option key={subject.id} value={subject.id}>
                                {subject.name}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="grid gap-1 text-sm">
                          <span className="text-text-secondary">
                            Enseignant
                          </span>
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
                            onChange={(event) =>
                              setSlotRoom(event.target.value)
                            }
                            placeholder="ex: B14"
                            className="rounded-card border border-border bg-surface px-3 py-2 text-sm"
                          />
                        </label>

                        <label className="grid gap-1 text-sm">
                          <span className="text-text-secondary">
                            Debut occurrences (optionnel)
                          </span>
                          <DateInput
                            value={slotActiveFromDate}
                            onChange={(event) =>
                              setSlotActiveFromDate(event.target.value)
                            }
                            className="rounded-card border border-border bg-surface px-3 py-2 text-sm"
                          />
                        </label>

                        <label className="grid gap-1 text-sm">
                          <span className="text-text-secondary">
                            Fin occurrences (optionnel)
                          </span>
                          <DateInput
                            value={slotActiveToDate}
                            onChange={(event) =>
                              setSlotActiveToDate(event.target.value)
                            }
                            className="rounded-card border border-border bg-surface px-3 py-2 text-sm"
                          />
                        </label>

                        {editingSlotId ? (
                          <label className="grid gap-1 text-sm">
                            <span className="text-text-secondary">
                              Appliquer a partir du (optionnel)
                            </span>
                            <DateInput
                              value={slotEffectiveFromDate}
                              onChange={(event) =>
                                setSlotEffectiveFromDate(event.target.value)
                              }
                              className="rounded-card border border-border bg-surface px-3 py-2 text-sm"
                            />
                          </label>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {!editingSlotId ? (
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={addCurrentSlotToDrafts}
                            disabled={
                              savingSlot || context.allowedSubjects.length === 0
                            }
                            iconLeft={<Plus size={14} />}
                          >
                            Ajouter a la liste
                          </Button>
                        ) : null}
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
                              : slotDrafts.length > 0
                                ? `Enregistrer ${slotDrafts.length + 1} creneaux`
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
                        ) : slotDrafts.length > 0 ? (
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setSlotDrafts([])}
                            disabled={savingSlot}
                          >
                            Vider la liste ({slotDrafts.length})
                          </Button>
                        ) : null}
                      </div>
                    </form>
                  ) : null}

                  {showSlotCreateForm && slotDrafts.length > 0 ? (
                    <div className="mt-3 rounded-card border border-border bg-surface p-3">
                      <p className="mb-2 text-sm font-semibold text-text-primary">
                        Creneaux en attente ({slotDrafts.length})
                      </p>
                      <div className="grid gap-2">
                        {slotDrafts.map((draft, index) => (
                          <div
                            key={`slot-draft-${index + 1}-${draft.weekday}-${draft.startMinute}`}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-border bg-background px-3 py-2 text-sm"
                          >
                            <span className="text-text-primary">
                              {WEEKDAY_OPTIONS.find(
                                (day) => day.value === draft.weekday,
                              )?.label ?? "Jour"}{" "}
                              · {minutesToTimeValue(draft.startMinute)} -{" "}
                              {minutesToTimeValue(draft.endMinute)}
                            </span>
                            <button
                              type="button"
                              className="text-xs font-semibold text-notification"
                              onClick={() =>
                                setSlotDrafts((current) =>
                                  current.filter(
                                    (_, itemIndex) => itemIndex !== index,
                                  ),
                                )
                              }
                            >
                              Retirer
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <p className="mt-3 rounded-card border border-[#DCE9F8] bg-[#F7FBFF] px-3 py-2 text-sm text-[#36557A]">
                    Cliquez sur un creneau dans les vues jour, semaine ou mois
                    pour definir un ponctuel, annuler ou modifier une
                    occurrence.
                  </p>

                  <TimetableViews
                    slots={timetableViewSlots}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    cursorDate={cursorDate}
                    onCursorDateChange={setCursorDate}
                    isCompactViewport={isCompactViewport}
                    subjectColorsBySubjectId={subjectColorsBySubjectId}
                    onSlotClick={(slot) => {
                      const sourceSlot = occurrences.find(
                        (entry) => entry.id === slot.id,
                      );
                      if (sourceSlot) {
                        openOccurrenceModal(sourceSlot);
                      }
                    }}
                  />
                </section>
              </>
            ) : tab === "vacations" ? (
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
                        <DateInput
                          value={vacationStartDate}
                          onChange={(event) =>
                            setVacationStartDate(event.target.value)
                          }
                          className="rounded-card border border-border bg-surface px-3 py-2 text-sm"
                        />
                      </label>

                      <label className="grid gap-1 text-sm">
                        <span className="text-text-secondary">Fin</span>
                        <DateInput
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
            ) : null}
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

      {occurrenceModalSlot ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B244066] px-4 py-8">
          <div
            className="w-full max-w-2xl rounded-card border border-border bg-background p-4 shadow-xl"
            data-testid="occurrence-modal"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-text-primary">
                  {occurrenceModalStep === "action"
                    ? "Gerer l'occurrence"
                    : occurrenceActionLabel(occurrenceActionType)}
                </h3>
                <p className="text-xs text-text-secondary">
                  {new Intl.DateTimeFormat("fr-FR", {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  }).format(new Date(occurrenceDateInput))}
                  {" · "}
                  {minutesToTimeValue(occurrenceModalSlot.startMinute)} -{" "}
                  {minutesToTimeValue(occurrenceModalSlot.endMinute)}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="px-2 py-1 text-xs"
                onClick={() => {
                  if (!savingOccurrenceAction) {
                    setOccurrenceModalSlot(null);
                    setOccurrenceModalStep("action");
                  }
                }}
              >
                Fermer
              </Button>
            </div>

            {occurrenceModalStep === "action" ? (
              <div className="grid gap-3">
                <div className="grid gap-2">
                  {(
                    [
                      "DELETE_OCCURRENCE",
                      "UPDATE_OCCURRENCE",
                      ...(occurrenceModalSlot.slotId
                        ? ["UPDATE_SERIES", "DELETE_SERIES"]
                        : []),
                    ] as OccurrenceModalAction[]
                  ).map((action) => (
                    <button
                      key={`occ-action-${action}`}
                      type="button"
                      onClick={() => setOccurrenceActionType(action)}
                      className={`rounded-card border px-3 py-2 text-left text-sm transition ${
                        occurrenceActionType === action
                          ? "border-primary bg-[#EAF3FF] text-primary"
                          : "border-border bg-surface text-text-primary hover:bg-background"
                      }`}
                    >
                      {occurrenceActionLabel(action)}
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setOccurrenceModalSlot(null);
                      setOccurrenceModalStep("action");
                    }}
                    disabled={savingOccurrenceAction}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setOccurrenceModalStep("details")}
                  >
                    Continuer
                  </Button>
                </div>
              </div>
            ) : (
              <form className="grid gap-3" onSubmit={onSubmitOccurrenceAction}>
                {occurrenceActionType === "DELETE_OCCURRENCE" ||
                occurrenceActionType === "DELETE_SERIES" ? (
                  (() => {
                    const tone = subjectVisualTone(
                      subjectColorsBySubjectId[occurrenceModalSlot.subject.id],
                    );
                    const sourceSeriesSlot = occurrenceModalSlot.slotId
                      ? (slots.find(
                          (entry) => entry.id === occurrenceModalSlot.slotId,
                        ) ?? null)
                      : null;
                    const seriesStartLabel = formatDateLabel(
                      sourceSeriesSlot?.activeFromDate,
                    );
                    const seriesEndLabel = formatDateLabel(
                      sourceSeriesSlot?.activeToDate,
                    );
                    return (
                      <div className="grid gap-3">
                        <p className="text-sm text-text-secondary">
                          {occurrenceActionType === "DELETE_SERIES"
                            ? "Voulez-vous vraiment supprimer toute la serie ?"
                            : "Voulez-vous vraiment supprimer cette occurrence ?"}
                        </p>
                        <article
                          className="rounded-card border px-3 py-2"
                          style={{
                            backgroundColor:
                              occurrenceModalSlot.status === "CANCELLED"
                                ? "#FFF5F5"
                                : tone.background,
                            borderColor:
                              occurrenceModalSlot.status === "CANCELLED"
                                ? "#FBCACA"
                                : tone.border,
                            borderLeftWidth:
                              occurrenceModalSlot.source === "ONE_OFF"
                                ? "7px"
                                : "1px",
                            borderLeftColor:
                              occurrenceModalSlot.source === "ONE_OFF"
                                ? "#D97706"
                                : occurrenceModalSlot.status === "CANCELLED"
                                  ? "#FBCACA"
                                  : tone.border,
                          }}
                        >
                          <p
                            className="text-sm font-semibold"
                            style={{
                              color:
                                occurrenceModalSlot.status === "CANCELLED"
                                  ? "#B42318"
                                  : tone.text,
                              textDecoration:
                                occurrenceModalSlot.status === "CANCELLED"
                                  ? "line-through"
                                  : undefined,
                            }}
                          >
                            {minutesToTimeValue(
                              occurrenceModalSlot.startMinute,
                            )}{" "}
                            -{" "}
                            {minutesToTimeValue(occurrenceModalSlot.endMinute)}{" "}
                            · {occurrenceModalSlot.subject.name}
                          </p>
                          <p className="text-xs text-text-secondary">
                            {teacherPrefixFromGender(
                              occurrenceModalSlot.teacherUser.gender,
                            )}{" "}
                            {occurrenceModalSlot.teacherUser.lastName.toUpperCase()}{" "}
                            {occurrenceModalSlot.teacherUser.firstName}
                            {occurrenceModalSlot.status === "CANCELLED"
                              ? " · Annule"
                              : ""}
                          </p>
                          {occurrenceModalSlot.room ? (
                            <p className="text-xs font-semibold uppercase tracking-wide text-[#36557A]">
                              Salle {occurrenceModalSlot.room}
                            </p>
                          ) : null}
                          {occurrenceActionType === "DELETE_SERIES" ? (
                            <div className="mt-1 grid gap-1 text-xs text-text-secondary">
                              <p>
                                Debut de serie :{" "}
                                <span className="font-medium text-text-primary">
                                  {seriesStartLabel ?? "-"}
                                </span>
                              </p>
                              <p>
                                Fin de serie :{" "}
                                <span className="font-medium text-text-primary">
                                  {seriesEndLabel ?? "Fin annee scolaire"}
                                </span>
                              </p>
                            </div>
                          ) : null}
                        </article>
                      </div>
                    );
                  })()
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="grid gap-1 text-sm">
                      <span className="text-text-secondary">
                        {occurrenceActionType === "UPDATE_SERIES"
                          ? "Date de debut d'effet"
                          : "Date"}
                      </span>
                      <DateInput
                        value={occurrenceDateInput}
                        onChange={(event) =>
                          setOccurrenceDateInput(event.target.value)
                        }
                        className="rounded-card border border-border bg-surface px-3 py-2 text-sm"
                      />
                    </label>
                    {occurrenceActionType === "UPDATE_SERIES" ? (
                      <label className="grid gap-1 text-sm">
                        <span className="text-text-secondary">
                          Date de fin de serie (optionnel)
                        </span>
                        <DateInput
                          value={occurrenceSeriesEndDate}
                          onChange={(event) =>
                            setOccurrenceSeriesEndDate(event.target.value)
                          }
                          className="rounded-card border border-border bg-surface px-3 py-2 text-sm"
                        />
                      </label>
                    ) : null}
                  </div>
                )}

                {occurrenceActionType === "DELETE_SERIES" ? (
                  <p className="rounded-card border border-[#F7D5A0] bg-[#FFFAEB] px-3 py-2 text-sm text-[#92400E]">
                    Cette action supprimera le creneau recurrent et toutes ses
                    occurrences futures.
                  </p>
                ) : null}

                {occurrenceActionType !== "DELETE_OCCURRENCE" &&
                occurrenceActionType !== "DELETE_SERIES" ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="grid gap-1 text-sm">
                      <span className="text-text-secondary">Debut</span>
                      <TimeInput
                        value={occurrenceStart}
                        onChange={(event) =>
                          setOccurrenceStart(event.target.value)
                        }
                        className="rounded-card border border-border bg-surface px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="grid gap-1 text-sm">
                      <span className="text-text-secondary">Fin</span>
                      <TimeInput
                        value={occurrenceEnd}
                        onChange={(event) =>
                          setOccurrenceEnd(event.target.value)
                        }
                        className="rounded-card border border-border bg-surface px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="grid gap-1 text-sm">
                      <span className="text-text-secondary">Matiere</span>
                      <select
                        value={occurrenceSubjectId}
                        onChange={(event) =>
                          setOccurrenceSubjectId(event.target.value)
                        }
                        className="rounded-card border border-border bg-surface px-3 py-2 text-sm"
                      >
                        {(context?.allowedSubjects ?? []).map((subject) => (
                          <option
                            key={`occ-subject-${subject.id}`}
                            value={subject.id}
                          >
                            {subject.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-1 text-sm">
                      <span className="text-text-secondary">Enseignant</span>
                      <select
                        value={occurrenceTeacherUserId}
                        onChange={(event) =>
                          setOccurrenceTeacherUserId(event.target.value)
                        }
                        className="rounded-card border border-border bg-surface px-3 py-2 text-sm"
                      >
                        {occurrenceTeacherChoices.map((teacher) => (
                          <option
                            key={`occ-teacher-${teacher.id}`}
                            value={teacher.id}
                          >
                            {teacher.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-1 text-sm md:col-span-2">
                      <span className="text-text-secondary">
                        Salle (optionnel)
                      </span>
                      <input
                        type="text"
                        value={occurrenceRoom}
                        onChange={(event) =>
                          setOccurrenceRoom(event.target.value)
                        }
                        className="rounded-card border border-border bg-surface px-3 py-2 text-sm"
                      />
                    </label>
                  </div>
                ) : null}

                <div className="flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setOccurrenceModalStep("action")}
                    disabled={savingOccurrenceAction}
                    iconLeft={<ChevronLeft size={16} />}
                  >
                    Retour
                  </Button>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setOccurrenceModalSlot(null);
                        setOccurrenceModalStep("action");
                      }}
                      disabled={savingOccurrenceAction}
                    >
                      Annuler
                    </Button>
                    <Button type="submit" disabled={savingOccurrenceAction}>
                      {savingOccurrenceAction
                        ? "Enregistrement..."
                        : "Appliquer l'action"}
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
