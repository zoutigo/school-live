import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  room: string | null;
  subject: { id: string; name: string };
  teacherUser: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
};

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
    getTimetablePayload(selectedSchoolYearId: string) {
      return {
        class: {
          id: "class-1",
          schoolYearId: selectedSchoolYearId,
          academicLevelId: "lvl-1",
        },
        slots: slotsByYear.get(selectedSchoolYearId) ?? [],
        calendarEvents: [],
        subjectStyles: subjectStylesByYear.get(selectedSchoolYearId) ?? [],
      };
    },
    addSlotToSchoolYear(selectedSchoolYearId: string, slot: SlotRow) {
      const existing = slotsByYear.get(selectedSchoolYearId) ?? [];
      slotsByYear.set(selectedSchoolYearId, [...existing, slot]);
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
        return jsonResponse(data.getTimetablePayload(schoolYearId));
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

        data.addSlotToSchoolYear(schoolYearId, {
          id: "slot-new-1",
          weekday: Number(body.weekday),
          startMinute: Number(body.startMinute),
          endMinute: Number(body.endMinute),
          room: body.room ?? null,
          subject,
          teacherUser: teacher,
        });

        return jsonResponse({ success: true }, 201);
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
      expect(
        screen.getByText(/NDEM\s+Guy\s+· Salle Labo/i),
      ).toBeInTheDocument();
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

  it("renders subject color on slot badges and allows month-day selection details", async () => {
    createFetchMock();
    render(<TeacherClassAgendaPage />);

    await screen.findByText("Emploi du temps - 6eC");

    const roomBadges = screen.getAllByText("Salle B14");
    const coloredBadge = roomBadges.find(
      (node) =>
        node instanceof HTMLElement &&
        (node as HTMLElement).style.backgroundColor.length > 0,
    ) as HTMLElement | undefined;

    expect(coloredBadge).toBeDefined();
    expect(coloredBadge?.style.backgroundColor).toBe("rgb(37, 99, 235)");

    fireEvent.click(screen.getByRole("button", { name: "Ce mois" }));
    expect(
      screen.getByText("Selectionnez un jour pour voir les creneaux"),
    ).toBeInTheDocument();

    const firstMonthDayButton = screen.getAllByRole("button").find((button) => {
      const label = button.textContent?.toLowerCase() ?? "";
      return /creneau/.test(label) && /\d{2}/.test(label);
    });

    expect(firstMonthDayButton).toBeDefined();
    fireEvent.click(firstMonthDayButton!);

    await waitFor(() => {
      expect(screen.getByText(/Creneaux du/i)).toBeInTheDocument();
    });
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
