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
    mockMeResponse({
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
      screen.getByRole("button", { name: "Jour precedent" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Jour suivant" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Jour suivant" }));
    fireEvent.click(screen.getByRole("button", { name: "Jour suivant" }));

    await waitFor(() => {
      expect(screen.getByText("FRANCAIS")).toBeInTheDocument();
    });
    expect(screen.getByText("Jamet P.")).toBeInTheDocument();
    expect(screen.getAllByText("B14").length).toBeGreaterThan(0);
  });

  it("navigates days and returns to today from the day title button", async () => {
    mockMeResponse({
      firstName: "Lisa",
      lastName: "MBELE",
      role: "STUDENT",
      currentEnrollment: { class: { name: "6eme N3" } },
    });

    render(<StudentTimetablePage />);
    await screen.findByText("Lisa MBELE - 6eme N3");

    fireEvent.click(screen.getByRole("button", { name: "Jour suivant" }));

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Aujourd'hui" }),
      ).not.toBeInTheDocument();
    });

    const shiftedDayButton = screen.getByRole("button", {
      name: /\d{2}\s\w+/i,
    });
    fireEvent.click(shiftedDayButton);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Aujourd'hui" }),
      ).toBeInTheDocument();
    });
  });

  it("handles week tab navigation and reset to current week", async () => {
    mockMeResponse({
      firstName: "Lisa",
      lastName: "MBELE",
      role: "STUDENT",
      currentEnrollment: { class: { name: "6eme N3" } },
    });

    render(<StudentTimetablePage />);
    await screen.findByText("Lisa MBELE - 6eme N3");

    fireEvent.click(screen.getByRole("button", { name: "Cette semaine" }));

    expect(
      screen.getByRole("button", { name: "Semaine precedente" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Semaine suivante" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Salle B14").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Semaine suivante" }));

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
    mockMeResponse({
      firstName: "Lisa",
      lastName: "MBELE",
      role: "STUDENT",
      currentEnrollment: { class: { name: "6eme N3" } },
    });

    render(<StudentTimetablePage />);
    await screen.findByText("Lisa MBELE - 6eme N3");

    fireEvent.click(screen.getByRole("button", { name: "Ce mois" }));

    expect(
      screen.getByRole("button", { name: "Mois precedent" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Mois suivant" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/- B14/i).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Mois suivant" }));

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

  it("supports parent context with childId query and shows targeted child", async () => {
    searchParamsMock = new URLSearchParams("childId=child-2");
    mockMeResponse({
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
    });

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

    mockMeResponse({
      firstName: "Lisa",
      lastName: "MBELE",
      role: "STUDENT",
      currentEnrollment: { class: { name: "6eme N3" } },
    });

    render(<StudentTimetablePage />);
    await screen.findByText("Lisa MBELE - 6eme N3");

    fireEvent.click(screen.getByRole("button", { name: "Semaine" }));
    expect(screen.getByText("H")).toBeInTheDocument();
    expect(screen.getByText("Detail du cours selectionne")).toBeInTheDocument();

    const mathsButtons = screen.getAllByRole("button", {
      name: /MATHEMATIQUES/i,
    });
    fireEvent.click(mathsButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Auberger C\./i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Plage horaire:/i)).toBeInTheDocument();
    expect(screen.getByText(/Salle:/i)).toBeInTheDocument();
  });

  it("renders mobile day view and supports compact day navigation", async () => {
    mockCompactViewport();
    mockMeResponse({
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
      expect(screen.getByText("FRANCAIS")).toBeInTheDocument();
    });
    expect(screen.getByText("Jamet P.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /\d{2}\s\w+/i }));
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Aujourd'hui" }),
      ).toBeInTheDocument();
    });
  });

  it("renders mobile month calendar and updates selected-day agenda", async () => {
    mockCompactViewport();
    mockMeResponse({
      firstName: "Lisa",
      lastName: "MBELE",
      role: "STUDENT",
      currentEnrollment: { class: { name: "6eme N3" } },
    });

    render(<StudentTimetablePage />);
    await screen.findByText("Lisa MBELE - 6eme N3");

    fireEvent.click(screen.getByRole("button", { name: "Mois" }));
    expect(screen.getByText("Agenda du jour selectionne")).toBeInTheDocument();
    expect(screen.getByText("Lun")).toBeInTheDocument();
    expect(screen.getByText("Mar")).toBeInTheDocument();

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
