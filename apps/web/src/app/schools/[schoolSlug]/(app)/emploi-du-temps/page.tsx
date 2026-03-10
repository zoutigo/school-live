"use client";

import { useMemo, useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Card } from "../../../../../components/ui/card";
import {
  TimetableViews,
  type TimetableDisplaySlot,
} from "../../../../../components/timetable/timetable-views";

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
  oneOffSlots?: Array<{
    id: string;
    occurrenceDate: string;
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

function toWeekdayMondayFirst(date: Date) {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

function startOfWeek(date: Date) {
  const normalized = stripTime(date);
  return addDays(normalized, 1 - toWeekdayMondayFirst(normalized));
}

function subjectLabel(subject: string) {
  return subject.includes("_") ? subject.replaceAll("_", " ") : subject;
}

function minuteToTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (totalMinutes % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function timeToMinute(value: string) {
  const [hoursRaw, minutesRaw] = value.split(":");
  const hours = Number.parseInt(hoursRaw ?? "", 10);
  const minutes = Number.parseInt(minutesRaw ?? "", 10);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return Number.NaN;
  }
  return hours * 60 + minutes;
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeApiDateOnly(value: string) {
  if (!value) {
    return value;
  }
  const trimmed = value.trim();
  if (trimmed.includes("T")) {
    return trimmed.slice(0, 10);
  }
  return trimmed;
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
  const [oneOffSlots, setOneOffSlots] = useState<TimetableDisplaySlot[]>([]);
  const [subjectColorsBySubjectId, setSubjectColorsBySubjectId] = useState<
    Record<string, string>
  >({});
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [cursorDate, setCursorDate] = useState(stripTime(new Date()));
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
      setOneOffSlots(
        (timetablePayload.oneOffSlots ?? []).map((slot) => ({
          id: `${slot.id}-${normalizeApiDateOnly(slot.occurrenceDate)}`,
          occurrenceDate: normalizeApiDateOnly(slot.occurrenceDate),
          weekday: toWeekdayMondayFirst(
            new Date(normalizeApiDateOnly(slot.occurrenceDate)),
          ),
          startMinute: slot.startMinute,
          endMinute: slot.endMinute,
          subjectId: slot.subject.id,
          subjectName: slot.subject.name,
          teacherName: `${slot.teacherUser.lastName.toUpperCase()} ${slot.teacherUser.firstName}`,
          room: slot.room?.trim() || null,
          status: "PLANNED",
          source: "ONE_OFF",
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

  const className = activeChildClassName || "6eme N3";
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

  const timetableViewSlots = useMemo<TimetableDisplaySlot[]>(() => {
    const rows: TimetableDisplaySlot[] = [];

    for (
      let date = new Date(activeRange.from);
      date <= activeRange.to;
      date = addDays(date, 1)
    ) {
      const weekday = toWeekdayMondayFirst(date);
      const occurrenceDate = toIsoDate(date);
      classSlots
        .filter((slot) => slot.weekday === weekday)
        .forEach((slot) => {
          rows.push({
            id: `${slot.id}-${occurrenceDate}`,
            occurrenceDate,
            weekday,
            startMinute: timeToMinute(slot.start),
            endMinute: timeToMinute(slot.end),
            subjectId: slot.subjectId ?? slot.subject,
            subjectName: subjectLabel(slot.subject),
            teacherName: slot.teacher,
            room: slot.room === "-" ? null : slot.room,
            status: "PLANNED",
            source: "RECURRING",
          });
        });
    }

    const oneOffRowsInRange = oneOffSlots.filter((slot) => {
      const date = stripTime(new Date(slot.occurrenceDate));
      return date >= activeRange.from && date <= activeRange.to;
    });
    rows.push(...oneOffRowsInRange);

    return rows;
  }, [activeRange.from, activeRange.to, classSlots, oneOffSlots]);

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
                <TimetableViews
                  slots={timetableViewSlots}
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                  cursorDate={cursorDate}
                  onCursorDateChange={setCursorDate}
                  isCompactViewport={isCompactViewport}
                  subjectColorsBySubjectId={subjectColorsBySubjectId}
                  dayEmptyLabel="Aucun cours programme pour cette journee."
                  monthEmptyLabel="Aucun cours programme pour cette journee."
                />
              </div>
            </section>
          </div>
        )}
      </Card>
    </div>
  );
}
