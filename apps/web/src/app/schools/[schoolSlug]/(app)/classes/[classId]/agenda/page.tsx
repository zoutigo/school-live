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

function addMonths(date: Date, amount: number) {
  const copy = new Date(date);
  copy.setMonth(copy.getMonth() + amount);
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

function sameDate(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatWeekRangeLabel(currentDate: Date) {
  const start = startOfWeek(currentDate);
  const end = addDays(start, 6);
  const startLabel = new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
  }).format(start);
  const endLabel = new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(end);
  return `${startLabel} - ${endLabel}`;
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
  const [occurrenceActionType, setOccurrenceActionType] = useState<
    "ONE_OFF" | "CANCEL" | "OVERRIDE"
  >("ONE_OFF");
  const [occurrenceDateInput, setOccurrenceDateInput] = useState("");
  const [occurrenceTargetSlotId, setOccurrenceTargetSlotId] = useState("");
  const [occurrenceSubjectId, setOccurrenceSubjectId] = useState("");
  const [occurrenceTeacherUserId, setOccurrenceTeacherUserId] = useState("");
  const [occurrenceStart, setOccurrenceStart] = useState("08:45");
  const [occurrenceEnd, setOccurrenceEnd] = useState("09:40");
  const [occurrenceRoom, setOccurrenceRoom] = useState("");
  const [occurrenceModalSlot, setOccurrenceModalSlot] =
    useState<TimetableOccurrenceRow | null>(null);

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
  const [selectedMonthDate, setSelectedMonthDate] = useState<Date | null>(null);
  const [showSlotCreateForm, setShowSlotCreateForm] = useState(false);

  const canManageCalendar =
    meRole !== null && CAN_MANAGE_CALENDAR_ROLES.includes(meRole);

  useEffect(() => {
    void bootstrap();
  }, [schoolSlug, classId]);

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

  useEffect(() => {
    if (slots.length === 0) {
      setOccurrenceTargetSlotId("");
      return;
    }
    const exists = slots.some((slot) => slot.id === occurrenceTargetSlotId);
    if (!exists) {
      setOccurrenceTargetSlotId(slots[0].id);
    }
  }, [slots, occurrenceTargetSlotId]);

  function openOccurrenceModal(slot: TimetableOccurrenceRow) {
    setOccurrenceModalSlot(slot);
    setOccurrenceDateInput(slot.occurrenceDate);
    setOccurrenceStart(minutesToTimeValue(slot.startMinute));
    setOccurrenceEnd(minutesToTimeValue(slot.endMinute));
    setOccurrenceSubjectId(slot.subject.id);
    setOccurrenceTeacherUserId(slot.teacherUser.id);
    setOccurrenceRoom(slot.room ?? "");
    if (slot.slotId) {
      setOccurrenceTargetSlotId(slot.slotId);
      setOccurrenceActionType(
        slot.status === "CANCELLED" ? "OVERRIDE" : "CANCEL",
      );
    } else {
      setOccurrenceActionType("ONE_OFF");
      setOccurrenceTargetSlotId("");
    }
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

  const today = stripTime(new Date());
  const weekStart = useMemo(() => startOfWeek(cursorDate), [cursorDate]);
  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const date = addDays(weekStart, index);
        return {
          weekday: index + 1,
          date,
          label: WEEKDAY_OPTIONS[index]?.label ?? "",
          shortLabel: WEEKDAY_OPTIONS[index]?.label.slice(0, 3) ?? "",
        };
      }),
    [weekStart],
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

  const daySlots = useMemo(
    () =>
      occurrences
        .filter((entry) => entry.occurrenceDate === toIsoDateString(cursorDate))
        .sort((a, b) => a.startMinute - b.startMinute),
    [cursorDate, occurrences],
  );

  const weekOccurrencesByDate = useMemo(() => {
    const map = new Map<string, TimetableOccurrenceRow[]>();
    weekDays.forEach((entry) => {
      const key = toIsoDateString(entry.date);
      const rows = occurrences
        .filter((occurrence) => occurrence.occurrenceDate === key)
        .sort((a, b) => a.startMinute - b.startMinute);
      map.set(key, rows);
    });
    return map;
  }, [occurrences, weekDays]);

  const monthCalendarCells = useMemo(() => {
    const firstDay = new Date(
      cursorDate.getFullYear(),
      cursorDate.getMonth(),
      1,
    );
    const firstWeekday = toWeekdayMondayFirst(firstDay);
    const leadingEmpty = firstWeekday - 1;
    const daysInMonth = new Date(
      cursorDate.getFullYear(),
      cursorDate.getMonth() + 1,
      0,
    ).getDate();
    const cells: Array<{ date: Date | null; slots: TimetableOccurrenceRow[] }> =
      [];

    for (let i = 0; i < leadingEmpty; i += 1) {
      cells.push({ date: null, slots: [] });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(
        cursorDate.getFullYear(),
        cursorDate.getMonth(),
        day,
      );
      const daySlotsForMonth = occurrences
        .filter((slot) => slot.occurrenceDate === toIsoDateString(date))
        .sort((a, b) => a.startMinute - b.startMinute);
      cells.push({ date, slots: daySlotsForMonth });
    }

    while (cells.length % 7 !== 0) {
      cells.push({ date: null, slots: [] });
    }

    return cells;
  }, [cursorDate, occurrences]);

  const selectedMonthSlots = useMemo(() => {
    if (!selectedMonthDate) {
      return [] as TimetableOccurrenceRow[];
    }
    return occurrences
      .filter(
        (slot) => slot.occurrenceDate === toIsoDateString(selectedMonthDate),
      )
      .sort((a, b) => a.startMinute - b.startMinute);
  }, [selectedMonthDate, occurrences]);

  const dayTabLabel = sameDate(cursorDate, today)
    ? "Aujourd'hui"
    : new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "short",
      }).format(cursorDate);
  const weekTabLabel = sameDate(startOfWeek(cursorDate), startOfWeek(today))
    ? "Cette semaine"
    : formatWeekRangeLabel(cursorDate);
  const monthTabLabel =
    cursorDate.getMonth() === today.getMonth() &&
    cursorDate.getFullYear() === today.getFullYear()
      ? "Ce mois"
      : formatMonthLabel(cursorDate);
  function moveCursorForMode(mode: ViewMode, direction: -1 | 1) {
    if (mode === "day") {
      setCursorDate((current) => addDays(current, direction));
      return;
    }
    if (mode === "week") {
      setCursorDate((current) => addDays(current, direction * 7));
      return;
    }
    setCursorDate((current) => addMonths(current, direction));
  }

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

    if (!occurrenceDateInput) {
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
      if (occurrenceActionType === "ONE_OFF") {
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
          `${API_URL}/schools/${schoolSlug}/timetable/classes/${classId}/one-off-slots`,
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              "X-CSRF-Token": csrfToken,
            },
            body: JSON.stringify({
              schoolYearId: selectedSchoolYearId ?? undefined,
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
            parseApiError(payload, "Creation du cours ponctuel impossible."),
          );
          return;
        }
        setSuccess("Cours ponctuel enregistre.");
      } else {
        if (!occurrenceTargetSlotId) {
          setError("Selectionnez un creneau recurrent cible.");
          return;
        }
        const payload: Record<string, unknown> = {
          occurrenceDate: occurrenceDateInput,
          type: occurrenceActionType,
        };
        if (occurrenceActionType === "OVERRIDE") {
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
          payload.startMinute = startMinute;
          payload.endMinute = endMinute;
          payload.subjectId = occurrenceSubjectId;
          payload.teacherUserId = occurrenceTeacherUserId;
          payload.room = occurrenceRoom.trim() || undefined;
        }

        const response = await fetch(
          `${API_URL}/schools/${schoolSlug}/timetable/slots/${occurrenceTargetSlotId}/exceptions`,
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              "X-CSRF-Token": csrfToken,
            },
            body: JSON.stringify(payload),
          },
        );
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          setError(parseApiError(body, "Mise a jour d'occurrence impossible."));
          return;
        }
        setSuccess(
          occurrenceActionType === "CANCEL"
            ? "Occurrence annulee."
            : "Occurrence modifiee.",
        );
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

                  <section className="grid gap-3 rounded-card border border-border bg-background p-3">
                    <div className="grid grid-cols-3 gap-2 rounded-[6px] border border-[#D4E4F6] bg-white p-1">
                      {(
                        [
                          { key: "day", label: dayTabLabel },
                          { key: "week", label: weekTabLabel },
                          { key: "month", label: monthTabLabel },
                        ] as Array<{ key: ViewMode; label: string }>
                      ).map((entry) => (
                        <div
                          key={`agenda-view-${entry.key}`}
                          className={`grid grid-cols-[34px_1fr_34px] items-center gap-1 rounded-[4px] px-1 py-1 text-sm font-semibold transition ${
                            viewMode === entry.key
                              ? "bg-[#0A62BF] text-white shadow-[0_10px_24px_-14px_rgba(10,98,191,0.95)]"
                              : "text-[#2B4A74] hover:bg-[#EEF5FF]"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setViewMode(entry.key);
                              moveCursorForMode(entry.key, -1);
                            }}
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-[4px] ${
                              viewMode === entry.key
                                ? "bg-white/15 text-white hover:bg-white/25"
                                : "bg-[#E8F2FF] text-[#0A62BF] hover:bg-[#D7E9FF]"
                            }`}
                            aria-label={`Periode precedente (${entry.key})`}
                          >
                            <ChevronLeft
                              className="h-5 w-5"
                              strokeWidth={2.6}
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setViewMode(entry.key);
                              setCursorDate(today);
                            }}
                            className="min-w-0 rounded-[4px] px-2 py-1 text-[13px]"
                            title="Revenir a la periode courante"
                          >
                            <span className="block truncate">
                              {entry.label}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setViewMode(entry.key);
                              moveCursorForMode(entry.key, 1);
                            }}
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-[4px] ${
                              viewMode === entry.key
                                ? "bg-white/15 text-white hover:bg-white/25"
                                : "bg-[#E8F2FF] text-[#0A62BF] hover:bg-[#D7E9FF]"
                            }`}
                            aria-label={`Periode suivante (${entry.key})`}
                          >
                            <ChevronRight
                              className="h-5 w-5"
                              strokeWidth={2.6}
                            />
                          </button>
                        </div>
                      ))}
                    </div>

                    {viewMode === "day" ? (
                      <div className="grid gap-2">
                        {daySlots.length === 0 ? (
                          <p className="rounded-card border border-dashed border-border bg-surface px-3 py-3 text-sm text-text-secondary">
                            Aucun creneau pour cette journee.
                          </p>
                        ) : (
                          daySlots.map((slot) =>
                            (() => {
                              const tone = subjectVisualTone(
                                subjectColorsBySubjectId[slot.subject.id],
                              );
                              return (
                                <article
                                  key={`day-slot-${slot.id}`}
                                  className="flex flex-wrap items-center justify-between gap-2 rounded-card border px-3 py-2"
                                  style={{
                                    backgroundColor:
                                      slot.status === "CANCELLED"
                                        ? "#FFF5F5"
                                        : tone.background,
                                    borderColor:
                                      slot.status === "CANCELLED"
                                        ? "#FBCACA"
                                        : tone.border,
                                    borderLeftWidth:
                                      slot.source === "ONE_OFF" ? "7px" : "1px",
                                    borderLeftColor:
                                      slot.source === "ONE_OFF"
                                        ? "#D97706"
                                        : slot.status === "CANCELLED"
                                          ? "#FBCACA"
                                          : tone.border,
                                  }}
                                >
                                  <button
                                    type="button"
                                    onClick={() => openOccurrenceModal(slot)}
                                    className="grid gap-0.5 text-left"
                                  >
                                    <p
                                      className="text-sm font-semibold"
                                      style={{
                                        color:
                                          slot.status === "CANCELLED"
                                            ? "#B42318"
                                            : tone.text,
                                        textDecoration:
                                          slot.status === "CANCELLED"
                                            ? "line-through"
                                            : undefined,
                                      }}
                                    >
                                      {minutesToTimeValue(slot.startMinute)} -{" "}
                                      {minutesToTimeValue(slot.endMinute)} ·{" "}
                                      {slot.subject.name}
                                    </p>
                                    <p className="text-xs text-text-secondary">
                                      {teacherPrefixFromGender(
                                        slot.teacherUser.gender,
                                      )}{" "}
                                      {slot.teacherUser.lastName.toUpperCase()}{" "}
                                      {slot.teacherUser.firstName}
                                      {slot.status === "CANCELLED"
                                        ? " · Annule"
                                        : ""}
                                    </p>
                                    {slot.room ? (
                                      <p className="text-xs font-semibold uppercase tracking-wide text-[#36557A]">
                                        Salle {slot.room}
                                      </p>
                                    ) : null}
                                  </button>
                                </article>
                              );
                            })(),
                          )
                        )}
                      </div>
                    ) : null}

                    {viewMode === "week" ? (
                      <section className="overflow-hidden rounded-card border border-border">
                        <div className="grid grid-cols-7 bg-[#F7FAFF]">
                          {weekDays.map((entry) => (
                            <div
                              key={`week-head-${entry.weekday}`}
                              className={`border-b border-r border-border px-2 py-2 text-center last:border-r-0 ${
                                sameDate(entry.date, today)
                                  ? "bg-[#E7F2FF]"
                                  : ""
                              }`}
                            >
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#4C6284]">
                                {entry.shortLabel}
                              </p>
                              <p className="text-sm font-semibold text-[#163158]">
                                {entry.date
                                  .getDate()
                                  .toString()
                                  .padStart(2, "0")}
                              </p>
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-7 bg-white">
                          {weekDays.map((entry) => {
                            const weekDaySlots =
                              weekOccurrencesByDate.get(
                                toIsoDateString(entry.date),
                              ) ?? [];
                            const plannedWeekDaySlots = weekDaySlots
                              .filter((slot) => slot.status === "PLANNED")
                              .sort((a, b) => a.startMinute - b.startMinute);
                            return (
                              <div
                                key={`week-col-${entry.weekday}`}
                                className="min-h-[230px] border-r border-border p-2 last:border-r-0"
                              >
                                {plannedWeekDaySlots.length === 0 ? (
                                  <p className="mt-2 text-center text-xs text-[#8192A8]">
                                    -
                                  </p>
                                ) : (
                                  <div className="grid gap-2">
                                    {plannedWeekDaySlots.map((slot) => {
                                      const tone = subjectVisualTone(
                                        subjectColorsBySubjectId[
                                          slot.subject.id
                                        ],
                                      );
                                      return (
                                        <button
                                          type="button"
                                          key={`week-slot-${slot.id}`}
                                          onClick={() =>
                                            openOccurrenceModal(slot)
                                          }
                                          className="rounded-[8px] border px-2 py-1.5"
                                          style={{
                                            backgroundColor: tone.background,
                                            borderColor: tone.border,
                                            borderLeftWidth:
                                              slot.source === "ONE_OFF"
                                                ? "7px"
                                                : "1px",
                                            borderLeftColor:
                                              slot.source === "ONE_OFF"
                                                ? "#D97706"
                                                : tone.border,
                                          }}
                                        >
                                          <p
                                            className="text-[11px] font-semibold"
                                            style={{ color: tone.text }}
                                          >
                                            {minutesToTimeValue(
                                              slot.startMinute,
                                            )}{" "}
                                            -{" "}
                                            {minutesToTimeValue(slot.endMinute)}
                                          </p>
                                          <p
                                            className="mt-0.5 text-[11px] font-semibold"
                                            style={{ color: tone.text }}
                                          >
                                            {slot.subject.name}
                                          </p>
                                          <p className="mt-0.5 text-[10px] text-[#5C6F88]">
                                            {slot.room
                                              ? `Salle ${slot.room}`
                                              : "-"}
                                          </p>
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    ) : null}

                    {viewMode === "month" ? (
                      <section className="grid gap-3">
                        <div className="grid grid-cols-7 rounded-card border border-border bg-white">
                          {WEEKDAY_OPTIONS.map((entry) => (
                            <div
                              key={`month-head-${entry.value}`}
                              className="border-b border-r border-border px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-[#4C6284] last:border-r-0"
                            >
                              {entry.label.slice(0, 3)}
                            </div>
                          ))}
                          {monthCalendarCells.map((entry, index) => {
                            if (!entry.date) {
                              return (
                                <div
                                  key={`month-empty-${index}`}
                                  className="min-h-[66px] border-r border-border bg-[#FAFCFF] last:border-r-0"
                                />
                              );
                            }
                            const isSelected =
                              selectedMonthDate &&
                              sameDate(entry.date, selectedMonthDate);
                            const isToday = sameDate(entry.date, today);
                            return (
                              <button
                                key={`month-cell-${entry.date.toISOString()}`}
                                type="button"
                                onClick={() => setSelectedMonthDate(entry.date)}
                                className={`min-h-[66px] border-r border-b border-border px-2 py-2 text-left last:border-r-0 ${
                                  isSelected
                                    ? "bg-[#EAF3FF]"
                                    : "bg-white hover:bg-[#F7FBFF]"
                                }`}
                              >
                                <p
                                  className={`text-xs font-semibold ${
                                    isToday ? "text-primary" : "text-[#163158]"
                                  }`}
                                >
                                  {entry.date
                                    .getDate()
                                    .toString()
                                    .padStart(2, "0")}
                                </p>
                                <p className="mt-1 text-[10px] text-[#5C6F88]">
                                  {
                                    entry.slots.filter(
                                      (slot) => slot.status === "PLANNED",
                                    ).length
                                  }{" "}
                                  creneau
                                  {entry.slots.filter(
                                    (slot) => slot.status === "PLANNED",
                                  ).length > 1
                                    ? "x"
                                    : ""}
                                </p>
                              </button>
                            );
                          })}
                        </div>

                        <div className="rounded-card border border-border bg-surface p-3">
                          <p className="mb-2 text-sm font-semibold text-text-primary">
                            {selectedMonthDate
                              ? `Creneaux du ${new Intl.DateTimeFormat(
                                  "fr-FR",
                                  {
                                    weekday: "long",
                                    day: "2-digit",
                                    month: "long",
                                  },
                                ).format(selectedMonthDate)}`
                              : "Selectionnez un jour pour voir les creneaux"}
                          </p>
                          {selectedMonthDate ? (
                            selectedMonthSlots.length === 0 ? (
                              <p className="text-sm text-text-secondary">
                                Aucun creneau pour ce jour.
                              </p>
                            ) : (
                              <div className="grid gap-2">
                                {selectedMonthSlots.map((slot) => {
                                  const tone = subjectVisualTone(
                                    subjectColorsBySubjectId[slot.subject.id],
                                  );
                                  return (
                                    <button
                                      type="button"
                                      key={`month-slot-${slot.id}`}
                                      onClick={() => openOccurrenceModal(slot)}
                                      className="rounded-card border px-3 py-2"
                                      style={{
                                        backgroundColor: tone.background,
                                        borderColor: tone.border,
                                        borderLeftWidth:
                                          slot.source === "ONE_OFF"
                                            ? "7px"
                                            : "1px",
                                        borderLeftColor:
                                          slot.source === "ONE_OFF"
                                            ? "#D97706"
                                            : tone.border,
                                      }}
                                    >
                                      <p
                                        className="text-sm font-semibold"
                                        style={{
                                          color:
                                            slot.status === "CANCELLED"
                                              ? "#B42318"
                                              : tone.text,
                                          textDecoration:
                                            slot.status === "CANCELLED"
                                              ? "line-through"
                                              : undefined,
                                        }}
                                      >
                                        {minutesToTimeValue(slot.startMinute)} -{" "}
                                        {minutesToTimeValue(slot.endMinute)} ·{" "}
                                        {slot.subject.name}
                                      </p>
                                      <p className="text-xs text-text-secondary">
                                        {slot.teacherUser.lastName.toUpperCase()}{" "}
                                        {slot.teacherUser.firstName}
                                        {slot.room
                                          ? ` · Salle ${slot.room}`
                                          : ""}
                                        {slot.status === "CANCELLED"
                                          ? " · Annule"
                                          : ""}
                                      </p>
                                    </button>
                                  );
                                })}
                              </div>
                            )
                          ) : null}
                        </div>
                      </section>
                    ) : null}
                  </section>
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
                  Gerer l'occurrence
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
                  }
                }}
              >
                Fermer
              </Button>
            </div>

            <form className="grid gap-3" onSubmit={onSubmitOccurrenceAction}>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-1 text-sm">
                  <span className="text-text-secondary">Action</span>
                  <select
                    value={occurrenceActionType}
                    onChange={(event) =>
                      setOccurrenceActionType(
                        event.target.value as "ONE_OFF" | "CANCEL" | "OVERRIDE",
                      )
                    }
                    className="rounded-card border border-border bg-surface px-3 py-2 text-sm"
                  >
                    <option value="ONE_OFF">Cours ponctuel</option>
                    <option value="CANCEL">Annuler cette occurrence</option>
                    <option value="OVERRIDE">Modifier cette occurrence</option>
                  </select>
                </label>

                <label className="grid gap-1 text-sm">
                  <span className="text-text-secondary">Date</span>
                  <DateInput
                    value={occurrenceDateInput}
                    onChange={(event) =>
                      setOccurrenceDateInput(event.target.value)
                    }
                    className="rounded-card border border-border bg-surface px-3 py-2 text-sm"
                  />
                </label>
              </div>

              {occurrenceActionType !== "ONE_OFF" ? (
                <label className="grid gap-1 text-sm">
                  <span className="text-text-secondary">
                    Creneau recurrent cible
                  </span>
                  <select
                    value={occurrenceTargetSlotId}
                    onChange={(event) =>
                      setOccurrenceTargetSlotId(event.target.value)
                    }
                    className="rounded-card border border-border bg-surface px-3 py-2 text-sm"
                  >
                    <option value="">Selectionner</option>
                    {slots.map((slot) => (
                      <option key={`target-slot-${slot.id}`} value={slot.id}>
                        {WEEKDAY_OPTIONS.find(
                          (day) => day.value === slot.weekday,
                        )?.label ?? "Jour"}{" "}
                        · {minutesToTimeValue(slot.startMinute)} -{" "}
                        {minutesToTimeValue(slot.endMinute)} ·{" "}
                        {slot.subject.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {occurrenceActionType !== "CANCEL" ? (
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
                      onChange={(event) => setOccurrenceEnd(event.target.value)}
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

              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setOccurrenceModalSlot(null)}
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
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
