"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export type TimetableViewMode = "day" | "week" | "month";

export type TimetableDisplaySlot = {
  id: string;
  occurrenceDate: string;
  weekday: number;
  startMinute: number;
  endMinute: number;
  subjectId: string;
  subjectName: string;
  teacherName: string;
  teacherGender?: string | null;
  room: string | null;
  status?: "PLANNED" | "CANCELLED";
  source?: "RECURRING" | "EXCEPTION_OVERRIDE" | "ONE_OFF";
};

type WeekDay = {
  weekday: number;
  date: Date;
  label: string;
  shortLabel: string;
};

type TimetableViewsProps = {
  slots: TimetableDisplaySlot[];
  viewMode: TimetableViewMode;
  onViewModeChange: (mode: TimetableViewMode) => void;
  cursorDate: Date;
  onCursorDateChange: (date: Date) => void;
  isCompactViewport: boolean;
  subjectColorsBySubjectId: Record<string, string>;
  onSlotClick?: (slot: TimetableDisplaySlot) => void;
  dayEmptyLabel?: string;
  monthEmptyLabel?: string;
};

const WEEKDAY_OPTIONS = [
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
  { value: 7, label: "Dimanche" },
];

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

function toIsoDateString(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseOccurrenceDate(value: string) {
  const dateOnly = value.includes("T") ? value.slice(0, 10) : value;
  const [yearRaw, monthRaw, dayRaw] = dateOnly.split("-");
  const year = Number.parseInt(yearRaw ?? "", 10);
  const month = Number.parseInt(monthRaw ?? "", 10);
  const day = Number.parseInt(dayRaw ?? "", 10);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    return null;
  }
  return new Date(year, month - 1, day);
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

function subjectShortLabel(subjectName: string) {
  const firstWord = subjectName.split(" ")[0] ?? subjectName;
  return firstWord.slice(0, 3).toUpperCase();
}

function formatTeacherDisplay(slot: TimetableDisplaySlot) {
  if (!slot.teacherGender) {
    return slot.teacherName;
  }
  return `${teacherPrefixFromGender(slot.teacherGender)} ${slot.teacherName}`;
}

export function TimetableViews({
  slots,
  viewMode,
  onViewModeChange,
  cursorDate,
  onCursorDateChange,
  isCompactViewport,
  subjectColorsBySubjectId,
  onSlotClick,
  dayEmptyLabel = "Aucun creneau pour cette journee.",
  monthEmptyLabel = "Aucun creneau pour ce jour.",
}: TimetableViewsProps) {
  const today = stripTime(new Date());

  const weekStart = useMemo(() => startOfWeek(cursorDate), [cursorDate]);
  const weekDays = useMemo<WeekDay[]>(
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

  const daySlots = useMemo(
    () =>
      slots
        .filter((entry) => entry.occurrenceDate === toIsoDateString(cursorDate))
        .sort((a, b) => a.startMinute - b.startMinute),
    [cursorDate, slots],
  );

  const weekOccurrencesByDate = useMemo(() => {
    const map = new Map<string, TimetableDisplaySlot[]>();
    weekDays.forEach((entry) => {
      const key = toIsoDateString(entry.date);
      const rows = slots
        .filter((occurrence) => occurrence.occurrenceDate === key)
        .sort((a, b) => a.startMinute - b.startMinute);
      map.set(key, rows);
    });
    return map;
  }, [slots, weekDays]);

  const activeRange = useMemo(() => {
    if (viewMode === "day") {
      const day = stripTime(cursorDate);
      return { from: day, to: day };
    }
    if (viewMode === "week") {
      const from = startOfWeek(cursorDate);
      return { from, to: addDays(from, 6) };
    }
    const from = new Date(cursorDate.getFullYear(), cursorDate.getMonth(), 1);
    const to = new Date(cursorDate.getFullYear(), cursorDate.getMonth() + 1, 0);
    return { from, to };
  }, [cursorDate, viewMode]);

  const { showSaturday, showSunday } = useMemo(() => {
    const from = stripTime(activeRange.from);
    const to = stripTime(activeRange.to);
    let hasSaturday = false;
    let hasSunday = false;

    for (const slot of slots) {
      if ((slot.status ?? "PLANNED") !== "PLANNED") continue;
      const occurrenceDate = parseOccurrenceDate(slot.occurrenceDate);
      if (!occurrenceDate) continue;
      if (occurrenceDate < from || occurrenceDate > to) continue;
      const weekday = toWeekdayMondayFirst(occurrenceDate);
      if (weekday === 6) hasSaturday = true;
      if (weekday === 7) hasSunday = true;
      if (hasSaturday && hasSunday) break;
    }

    return { showSaturday: hasSaturday, showSunday: hasSunday };
  }, [activeRange.from, activeRange.to, slots]);

  const visibleWeekdayOptions = useMemo(
    () =>
      WEEKDAY_OPTIONS.filter(
        (entry) =>
          entry.value <= 5 ||
          (entry.value === 6 && showSaturday) ||
          (entry.value === 7 && showSunday),
      ),
    [showSaturday, showSunday],
  );

  const monthColumns = visibleWeekdayOptions.length;

  const monthCalendarCells = useMemo(() => {
    const daysInMonth = new Date(
      cursorDate.getFullYear(),
      cursorDate.getMonth() + 1,
      0,
    ).getDate();

    const visibleWeekdays = visibleWeekdayOptions.map((entry) => entry.value);

    // Find first visible day
    let firstVisibleDay: Date | null = null;
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(
        cursorDate.getFullYear(),
        cursorDate.getMonth(),
        day,
      );
      if (visibleWeekdays.includes(toWeekdayMondayFirst(date))) {
        firstVisibleDay = date;
        break;
      }
    }
    if (!firstVisibleDay) {
      firstVisibleDay = new Date(
        cursorDate.getFullYear(),
        cursorDate.getMonth(),
        1,
      );
    }

    const colIndexOfFirst = visibleWeekdays.indexOf(
      toWeekdayMondayFirst(firstVisibleDay),
    );
    const leadingEmpty = Math.max(0, colIndexOfFirst);

    const cells: Array<{ date: Date | null; slots: TimetableDisplaySlot[] }> =
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
      if (!visibleWeekdays.includes(toWeekdayMondayFirst(date))) continue;
      const daySlotsForMonth = slots
        .filter((slot) => slot.occurrenceDate === toIsoDateString(date))
        .sort((a, b) => a.startMinute - b.startMinute);
      cells.push({ date, slots: daySlotsForMonth });
    }

    while (cells.length % monthColumns !== 0) {
      cells.push({ date: null, slots: [] });
    }

    return cells;
  }, [cursorDate, slots, visibleWeekdayOptions, monthColumns]);

  const compactVisibleWeekDays = useMemo(
    () =>
      weekDays.filter(
        (entry) =>
          entry.weekday <= 5 ||
          (entry.weekday === 6 && showSaturday) ||
          (entry.weekday === 7 && showSunday),
      ),
    [showSaturday, showSunday, weekDays],
  );

  const weekSlotsByWeekday = useMemo(() => {
    const result = new Map<number, TimetableDisplaySlot[]>();
    weekDays.forEach((entry) => {
      const rows =
        weekOccurrencesByDate
          .get(toIsoDateString(entry.date))
          ?.filter((slot) => (slot.status ?? "PLANNED") === "PLANNED")
          .sort((a, b) => a.startMinute - b.startMinute) ?? [];
      result.set(entry.weekday, rows);
    });
    return result;
  }, [weekDays, weekOccurrencesByDate]);

  const compactTimelineStartMinute = 7 * 60;
  const compactTimelineEndMinute = 18 * 60;
  const compactTimelinePxPerHour = 36;
  const compactTimelineHeight =
    ((compactTimelineEndMinute - compactTimelineStartMinute) / 60) *
    compactTimelinePxPerHour;
  const compactTimelineHours = useMemo(() => {
    const hours: number[] = [];
    for (
      let minute = compactTimelineStartMinute;
      minute <= compactTimelineEndMinute;
      minute += 60
    ) {
      hours.push(minute);
    }
    return hours;
  }, [compactTimelineStartMinute, compactTimelineEndMinute]);

  const compactMonthCalendarCells = useMemo(
    () =>
      monthCalendarCells.map((entry) => ({
        date: entry.date,
        slotsCount: entry.slots.filter(
          (slot) => (slot.status ?? "PLANNED") === "PLANNED",
        ).length,
      })),
    [monthCalendarCells],
  );

  const [selectedMonthDate, setSelectedMonthDate] = useState<Date | null>(null);
  const [selectedCompactMonthDate, setSelectedCompactMonthDate] =
    useState<Date | null>(null);
  const [selectedCompactWeekCell, setSelectedCompactWeekCell] = useState<{
    slot: TimetableDisplaySlot;
    date: Date;
  } | null>(null);

  useEffect(() => {
    if (!isCompactViewport || viewMode !== "week") {
      return;
    }

    if (selectedCompactWeekCell) {
      const stillVisible = compactVisibleWeekDays.some((entry) =>
        sameDate(entry.date, selectedCompactWeekCell.date),
      );
      if (stillVisible) {
        return;
      }
    }

    const todayWeekDay = compactVisibleWeekDays.find((entry) =>
      sameDate(entry.date, today),
    );
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

    const firstWithSlot = compactVisibleWeekDays.find(
      (entry) => (weekSlotsByWeekday.get(entry.weekday) ?? []).length > 0,
    );
    if (firstWithSlot) {
      const slotsForDay = weekSlotsByWeekday.get(firstWithSlot.weekday) ?? [];
      setSelectedCompactWeekCell({
        slot: slotsForDay[0],
        date: firstWithSlot.date,
      });
      return;
    }

    setSelectedCompactWeekCell(null);
  }, [
    isCompactViewport,
    viewMode,
    compactVisibleWeekDays,
    weekSlotsByWeekday,
    selectedCompactWeekCell,
    today,
  ]);

  useEffect(() => {
    if (!isCompactViewport || viewMode !== "month") {
      return;
    }

    const firstSelectableDate = compactMonthCalendarCells.find(
      (entry) => entry.date,
    )?.date;
    if (!firstSelectableDate) {
      return;
    }
    const todayInCurrentMonth =
      today.getFullYear() === cursorDate.getFullYear() &&
      today.getMonth() === cursorDate.getMonth();
    const todaySelectable = compactMonthCalendarCells.some(
      (entry) => entry.date && sameDate(entry.date, today),
    );

    if (!selectedCompactMonthDate) {
      setSelectedCompactMonthDate(
        todayInCurrentMonth && todaySelectable ? today : firstSelectableDate,
      );
      return;
    }

    const selectedInCurrentMonth =
      selectedCompactMonthDate.getFullYear() === cursorDate.getFullYear() &&
      selectedCompactMonthDate.getMonth() === cursorDate.getMonth();
    if (!selectedInCurrentMonth) {
      setSelectedCompactMonthDate(
        todayInCurrentMonth && todaySelectable ? today : firstSelectableDate,
      );
    }
  }, [
    compactMonthCalendarCells,
    isCompactViewport,
    viewMode,
    cursorDate,
    selectedCompactMonthDate,
    today,
  ]);

  const selectedCompactMonthEntry = useMemo(() => {
    if (!selectedCompactMonthDate) {
      return null;
    }
    return (
      monthCalendarCells.find(
        (entry) => entry.date && sameDate(entry.date, selectedCompactMonthDate),
      ) ?? null
    );
  }, [monthCalendarCells, selectedCompactMonthDate]);

  const selectedMonthSlots = useMemo(() => {
    if (!selectedMonthDate) {
      return [] as TimetableDisplaySlot[];
    }
    return slots
      .filter(
        (slot) => slot.occurrenceDate === toIsoDateString(selectedMonthDate),
      )
      .sort((a, b) => a.startMinute - b.startMinute);
  }, [selectedMonthDate, slots]);

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

  function moveCursorForMode(mode: TimetableViewMode, direction: -1 | 1) {
    if (mode === "day") {
      let next = addDays(cursorDate, direction);
      const hiddenWeekdays = [
        ...(!showSaturday ? [6] : []),
        ...(!showSunday ? [7] : []),
      ];
      if (hiddenWeekdays.length > 0) {
        while (hiddenWeekdays.includes(toWeekdayMondayFirst(next))) {
          next = addDays(next, direction);
        }
      }
      onCursorDateChange(next);
      return;
    }
    if (mode === "week") {
      onCursorDateChange(addDays(cursorDate, direction * 7));
      return;
    }
    onCursorDateChange(addMonths(cursorDate, direction));
  }

  const onClickSlot = (slot: TimetableDisplaySlot) => {
    if (onSlotClick) {
      onSlotClick(slot);
    }
  };

  return (
    <section className="grid gap-3 rounded-card border border-border bg-background p-3">
      {isCompactViewport ? (
        <div className="grid min-w-0 gap-2">
          <div className="grid min-w-0 grid-cols-3 gap-1 rounded-[8px] border border-[#DCE8F7] bg-[#F8FBFF] p-1">
            {(
              [
                { key: "day", label: "Jour" },
                { key: "week", label: "Semaine" },
                { key: "month", label: "Mois" },
              ] as Array<{ key: TimetableViewMode; label: string }>
            ).map((tabOption) => (
              <button
                key={`compact-tab-${tabOption.key}`}
                type="button"
                onClick={() => onViewModeChange(tabOption.key)}
                className={`h-8 min-w-0 rounded-[6px] px-2 text-[11px] font-semibold transition ${
                  viewMode === tabOption.key
                    ? "bg-[#0A62BF] text-white shadow-[0_6px_14px_-10px_rgba(10,98,191,0.95)]"
                    : "text-[#2B4A74] hover:bg-white"
                }`}
              >
                {tabOption.label}
              </button>
            ))}
          </div>

          <div className="grid min-w-0 grid-cols-[40px_minmax(0,1fr)_40px] items-center gap-2 rounded-[8px] border border-[#DCE8F7] bg-[#F8FBFF] p-1">
            <button
              type="button"
              onClick={() => moveCursorForMode(viewMode, -1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] bg-[#EAF3FF] text-[#0A62BF] hover:bg-[#DCEBFF]"
              aria-label={`${activeModeLabel} precedent`}
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={2.6} />
            </button>

            <button
              type="button"
              onClick={() => {
                if (viewMode === "day") {
                  const hiddenWeekdays = [
                    ...(!showSaturday ? [6] : []),
                    ...(!showSunday ? [7] : []),
                  ];
                  let next = today;
                  while (
                    hiddenWeekdays.length > 0 &&
                    hiddenWeekdays.includes(toWeekdayMondayFirst(next))
                  ) {
                    next = addDays(next, 1);
                  }
                  onCursorDateChange(next);
                  return;
                }
                onCursorDateChange(today);
              }}
              className="min-w-0 rounded-[6px] bg-white px-2 py-1 text-center text-[13px] font-semibold text-[#163158]"
              title={`Revenir a ${activeModeLabel.toLowerCase()} courant`}
            >
              <span className="block truncate">{activePeriodLabel}</span>
            </button>

            <button
              type="button"
              onClick={() => moveCursorForMode(viewMode, 1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] bg-[#EAF3FF] text-[#0A62BF] hover:bg-[#DCEBFF]"
              aria-label={`${activeModeLabel} suivant`}
            >
              <ChevronRight className="h-5 w-5" strokeWidth={2.6} />
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 rounded-[6px] border border-[#D4E4F6] bg-white p-1">
          {(
            [
              { key: "day", label: dayTabLabel },
              { key: "week", label: weekTabLabel },
              { key: "month", label: monthTabLabel },
            ] as Array<{ key: TimetableViewMode; label: string }>
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
                  onViewModeChange(entry.key);
                  moveCursorForMode(entry.key, -1);
                }}
                className={`inline-flex h-8 w-8 items-center justify-center rounded-[4px] ${
                  viewMode === entry.key
                    ? "bg-white/15 text-white hover:bg-white/25"
                    : "bg-[#E8F2FF] text-[#0A62BF] hover:bg-[#D7E9FF]"
                }`}
                aria-label={`Periode precedente (${entry.key})`}
              >
                <ChevronLeft className="h-5 w-5" strokeWidth={2.6} />
              </button>
              <button
                type="button"
                onClick={() => {
                  onViewModeChange(entry.key);
                  onCursorDateChange(today);
                }}
                className="min-w-0 rounded-[4px] px-2 py-1 text-[13px]"
                title="Revenir a la periode courante"
              >
                <span className="block truncate">{entry.label}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onViewModeChange(entry.key);
                  moveCursorForMode(entry.key, 1);
                }}
                className={`inline-flex h-8 w-8 items-center justify-center rounded-[4px] ${
                  viewMode === entry.key
                    ? "bg-white/15 text-white hover:bg-white/25"
                    : "bg-[#E8F2FF] text-[#0A62BF] hover:bg-[#D7E9FF]"
                }`}
                aria-label={`Periode suivante (${entry.key})`}
              >
                <ChevronRight className="h-5 w-5" strokeWidth={2.6} />
              </button>
            </div>
          ))}
        </div>
      )}

      {viewMode === "day" ? (
        <div className="grid gap-2">
          {daySlots.length === 0 ? (
            <p className="rounded-card border border-dashed border-border bg-surface px-3 py-3 text-sm text-text-secondary">
              {dayEmptyLabel}
            </p>
          ) : (
            daySlots.map((slot) => {
              const tone = subjectVisualTone(
                subjectColorsBySubjectId[slot.subjectId],
              );
              return (
                <article
                  key={`day-slot-${slot.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-card border px-3 py-2"
                  style={{
                    backgroundColor:
                      (slot.status ?? "PLANNED") === "CANCELLED"
                        ? "#FFF5F5"
                        : tone.background,
                    borderColor:
                      (slot.status ?? "PLANNED") === "CANCELLED"
                        ? "#FBCACA"
                        : tone.border,
                    borderLeftWidth:
                      (slot.source ?? "RECURRING") === "ONE_OFF"
                        ? "7px"
                        : "1px",
                    borderLeftColor:
                      (slot.source ?? "RECURRING") === "ONE_OFF"
                        ? "#D97706"
                        : (slot.status ?? "PLANNED") === "CANCELLED"
                          ? "#FBCACA"
                          : tone.border,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onClickSlot(slot)}
                    className="grid gap-0.5 text-left"
                  >
                    <p
                      className="text-sm font-semibold"
                      style={{
                        color:
                          (slot.status ?? "PLANNED") === "CANCELLED"
                            ? "#B42318"
                            : tone.text,
                        textDecoration:
                          (slot.status ?? "PLANNED") === "CANCELLED"
                            ? "line-through"
                            : undefined,
                      }}
                    >
                      {minutesToTimeValue(slot.startMinute)} -{" "}
                      {minutesToTimeValue(slot.endMinute)} · {slot.subjectName}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {formatTeacherDisplay(slot)}
                    </p>
                    {slot.room ? (
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#36557A]">
                        Salle {slot.room}
                      </p>
                    ) : null}
                  </button>
                </article>
              );
            })
          )}
        </div>
      ) : null}

      {viewMode === "week" ? (
        isCompactViewport ? (
          <section className="grid min-w-0 gap-3">
            <article className="min-w-0 overflow-hidden rounded-card border border-[#DCE8F7] bg-[#FBFDFF] p-2 shadow-[0_8px_20px_-18px_rgba(10,98,191,0.6)]">
              <div className="w-full overflow-x-auto">
                <div
                  data-testid="compact-week-timeline"
                  className="grid w-max min-w-full gap-[2px]"
                  style={{
                    gridTemplateColumns: `36px repeat(${compactVisibleWeekDays.length}, minmax(34px, 1fr))`,
                  }}
                >
                  <div className="rounded-[6px] bg-[#EFF5FD] px-1 py-1 text-left text-[8px] font-semibold uppercase tracking-[0.02em] text-[#5A7093]">
                    H
                  </div>
                  {compactVisibleWeekDays.map((entry) => (
                    <div
                      key={`compact-week-head-${entry.weekday}`}
                      className={`rounded-[6px] px-0.5 py-1 text-center text-[8px] font-semibold uppercase tracking-[0.01em] ${
                        sameDate(entry.date, today)
                          ? "bg-[#DCEBFF] text-[#0A62BF]"
                          : "bg-[#EFF5FD] text-[#5A7093]"
                      }`}
                    >
                      {entry.label.slice(0, 1)}{" "}
                      {entry.date.getDate().toString().padStart(2, "0")}
                    </div>
                  ))}

                  <div
                    className="relative rounded-[6px] bg-[#F2F7FD]"
                    style={{
                      height: `${compactTimelineHeight}px`,
                    }}
                  >
                    {compactTimelineHours.map((hourMinute, index) => (
                      <div
                        key={`compact-time-${hourMinute}`}
                        className="absolute left-0 right-0"
                        style={{
                          top:
                            index === compactTimelineHours.length - 1
                              ? `${compactTimelineHeight - 12}px`
                              : `${((hourMinute - compactTimelineStartMinute) / 60) * compactTimelinePxPerHour}px`,
                        }}
                      >
                        <span
                          data-testid={`compact-hour-${hourMinute}`}
                          className="block px-0.5 font-mono text-[8px] font-medium leading-none text-[#35557F]"
                        >
                          {minutesToTimeValue(hourMinute)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {compactVisibleWeekDays.map((entry) => {
                    const dayRows = weekSlotsByWeekday.get(entry.weekday) ?? [];
                    return (
                      <div
                        key={`compact-week-col-${entry.weekday}`}
                        data-testid={`compact-week-col-${entry.weekday}`}
                        className="relative rounded-[6px] bg-[#FAFCFF]"
                        style={{
                          height: `${compactTimelineHeight}px`,
                        }}
                      >
                        {compactTimelineHours.slice(0, -1).map((hourMinute) => (
                          <div
                            key={`compact-line-${entry.weekday}-${hourMinute}`}
                            className="absolute left-0 right-0 border-t border-[#E5EEF9]"
                            style={{
                              top: `${((hourMinute - compactTimelineStartMinute) / 60) * compactTimelinePxPerHour}px`,
                            }}
                          />
                        ))}

                        {dayRows.map((slot) => {
                          const tone = subjectVisualTone(
                            subjectColorsBySubjectId[slot.subjectId],
                          );
                          const clampedStart = Math.max(
                            compactTimelineStartMinute,
                            Math.min(
                              compactTimelineEndMinute,
                              slot.startMinute,
                            ),
                          );
                          const clampedEnd = Math.max(
                            compactTimelineStartMinute,
                            Math.min(compactTimelineEndMinute, slot.endMinute),
                          );
                          const top =
                            ((clampedStart - compactTimelineStartMinute) / 60) *
                            compactTimelinePxPerHour;
                          const height = Math.max(
                            16,
                            ((Math.max(clampedEnd, clampedStart + 15) -
                              clampedStart) /
                              60) *
                              compactTimelinePxPerHour,
                          );
                          const isSelected =
                            selectedCompactWeekCell &&
                            selectedCompactWeekCell.slot.id === slot.id &&
                            sameDate(selectedCompactWeekCell.date, entry.date);

                          return (
                            <button
                              type="button"
                              data-testid={`compact-week-slot-${entry.weekday}-${slot.id}`}
                              key={`compact-week-slot-${entry.weekday}-${slot.id}`}
                              onClick={() => {
                                setSelectedCompactWeekCell({
                                  slot,
                                  date: entry.date,
                                });
                              }}
                              className="absolute left-0.5 right-0.5 overflow-hidden rounded-[6px] border px-0.5 py-0.5 text-left"
                              style={{
                                top,
                                minHeight: `${height}px`,
                                backgroundColor: isSelected
                                  ? tone.chip
                                  : tone.background,
                                borderColor: isSelected
                                  ? tone.chip
                                  : tone.border,
                                color: isSelected ? "#FFFFFF" : tone.text,
                                borderLeftWidth:
                                  (slot.source ?? "RECURRING") === "ONE_OFF"
                                    ? "4px"
                                    : "1px",
                                borderLeftColor:
                                  (slot.source ?? "RECURRING") === "ONE_OFF"
                                    ? "#D97706"
                                    : isSelected
                                      ? tone.chip
                                      : tone.border,
                              }}
                            >
                              <span className="block truncate text-[8px] font-semibold uppercase leading-tight tracking-[0.01em]">
                                {subjectShortLabel(slot.subjectName)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </article>

            <article
              data-testid="compact-week-detail-card"
              className="rounded-card border border-[#DCE8F7] bg-[#F9FCFF] p-3 shadow-[0_8px_20px_-18px_rgba(7,38,78,0.45)]"
              style={
                selectedCompactWeekCell
                  ? {
                      backgroundColor: subjectVisualTone(
                        subjectColorsBySubjectId[
                          selectedCompactWeekCell.slot.subjectId
                        ],
                      ).background,
                      borderColor: subjectVisualTone(
                        subjectColorsBySubjectId[
                          selectedCompactWeekCell.slot.subjectId
                        ],
                      ).border,
                    }
                  : undefined
              }
            >
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#4C6284]">
                Detail du creneau selectionne
              </p>
              {selectedCompactWeekCell ? (
                <div className="grid gap-1 text-[13px] text-[#213B5D]">
                  <p>
                    <span className="font-semibold">Matiere:</span>{" "}
                    {selectedCompactWeekCell.slot.subjectName}
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
                    {minutesToTimeValue(
                      selectedCompactWeekCell.slot.startMinute,
                    )}{" "}
                    -{" "}
                    {minutesToTimeValue(selectedCompactWeekCell.slot.endMinute)}
                  </p>
                  <p>
                    <span className="font-semibold">Enseignant:</span>{" "}
                    {formatTeacherDisplay(selectedCompactWeekCell.slot)}
                  </p>
                  <p>
                    <span className="font-semibold">Salle:</span>{" "}
                    {selectedCompactWeekCell.slot.room ?? "-"}
                  </p>
                  {onSlotClick ? (
                    <div className="pt-1">
                      <button
                        type="button"
                        className="inline-flex items-center rounded-[8px] border border-[#BCD4F5] bg-white px-2 py-1 text-[11px] font-semibold text-[#0A62BF] hover:bg-[#EEF5FF]"
                        onClick={() =>
                          onClickSlot(selectedCompactWeekCell.slot)
                        }
                      >
                        Gerer ce creneau
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-xs text-[#8192A8]">
                  Selectionnez une matiere dans le tableau pour afficher le
                  detail.
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
                    {entry.shortLabel}
                  </p>
                  <p className="text-sm font-semibold text-[#163158]">
                    {entry.date.getDate().toString().padStart(2, "0")}
                  </p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 bg-white">
              {weekDays.map((entry) => {
                const dayRows = weekSlotsByWeekday.get(entry.weekday) ?? [];
                return (
                  <div
                    key={`${entry.label}-content`}
                    className="min-h-[360px] border-r border-border p-2 last:border-r-0"
                  >
                    {dayRows.length === 0 ? (
                      <p className="mt-2 text-center text-xs text-[#8192A8]">
                        -
                      </p>
                    ) : (
                      <div className="grid gap-2">
                        {dayRows.map((slot) => {
                          const tone = subjectVisualTone(
                            subjectColorsBySubjectId[slot.subjectId],
                          );
                          return (
                            <button
                              type="button"
                              key={slot.id}
                              onClick={() => onClickSlot(slot)}
                              className="rounded-[10px] border px-2 py-1.5 text-left"
                              style={{
                                backgroundColor: tone.background,
                                borderColor: tone.border,
                                borderLeftWidth:
                                  (slot.source ?? "RECURRING") === "ONE_OFF"
                                    ? "7px"
                                    : "1px",
                                borderLeftColor:
                                  (slot.source ?? "RECURRING") === "ONE_OFF"
                                    ? "#D97706"
                                    : tone.border,
                              }}
                            >
                              <p
                                className="text-[11px] font-semibold"
                                style={{ color: tone.text }}
                              >
                                {minutesToTimeValue(slot.startMinute)} -{" "}
                                {minutesToTimeValue(slot.endMinute)}
                              </p>
                              <p
                                className="truncate text-xs font-semibold uppercase tracking-[0.02em]"
                                style={{ color: tone.text }}
                              >
                                {slot.subjectName}
                              </p>
                              <p className="truncate text-[11px] text-[#3B4F6B]">
                                {slot.teacherName}
                              </p>
                              <p className="truncate text-[11px] font-medium text-[#4B6285]">
                                Salle {slot.room ?? "-"}
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
        )
      ) : null}

      {viewMode === "month" ? (
        isCompactViewport ? (
          <section className="grid gap-3">
            <article className="rounded-card border border-border bg-surface p-3 shadow-[0_8px_20px_-18px_rgba(10,98,191,0.6)]">
              <div
                className="mb-2 grid gap-1"
                style={{
                  gridTemplateColumns: `repeat(${monthColumns}, minmax(0, 1fr))`,
                }}
              >
                {visibleWeekdayOptions.map((entry) => (
                  <p
                    key={`compact-head-${entry.value}`}
                    className="text-center text-[10px] font-semibold uppercase tracking-wide text-[#5A7093]"
                  >
                    {entry.label.slice(0, 1)}
                  </p>
                ))}
              </div>

              <div
                className="grid gap-1"
                style={{
                  gridTemplateColumns: `repeat(${monthColumns}, minmax(0, 1fr))`,
                }}
              >
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
                      onClick={() => setSelectedCompactMonthDate(entry.date)}
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
              selectedCompactMonthEntry.date &&
              selectedCompactMonthEntry.slots.length > 0 ? (
                <div className="grid gap-2">
                  {selectedCompactMonthEntry.slots.map((slot) => {
                    const tone = subjectVisualTone(
                      subjectColorsBySubjectId[slot.subjectId],
                    );
                    return (
                      <button
                        type="button"
                        key={`compact-month-selected-${slot.id}`}
                        onClick={() => onClickSlot(slot)}
                        className="rounded-[10px] border px-2 py-1.5 text-left"
                        style={{
                          backgroundColor: tone.background,
                          borderColor: tone.border,
                          borderLeftWidth:
                            (slot.source ?? "RECURRING") === "ONE_OFF"
                              ? "7px"
                              : "1px",
                          borderLeftColor:
                            (slot.source ?? "RECURRING") === "ONE_OFF"
                              ? "#D97706"
                              : tone.border,
                        }}
                      >
                        <p
                          className="text-[11px] font-semibold"
                          style={{ color: tone.text }}
                        >
                          {minutesToTimeValue(slot.startMinute)} -{" "}
                          {minutesToTimeValue(slot.endMinute)}
                        </p>
                        <p
                          className="truncate text-xs font-semibold uppercase tracking-[0.02em]"
                          style={{ color: tone.text }}
                        >
                          {slot.subjectName}
                        </p>
                        <p className="truncate text-[11px] text-[#3B4F6B]">
                          {slot.teacherName}
                        </p>
                        <p className="truncate text-[11px] font-medium text-[#4B6285]">
                          Salle {slot.room ?? "-"}
                        </p>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-[#8192A8]">{dayEmptyLabel}</p>
              )}
            </article>
          </section>
        ) : (
          <section className="grid gap-3">
            <div
              className="grid rounded-card border border-border bg-white"
              style={{
                gridTemplateColumns: `repeat(${monthColumns}, minmax(0, 1fr))`,
              }}
            >
              {visibleWeekdayOptions.map((entry) => (
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
                  selectedMonthDate && sameDate(entry.date, selectedMonthDate);
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
                      {entry.date.getDate().toString().padStart(2, "0")}
                    </p>
                    <p className="mt-1 text-[10px] text-[#5C6F88]">
                      {
                        entry.slots.filter(
                          (slot) => (slot.status ?? "PLANNED") === "PLANNED",
                        ).length
                      }{" "}
                      creneau
                      {entry.slots.filter(
                        (slot) => (slot.status ?? "PLANNED") === "PLANNED",
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
                  ? `Creneaux du ${new Intl.DateTimeFormat("fr-FR", {
                      weekday: "long",
                      day: "2-digit",
                      month: "long",
                    }).format(selectedMonthDate)}`
                  : "Selectionnez un jour pour voir les creneaux"}
              </p>
              {selectedMonthDate ? (
                selectedMonthSlots.length === 0 ? (
                  <p className="text-sm text-text-secondary">
                    {monthEmptyLabel}
                  </p>
                ) : (
                  <div className="grid gap-2">
                    {selectedMonthSlots.map((slot) => {
                      const tone = subjectVisualTone(
                        subjectColorsBySubjectId[slot.subjectId],
                      );
                      return (
                        <button
                          type="button"
                          key={`month-slot-${slot.id}`}
                          onClick={() => onClickSlot(slot)}
                          className="rounded-card border px-3 py-2 text-left"
                          style={{
                            backgroundColor: tone.background,
                            borderColor: tone.border,
                            borderLeftWidth:
                              (slot.source ?? "RECURRING") === "ONE_OFF"
                                ? "7px"
                                : "1px",
                            borderLeftColor:
                              (slot.source ?? "RECURRING") === "ONE_OFF"
                                ? "#D97706"
                                : tone.border,
                          }}
                        >
                          <p
                            className="text-sm font-semibold"
                            style={{
                              color:
                                (slot.status ?? "PLANNED") === "CANCELLED"
                                  ? "#B42318"
                                  : tone.text,
                              textDecoration:
                                (slot.status ?? "PLANNED") === "CANCELLED"
                                  ? "line-through"
                                  : undefined,
                            }}
                          >
                            {minutesToTimeValue(slot.startMinute)} -{" "}
                            {minutesToTimeValue(slot.endMinute)} ·{" "}
                            {slot.subjectName}
                          </p>
                          <p className="text-xs text-text-secondary">
                            {formatTeacherDisplay(slot)}
                            {slot.room ? ` · Salle ${slot.room}` : ""}
                            {(slot.status ?? "PLANNED") === "CANCELLED"
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
        )
      ) : null}
    </section>
  );
}
