import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TeacherClassAgendaPage from "./page";

const replaceMock = vi.fn();
const getCsrfTokenCookieMock = vi.fn(() => "csrf-token-test");

let paramsMock = {
  schoolSlug: "college-vogt",
  classId: "class-1",
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
  useParams: () => paramsMock,
}));

vi.mock("../../../../../../../lib/auth-cookies", () => ({
  getCsrfTokenCookie: () => getCsrfTokenCookieMock(),
}));

function jsonResponse(payload: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

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
  };
};

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toWeekdayMondayFirst(date: Date) {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

function buildDataset() {
  const sy1 = "sy-2025";
  const sy2 = "sy-2024";

  const subjects = [
    { id: "sub-fr", name: "Francais" },
    { id: "sub-math", name: "Mathematiques" },
  ];

  const assignments = [
    {
      teacherUserId: "teacher-1",
      subjectId: "sub-fr",
      subject: { id: "sub-fr", name: "Francais" },
      teacherUser: {
        id: "teacher-1",
        firstName: "Albert",
        lastName: "Mvondo",
        email: "albert@example.test",
      },
    },
    {
      teacherUserId: "teacher-2",
      subjectId: "sub-math",
      subject: { id: "sub-math", name: "Mathematiques" },
      teacherUser: {
        id: "teacher-2",
        firstName: "Guy",
        lastName: "Ndem",
        email: "guy@example.test",
      },
    },
  ];

  const slotsByYear = new Map<string, SlotRow[]>([
    [
      sy1,
      [
        {
          id: "slot-fr-1",
          weekday: 1,
          startMinute: 525,
          endMinute: 600,
          activeFromDate: "2025-09-01",
          activeToDate: "2026-06-30",
          room: "B14",
          subject: { id: "sub-fr", name: "Francais" },
          teacherUser: {
            id: "teacher-1",
            firstName: "Albert",
            lastName: "Mvondo",
            email: "albert@example.test",
          },
        },
      ],
    ],
    [
      sy2,
      [
        {
          id: "slot-fr-2",
          weekday: 2,
          startMinute: 525,
          endMinute: 580,
          room: "C02",
          subject: { id: "sub-fr", name: "Francais" },
          teacherUser: {
            id: "teacher-1",
            firstName: "Albert",
            lastName: "Mvondo",
            email: "albert@example.test",
          },
        },
      ],
    ],
  ]);

  const subjectStylesByYear = new Map<
    string,
    Array<{ subjectId: string; colorHex: string }>
  >([
    [
      sy1,
      [
        { subjectId: "sub-fr", colorHex: "#2563EB" },
        { subjectId: "sub-math", colorHex: "#DC2626" },
      ],
    ],
    [
      sy2,
      [
        { subjectId: "sub-fr", colorHex: "#10B981" },
        { subjectId: "sub-math", colorHex: "#F59E0B" },
      ],
    ],
  ]);
  const oneOffByYear = new Map<
    string,
    Array<{
      id: string;
      occurrenceDate: string;
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
    }>
  >([
    [sy1, []],
    [sy2, []],
  ]);

  return {
    sy1,
    sy2,
    getContextPayload(selectedSchoolYearId: string) {
      return {
        class: {
          id: "class-1",
          name: "6eC",
          schoolYearId: selectedSchoolYearId,
          academicLevelId: "lvl-1",
          referentTeacherUserId: "teacher-1",
        },
        allowedSubjects: subjects,
        assignments,
        subjectStyles: subjectStylesByYear.get(selectedSchoolYearId) ?? [],
        schoolYears: [
          { id: sy1, label: "2025-2026", isActive: true },
          { id: sy2, label: "2024-2025", isActive: false },
        ],
        selectedSchoolYearId,
      };
    },
    getTimetablePayload(
      selectedSchoolYearId: string,
      fromDateRaw?: string | null,
      toDateRaw?: string | null,
    ) {
      const slots = slotsByYear.get(selectedSchoolYearId) ?? [];
      const fromDate = fromDateRaw ? new Date(fromDateRaw) : null;
      const toDate = toDateRaw ? new Date(toDateRaw) : null;
      const occurrences: Array<Record<string, unknown>> = [];
      if (fromDate && toDate) {
        for (
          let cursor = new Date(fromDate);
          cursor <= toDate;
          cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)
        ) {
          const weekday = toWeekdayMondayFirst(cursor);
          const dateKey = toIsoDate(cursor);
          slots
            .filter((slot) => slot.weekday === weekday)
            .forEach((slot) => {
              occurrences.push({
                id: `${slot.id}-${dateKey}`,
                source: "RECURRING",
                status: "PLANNED",
                occurrenceDate: dateKey,
                weekday,
                startMinute: slot.startMinute,
                endMinute: slot.endMinute,
                room: slot.room,
                subject: slot.subject,
                teacherUser: slot.teacherUser,
                slotId: slot.id,
              });
            });
        }
        const oneOffRows = oneOffByYear.get(selectedSchoolYearId) ?? [];
        oneOffRows
          .filter((row) => {
            const date = new Date(row.occurrenceDate);
            return date >= fromDate && date <= toDate;
          })
          .forEach((row) => {
            occurrences.push({
              id: row.id,
              source: "ONE_OFF",
              status: "PLANNED",
              oneOffSlotId: row.id,
              occurrenceDate: row.occurrenceDate,
              weekday: toWeekdayMondayFirst(new Date(row.occurrenceDate)),
              startMinute: row.startMinute,
              endMinute: row.endMinute,
              room: row.room,
              subject: row.subject,
              teacherUser: row.teacherUser,
            });
          });
      }
      return {
        class: {
          id: "class-1",
          schoolYearId: selectedSchoolYearId,
          academicLevelId: "lvl-1",
        },
        slots,
        occurrences,
        calendarEvents: [],
        subjectStyles: subjectStylesByYear.get(selectedSchoolYearId) ?? [],
      };
    },
    addSlotToSchoolYear(selectedSchoolYearId: string, slot: SlotRow) {
      const existing = slotsByYear.get(selectedSchoolYearId) ?? [];
      slotsByYear.set(selectedSchoolYearId, [...existing, slot]);
    },
    addOneOffToSchoolYear(
      selectedSchoolYearId: string,
      oneOff: {
        id: string;
        occurrenceDate: string;
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
      },
    ) {
      const existing = oneOffByYear.get(selectedSchoolYearId) ?? [];
      oneOffByYear.set(selectedSchoolYearId, [...existing, oneOff]);
    },
    setStyleForSchoolYear(
      selectedSchoolYearId: string,
      subjectId: string,
      colorHex: string,
    ) {
      const existing = subjectStylesByYear.get(selectedSchoolYearId) ?? [];
      const otherRows = existing.filter(
        (entry) => entry.subjectId !== subjectId,
      );
      subjectStylesByYear.set(selectedSchoolYearId, [
        ...otherRows,
        { subjectId, colorHex: colorHex.toUpperCase() },
      ]);
    },
  };
}

function createFetchMock(options?: { rejectDuplicateColor?: boolean }) {
  const data = buildDataset();
  let createdSlotIndex = 0;
  const fetchMock = vi
    .spyOn(globalThis, "fetch")
    .mockImplementation((input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url.endsWith("/schools/college-vogt/me")) {
        return jsonResponse({ role: "TEACHER" });
      }

      if (url.includes("/timetable/classes/class-1/context")) {
        const parsed = new URL(url);
        const schoolYearId =
          parsed.searchParams.get("schoolYearId") ?? data.sy1;
        return jsonResponse(data.getContextPayload(schoolYearId));
      }

      if (
        url.includes("/timetable/classes/class-1") &&
        !url.includes("/timetable/classes/class-1/slots") &&
        method === "GET"
      ) {
        const parsed = new URL(url);
        const schoolYearId =
          parsed.searchParams.get("schoolYearId") ?? data.sy1;
        return jsonResponse(
          data.getTimetablePayload(
            schoolYearId,
            parsed.searchParams.get("fromDate"),
            parsed.searchParams.get("toDate"),
          ),
        );
      }

      if (
        url.includes("/timetable/classes/class-1/slots") &&
        method === "POST"
      ) {
        const body = JSON.parse(String(init?.body ?? "{}"));
        const schoolYearId = body.schoolYearId ?? data.sy1;
        const subjectId = String(body.subjectId);
        const teacherUserId = String(body.teacherUserId);
        const subject =
          subjectId === "sub-math"
            ? { id: "sub-math", name: "Mathematiques" }
            : { id: "sub-fr", name: "Francais" };
        const teacher =
          teacherUserId === "teacher-2"
            ? {
                id: "teacher-2",
                firstName: "Guy",
                lastName: "Ndem",
                email: "guy@example.test",
              }
            : {
                id: "teacher-1",
                firstName: "Albert",
                lastName: "Mvondo",
                email: "albert@example.test",
              };

        createdSlotIndex += 1;
        data.addSlotToSchoolYear(schoolYearId, {
          id: `slot-new-${createdSlotIndex}`,
          weekday: Number(body.weekday),
          startMinute: Number(body.startMinute),
          endMinute: Number(body.endMinute),
          room: body.room ?? null,
          subject,
          teacherUser: teacher,
        });

        return jsonResponse({ success: true }, 201);
      }

      if (url.includes("/timetable/slots/") && method === "PATCH") {
        return jsonResponse({ success: true }, 200);
      }

      if (url.includes("/timetable/slots/") && method === "DELETE") {
        return jsonResponse({ success: true }, 200);
      }

      if (
        url.includes("/timetable/classes/class-1/subjects/") &&
        url.endsWith("/style") &&
        method === "PATCH"
      ) {
        const body = JSON.parse(String(init?.body ?? "{}")) as {
          schoolYearId?: string;
          colorHex?: string;
        };
        const schoolYearId = body.schoolYearId ?? data.sy1;
        const subjectId = String(
          url.split("/subjects/")[1]?.split("/style")[0] ?? "",
        );
        const colorHex = String(body.colorHex ?? "").toUpperCase();

        if (options?.rejectDuplicateColor && colorHex === "#DC2626") {
          return jsonResponse(
            { message: "Choisissez une couleur plus distincte." },
            400,
          );
        }

        data.setStyleForSchoolYear(schoolYearId, subjectId, colorHex);
        return jsonResponse(
          { subjectId, classId: "class-1", schoolYearId, colorHex },
          200,
        );
      }

      if (
        url.includes("/timetable/classes/class-1/one-off-slots") &&
        method === "POST"
      ) {
        const body = JSON.parse(String(init?.body ?? "{}"));
        const schoolYearId = body.schoolYearId ?? data.sy1;
        const subjectId = String(body.subjectId);
        const teacherUserId = String(body.teacherUserId);
        const subject =
          subjectId === "sub-math"
            ? { id: "sub-math", name: "Mathematiques" }
            : { id: "sub-fr", name: "Francais" };
        const teacher =
          teacherUserId === "teacher-2"
            ? {
                id: "teacher-2",
                firstName: "Guy",
                lastName: "Ndem",
                email: "guy@example.test",
              }
            : {
                id: "teacher-1",
                firstName: "Albert",
                lastName: "Mvondo",
                email: "albert@example.test",
              };
        data.addOneOffToSchoolYear(schoolYearId, {
          id: "oneoff-1",
          occurrenceDate: String(body.occurrenceDate),
          startMinute: Number(body.startMinute),
          endMinute: Number(body.endMinute),
          room: (body.room as string | undefined) ?? null,
          subject,
          teacherUser: teacher,
        });
        return jsonResponse({ id: "oneoff-1" }, 201);
      }

      if (url.includes("/timetable/one-off-slots/") && method === "PATCH") {
        return jsonResponse({ success: true }, 200);
      }

      if (url.includes("/timetable/one-off-slots/") && method === "DELETE") {
        return jsonResponse({ success: true }, 200);
      }

      if (
        url.includes("/timetable/slots/") &&
        url.includes("/exceptions") &&
        method === "POST"
      ) {
        return jsonResponse({ id: "exception-1" }, 201);
      }

      return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
    });

  return { fetchMock, data };
}

function findShiftedDayButton() {
  return screen.getAllByRole("button").find((button) => {
    const label = button.textContent?.trim() ?? "";
    return /^\d{2}\s+\w+/i.test(label) && !label.includes("Aujourd");
  });
}

function findShiftedWeekButton() {
  return screen.getAllByRole("button").find((button) => {
    const label = button.textContent?.trim() ?? "";
    return /\d{2}\s+\w+\.?\s+-\s+\d{2}\s+\w+\.?\s+\d{4}/i.test(label);
  });
}

function findShiftedMonthButton() {
  return screen.getAllByRole("button").find((button) => {
    const label = button.textContent?.trim() ?? "";
    return /\w+\s+\d{4}/i.test(label) && !label.includes("Ce mois");
  });
}

describe("TeacherClassAgendaPage - creneaux UI", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
    getCsrfTokenCookieMock.mockReset();
    getCsrfTokenCookieMock.mockReturnValue("csrf-token-test");
    paramsMock = {
      schoolSlug: "college-vogt",
      classId: "class-1",
    };
  });

  it("renders full creneaux UI with form and timetable view controls", async () => {
    createFetchMock();

    render(<TeacherClassAgendaPage />);

    expect(
      await screen.findByText("Emploi du temps - 6eC"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Creneaux" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Vacances" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Couleurs" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aide" })).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Ajouter" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Jour")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Ajouter" }));

    expect(screen.getByLabelText("Jour")).toBeInTheDocument();
    expect(screen.getByLabelText("Debut")).toBeInTheDocument();
    expect(screen.getByLabelText("Fin")).toBeInTheDocument();
    expect(screen.getByLabelText("Matiere")).toBeInTheDocument();
    expect(screen.getByLabelText("Enseignant")).toBeInTheDocument();
    expect(screen.getByLabelText("Salle (optionnel)")).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Ajouter le creneau" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Aujourd'hui" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Cette semaine" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ce mois" })).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Periode precedente (day)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Periode suivante (day)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Periode precedente (week)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Periode suivante (week)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Periode precedente (month)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Periode suivante (month)" }),
    ).toBeInTheDocument();
  });

  it("navigates day view and returns to today when clicking day title", async () => {
    createFetchMock();
    render(<TeacherClassAgendaPage />);

    await screen.findByText("Emploi du temps - 6eC");

    fireEvent.click(
      screen.getByRole("button", { name: "Periode suivante (day)" }),
    );

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Aujourd'hui" }),
      ).not.toBeInTheDocument();
    });

    const shiftedButton = findShiftedDayButton();
    expect(shiftedButton).toBeDefined();
    fireEvent.click(shiftedButton!);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Aujourd'hui" }),
      ).toBeInTheDocument();
    });
  });

  it("toggles slot creation form from add tooltip button", async () => {
    createFetchMock();
    render(<TeacherClassAgendaPage />);

    await screen.findByText("Emploi du temps - 6eC");
    const addButton = screen.getByRole("button", { name: "Ajouter" });
    expect(screen.queryByLabelText("Jour")).not.toBeInTheDocument();

    fireEvent.click(addButton);
    expect(screen.getByLabelText("Jour")).toBeInTheDocument();

    fireEvent.click(addButton);
    await waitFor(() => {
      expect(screen.queryByLabelText("Jour")).not.toBeInTheDocument();
    });
  });

  it("navigates week and month views and resets each period from tab title", async () => {
    createFetchMock();
    render(<TeacherClassAgendaPage />);

    await screen.findByText("Emploi du temps - 6eC");

    fireEvent.click(
      screen.getByRole("button", { name: "Periode suivante (week)" }),
    );
    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Cette semaine" }),
      ).not.toBeInTheDocument();
    });

    const shiftedWeekButton = findShiftedWeekButton();
    expect(shiftedWeekButton).toBeDefined();
    fireEvent.click(shiftedWeekButton!);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Cette semaine" }),
      ).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Periode suivante (month)" }),
    );
    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Ce mois" }),
      ).not.toBeInTheDocument();
    });

    const shiftedMonthButton = findShiftedMonthButton();
    expect(shiftedMonthButton).toBeDefined();
    fireEvent.click(shiftedMonthButton!);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Ce mois" }),
      ).toBeInTheDocument();
    });
  });

  it("switches school year using increment controls and reloads context + timetable", async () => {
    const { fetchMock, data } = createFetchMock();
    render(<TeacherClassAgendaPage />);

    await screen.findByText("Emploi du temps - 6eC");
    expect(screen.getByText("2025-2026 (en cours)")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Annee suivante" }));

    await waitFor(() => {
      expect(screen.getByText("2024-2025")).toBeInTheDocument();
    });

    const contextCallsSy2 = fetchMock.mock.calls.filter(([url]) =>
      String(url).includes(`/context?schoolYearId=${data.sy2}`),
    );
    const timetableCallsSy2 = fetchMock.mock.calls.filter(([url]) =>
      String(url).includes(
        `/timetable/classes/class-1?schoolYearId=${data.sy2}`,
      ),
    );

    expect(contextCallsSy2.length).toBeGreaterThan(0);
    expect(timetableCallsSy2.length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Annee precedente" }));
    await waitFor(() => {
      expect(screen.getByText("2025-2026 (en cours)")).toBeInTheDocument();
    });
  });

  it("creates a slot from form submission and refreshes timetable", async () => {
    const { fetchMock } = createFetchMock();
    render(<TeacherClassAgendaPage />);

    await screen.findByText("Emploi du temps - 6eC");
    fireEvent.click(screen.getByRole("button", { name: "Ajouter" }));

    fireEvent.change(screen.getByLabelText("Matiere"), {
      target: { value: "sub-math" },
    });
    fireEvent.change(screen.getByLabelText("Enseignant"), {
      target: { value: "teacher-2" },
    });
    fireEvent.change(screen.getByLabelText("Debut"), {
      target: { value: "10:00" },
    });
    fireEvent.change(screen.getByLabelText("Fin"), {
      target: { value: "11:45" },
    });
    fireEvent.change(screen.getByLabelText("Salle (optionnel)"), {
      target: { value: "Labo" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Ajouter le creneau" }));

    await waitFor(() => {
      expect(screen.getByText("Creneau ajoute.")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText(/Mr\s+NDEM\s+Guy/i)).toBeInTheDocument();
      expect(screen.getByText("Salle Labo")).toBeInTheDocument();
    });

    const postCall = fetchMock.mock.calls.find(
      ([url, init]) =>
        String(url).includes("/timetable/classes/class-1/slots") &&
        init?.method === "POST",
    );

    expect(postCall).toBeDefined();
    expect(String((postCall?.[1]?.body as string) ?? "")).toContain(
      '"subjectId":"sub-math"',
    );
    expect(String((postCall?.[1]?.body as string) ?? "")).toContain(
      '"teacherUserId":"teacher-2"',
    );
    expect(String((postCall?.[1]?.body as string) ?? "")).toContain(
      '"schoolYearId":"sy-2025"',
    );
  });

  it("queues multiple recurring slots and submits them in one save flow", async () => {
    const { fetchMock } = createFetchMock();
    render(<TeacherClassAgendaPage />);

    await screen.findByText("Emploi du temps - 6eC");
    fireEvent.click(screen.getByRole("button", { name: "Ajouter" }));

    fireEvent.change(screen.getByLabelText("Matiere"), {
      target: { value: "sub-fr" },
    });
    fireEvent.change(screen.getByLabelText("Enseignant"), {
      target: { value: "teacher-1" },
    });
    fireEvent.change(screen.getByLabelText("Debut"), {
      target: { value: "08:00" },
    });
    fireEvent.change(screen.getByLabelText("Fin"), {
      target: { value: "09:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ajouter a la liste" }));

    await waitFor(() => {
      expect(
        screen.getByText(/Creneaux en attente \(1\)/i),
      ).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Debut"), {
      target: { value: "10:00" },
    });
    fireEvent.change(screen.getByLabelText("Fin"), {
      target: { value: "11:00" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer 2 creneaux" }),
    );

    await waitFor(() => {
      expect(screen.getByText("2 creneaux ajoutes.")).toBeInTheDocument();
    });

    const postCalls = fetchMock.mock.calls.filter(
      ([url, init]) =>
        String(url).includes("/timetable/classes/class-1/slots") &&
        init?.method === "POST",
    );
    expect(postCalls.length).toBeGreaterThanOrEqual(2);
  });

  it("opens occurrence modal from a day slot and updates this occurrence", async () => {
    const { fetchMock } = createFetchMock();
    render(<TeacherClassAgendaPage />);

    await screen.findByText("Emploi du temps - 6eC");

    fireEvent.click(screen.getByText(/08:45 - 10:00 · Francais/i));
    await screen.findByText("Gerer l'occurrence");
    const modalQueries = within(screen.getByTestId("occurrence-modal"));

    fireEvent.click(modalQueries.getByText("Modifier cette occurrence"));
    fireEvent.click(modalQueries.getByRole("button", { name: "Continuer" }));
    await screen.findByText("Modifier cette occurrence");

    fireEvent.change(modalQueries.getByLabelText("Date"), {
      target: { value: "2026-03-09" },
    });
    fireEvent.change(modalQueries.getByLabelText("Matiere"), {
      target: { value: "sub-math" },
    });
    fireEvent.change(modalQueries.getByLabelText("Enseignant"), {
      target: { value: "teacher-2" },
    });
    fireEvent.change(modalQueries.getByLabelText("Debut"), {
      target: { value: "13:00" },
    });
    fireEvent.change(modalQueries.getByLabelText("Fin"), {
      target: { value: "14:00" },
    });
    fireEvent.click(
      modalQueries.getByRole("button", { name: "Appliquer l'action" }),
    );

    await waitFor(() => {
      expect(screen.getByText("Occurrence modifiee.")).toBeInTheDocument();
    });

    const overrideCall = fetchMock.mock.calls.find(
      ([url, init]) =>
        String(url).includes("/timetable/slots/slot-fr-1/exceptions") &&
        init?.method === "POST",
    );
    expect(overrideCall).toBeDefined();
    expect(String((overrideCall?.[1]?.body as string) ?? "")).toContain(
      '"occurrenceDate":"2026-03-09"',
    );
    expect(String((overrideCall?.[1]?.body as string) ?? "")).toContain(
      '"type":"OVERRIDE"',
    );
  });

  it("supports modal back navigation from details step to action step", async () => {
    createFetchMock();
    render(<TeacherClassAgendaPage />);

    await screen.findByText("Emploi du temps - 6eC");
    fireEvent.click(screen.getByText(/08:45 - 10:00 · Francais/i));

    const modalQueries = within(screen.getByTestId("occurrence-modal"));
    fireEvent.click(modalQueries.getByText("Modifier cette occurrence"));
    fireEvent.click(modalQueries.getByRole("button", { name: "Continuer" }));
    expect(
      await screen.findByText("Modifier cette occurrence"),
    ).toBeInTheDocument();

    fireEvent.click(modalQueries.getByRole("button", { name: "Retour" }));
    await waitFor(() => {
      expect(screen.getByText("Gerer l'occurrence")).toBeInTheDocument();
    });
    expect(
      modalQueries.getByText("Supprimer cette occurrence"),
    ).toBeInTheDocument();
  });

  it("deletes current recurring occurrence via CANCEL exception", async () => {
    const { fetchMock } = createFetchMock();
    render(<TeacherClassAgendaPage />);

    await screen.findByText("Emploi du temps - 6eC");
    fireEvent.click(screen.getByText(/08:45 - 10:00 · Francais/i));

    const modalQueries = within(screen.getByTestId("occurrence-modal"));
    fireEvent.click(modalQueries.getByText("Supprimer cette occurrence"));
    fireEvent.click(modalQueries.getByRole("button", { name: "Continuer" }));

    await waitFor(() => {
      expect(
        screen.getByText("Supprimer cette occurrence"),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText(/Voulez-vous vraiment supprimer cette occurrence/i),
    ).toBeInTheDocument();
    expect(modalQueries.queryByLabelText("Date")).not.toBeInTheDocument();
    expect(
      modalQueries.getByText(/08:45 - 10:00 · Francais/i),
    ).toBeInTheDocument();
    expect(modalQueries.queryByLabelText("Debut")).not.toBeInTheDocument();

    fireEvent.click(
      modalQueries.getByRole("button", { name: "Appliquer l'action" }),
    );

    await waitFor(() => {
      expect(screen.getByText("Occurrence supprimee.")).toBeInTheDocument();
    });

    const cancelCall = fetchMock.mock.calls.find(
      ([url, init]) =>
        String(url).includes("/timetable/slots/slot-fr-1/exceptions") &&
        init?.method === "POST" &&
        String((init?.body as string) ?? "").includes('"type":"CANCEL"'),
    );
    expect(cancelCall).toBeDefined();
  });

  it("updates whole series from occurrence modal with effective date", async () => {
    const { fetchMock } = createFetchMock();
    render(<TeacherClassAgendaPage />);

    await screen.findByText("Emploi du temps - 6eC");
    fireEvent.click(screen.getByText(/08:45 - 10:00 · Francais/i));

    const modalQueries = within(screen.getByTestId("occurrence-modal"));
    fireEvent.click(modalQueries.getByText("Modifier toute la serie"));
    fireEvent.click(modalQueries.getByRole("button", { name: "Continuer" }));

    fireEvent.change(modalQueries.getByLabelText("Date de debut d'effet"), {
      target: { value: "2026-03-10" },
    });
    fireEvent.change(
      modalQueries.getByLabelText("Date de fin de serie (optionnel)"),
      {
        target: { value: "2026-04-30" },
      },
    );
    fireEvent.change(modalQueries.getByLabelText("Debut"), {
      target: { value: "09:00" },
    });
    fireEvent.change(modalQueries.getByLabelText("Fin"), {
      target: { value: "10:15" },
    });
    fireEvent.click(
      modalQueries.getByRole("button", { name: "Appliquer l'action" }),
    );

    await waitFor(() => {
      expect(screen.getByText("Serie mise a jour.")).toBeInTheDocument();
    });

    const patchSeriesCall = fetchMock.mock.calls.find(
      ([url, init]) =>
        String(url).includes("/timetable/slots/slot-fr-1") &&
        init?.method === "PATCH",
    );
    expect(patchSeriesCall).toBeDefined();
    expect(String((patchSeriesCall?.[1]?.body as string) ?? "")).toContain(
      '"effectiveFromDate":"2026-03-10"',
    );
    expect(String((patchSeriesCall?.[1]?.body as string) ?? "")).toContain(
      '"activeToDate":"2026-04-30"',
    );
  });

  it("deletes whole series from occurrence modal", async () => {
    const { fetchMock } = createFetchMock();
    render(<TeacherClassAgendaPage />);

    await screen.findByText("Emploi du temps - 6eC");
    fireEvent.click(screen.getByText(/08:45 - 10:00 · Francais/i));

    const modalQueries = within(screen.getByTestId("occurrence-modal"));
    fireEvent.click(modalQueries.getByText("Supprimer toute la serie"));
    fireEvent.click(modalQueries.getByRole("button", { name: "Continuer" }));

    await waitFor(() => {
      expect(screen.getByText("Supprimer toute la serie")).toBeInTheDocument();
    });
    expect(
      screen.getByText(/supprimera le creneau recurrent/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Voulez-vous vraiment supprimer toute la serie/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Debut de serie/i)).toBeInTheDocument();
    expect(screen.getByText("01/09/2025")).toBeInTheDocument();
    expect(screen.getByText(/Fin de serie/i)).toBeInTheDocument();
    expect(screen.getByText("30/06/2026")).toBeInTheDocument();
    expect(modalQueries.queryByLabelText("Date")).not.toBeInTheDocument();
    expect(
      modalQueries.getByText(/08:45 - 10:00 · Francais/i),
    ).toBeInTheDocument();

    fireEvent.click(
      modalQueries.getByRole("button", { name: "Appliquer l'action" }),
    );
    await waitFor(() => {
      expect(screen.getByText("Serie supprimee.")).toBeInTheDocument();
    });

    const deleteSeriesCall = fetchMock.mock.calls.find(
      ([url, init]) =>
        String(url).includes("/timetable/slots/slot-fr-1") &&
        init?.method === "DELETE",
    );
    expect(deleteSeriesCall).toBeDefined();
  });

  it("shows only occurrence actions for one-off slot and deletes it", async () => {
    const { fetchMock, data } = createFetchMock();
    data.addOneOffToSchoolYear(data.sy1, {
      id: "oneoff-seeded-1",
      occurrenceDate: toIsoDate(new Date()),
      startMinute: 900,
      endMinute: 960,
      room: "PONC1",
      subject: { id: "sub-math", name: "Mathematiques" },
      teacherUser: {
        id: "teacher-2",
        firstName: "Guy",
        lastName: "Ndem",
        email: "guy@example.test",
      },
    });
    render(<TeacherClassAgendaPage />);

    await screen.findByText("Emploi du temps - 6eC");
    fireEvent.click(screen.getByText(/15:00 - 16:00 · Mathematiques/i));

    const modalQueries = within(screen.getByTestId("occurrence-modal"));
    expect(
      modalQueries.getByText("Supprimer cette occurrence"),
    ).toBeInTheDocument();
    expect(
      modalQueries.getByText("Modifier cette occurrence"),
    ).toBeInTheDocument();
    expect(
      modalQueries.queryByText("Modifier toute la serie"),
    ).not.toBeInTheDocument();
    expect(
      modalQueries.queryByText("Supprimer toute la serie"),
    ).not.toBeInTheDocument();

    fireEvent.click(modalQueries.getByText("Supprimer cette occurrence"));
    fireEvent.click(modalQueries.getByRole("button", { name: "Continuer" }));
    fireEvent.click(
      modalQueries.getByRole("button", { name: "Appliquer l'action" }),
    );

    await waitFor(() => {
      expect(screen.getByText("Occurrence supprimee.")).toBeInTheDocument();
    });

    const deleteOneOffCall = fetchMock.mock.calls.find(
      ([url, init]) =>
        String(url).includes("/timetable/one-off-slots/oneoff-seeded-1") &&
        init?.method === "DELETE",
    );
    expect(deleteOneOffCall).toBeDefined();
  });

  it("renders day slot visual tone and opens modal from month day slot", async () => {
    createFetchMock();
    render(<TeacherClassAgendaPage />);

    await screen.findByText("Emploi du temps - 6eC");

    const daySlotTitle = screen.getByText(/08:45 - 10:00 · Francais/i);
    const daySlotCard = daySlotTitle.closest("article") as HTMLElement | null;
    expect(daySlotCard).toBeTruthy();
    expect(daySlotCard?.style.backgroundColor.length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Ce mois" }));
    expect(
      screen.getByText("Selectionnez un jour pour voir les creneaux"),
    ).toBeInTheDocument();

    const firstMonthDayButton = screen.getAllByRole("button").find((button) => {
      const label = button.textContent?.toLowerCase() ?? "";
      return /[1-9]\s*creneau/.test(label) && /\d{2}/.test(label);
    });

    expect(firstMonthDayButton).toBeDefined();
    fireEvent.click(firstMonthDayButton!);

    await waitFor(() => {
      expect(screen.getByText(/Creneaux du/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/08:45 - 10:00 · Francais/i));
    expect(await screen.findByText("Gerer l'occurrence")).toBeInTheDocument();
  });

  it("renders compact responsive timetable views for week and month", async () => {
    const previousMatchMedia = window.matchMedia;
    try {
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
          matches: query === "(max-width: 1023px)",
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      createFetchMock();
      render(<TeacherClassAgendaPage />);

      await screen.findByText("Emploi du temps - 6eC");
      expect(screen.getByRole("button", { name: "Jour" })).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Semaine" }),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Mois" })).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Semaine" }));
      expect(
        await screen.findByText("Detail du creneau selectionne"),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Gerer ce creneau" }),
      ).toBeInTheDocument();
      expect(screen.getByTestId("compact-week-timeline")).toBeInTheDocument();
      expect(screen.getByTestId("compact-hour-420")).toHaveTextContent("07:00");
      expect(screen.getByTestId("compact-hour-1080")).toHaveTextContent(
        "18:00",
      );

      const compactWeekSlot = document.querySelector(
        '[data-testid^="compact-week-slot-1-slot-fr-1-"]',
      ) as HTMLElement | null;
      expect(compactWeekSlot).toBeTruthy();
      expect(compactWeekSlot?.getAttribute("style") ?? "").toContain("top:");
      expect(compactWeekSlot?.getAttribute("style") ?? "").toContain("height:");
      fireEvent.click(compactWeekSlot!);
      expect(screen.getByText(/Matiere:/i)).toBeInTheDocument();
      expect(screen.getByText(/Francais/i)).toBeInTheDocument();
      const detailCard = screen.getByTestId("compact-week-detail-card");
      expect(detailCard.getAttribute("style") ?? "").toContain(
        "background-color",
      );
      expect(detailCard.getAttribute("style") ?? "").toContain("border-color");
      fireEvent.click(screen.getByRole("button", { name: "Gerer ce creneau" }));
      expect(await screen.findByText("Gerer l'occurrence")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Mois" }));
      expect(
        await screen.findByText("Agenda du jour selectionne"),
      ).toBeInTheDocument();
    } finally {
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: previousMatchMedia,
      });
    }
  });
});

describe("TeacherClassAgendaPage - couleurs UI", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
    getCsrfTokenCookieMock.mockReset();
    getCsrfTokenCookieMock.mockReturnValue("csrf-token-test");
    paramsMock = {
      schoolSlug: "college-vogt",
      classId: "class-1",
    };
  });

  it("renders colors tab with subject entries and no vacation content", async () => {
    createFetchMock();
    render(<TeacherClassAgendaPage />);

    await screen.findByText("Emploi du temps - 6eC");
    fireEvent.click(screen.getByRole("button", { name: "Couleurs" }));

    expect(
      await screen.findByText("Couleurs des matieres (classe + annee)"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Couleur Francais")).toBeInTheDocument();
    expect(screen.getByLabelText("Couleur Mathematiques")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Sauver" }).length).toBe(2);

    expect(
      screen.queryByText("Aucune periode de vacances enregistree."),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        "Vous n'avez pas les droits pour modifier les vacances.",
      ),
    ).not.toBeInTheDocument();
  });

  it("updates subject color from colors tab and sends correct payload", async () => {
    const { fetchMock } = createFetchMock();
    render(<TeacherClassAgendaPage />);

    await screen.findByText("Emploi du temps - 6eC");
    fireEvent.click(screen.getByRole("button", { name: "Couleurs" }));

    const francaisColorInput = (await screen.findByLabelText(
      "Couleur Francais",
    )) as HTMLInputElement;
    fireEvent.change(francaisColorInput, { target: { value: "#10B981" } });

    const colorCards = screen
      .getAllByText("Francais")
      .map((node) => node.closest("article"))
      .filter((node): node is HTMLElement => node instanceof HTMLElement);
    expect(colorCards.length).toBeGreaterThan(0);
    const francaisCard = colorCards[0];
    const saveButton = francaisCard.querySelector("button");
    expect(saveButton).toBeTruthy();
    fireEvent.click(saveButton as HTMLButtonElement);

    await waitFor(() => {
      expect(
        screen.getByText("Couleur de matiere enregistree."),
      ).toBeInTheDocument();
    });

    const patchCall = fetchMock.mock.calls.find(
      ([url, init]) =>
        String(url).includes("/subjects/sub-fr/style") &&
        init?.method === "PATCH",
    );
    expect(patchCall).toBeDefined();
    expect(String((patchCall?.[1]?.body as string) ?? "")).toContain(
      '"schoolYearId":"sy-2025"',
    );
    expect(String((patchCall?.[1]?.body as string) ?? "")).toContain(
      '"colorHex":"#10B981"',
    );
  });

  it("shows backend validation error when color is rejected", async () => {
    createFetchMock({ rejectDuplicateColor: true });
    render(<TeacherClassAgendaPage />);

    await screen.findByText("Emploi du temps - 6eC");
    fireEvent.click(screen.getByRole("button", { name: "Couleurs" }));

    const francaisColorInput = (await screen.findByLabelText(
      "Couleur Francais",
    )) as HTMLInputElement;
    fireEvent.change(francaisColorInput, { target: { value: "#DC2626" } });

    const colorCards = screen
      .getAllByText("Francais")
      .map((node) => node.closest("article"))
      .filter((node): node is HTMLElement => node instanceof HTMLElement);
    const francaisCard = colorCards[0];
    const saveButton = francaisCard.querySelector("button");
    expect(saveButton).toBeTruthy();
    fireEvent.click(saveButton as HTMLButtonElement);

    await waitFor(() => {
      expect(
        screen.getByText("Choisissez une couleur plus distincte."),
      ).toBeInTheDocument();
    });
  });

  it("refreshes colors when school year changes inside colors tab", async () => {
    createFetchMock();
    render(<TeacherClassAgendaPage />);

    await screen.findByText("Emploi du temps - 6eC");
    fireEvent.click(screen.getByRole("button", { name: "Couleurs" }));

    const francaisColorInput = (await screen.findByLabelText(
      "Couleur Francais",
    )) as HTMLInputElement;
    expect(francaisColorInput.value.toUpperCase()).toBe("#2563EB");

    fireEvent.click(screen.getByRole("button", { name: "Annee suivante" }));

    await waitFor(() => {
      expect(screen.getByText("2024-2025")).toBeInTheDocument();
    });
    await waitFor(() => {
      const input = screen.getByLabelText(
        "Couleur Francais",
      ) as HTMLInputElement;
      expect(input.value.toUpperCase()).toBe("#10B981");
    });
  });
});
