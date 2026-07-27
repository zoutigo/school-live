"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "../../../components/layout/app-shell";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { useTranslation } from "../../../i18n/useTranslation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type RoomStatus = "AVAILABLE" | "UNAVAILABLE" | "MAINTENANCE";

type RoomRow = {
  id: string;
  schoolId: string;
  name: string;
  description: string | null;
  capacity: number | null;
  maxConcurrentSlots: number;
  status: RoomStatus;
  createdAt: string;
  updatedAt: string;
};

type RoomCalendarEntry = {
  id: string;
  occurrenceDate: string;
  startMinute: number;
  endMinute: number;
  className: string;
  subjectName: string;
  teacherName: string;
};

type AgendaView = "week" | "month";

function toIsoDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfWeek(date: Date) {
  const weekday = date.getDay() === 0 ? 7 : date.getDay();
  const start = new Date(date);
  start.setDate(date.getDate() - (weekday - 1));
  return start;
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(date.getDate() + amount);
  return next;
}

function addMonths(date: Date, amount: number) {
  const next = new Date(date);
  next.setMonth(date.getMonth() + amount);
  return next;
}

function minutesToTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (totalMinutes % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function buildWeekDays(cursor: Date) {
  const monday = startOfWeek(cursor);
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

function buildMonthCells(cursor: Date): Array<Date | null> {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = (firstDay.getDay() + 6) % 7;
  const cells: Array<Date | null> = [];
  for (let i = 0; i < leading; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, month, day));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export default function RoomDetailPage() {
  return (
    <Suspense fallback={null}>
      <RoomDetailPageContent />
    </Suspense>
  );
}

function RoomDetailPageContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams<{ roomId: string }>();
  const searchParams = useSearchParams();
  const roomId = params.roomId;
  const schoolSlug = searchParams.get("schoolSlug") ?? "";

  const [room, setRoom] = useState<RoomRow | null>(null);
  const [roomLoading, setRoomLoading] = useState(true);
  const [roomError, setRoomError] = useState<string | null>(null);

  const [view, setView] = useState<AgendaView>("week");
  const [cursorDate, setCursorDate] = useState(() => new Date());
  const [entries, setEntries] = useState<RoomCalendarEntry[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const weekDays = useMemo(() => buildWeekDays(cursorDate), [cursorDate]);
  const monthCells = useMemo(() => buildMonthCells(cursorDate), [cursorDate]);
  const monthDatesOnly = useMemo(
    () => monthCells.filter((d): d is Date => d != null),
    [monthCells],
  );

  const rangeStart = view === "week" ? weekDays[0] : monthDatesOnly[0];
  const rangeEnd =
    view === "week" ? weekDays[6] : monthDatesOnly[monthDatesOnly.length - 1];
  const fromDate = toIsoDateString(rangeStart);
  const toDate = toIsoDateString(rangeEnd);

  useEffect(() => {
    if (!schoolSlug || !roomId) {
      setRoomLoading(false);
      return;
    }
    let cancelled = false;
    setRoomLoading(true);
    setRoomError(null);
    fetch(`${API_URL}/schools/${schoolSlug}/admin/rooms/${roomId}`, {
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(t("salles.detail.notFound"));
        }
        return (await response.json()) as RoomRow;
      })
      .then((data) => {
        if (!cancelled) setRoom(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setRoomError(err.message);
      })
      .finally(() => {
        if (!cancelled) setRoomLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [schoolSlug, roomId, t]);

  useEffect(() => {
    if (!schoolSlug || !roomId) return;
    let cancelled = false;
    setCalendarLoading(true);
    setCalendarError(null);
    fetch(
      `${API_URL}/schools/${schoolSlug}/admin/rooms/${roomId}/calendar?fromDate=${fromDate}&toDate=${toDate}`,
      { credentials: "include" },
    )
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Impossible de charger le calendrier de la salle.");
        }
        return (await response.json()) as RoomCalendarEntry[];
      })
      .then((data) => {
        if (!cancelled) setEntries(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setCalendarError(err.message);
      })
      .finally(() => {
        if (!cancelled) setCalendarLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [schoolSlug, roomId, fromDate, toDate]);

  useEffect(() => {
    setSelectedDay(null);
  }, [view, fromDate, toDate]);

  const entriesByDate = useMemo(() => {
    const map = new Map<string, RoomCalendarEntry[]>();
    for (const entry of entries) {
      const list = map.get(entry.occurrenceDate) ?? [];
      list.push(entry);
      map.set(entry.occurrenceDate, list);
    }
    return map;
  }, [entries]);

  function goToPrevious() {
    setCursorDate((current) =>
      view === "week" ? addDays(current, -7) : addMonths(current, -1),
    );
  }
  function goToNext() {
    setCursorDate((current) =>
      view === "week" ? addDays(current, 7) : addMonths(current, 1),
    );
  }

  const selectedDayEntries = selectedDay
    ? (entriesByDate.get(selectedDay) ?? [])
    : [];

  return (
    <AppShell
      schoolSlug={schoolSlug || null}
      schoolName={t("salles.shellName")}
    >
      <div className="grid gap-4">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push("/salles")}
          data-testid="room-detail-back"
        >
          {t("salles.detail.back")}
        </Button>

        {roomLoading ? (
          <p className="text-sm text-text-secondary">{t("common.loading")}</p>
        ) : roomError || !room ? (
          <p
            className="text-sm text-notification"
            data-testid="room-detail-error"
          >
            {roomError ?? t("salles.detail.notFound")}
          </p>
        ) : (
          <>
            <Card
              title={room.name}
              subtitle={t("salles.detail.headerTitle")}
              data-testid="room-detail-info-card"
            >
              <div className="grid gap-2 text-sm text-text-primary">
                <p className="flex items-center gap-2">
                  <span
                    className={`inline-block h-2.5 w-2.5 rounded-full ${
                      room.status === "AVAILABLE"
                        ? "bg-warm-accent"
                        : "bg-notification"
                    }`}
                    data-testid="room-detail-status-dot"
                  />
                  <span className="font-semibold">
                    {t(`salles.status.${room.status}`)}
                  </span>
                </p>
                <p className="text-text-secondary">
                  {t("salles.detail.capacityLabel")}: {room.capacity ?? "-"}
                </p>
                <p className="text-text-secondary">
                  {t("salles.detail.maxConcurrentSlotsLabel")}:{" "}
                  {room.maxConcurrentSlots}
                </p>
                <p className="text-text-secondary">
                  {t("salles.detail.descriptionLabel")}:{" "}
                  {room.description ?? t("salles.detail.noDescription")}
                </p>
              </div>
            </Card>

            <Card
              title={t("salles.detail.agendaTitle")}
              data-testid="room-detail-agenda-card"
            >
              <div className="mb-3 flex gap-2">
                <Button
                  type="button"
                  variant={view === "week" ? "primary" : "secondary"}
                  onClick={() => setView("week")}
                  data-testid="room-detail-view-week"
                >
                  {t("salles.detail.viewWeek")}
                </Button>
                <Button
                  type="button"
                  variant={view === "month" ? "primary" : "secondary"}
                  onClick={() => setView("month")}
                  data-testid="room-detail-view-month"
                >
                  {t("salles.detail.viewMonth")}
                </Button>
              </div>

              <div className="mb-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={goToPrevious}
                  aria-label="previous"
                  data-testid="room-detail-nav-previous"
                  className="text-primary"
                >
                  {"<"}
                </button>
                <p className="font-semibold text-text-primary">
                  {fromDate} - {toDate}
                </p>
                <button
                  type="button"
                  onClick={goToNext}
                  aria-label="next"
                  data-testid="room-detail-nav-next"
                  className="text-primary"
                >
                  {">"}
                </button>
              </div>

              {calendarError ? (
                <p className="mb-2 text-sm text-notification">
                  {calendarError}
                </p>
              ) : null}

              {calendarLoading ? (
                <p className="text-sm text-text-secondary">
                  {t("common.loading")}
                </p>
              ) : view === "week" ? (
                <div
                  className="grid grid-cols-7 gap-2"
                  data-testid="room-detail-week-grid"
                >
                  {weekDays.map((day) => {
                    const dateKey = toIsoDateString(day);
                    const dayEntries = entriesByDate.get(dateKey) ?? [];
                    return (
                      <div
                        key={dateKey}
                        className="rounded-card border border-border p-2"
                        data-testid={`room-detail-week-col-${dateKey}`}
                      >
                        <p className="mb-1 text-xs font-semibold text-text-secondary">
                          {
                            WEEKDAY_LABELS[
                              day.getDay() === 0 ? 6 : day.getDay() - 1
                            ]
                          }{" "}
                          {String(day.getDate()).padStart(2, "0")}
                        </p>
                        <div className="grid gap-1">
                          {dayEntries.map((entry) => (
                            <div
                              key={entry.id}
                              className="rounded-card border border-primary/40 bg-primary/10 px-1 py-1 text-[11px] text-primary"
                              data-testid={`room-detail-week-slot-${entry.id}`}
                            >
                              {minutesToTime(entry.startMinute)}-
                              {minutesToTime(entry.endMinute)}
                              <br />
                              {entry.className}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div data-testid="room-detail-month-grid">
                  <div className="mb-1 grid grid-cols-7 text-center text-xs font-semibold text-text-secondary">
                    {WEEKDAY_LABELS.map((label) => (
                      <span key={label}>{label}</span>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {monthCells.map((day, index) => {
                      if (!day) {
                        return (
                          <div
                            key={`empty-${index}`}
                            className="aspect-square"
                          />
                        );
                      }
                      const dateKey = toIsoDateString(day);
                      const count = entriesByDate.get(dateKey)?.length ?? 0;
                      return (
                        <button
                          key={dateKey}
                          type="button"
                          onClick={() => setSelectedDay(dateKey)}
                          data-testid={`room-detail-month-cell-${dateKey}`}
                          className={`aspect-square rounded-card border text-xs ${
                            selectedDay === dateKey
                              ? "border-primary bg-primary/10"
                              : "border-border"
                          }`}
                        >
                          {day.getDate()}
                          {count > 0 ? (
                            <span className="ml-1 rounded-full bg-primary px-1 text-white">
                              {count}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>

                  {selectedDay ? (
                    <div className="mt-3 grid gap-2">
                      {selectedDayEntries.map((entry) => (
                        <div
                          key={entry.id}
                          className="rounded-card border border-border p-2 text-sm"
                          data-testid={`room-detail-day-entry-${entry.id}`}
                        >
                          <p className="font-semibold text-text-primary">
                            {minutesToTime(entry.startMinute)} -{" "}
                            {minutesToTime(entry.endMinute)}
                          </p>
                          <p className="text-text-secondary">
                            {entry.className} - {entry.subjectName} -{" "}
                            {entry.teacherName}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}
