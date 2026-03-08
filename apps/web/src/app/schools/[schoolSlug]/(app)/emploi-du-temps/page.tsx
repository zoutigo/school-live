"use client";

import { useMemo, useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "../../../../../components/ui/card";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type Role =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "SALES"
  | "SUPPORT"
  | "SCHOOL_ADMIN"
  | "SCHOOL_MANAGER"
  | "SUPERVISOR"
  | "SCHOOL_ACCOUNTANT"
  | "SCHOOL_STAFF"
  | "TEACHER"
  | "PARENT"
  | "STUDENT";

type MeResponse = {
  firstName: string;
  lastName: string;
  role: Role;
  linkedStudents?: Array<{
    id: string;
    firstName: string;
    lastName: string;
  }>;
};

type ViewMode = "day" | "week" | "month";
type SubjectTone = {
  bgColor: string;
  borderColor: string;
  textColor: string;
  chipColor: string;
  chipTextColor: string;
};

type TimetableSlot = {
  id: string;
  subjectId?: string;
  weekday: number;
  start: string;
  end: string;
  subject: string;
  teacher: string;
  room: string;
};

type MyTimetableResponse = {
  student: {
    id: string;
    firstName: string;
    lastName: string;
  };
  class: {
    id: string;
    name: string;
    schoolYearId: string;
    academicLevelId: string | null;
  };
  slots: Array<{
    id: string;
    weekday: number;
    startMinute: number;
    endMinute: number;
    room: string | null;
    subject: { id: string; name: string };
    teacherUser: { id: string; firstName: string; lastName: string };
  }>;
  subjectStyles: Array<{ subjectId: string; colorHex: string }>;
  calendarEvents: Array<{
    id: string;
    type: "HOLIDAY";
    scope: "SCHOOL" | "ACADEMIC_LEVEL" | "CLASS";
    label: string;
    startDate: string;
    endDate: string;
  }>;
};

const WEEKDAY_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const WEEKDAY_LONG = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
];

const SUBJECT_TONES: Record<string, SubjectTone> = {
  FRANCAIS: {
    bgColor: "#E4EEFF",
    borderColor: "#98B8F3",
    textColor: "#123B7A",
    chipColor: "#2F66C7",
    chipTextColor: "#FFFFFF",
  },
  MATHEMATIQUES: {
    bgColor: "#FFE9E7",
    borderColor: "#F3A39B",
    textColor: "#7B1D15",
    chipColor: "#CF3F2F",
    chipTextColor: "#FFFFFF",
  },
  ANGLAIS: {
    bgColor: "#E5F4F7",
    borderColor: "#95C9D2",
    textColor: "#0D4F5B",
    chipColor: "#12839B",
    chipTextColor: "#FFFFFF",
  },
  HISTOIRE_GEOGRAPHIE: {
    bgColor: "#EAF0D9",
    borderColor: "#B8C68C",
    textColor: "#455B1E",
    chipColor: "#6C8D2D",
    chipTextColor: "#FFFFFF",
  },
  SCIENCES_VIE_TERRE: {
    bgColor: "#FFF3D9",
    borderColor: "#E5C27A",
    textColor: "#6D490D",
    chipColor: "#B57A10",
    chipTextColor: "#FFFFFF",
  },
  EDUCATION_PHYSIQUE: {
    bgColor: "#F0E6FA",
    borderColor: "#C29EE6",
    textColor: "#4E257B",
    chipColor: "#7C3FB3",
    chipTextColor: "#FFFFFF",
  },
  default: {
    bgColor: "#EEF2F7",
    borderColor: "#C6D2E1",
    textColor: "#1F344D",
    chipColor: "#36577E",
    chipTextColor: "#FFFFFF",
  },
};

const CLASS_SLOTS: TimetableSlot[] = [
  {
    id: "m-0845-fr",
    weekday: 1,
    start: "08:45",
    end: "09:40",
    subject: "FRANCAIS",
    teacher: "Jamet P.",
    room: "B14",
  },
  {
    id: "m-0940-math",
    weekday: 1,
    start: "09:40",
    end: "10:35",
    subject: "MATHEMATIQUES",
    teacher: "Auberger C.",
    room: "B11",
  },
  {
    id: "m-1050-ang",
    weekday: 1,
    start: "10:50",
    end: "11:45",
    subject: "ANGLAIS",
    teacher: "Assade S.",
    room: "A08",
  },
  {
    id: "m-1245-svt",
    weekday: 1,
    start: "12:45",
    end: "13:40",
    subject: "SCIENCES_VIE_TERRE",
    teacher: "Barriere C.",
    room: "Lab 2",
  },
  {
    id: "tu-0845-hg",
    weekday: 2,
    start: "08:45",
    end: "09:40",
    subject: "HISTOIRE_GEOGRAPHIE",
    teacher: "Pigeon C.",
    room: "C03",
  },
  {
    id: "tu-1050-eps",
    weekday: 2,
    start: "10:50",
    end: "11:45",
    subject: "EDUCATION_PHYSIQUE",
    teacher: "Merret P.",
    room: "Gymnase",
  },
  {
    id: "tu-1330-fr",
    weekday: 2,
    start: "13:30",
    end: "14:25",
    subject: "FRANCAIS",
    teacher: "Jamet P.",
    room: "B14",
  },
  {
    id: "we-0845-fr",
    weekday: 3,
    start: "08:45",
    end: "09:40",
    subject: "FRANCAIS",
    teacher: "Jamet P.",
    room: "B14",
  },
  {
    id: "we-0940-fr",
    weekday: 3,
    start: "09:40",
    end: "10:35",
    subject: "FRANCAIS",
    teacher: "Jamet P.",
    room: "B14",
  },
  {
    id: "we-1050-svt",
    weekday: 3,
    start: "10:50",
    end: "11:45",
    subject: "SCIENCES_VIE_TERRE",
    teacher: "Barriere C.",
    room: "Lab 2",
  },
  {
    id: "th-0845-math",
    weekday: 4,
    start: "08:45",
    end: "09:40",
    subject: "MATHEMATIQUES",
    teacher: "Auberger C.",
    room: "B11",
  },
  {
    id: "th-0940-ang",
    weekday: 4,
    start: "09:40",
    end: "10:35",
    subject: "ANGLAIS",
    teacher: "Assade S.",
    room: "A08",
  },
  {
    id: "th-1050-ang",
    weekday: 4,
    start: "10:50",
    end: "11:45",
    subject: "ANGLAIS",
    teacher: "Assade S.",
    room: "A08",
  },
  {
    id: "th-1330-svt",
    weekday: 4,
    start: "13:30",
    end: "14:25",
    subject: "SCIENCES_VIE_TERRE",
    teacher: "Barriere C.",
    room: "Lab 2",
  },
  {
    id: "fr-0845-ang",
    weekday: 5,
    start: "08:45",
    end: "09:40",
    subject: "ANGLAIS",
    teacher: "Assade S.",
    room: "A08",
  },
  {
    id: "fr-0940-math",
    weekday: 5,
    start: "09:40",
    end: "10:35",
    subject: "MATHEMATIQUES",
    teacher: "Auberger C.",
    room: "B11",
  },
  {
    id: "fr-1050-eps",
    weekday: 5,
    start: "10:50",
    end: "11:45",
    subject: "EDUCATION_PHYSIQUE",
    teacher: "Merret P.",
    room: "Gymnase",
  },
  {
    id: "fr-1425-hg",
    weekday: 5,
    start: "14:25",
    end: "15:20",
    subject: "HISTOIRE_GEOGRAPHIE",
    teacher: "Pigeon C.",
    room: "C03",
  },
];

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

function normalizeSubjectKey(subject: string) {
  return subject
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
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

function bestTextColorOn(hex: string) {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return "#FFFFFF";
  }
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.62 ? "#163158" : "#FFFFFF";
}

function buildToneFromBase(baseHex: string): SubjectTone {
  return {
    bgColor: mixHex(baseHex, "#FFFFFF", 0.86),
    borderColor: mixHex(baseHex, "#FFFFFF", 0.66),
    textColor: mixHex(baseHex, "#0F172A", 0.3),
    chipColor: baseHex.toUpperCase(),
    chipTextColor: bestTextColorOn(baseHex),
  };
}

function subjectTone(
  subject: string,
  subjectId: string | undefined,
  subjectColorsBySubjectId: Record<string, string>,
) {
  if (subjectId) {
    const colorHex = subjectColorsBySubjectId[subjectId];
    if (colorHex && /^#[0-9A-Fa-f]{6}$/.test(colorHex)) {
      return buildToneFromBase(colorHex);
    }
  }
  return SUBJECT_TONES[normalizeSubjectKey(subject)] ?? SUBJECT_TONES.default;
}

function subjectLabel(subject: string) {
  return subject.includes("_") ? subject.replaceAll("_", " ") : subject;
}

function subjectShortLabel(subject: string) {
  const [firstWord] = subjectLabel(subject).split(" ");
  return (firstWord ?? subjectLabel(subject)).slice(0, 3);
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

function minuteToTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (totalMinutes % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export default function StudentTimetablePage() {
  const router = useRouter();
  const params = useParams<{ schoolSlug: string; childId?: string }>();
  const searchParams = useSearchParams();
  const schoolSlug = params.schoolSlug;
  const childIdFromRoute = params.childId;
  const childIdFromQuery = searchParams.get("childId");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeChildLabel, setActiveChildLabel] = useState<string | null>(null);
  const [activeChildClassName, setActiveChildClassName] = useState<
    string | null
  >(null);
  const [classSlots, setClassSlots] = useState<TimetableSlot[]>(CLASS_SLOTS);
  const [subjectColorsBySubjectId, setSubjectColorsBySubjectId] = useState<
    Record<string, string>
  >({});
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [cursorDate, setCursorDate] = useState(stripTime(new Date()));
  const [selectedCompactMonthDate, setSelectedCompactMonthDate] =
    useState<Date | null>(null);
  const [selectedCompactWeekCell, setSelectedCompactWeekCell] = useState<{
    slot: TimetableSlot;
    date: Date;
  } | null>(null);
  const [isCompactViewport, setIsCompactViewport] = useState(false);

  useEffect(() => {
    void loadProfile();
  }, [schoolSlug, childIdFromRoute, childIdFromQuery]);

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

  async function loadProfile() {
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

      const payload = (await meResponse.json()) as MeResponse;

      if (payload.role === "PARENT") {
        const linkedStudents = payload.linkedStudents ?? [];
        if (linkedStudents.length === 0) {
          setError("Aucun eleve lie a ce compte parent.");
          return;
        }
      }

      if (payload.role !== "STUDENT" && payload.role !== "PARENT") {
        router.replace(`/schools/${schoolSlug}/dashboard`);
        return;
      }

      const targetChildId = childIdFromRoute || childIdFromQuery;
      const myTimetableQuery =
        payload.role === "PARENT" && targetChildId
          ? `?childId=${encodeURIComponent(targetChildId)}`
          : "";

      const timetableResponse = await fetch(
        `${API_URL}/schools/${schoolSlug}/timetable/me${myTimetableQuery}`,
        {
          credentials: "include",
        },
      );

      if (!timetableResponse.ok) {
        setError("Impossible de charger l'emploi du temps.");
        return;
      }

      const timetablePayload =
        (await timetableResponse.json()) as MyTimetableResponse;

      setActiveChildLabel(
        `${timetablePayload.student.firstName} ${timetablePayload.student.lastName}`,
      );
      setActiveChildClassName(timetablePayload.class.name);
      setClassSlots(
        timetablePayload.slots.map((slot) => ({
          id: slot.id,
          subjectId: slot.subject.id,
          weekday: slot.weekday,
          start: minuteToTime(slot.startMinute),
          end: minuteToTime(slot.endMinute),
          subject: slot.subject.name,
          teacher: `${slot.teacherUser.lastName.toUpperCase()} ${slot.teacherUser.firstName}`,
          room: slot.room?.trim() || "-",
        })),
      );
      setSubjectColorsBySubjectId(
        Object.fromEntries(
          timetablePayload.subjectStyles.map((entry) => [
            entry.subjectId,
            entry.colorHex.toUpperCase(),
          ]),
        ),
      );
    } catch {
      setError("Impossible de charger l'emploi du temps.");
    } finally {
      setLoading(false);
    }
  }

  const weekday = toWeekdayMondayFirst(cursorDate);
  const today = stripTime(new Date());
  const className = activeChildClassName || "6eme N3";
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
  const activePeriodLabel =
    viewMode === "day"
      ? dayTabLabel
      : viewMode === "week"
        ? weekTabLabel
        : monthTabLabel;
  const activeModeLabel =
    viewMode === "day" ? "Jour" : viewMode === "week" ? "Semaine" : "Mois";

  function moveCursorByMode(mode: ViewMode, direction: -1 | 1) {
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

  const daySlots = useMemo(
    () =>
      classSlots
        .filter((slot) => slot.weekday === weekday)
        .sort((a, b) => a.start.localeCompare(b.start)),
    [classSlots, weekday],
  );

  const weekStart = useMemo(() => startOfWeek(cursorDate), [cursorDate]);
  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const date = addDays(weekStart, index);
        return {
          weekday: index + 1,
          date,
          label: WEEKDAY_SHORT[index],
        };
      }),
    [weekStart],
  );

  const weekSlotsByWeekday = useMemo(() => {
    const result = new Map<number, TimetableSlot[]>();
    weekDays.forEach((entry) => {
      const slots = classSlots
        .filter((slot) => slot.weekday === entry.weekday)
        .sort((a, b) => a.start.localeCompare(b.start));
      result.set(entry.weekday, slots);
    });
    return result;
  }, [classSlots, weekDays]);

  const compactWeekTimeRows = useMemo(() => {
    const seen = new Set<string>();
    const rows: Array<{ start: string; end: string }> = [];

    classSlots.forEach((slot) => {
      const key = `${slot.start}-${slot.end}`;
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      rows.push({ start: slot.start, end: slot.end });
    });

    return rows.sort((a, b) => a.start.localeCompare(b.start));
  }, [classSlots]);

  const monthMatrix = useMemo(() => {
    const firstDay = new Date(
      cursorDate.getFullYear(),
      cursorDate.getMonth(),
      1,
    );
    const calendarStart = startOfWeek(firstDay);
    return Array.from({ length: 42 }, (_, index) => {
      const date = addDays(calendarStart, index);
      const weekdayIndex = toWeekdayMondayFirst(date);
      const slots = classSlots.filter((slot) => slot.weekday === weekdayIndex);
      return {
        date,
        slots,
        isCurrentMonth: date.getMonth() === cursorDate.getMonth(),
      };
    });
  }, [classSlots, cursorDate]);

  const monthDaysList = useMemo(() => {
    const firstDay = new Date(
      cursorDate.getFullYear(),
      cursorDate.getMonth(),
      1,
    );
    const lastDay = new Date(
      cursorDate.getFullYear(),
      cursorDate.getMonth() + 1,
      0,
    );
    const days: Array<{ date: Date; slots: TimetableSlot[] }> = [];

    for (let day = 1; day <= lastDay.getDate(); day += 1) {
      const date = new Date(
        cursorDate.getFullYear(),
        cursorDate.getMonth(),
        day,
      );
      const weekdayIndex = toWeekdayMondayFirst(date);
      const slots = classSlots
        .filter((slot) => slot.weekday === weekdayIndex)
        .sort((a, b) => a.start.localeCompare(b.start));
      days.push({
        date,
        slots,
      });
    }

    if (days.length === 0) {
      return [{ date: firstDay, slots: [] }];
    }

    return days;
  }, [classSlots, cursorDate]);

  const compactMonthCalendarCells = useMemo(() => {
    const firstDay = new Date(
      cursorDate.getFullYear(),
      cursorDate.getMonth(),
      1,
    );
    const firstWeekday = toWeekdayMondayFirst(firstDay);
    const leadingEmpty = firstWeekday - 1;
    const cells: Array<{ date: Date | null; slotsCount: number }> = [];

    for (let i = 0; i < leadingEmpty; i += 1) {
      cells.push({ date: null, slotsCount: 0 });
    }

    monthDaysList.forEach((entry) => {
      cells.push({
        date: entry.date,
        slotsCount: entry.slots.length,
      });
    });

    while (cells.length % 7 !== 0) {
      cells.push({ date: null, slotsCount: 0 });
    }

    return cells;
  }, [cursorDate, monthDaysList]);

  useEffect(() => {
    const firstDayOfMonth = new Date(
      cursorDate.getFullYear(),
      cursorDate.getMonth(),
      1,
    );
    const todayInCurrentMonth =
      today.getFullYear() === cursorDate.getFullYear() &&
      today.getMonth() === cursorDate.getMonth();

    if (!selectedCompactMonthDate) {
      setSelectedCompactMonthDate(
        todayInCurrentMonth ? today : firstDayOfMonth,
      );
      return;
    }

    const selectedInCurrentMonth =
      selectedCompactMonthDate.getFullYear() === cursorDate.getFullYear() &&
      selectedCompactMonthDate.getMonth() === cursorDate.getMonth();

    if (!selectedInCurrentMonth) {
      setSelectedCompactMonthDate(
        todayInCurrentMonth ? today : firstDayOfMonth,
      );
    }
  }, [cursorDate, selectedCompactMonthDate, today]);

  useEffect(() => {
    if (!isCompactViewport || viewMode !== "week") {
      return;
    }

    if (selectedCompactWeekCell) {
      const stillVisible = weekDays.some((entry) =>
        sameDate(entry.date, selectedCompactWeekCell.date),
      );
      if (stillVisible) {
        return;
      }
    }

    const todayWeekDay = weekDays.find((entry) => sameDate(entry.date, today));
    if (todayWeekDay) {
      const todaySlots = weekSlotsByWeekday.get(todayWeekDay.weekday) ?? [];
      if (todaySlots.length > 0) {
        setSelectedCompactWeekCell({
          slot: todaySlots[0],
          date: todayWeekDay.date,
        });
        return;
      }
    }

    const firstWithSlot = weekDays.find(
      (entry) => (weekSlotsByWeekday.get(entry.weekday) ?? []).length > 0,
    );
    if (firstWithSlot) {
      const slots = weekSlotsByWeekday.get(firstWithSlot.weekday) ?? [];
      setSelectedCompactWeekCell({
        slot: slots[0],
        date: firstWithSlot.date,
      });
      return;
    }

    setSelectedCompactWeekCell(null);
  }, [
    isCompactViewport,
    viewMode,
    weekDays,
    weekSlotsByWeekday,
    selectedCompactWeekCell,
    today,
  ]);

  const selectedCompactMonthEntry = useMemo(() => {
    if (!selectedCompactMonthDate) {
      return null;
    }

    return (
      monthDaysList.find((entry) =>
        sameDate(entry.date, selectedCompactMonthDate),
      ) ?? null
    );
  }, [monthDaysList, selectedCompactMonthDate]);

  return (
    <div className="grid gap-4">
      <Card
        title="Emploi du temps"
        subtitle={
          activeChildLabel ? `${activeChildLabel} - ${className}` : "Vue eleve"
        }
      >
        {loading ? (
          <p className="text-sm text-text-secondary">Chargement...</p>
        ) : error ? (
          <p className="text-sm text-notification">{error}</p>
        ) : (
          <div className="grid gap-4">
            <section className="relative overflow-hidden rounded-card border border-[#D9E7F9] bg-gradient-to-r from-[#F5FAFF] via-[#FFFFFF] to-[#F2F8FF] p-4">
              <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-[#A7D1FF]/35 blur-2xl" />
              <div className="pointer-events-none absolute -left-8 bottom-0 h-28 w-28 rounded-full bg-[#C4B1FF]/25 blur-xl" />
              <div className="relative grid gap-4">
                {isCompactViewport ? (
                  <div className="grid min-w-0 gap-2">
                    <div className="grid min-w-0 grid-cols-3 gap-1 rounded-[8px] border border-[#DCE8F7] bg-[#F8FBFF] p-1">
                      {(
                        [
                          { key: "day", label: "Jour" },
                          { key: "week", label: "Semaine" },
                          { key: "month", label: "Mois" },
                        ] as Array<{ key: ViewMode; label: string }>
                      ).map((tab) => (
                        <button
                          key={`compact-tab-${tab.key}`}
                          type="button"
                          onClick={() => setViewMode(tab.key)}
                          className={`h-8 min-w-0 rounded-[6px] px-2 text-[11px] font-semibold transition ${
                            viewMode === tab.key
                              ? "bg-[#0A62BF] text-white shadow-[0_6px_14px_-10px_rgba(10,98,191,0.95)]"
                              : "text-[#2B4A74] hover:bg-white"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <div className="grid min-w-0 grid-cols-[40px_minmax(0,1fr)_40px] items-center gap-2 rounded-[8px] border border-[#DCE8F7] bg-[#F8FBFF] p-1">
                      <button
                        type="button"
                        onClick={() => moveCursorByMode(viewMode, -1)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] bg-[#EAF3FF] text-[#0A62BF] hover:bg-[#DCEBFF]"
                        aria-label={`${activeModeLabel} precedent`}
                      >
                        <ChevronLeft className="h-5 w-5" strokeWidth={2.6} />
                      </button>

                      <button
                        type="button"
                        onClick={() => setCursorDate(today)}
                        className="min-w-0 rounded-[6px] bg-white px-2 py-1 text-center text-[13px] font-semibold text-[#163158]"
                        title={`Revenir a ${activeModeLabel.toLowerCase()} courant`}
                      >
                        <span className="block truncate">
                          {activePeriodLabel}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => moveCursorByMode(viewMode, 1)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] bg-[#EAF3FF] text-[#0A62BF] hover:bg-[#DCEBFF]"
                        aria-label={`${activeModeLabel} suivant`}
                      >
                        <ChevronRight className="h-5 w-5" strokeWidth={2.6} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 rounded-[6px] border border-[#D4E4F6] bg-white p-1">
                    <div
                      className={`grid grid-cols-[36px_1fr_36px] items-center gap-1 rounded-[4px] px-1 py-1 text-sm font-semibold transition ${
                        viewMode === "day"
                          ? "bg-[#0A62BF] text-white shadow-[0_10px_24px_-14px_rgba(10,98,191,0.95)]"
                          : "text-[#2B4A74] hover:bg-[#EEF5FF]"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setViewMode("day");
                          moveCursorByMode("day", -1);
                        }}
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-[4px] ${
                          viewMode === "day"
                            ? "bg-white/15 text-white hover:bg-white/25"
                            : "bg-[#E8F2FF] text-[#0A62BF] hover:bg-[#D7E9FF]"
                        }`}
                        aria-label="Jour precedent"
                      >
                        <ChevronLeft className="h-5 w-5" strokeWidth={2.6} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setViewMode("day");
                          setCursorDate(today);
                        }}
                        className="rounded-[4px] px-2 py-1 text-[13px]"
                      >
                        {dayTabLabel}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setViewMode("day");
                          moveCursorByMode("day", 1);
                        }}
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-[4px] ${
                          viewMode === "day"
                            ? "bg-white/15 text-white hover:bg-white/25"
                            : "bg-[#E8F2FF] text-[#0A62BF] hover:bg-[#D7E9FF]"
                        }`}
                        aria-label="Jour suivant"
                      >
                        <ChevronRight className="h-5 w-5" strokeWidth={2.6} />
                      </button>
                    </div>

                    <div
                      className={`grid grid-cols-[36px_1fr_36px] items-center gap-1 rounded-[4px] px-1 py-1 text-sm font-semibold transition ${
                        viewMode === "week"
                          ? "bg-[#0A62BF] text-white shadow-[0_10px_24px_-14px_rgba(10,98,191,0.95)]"
                          : "text-[#2B4A74] hover:bg-[#EEF5FF]"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setViewMode("week");
                          moveCursorByMode("week", -1);
                        }}
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-[4px] ${
                          viewMode === "week"
                            ? "bg-white/15 text-white hover:bg-white/25"
                            : "bg-[#E8F2FF] text-[#0A62BF] hover:bg-[#D7E9FF]"
                        }`}
                        aria-label="Semaine precedente"
                      >
                        <ChevronLeft className="h-5 w-5" strokeWidth={2.6} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setViewMode("week");
                          setCursorDate(today);
                        }}
                        className="rounded-[4px] px-2 py-1 text-[13px]"
                      >
                        {weekTabLabel}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setViewMode("week");
                          moveCursorByMode("week", 1);
                        }}
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-[4px] ${
                          viewMode === "week"
                            ? "bg-white/15 text-white hover:bg-white/25"
                            : "bg-[#E8F2FF] text-[#0A62BF] hover:bg-[#D7E9FF]"
                        }`}
                        aria-label="Semaine suivante"
                      >
                        <ChevronRight className="h-5 w-5" strokeWidth={2.6} />
                      </button>
                    </div>

                    <div
                      className={`grid grid-cols-[36px_1fr_36px] items-center gap-1 rounded-[4px] px-1 py-1 text-sm font-semibold transition ${
                        viewMode === "month"
                          ? "bg-[#0A62BF] text-white shadow-[0_10px_24px_-14px_rgba(10,98,191,0.95)]"
                          : "text-[#2B4A74] hover:bg-[#EEF5FF]"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setViewMode("month");
                          moveCursorByMode("month", -1);
                        }}
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-[4px] ${
                          viewMode === "month"
                            ? "bg-white/15 text-white hover:bg-white/25"
                            : "bg-[#E8F2FF] text-[#0A62BF] hover:bg-[#D7E9FF]"
                        }`}
                        aria-label="Mois precedent"
                      >
                        <ChevronLeft className="h-5 w-5" strokeWidth={2.6} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setViewMode("month");
                          setCursorDate(today);
                        }}
                        className="rounded-[4px] px-2 py-1 text-[13px]"
                      >
                        {monthTabLabel}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setViewMode("month");
                          moveCursorByMode("month", 1);
                        }}
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-[4px] ${
                          viewMode === "month"
                            ? "bg-white/15 text-white hover:bg-white/25"
                            : "bg-[#E8F2FF] text-[#0A62BF] hover:bg-[#D7E9FF]"
                        }`}
                        aria-label="Mois suivant"
                      >
                        <ChevronRight className="h-5 w-5" strokeWidth={2.6} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {viewMode === "day" ? (
              <section className="grid gap-3">
                {daySlots.length === 0 ? (
                  <div className="rounded-card border border-dashed border-border bg-background p-6 text-sm text-text-secondary">
                    Aucun cours programme pour cette journee.
                  </div>
                ) : (
                  daySlots.map((slot) => {
                    const tone = subjectTone(
                      slot.subject,
                      slot.subjectId,
                      subjectColorsBySubjectId,
                    );
                    return (
                      <article
                        key={slot.id}
                        className={`rounded-card border p-3 ${
                          isCompactViewport
                            ? "grid gap-1.5 px-2.5 py-2"
                            : "grid grid-cols-[120px_1fr] gap-3"
                        }`}
                        style={{
                          backgroundColor: tone.bgColor,
                          borderColor: tone.borderColor,
                        }}
                      >
                        {isCompactViewport ? (
                          <div className="flex items-center justify-between gap-2">
                            <div className="rounded-[8px] bg-white/92 px-2.5 py-1.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.65)]">
                              <p
                                className="text-[13px] font-semibold leading-none"
                                style={{ color: tone.textColor }}
                              >
                                {slot.start} - {slot.end}
                              </p>
                            </div>
                            <span
                              className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                              style={{
                                backgroundColor: tone.chipColor,
                                color: tone.chipTextColor,
                              }}
                            >
                              {slot.room}
                            </span>
                          </div>
                        ) : (
                          <div className="rounded-card bg-white/80 p-2 text-center">
                            <p
                              className="text-sm font-semibold"
                              style={{ color: tone.textColor }}
                            >
                              {slot.start}
                            </p>
                            <p className="text-xs text-[#5B6A7E]">
                              a {slot.end}
                            </p>
                          </div>
                        )}

                        <div className="grid gap-1">
                          <div className="flex items-center justify-between gap-2">
                            <h3
                              className={`font-heading font-semibold ${
                                isCompactViewport
                                  ? "text-[0.92rem] leading-[1.15]"
                                  : "text-base"
                              }`}
                              style={{ color: tone.textColor }}
                            >
                              {subjectLabel(slot.subject)}
                            </h3>
                            {isCompactViewport ? null : (
                              <span
                                className="rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide"
                                style={{
                                  backgroundColor: tone.chipColor,
                                  color: tone.chipTextColor,
                                }}
                              >
                                {slot.room}
                              </span>
                            )}
                          </div>
                          <p
                            className={`text-[#374A66] ${
                              isCompactViewport ? "text-[0.8rem]" : "text-sm"
                            }`}
                          >
                            {slot.teacher}
                          </p>
                        </div>
                      </article>
                    );
                  })
                )}
              </section>
            ) : null}

            {viewMode === "week" ? (
              isCompactViewport ? (
                <section className="grid min-w-0 gap-3">
                  <article className="min-w-0 overflow-hidden rounded-card border border-[#DCE8F7] bg-[#FBFDFF] p-2 shadow-[0_8px_20px_-18px_rgba(10,98,191,0.6)]">
                    <div className="w-full overflow-x-auto">
                      <table className="w-max border-separate [border-spacing:1px]">
                        <colgroup>
                          <col style={{ width: "clamp(24px, 7.2vw, 34px)" }} />
                          {weekDays.map((entry) => (
                            <col
                              key={`compact-week-col-${entry.weekday}`}
                              style={{ width: "clamp(27px, 7.7vw, 44px)" }}
                            />
                          ))}
                        </colgroup>
                        <thead>
                          <tr>
                            <th className="whitespace-nowrap rounded-[6px] bg-[#EFF5FD] px-0.5 py-1 text-left text-[7px] font-semibold uppercase tracking-[0.015em] text-[#5A7093]">
                              H
                            </th>
                            {weekDays.map((entry) => (
                              <th
                                key={`compact-week-head-${entry.weekday}`}
                                className={`whitespace-nowrap rounded-[6px] px-0.5 py-1 text-center text-[7px] font-semibold uppercase tracking-[0.01em] ${
                                  sameDate(entry.date, today)
                                    ? "bg-[#DCEBFF] text-[#0A62BF]"
                                    : "bg-[#EFF5FD] text-[#5A7093]"
                                }`}
                                style={{ fontSize: "clamp(7px, 1.7vw, 9px)" }}
                              >
                                {entry.label.slice(0, 1)}{" "}
                                {entry.date
                                  .getDate()
                                  .toString()
                                  .padStart(2, "0")}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {compactWeekTimeRows.map((row) => (
                            <tr
                              key={`compact-week-row-${row.start}-${row.end}`}
                            >
                              <td
                                className="rounded-[6px] bg-[#F2F7FD] px-[1px] py-0.5 text-[6px] font-medium leading-[1.03] text-[#35557F]"
                                style={{ fontSize: "clamp(6px, 1.45vw, 8px)" }}
                              >
                                <span className="block">{row.start}</span>
                                <span className="block">{row.end}</span>
                              </td>
                              {weekDays.map((entry) => {
                                const slot = (
                                  weekSlotsByWeekday.get(entry.weekday) ?? []
                                ).find(
                                  (candidate) =>
                                    candidate.start === row.start &&
                                    candidate.end === row.end,
                                );

                                if (!slot) {
                                  return (
                                    <td
                                      key={`compact-week-empty-${entry.weekday}-${row.start}`}
                                      className="rounded-[8px] bg-[#FAFCFF]"
                                    />
                                  );
                                }

                                const tone = subjectTone(
                                  slot.subject,
                                  slot.subjectId,
                                  subjectColorsBySubjectId,
                                );
                                const isSelected =
                                  selectedCompactWeekCell &&
                                  selectedCompactWeekCell.slot.id === slot.id &&
                                  sameDate(
                                    selectedCompactWeekCell.date,
                                    entry.date,
                                  );

                                return (
                                  <td
                                    key={`compact-week-slot-${entry.weekday}-${slot.id}`}
                                    className="rounded-[6px] bg-white p-0.5"
                                  >
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setSelectedCompactWeekCell({
                                          slot,
                                          date: entry.date,
                                        })
                                      }
                                      aria-label={`${subjectLabel(slot.subject)} ${slot.start}-${slot.end}`}
                                      className={`w-full rounded-[6px] px-0 py-0.5 text-[7px] font-semibold uppercase tracking-[0.01em] transition ${
                                        isSelected
                                          ? "hover:brightness-[0.98]"
                                          : "hover:brightness-[0.98]"
                                      }`}
                                      style={{
                                        fontSize: "clamp(7px, 1.65vw, 9px)",
                                        minHeight: "clamp(14px, 2.1vh, 20px)",
                                        backgroundColor: isSelected
                                          ? tone.chipColor
                                          : tone.bgColor,
                                        color: isSelected
                                          ? tone.chipTextColor
                                          : tone.textColor,
                                      }}
                                    >
                                      <span className="block truncate">
                                        {subjectShortLabel(slot.subject)}
                                      </span>
                                    </button>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </article>

                  <article className="rounded-card border border-[#DCE8F7] bg-[#F9FCFF] p-3 shadow-[0_8px_20px_-18px_rgba(7,38,78,0.45)]">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#4C6284]">
                      Detail du cours selectionne
                    </p>
                    {selectedCompactWeekCell ? (
                      <div className="grid gap-1 text-[13px] text-[#213B5D]">
                        <p>
                          <span className="font-semibold">Matiere:</span>{" "}
                          {subjectLabel(selectedCompactWeekCell.slot.subject)}
                        </p>
                        <p>
                          <span className="font-semibold">Jour:</span>{" "}
                          {new Intl.DateTimeFormat("fr-FR", {
                            weekday: "long",
                            day: "2-digit",
                            month: "long",
                          }).format(selectedCompactWeekCell.date)}
                        </p>
                        <p>
                          <span className="font-semibold">Plage horaire:</span>{" "}
                          {selectedCompactWeekCell.slot.start} -{" "}
                          {selectedCompactWeekCell.slot.end}
                        </p>
                        <p>
                          <span className="font-semibold">Enseignant:</span>{" "}
                          {selectedCompactWeekCell.slot.teacher}
                        </p>
                        <p>
                          <span className="font-semibold">Salle:</span>{" "}
                          {selectedCompactWeekCell.slot.room}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-[#8192A8]">
                        Selectionnez une matiere dans le tableau pour afficher
                        le detail.
                      </p>
                    )}
                  </article>
                </section>
              ) : (
                <section className="overflow-hidden rounded-card border border-border">
                  <div className="grid grid-cols-7 bg-[#F7FAFF]">
                    {weekDays.map((entry) => (
                      <div
                        key={entry.label}
                        className={`border-b border-r border-border px-3 py-2 text-center last:border-r-0 ${
                          sameDate(entry.date, today) ? "bg-[#E7F2FF]" : ""
                        }`}
                      >
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#4C6284]">
                          {entry.label}
                        </p>
                        <p className="text-sm font-semibold text-[#163158]">
                          {entry.date.getDate().toString().padStart(2, "0")}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 bg-white">
                    {weekDays.map((entry) => {
                      const slots = classSlots
                        .filter((slot) => slot.weekday === entry.weekday)
                        .sort((a, b) => a.start.localeCompare(b.start));

                      return (
                        <div
                          key={`${entry.label}-content`}
                          className="min-h-[360px] border-r border-border p-2 last:border-r-0"
                        >
                          {slots.length === 0 ? (
                            <p className="mt-2 text-center text-xs text-[#8192A8]">
                              -
                            </p>
                          ) : (
                            <div className="grid gap-2">
                              {slots.map((slot) => {
                                const tone = subjectTone(
                                  slot.subject,
                                  slot.subjectId,
                                  subjectColorsBySubjectId,
                                );
                                return (
                                  <article
                                    key={slot.id}
                                    className="rounded-[10px] border px-2 py-1.5"
                                    style={{
                                      backgroundColor: tone.bgColor,
                                      borderColor: tone.borderColor,
                                    }}
                                  >
                                    <p
                                      className="text-[11px] font-semibold"
                                      style={{ color: tone.textColor }}
                                    >
                                      {slot.start} - {slot.end}
                                    </p>
                                    <p
                                      className="truncate text-xs font-semibold uppercase tracking-[0.02em]"
                                      style={{ color: tone.textColor }}
                                    >
                                      {subjectLabel(slot.subject)}
                                    </p>
                                    <p className="truncate text-[11px] text-[#3B4F6B]">
                                      {slot.teacher}
                                    </p>
                                    <p className="truncate text-[11px] font-medium text-[#4B6285]">
                                      Salle {slot.room}
                                    </p>
                                  </article>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )
            ) : null}

            {viewMode === "month" ? (
              isCompactViewport ? (
                <section className="grid gap-3">
                  <article className="rounded-card border border-border bg-surface p-3 shadow-[0_8px_20px_-18px_rgba(10,98,191,0.6)]">
                    <div className="mb-2 grid grid-cols-7 gap-1">
                      {WEEKDAY_SHORT.map((label) => (
                        <p
                          key={`compact-head-${label}`}
                          className="text-center text-[10px] font-semibold uppercase tracking-wide text-[#5A7093]"
                        >
                          {label}
                        </p>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {compactMonthCalendarCells.map((entry, index) => {
                        if (!entry.date) {
                          return (
                            <div
                              key={`compact-month-empty-${index}`}
                              className="h-11 rounded-[8px] bg-[#F7FAFD]"
                            />
                          );
                        }

                        const isToday = sameDate(entry.date, today);
                        const isSelected = selectedCompactMonthDate
                          ? sameDate(entry.date, selectedCompactMonthDate)
                          : false;

                        return (
                          <button
                            key={`compact-month-cell-${entry.date.toISOString()}`}
                            type="button"
                            onClick={() =>
                              setSelectedCompactMonthDate(entry.date)
                            }
                            className={`relative h-11 rounded-[8px] border text-center transition ${
                              isSelected
                                ? "border-[#0A62BF] bg-[#0A62BF] text-white"
                                : "border-[#D8E5F5] bg-white text-[#20446E] hover:bg-[#EDF5FF]"
                            }`}
                            title={new Intl.DateTimeFormat("fr-FR", {
                              weekday: "long",
                              day: "2-digit",
                              month: "long",
                            }).format(entry.date)}
                          >
                            <span
                              className={`text-sm font-semibold ${
                                isToday && !isSelected ? "text-[#0A62BF]" : ""
                              }`}
                            >
                              {entry.date.getDate()}
                            </span>
                            {entry.slotsCount > 0 ? (
                              <span
                                className={`absolute bottom-1 right-1 rounded-full px-1 text-[9px] font-semibold ${
                                  isSelected
                                    ? "bg-white/20 text-white"
                                    : "bg-[#E1EEFF] text-[#0A62BF]"
                                }`}
                              >
                                {entry.slotsCount}
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </article>

                  <article className="rounded-card border border-border bg-surface p-3 shadow-[0_8px_20px_-18px_rgba(7,38,78,0.45)]">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#4C6284]">
                      Agenda du jour selectionne
                    </p>
                    <p className="mb-3 text-sm font-semibold text-[#163158]">
                      {selectedCompactMonthDate
                        ? new Intl.DateTimeFormat("fr-FR", {
                            weekday: "long",
                            day: "2-digit",
                            month: "long",
                          }).format(selectedCompactMonthDate)
                        : "-"}
                    </p>

                    {selectedCompactMonthEntry &&
                    selectedCompactMonthEntry.slots.length > 0 ? (
                      <div className="grid gap-2">
                        {selectedCompactMonthEntry.slots.map((slot) => {
                          const tone = subjectTone(
                            slot.subject,
                            slot.subjectId,
                            subjectColorsBySubjectId,
                          );
                          return (
                            <div
                              key={`compact-month-selected-${slot.id}`}
                              className="rounded-[10px] border px-2 py-1.5"
                              style={{
                                backgroundColor: tone.bgColor,
                                borderColor: tone.borderColor,
                              }}
                            >
                              <p
                                className="text-[11px] font-semibold"
                                style={{ color: tone.textColor }}
                              >
                                {slot.start} - {slot.end}
                              </p>
                              <p
                                className="truncate text-xs font-semibold uppercase tracking-[0.02em]"
                                style={{ color: tone.textColor }}
                              >
                                {subjectLabel(slot.subject)}
                              </p>
                              <p className="truncate text-[11px] text-[#3B4F6B]">
                                {slot.teacher}
                              </p>
                              <p className="truncate text-[11px] font-medium text-[#4B6285]">
                                Salle {slot.room}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-[#8192A8]">
                        Aucun cours programme pour cette journee.
                      </p>
                    )}
                  </article>
                </section>
              ) : (
                <section className="overflow-hidden rounded-card border border-border">
                  <div className="grid grid-cols-7 bg-[#F7FAFF]">
                    {WEEKDAY_LONG.map((label) => (
                      <div
                        key={label}
                        className="border-b border-r border-border px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-[#4C6284] last:border-r-0"
                      >
                        {label}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 bg-white">
                    {monthMatrix.map((cell) => {
                      const isToday = sameDate(cell.date, today);
                      return (
                        <div
                          key={cell.date.toISOString()}
                          className={`min-h-[140px] border-r border-t border-border p-2 last:border-r-0 ${
                            cell.isCurrentMonth ? "" : "bg-[#FAFBFD]"
                          }`}
                        >
                          <p
                            className={`mb-2 text-right text-xs font-semibold ${
                              isToday
                                ? "text-[#0A62BF]"
                                : cell.isCurrentMonth
                                  ? "text-[#274566]"
                                  : "text-[#A1AEC0]"
                            }`}
                          >
                            {cell.date.getDate().toString().padStart(2, "0")}
                          </p>
                          <div className="grid gap-1">
                            {cell.slots.slice(0, 3).map((slot) => {
                              const tone = subjectTone(
                                slot.subject,
                                slot.subjectId,
                                subjectColorsBySubjectId,
                              );
                              return (
                                <div
                                  key={`${cell.date.toDateString()}-${slot.id}`}
                                  className="truncate rounded-full px-2 py-1 text-[10px] font-semibold"
                                  style={{
                                    backgroundColor: tone.bgColor,
                                    color: tone.textColor,
                                  }}
                                  title={`${slot.start} ${subjectLabel(slot.subject)} - Salle ${slot.room}`}
                                >
                                  {slot.start} {subjectLabel(slot.subject)} -{" "}
                                  {slot.room}
                                </div>
                              );
                            })}
                            {cell.slots.length > 3 ? (
                              <p className="text-[10px] font-medium text-[#6682A8]">
                                +{cell.slots.length - 3} autres
                              </p>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )
            ) : null}
          </div>
        )}
      </Card>
    </div>
  );
}
