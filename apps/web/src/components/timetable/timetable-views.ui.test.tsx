import { fireEvent, render, screen } from "@testing-library/react";
import * as React from "react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  TimetableViews,
  type TimetableDisplaySlot,
  type TimetableViewMode,
} from "./timetable-views";

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-03-10T12:00:00Z"));
});

afterAll(() => {
  vi.useRealTimers();
});

function buildSlot(
  overrides: Partial<TimetableDisplaySlot> = {},
): TimetableDisplaySlot {
  return {
    id: "slot-1",
    occurrenceDate: "2026-03-10",
    weekday: 2,
    startMinute: 8 * 60 + 45,
    endMinute: 10 * 60,
    subjectId: "sub-fr",
    subjectName: "Francais",
    teacherName: "NDEM Guy",
    teacherGender: "MALE",
    room: "B14",
    status: "PLANNED",
    source: "RECURRING",
    ...overrides,
  };
}

function Harness({
  compact = false,
  slots = [buildSlot()],
  onSlotClick,
  initialCursorDate = new Date("2026-03-10T09:00:00"),
  initialViewMode = "day" as TimetableViewMode,
}: {
  compact?: boolean;
  slots?: TimetableDisplaySlot[];
  onSlotClick?: (slot: TimetableDisplaySlot) => void;
  initialCursorDate?: Date;
  initialViewMode?: TimetableViewMode;
}) {
  const [viewMode, setViewMode] =
    React.useState<TimetableViewMode>(initialViewMode);
  const [cursorDate, setCursorDate] = React.useState(initialCursorDate);

  return (
    <TimetableViews
      slots={slots}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      cursorDate={cursorDate}
      onCursorDateChange={setCursorDate}
      isCompactViewport={compact}
      subjectColorsBySubjectId={{ subfr: "#2563EB", "sub-fr": "#2563EB" }}
      onSlotClick={onSlotClick}
    />
  );
}

describe("TimetableViews", () => {
  it("renders desktop tabs with period navigation and day slot", () => {
    render(<Harness />);

    expect(
      screen.getByRole("button", { name: "Periode precedente (day)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Periode suivante (day)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /10 mars|Aujourd'hui/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/08:45 - 10:00 · Francais/i)).toBeInTheDocument();
    expect(screen.getByText(/Mr\s+NDEM\s+Guy/i)).toBeInTheDocument();
  });

  it("supports compact week detail and action callback", () => {
    const onSlotClick = vi.fn();
    render(<Harness compact onSlotClick={onSlotClick} />);

    fireEvent.click(screen.getByRole("button", { name: "Semaine" }));
    expect(
      screen.getByText("Detail du creneau selectionne"),
    ).toBeInTheDocument();

    const compactSlot = document.querySelector(
      '[data-testid^="compact-week-slot-"]',
    ) as HTMLElement | null;
    expect(compactSlot).toBeTruthy();
    fireEvent.click(compactSlot!);

    fireEvent.click(screen.getByRole("button", { name: "Gerer ce creneau" }));
    expect(onSlotClick).toHaveBeenCalledTimes(1);
  });

  it("navigates month in compact mode and exposes selected day agenda", () => {
    const monthSlots = [
      buildSlot({ id: "slot-a", occurrenceDate: "2026-03-10", weekday: 2 }),
      buildSlot({
        id: "slot-b",
        occurrenceDate: "2026-03-11",
        weekday: 3,
        subjectName: "Anglais",
      }),
    ];

    render(<Harness compact slots={monthSlots} />);
    fireEvent.click(screen.getByRole("button", { name: "Mois" }));

    const calendarDay = screen
      .getAllByRole("button")
      .find((btn) =>
        /mardi 10 mars|10/.test(
          `${btn.getAttribute("title") ?? ""} ${btn.textContent ?? ""}`,
        ),
      );
    expect(calendarDay).toBeDefined();
    fireEvent.click(calendarDay!);

    expect(screen.getByText(/Agenda du jour selectionne/i)).toBeInTheDocument();
    expect(screen.getByText(/Francais/i)).toBeInTheDocument();
  });

  it("hides saturday and sunday columns in compact week when no weekend slots", () => {
    const weekdayOnlySlots = [
      buildSlot({ id: "slot-mon", occurrenceDate: "2026-03-09", weekday: 1 }),
      buildSlot({ id: "slot-fri", occurrenceDate: "2026-03-13", weekday: 5 }),
    ];
    render(<Harness compact slots={weekdayOnlySlots} />);

    fireEvent.click(screen.getByRole("button", { name: "Semaine" }));

    expect(screen.queryByTestId("compact-week-col-6")).not.toBeInTheDocument();
    expect(screen.queryByTestId("compact-week-col-7")).not.toBeInTheDocument();
    expect(screen.getByTestId("compact-week-col-1")).toBeInTheDocument();
    expect(screen.getByTestId("compact-week-col-5")).toBeInTheDocument();
  });

  it("hides weekend days in compact month when no weekend slots", () => {
    const weekdayOnlySlots = [
      buildSlot({ id: "slot-mon", occurrenceDate: "2026-03-09", weekday: 1 }),
      buildSlot({ id: "slot-fri", occurrenceDate: "2026-03-13", weekday: 5 }),
    ];
    render(<Harness compact slots={weekdayOnlySlots} />);

    fireEvent.click(screen.getByRole("button", { name: "Mois" }));

    const weekendButtons = screen
      .getAllByRole("button")
      .filter((button) =>
        /(samedi|dimanche)/i.test(button.getAttribute("title") ?? ""),
      );
    expect(weekendButtons.length).toBe(0);
  });

  it("skips weekend in compact day navigation when no weekend slots", () => {
    const slots = [
      buildSlot({
        id: "slot-fri",
        occurrenceDate: "2026-03-13",
        weekday: 5,
        subjectName: "Physique",
      }),
      buildSlot({
        id: "slot-mon",
        occurrenceDate: "2026-03-16",
        weekday: 1,
        subjectName: "Technologie",
      }),
    ];

    render(
      <Harness
        compact
        slots={slots}
        initialCursorDate={new Date("2026-03-13T09:00:00")}
      />,
    );

    expect(screen.getByText(/Physique/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Jour suivant" }));
    expect(screen.queryByText(/Physique/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Technologie/i)).toBeInTheDocument();
  });

  it("affiche la colonne Sam dans la grille mensuelle desktop si des cours ont lieu le samedi", () => {
    const saturdaySlots = [
      buildSlot({ id: "slot-tue", occurrenceDate: "2026-03-10", weekday: 2 }),
      buildSlot({
        id: "slot-sat",
        occurrenceDate: "2026-03-14",
        weekday: 6,
        subjectName: "Sport",
      }),
    ];
    render(<Harness slots={saturdaySlots} initialViewMode="month" />);

    // Desktop month header shows 3-letter abbreviations: Sam should appear, Dim should not
    expect(screen.getByText("Sam")).toBeInTheDocument();
    expect(screen.queryByText("Dim")).not.toBeInTheDocument();
  });

  it("masque Sam et Dim dans la grille mensuelle desktop si aucun cours le week-end", () => {
    const weekdaySlots = [
      buildSlot({ id: "slot-mon", occurrenceDate: "2026-03-09", weekday: 1 }),
      buildSlot({ id: "slot-fri", occurrenceDate: "2026-03-13", weekday: 5 }),
    ];
    render(<Harness slots={weekdaySlots} initialViewMode="month" />);

    expect(screen.queryByText("Sam")).not.toBeInTheDocument();
    expect(screen.queryByText("Dim")).not.toBeInTheDocument();
    // Weekday columns still visible
    expect(screen.getByText("Lun")).toBeInTheDocument();
    expect(screen.getByText("Ven")).toBeInTheDocument();
  });
});
