import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StudentTimetablePage from "./page";

const replaceMock = vi.fn();
let paramsMock: { schoolSlug: string; childId?: string } = {
  schoolSlug: "college-vogt",
};
let searchParamsMock = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
  useParams: () => paramsMock,
  useSearchParams: () => searchParamsMock,
}));

function mockMeResponse(payload: unknown, status = 200) {
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

function buildTimetablePayload(
  overrides?: Partial<{
    student: { id: string; firstName: string; lastName: string };
    classEntity: {
      id: string;
      name: string;
      schoolYearId: string;
      academicLevelId: string | null;
    };
    oneOffSlots: Array<{
      id: string;
      occurrenceDate: string;
      startMinute: number;
      endMinute: number;
      room: string | null;
      subject: { id: string; name: string };
      teacherUser: { id: string; firstName: string; lastName: string };
    }>;
  }>,
) {
  return {
    student: overrides?.student ?? {
      id: "student-1",
      firstName: "Lisa",
      lastName: "MBELE",
    },
    class: overrides?.classEntity ?? {
      id: "class-1",
      name: "6eme N3",
      schoolYearId: "sy-1",
      academicLevelId: null,
    },
    slots: [
      {
        id: "slot-fr-mon",
        weekday: 1,
        startMinute: 525,
        endMinute: 580,
        room: "B14",
        subject: { id: "subject-fr", name: "FRANCAIS" },
        teacherUser: { id: "teacher-fr", firstName: "P.", lastName: "Jamet" },
      },
      {
        id: "slot-math-mon",
        weekday: 1,
        startMinute: 580,
        endMinute: 635,
        room: "B11",
        subject: { id: "subject-math", name: "MATHEMATIQUES" },
        teacherUser: {
          id: "teacher-math",
          firstName: "C.",
          lastName: "Auberger",
        },
      },
      {
        id: "slot-ang-mon",
        weekday: 1,
        startMinute: 650,
        endMinute: 705,
        room: "A08",
        subject: { id: "subject-ang", name: "ANGLAIS" },
        teacherUser: {
          id: "teacher-ang",
          firstName: "S.",
          lastName: "Assade",
        },
      },
      {
        id: "slot-fr-tue",
        weekday: 2,
        startMinute: 525,
        endMinute: 580,
        room: "B14",
        subject: { id: "subject-fr", name: "FRANCAIS" },
        teacherUser: { id: "teacher-fr", firstName: "P.", lastName: "Jamet" },
      },
      {
        id: "slot-fr-wed",
        weekday: 3,
        startMinute: 525,
        endMinute: 580,
        room: "B14",
        subject: { id: "subject-fr", name: "FRANCAIS" },
        teacherUser: { id: "teacher-fr", firstName: "P.", lastName: "Jamet" },
      },
      {
        id: "slot-fr-thu",
        weekday: 4,
        startMinute: 525,
        endMinute: 580,
        room: "B14",
        subject: { id: "subject-fr", name: "FRANCAIS" },
        teacherUser: { id: "teacher-fr", firstName: "P.", lastName: "Jamet" },
      },
      {
        id: "slot-fr-fri",
        weekday: 5,
        startMinute: 525,
        endMinute: 580,
        room: "B14",
        subject: { id: "subject-fr", name: "FRANCAIS" },
        teacherUser: { id: "teacher-fr", firstName: "P.", lastName: "Jamet" },
      },
    ],
    oneOffSlots: overrides?.oneOffSlots ?? [],
    subjectStyles: [],
    calendarEvents: [],
  };
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function mockTimetableFlow(mePayload: unknown, timetablePayload?: unknown) {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    if (url.includes("/schools/college-vogt/me")) {
      return new Response(JSON.stringify(mePayload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.includes("/schools/college-vogt/timetable/me")) {
      return new Response(
        JSON.stringify(timetablePayload ?? buildTimetablePayload()),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify({ message: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  });
}

function findMonthTitleButton() {
  return screen.getAllByRole("button").find((button) => {
    const label = button.textContent?.trim() ?? "";
    return (
      /\d{4}/.test(label) && !label.includes("-") && !label.includes("Ce mois")
    );
  });
}

function findWeekTitleButton() {
  return screen.getAllByRole("button").find((button) => {
    const label = button.textContent?.trim() ?? "";
    return /\d{4}/.test(label) && label.includes(" - ");
  });
}

function findDayTitleButton() {
  return screen.getAllByRole("button").find((button) => {
    const label = button.textContent?.trim() ?? "";
    return (
      /^\d{2}\s+\w+/i.test(label) &&
      !label.includes("-") &&
      !label.includes("Aujourd")
    );
  });
}

function mockCompactViewport() {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("max-width"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe("StudentTimetablePage UI", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
    paramsMock = { schoolSlug: "college-vogt" };
    searchParamsMock = new URLSearchParams();
  });

  it("renders student timetable in day mode with class and room details", async () => {
    mockTimetableFlow({
      firstName: "Lisa",
      lastName: "MBELE",
      role: "STUDENT",
      currentEnrollment: { class: { name: "6eme N3" } },
    });

    render(<StudentTimetablePage />);

    expect(await screen.findByText("Lisa MBELE - 6eme N3")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Aujourd'hui" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Periode precedente (day)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Periode suivante (day)" }),
    ).toBeInTheDocument();
    const daySlotButton = screen
      .getAllByRole("button")
      .find((button) =>
        /\d{2}:\d{2}\s-\s\d{2}:\d{2}\s·/i.test(button.textContent ?? ""),
      );
    expect(daySlotButton).toBeDefined();
    expect(daySlotButton?.textContent ?? "").toMatch(/Salle/i);
  });

  it("navigates days and returns to today from the day title button", async () => {
    mockTimetableFlow({
      firstName: "Lisa",
      lastName: "MBELE",
      role: "STUDENT",
      currentEnrollment: { class: { name: "6eme N3" } },
    });

    render(<StudentTimetablePage />);
    await screen.findByText("Lisa MBELE - 6eme N3");

    fireEvent.click(
      screen.getByRole("button", { name: "Periode suivante (day)" }),
    );

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Aujourd'hui" }),
      ).not.toBeInTheDocument();
    });

    const shiftedDayButton = findDayTitleButton();
    expect(shiftedDayButton).toBeDefined();
    fireEvent.click(shiftedDayButton!);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Aujourd'hui" }),
      ).toBeInTheDocument();
    });
  });

  it("handles week tab navigation and reset to current week", async () => {
    mockTimetableFlow({
      firstName: "Lisa",
      lastName: "MBELE",
      role: "STUDENT",
      currentEnrollment: { class: { name: "6eme N3" } },
    });

    render(<StudentTimetablePage />);
    await screen.findByText("Lisa MBELE - 6eme N3");

    fireEvent.click(screen.getByRole("button", { name: "Cette semaine" }));

    expect(
      screen.getByRole("button", { name: "Periode precedente (week)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Periode suivante (week)" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Salle/i).length).toBeGreaterThan(0);

    fireEvent.click(
      screen.getByRole("button", { name: "Periode suivante (week)" }),
    );

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Cette semaine" }),
      ).not.toBeInTheDocument();
    });

    const shiftedWeekButton = findWeekTitleButton();
    expect(shiftedWeekButton).toBeDefined();
    fireEvent.click(shiftedWeekButton!);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Cette semaine" }),
      ).toBeInTheDocument();
    });
  });

  it("handles month tab navigation and reset to current month", async () => {
    mockTimetableFlow({
      firstName: "Lisa",
      lastName: "MBELE",
      role: "STUDENT",
      currentEnrollment: { class: { name: "6eme N3" } },
    });

    render(<StudentTimetablePage />);
    await screen.findByText("Lisa MBELE - 6eme N3");

    fireEvent.click(screen.getByRole("button", { name: "Ce mois" }));

    expect(
      screen.getByRole("button", { name: "Periode precedente (month)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Periode suivante (month)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Selectionnez un jour pour voir les creneaux"),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Periode suivante (month)" }),
    );

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Ce mois" }),
      ).not.toBeInTheDocument();
    });

    const shiftedMonthButton = findMonthTitleButton();
    expect(shiftedMonthButton).toBeDefined();
    fireEvent.click(shiftedMonthButton!);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Ce mois" }),
      ).toBeInTheDocument();
    });
  });

  it("renders one-off slots in student/parent timetable views", async () => {
    const now = new Date();
    const weekday = now.getDay() === 0 ? 7 : now.getDay();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - (weekday - 1));
    const saturday = new Date(weekStart);
    saturday.setDate(weekStart.getDate() + 5);
    const saturdayIso = toIsoDate(saturday);

    mockTimetableFlow(
      {
        firstName: "Lisa",
        lastName: "MBELE",
        role: "STUDENT",
        currentEnrollment: { class: { name: "6eme N3" } },
      },
      buildTimetablePayload({
        oneOffSlots: [
          {
            id: "oneoff-tech-sat",
            occurrenceDate: `${saturdayIso}T00:00:00.000Z`,
            startMinute: 615,
            endMinute: 690,
            room: "ATELIER",
            subject: { id: "subject-tech", name: "TECHNOLOGIE" },
            teacherUser: {
              id: "teacher-tech",
              firstName: "Aline",
              lastName: "Mekongo",
            },
          },
        ],
      }),
    );

    render(<StudentTimetablePage />);
    await screen.findByText("Lisa MBELE - 6eme N3");

    fireEvent.click(screen.getByRole("button", { name: "Cette semaine" }));
    await waitFor(() => {
      expect(screen.getByText(/TECHNOLOGIE/i)).toBeInTheDocument();
      expect(screen.getByText(/ATELIER/i)).toBeInTheDocument();
    });
  });

  it("supports parent context with childId query and shows targeted child", async () => {
    searchParamsMock = new URLSearchParams("childId=child-2");
    mockTimetableFlow(
      {
        firstName: "Parent",
        lastName: "Account",
        role: "PARENT",
        linkedStudents: [
          {
            id: "child-1",
            firstName: "Lisa",
            lastName: "MBELE",
            currentEnrollment: { class: { name: "6eme N3" } },
          },
          {
            id: "child-2",
            firstName: "Paul",
            lastName: "MBELE",
            currentEnrollment: { class: { name: "5eme A" } },
          },
        ],
      },
      buildTimetablePayload({
        student: { id: "child-2", firstName: "Paul", lastName: "MBELE" },
        classEntity: {
          id: "class-2",
          name: "5eme A",
          schoolYearId: "sy-1",
          academicLevelId: null,
        },
      }),
    );

    render(<StudentTimetablePage />);

    expect(await screen.findByText("Paul MBELE - 5eme A")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("redirects non-student/non-parent roles to dashboard", async () => {
    mockMeResponse({
      firstName: "Teacher",
      lastName: "User",
      role: "TEACHER",
    });

    render(<StudentTimetablePage />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith(
        "/schools/college-vogt/dashboard",
      );
    });
  });

  it("renders mobile week grid and shows selected course details on click", async () => {
    mockCompactViewport();

    mockTimetableFlow({
      firstName: "Lisa",
      lastName: "MBELE",
      role: "STUDENT",
      currentEnrollment: { class: { name: "6eme N3" } },
    });

    render(<StudentTimetablePage />);
    await screen.findByText("Lisa MBELE - 6eme N3");

    fireEvent.click(screen.getByRole("button", { name: "Semaine" }));
    expect(screen.getByText("H")).toBeInTheDocument();
    expect(
      screen.getByText("Detail du creneau selectionne"),
    ).toBeInTheDocument();

    const mathsCompactButton = screen
      .getAllByRole("button")
      .find((button) =>
        (button.getAttribute("data-testid") ?? "").includes(
          "compact-week-slot-1-slot-math",
        ),
      );
    expect(mathsCompactButton).toBeDefined();
    fireEvent.click(mathsCompactButton!);

    await waitFor(() => {
      expect(screen.getByText(/AUBERGER C\./i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Plage horaire:/i)).toBeInTheDocument();
    expect(screen.getByText(/Salle:/i)).toBeInTheDocument();
  });

  it("renders mobile day view and supports compact day navigation", async () => {
    mockCompactViewport();
    mockTimetableFlow({
      firstName: "Lisa",
      lastName: "MBELE",
      role: "STUDENT",
      currentEnrollment: { class: { name: "6eme N3" } },
    });

    render(<StudentTimetablePage />);
    await screen.findByText("Lisa MBELE - 6eme N3");

    expect(screen.getByRole("button", { name: "Jour" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Semaine" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mois" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Jour suivant" }));
    fireEvent.click(screen.getByRole("button", { name: "Jour suivant" }));

    await waitFor(() => {
      expect(screen.getAllByText(/FRANCAIS/i).length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText(/JAMET P\./i).length).toBeGreaterThan(0);

    const shiftedDayButton = findDayTitleButton();
    expect(shiftedDayButton).toBeDefined();
    fireEvent.click(shiftedDayButton!);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Aujourd'hui" }),
      ).toBeInTheDocument();
    });
  });

  it("renders mobile month calendar and updates selected-day agenda", async () => {
    mockCompactViewport();
    mockTimetableFlow({
      firstName: "Lisa",
      lastName: "MBELE",
      role: "STUDENT",
      currentEnrollment: { class: { name: "6eme N3" } },
    });

    render(<StudentTimetablePage />);
    await screen.findByText("Lisa MBELE - 6eme N3");

    fireEvent.click(screen.getByRole("button", { name: "Mois" }));
    expect(screen.getByText("Agenda du jour selectionne")).toBeInTheDocument();

    const monthDayButtons = screen
      .getAllByRole("button")
      .filter((button) =>
        /(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)/i.test(
          button.getAttribute("title") ?? "",
        ),
      );

    expect(monthDayButtons.length).toBeGreaterThan(0);
    const targetButton = monthDayButtons.find((button) =>
      /(lundi|mardi|mercredi|jeudi|vendredi)/i.test(
        button.getAttribute("title") ?? "",
      ),
    );
    expect(targetButton).toBeDefined();

    fireEvent.click(targetButton!);

    await waitFor(() => {
      expect(screen.getAllByText(/Salle/i).length).toBeGreaterThan(0);
    });
  });
});
