import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TeacherClassAgendaPage from "./page";
import { useLocaleStore } from "../../../../../../../i18n/locale-store";
import { DEFAULT_LOCALE } from "../../../../../../../i18n/translations";

const replaceMock = vi.fn();
const getCsrfTokenCookieMock = vi.fn(() => "csrf-token-test");

vi.mock("next/navigation", () => ({
  useParams: () => ({
    schoolSlug: "college-vogt",
    classId: "class-1",
  }),
  useRouter: () => ({ replace: replaceMock }),
}));

vi.mock("../../../../../../../components/timetable/timetable-views", () => ({
  TimetableViews: ({
    slots,
    onSlotClick,
  }: {
    slots: Array<{ id: string; subjectName: string }>;
    onSlotClick?: (slot: { id: string; subjectName: string }) => void;
  }) => (
    <div>
      {slots.map((slot) => (
        <button key={slot.id} type="button" onClick={() => onSlotClick?.(slot)}>
          {slot.subjectName}
        </button>
      ))}
    </div>
  ),
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

const contextPayload = {
  class: {
    id: "class-1",
    name: "6eC",
    schoolYearId: "sy-1",
    academicLevelId: "level-1",
    referentTeacherUserId: "teacher-1",
  },
  allowedSubjects: [{ id: "sub-1", name: "Anglais" }],
  assignments: [
    {
      teacherUserId: "teacher-1",
      subjectId: "sub-1",
      subject: { id: "sub-1", name: "Anglais" },
      teacherUser: {
        id: "teacher-1",
        firstName: "Albert",
        lastName: "Mvondo",
        email: "albert@example.test",
        gender: "M",
      },
    },
  ],
  subjectStyles: [{ subjectId: "sub-1", colorHex: "#2563EB" }],
  schoolYears: [{ id: "sy-1", label: "2025-2026", isActive: true }],
  selectedSchoolYearId: "sy-1",
};

const timetablePayload = {
  class: {
    id: "class-1",
    schoolYearId: "sy-1",
    academicLevelId: "level-1",
  },
  slots: [
    {
      id: "slot-1",
      weekday: 1,
      startMinute: 525,
      endMinute: 580,
      activeFromDate: null,
      activeToDate: null,
      room: "B14",
      subject: { id: "sub-1", name: "Anglais" },
      teacherUser: {
        id: "teacher-1",
        firstName: "Albert",
        lastName: "Mvondo",
        email: "albert@example.test",
        gender: "M",
      },
    },
  ],
  occurrences: [
    {
      id: "occ-1",
      source: "RECURRING",
      status: "PLANNED",
      occurrenceDate: "2026-03-16",
      weekday: 1,
      startMinute: 525,
      endMinute: 580,
      room: "B14",
      reason: null,
      slotId: "slot-1",
      subject: { id: "sub-1", name: "Anglais" },
      teacherUser: {
        id: "teacher-1",
        firstName: "Albert",
        lastName: "Mvondo",
        email: "albert@example.test",
        gender: "M",
      },
    },
  ],
  calendarEvents: [],
  subjectStyles: [{ subjectId: "sub-1", colorHex: "#2563EB" }],
};

describe("Agenda page forms", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
    getCsrfTokenCookieMock.mockReset();
    getCsrfTokenCookieMock.mockReturnValue("csrf-token-test");
    window.localStorage.clear();
    useLocaleStore.setState({ locale: DEFAULT_LOCALE });
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  it("validates slot creation inline and submits only when the form passes zod", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input, init) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (url.endsWith("/schools/college-vogt/me")) {
          return jsonResponse({ role: "TEACHER" });
        }
        if (url.includes("/timetable/classes/class-1/context")) {
          return jsonResponse(contextPayload);
        }
        if (
          url.includes("/timetable/classes/class-1?") &&
          !url.includes("/context")
        ) {
          return jsonResponse(timetablePayload);
        }
        if (url.includes("/admin/rooms/available")) {
          return jsonResponse([
            {
              id: "r-b14",
              name: "B14",
              status: "AVAILABLE",
              isAvailable: true,
            },
          ]);
        }
        if (
          url.endsWith(
            "/schools/college-vogt/timetable/classes/class-1/slots",
          ) &&
          method === "POST"
        ) {
          return jsonResponse({ id: "slot-2" }, 201);
        }

        return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
      });

    render(<TeacherClassAgendaPage />);

    fireEvent.click(await screen.findByTitle("Ajouter"));

    const submitButton = await screen.findByRole("button", {
      name: "Ajouter le creneau",
    });
    expect(submitButton).toBeEnabled();

    // Sélectionner la salle B14 dans le dropdown (select)
    const roomSelect = document.getElementById(
      "slot-room",
    ) as HTMLSelectElement;
    await waitFor(() => expect(roomSelect).not.toBeNull());
    fireEvent.change(roomSelect, { target: { value: "B14" } });

    const slotTimeInputs = document.querySelectorAll('input[type="time"]');
    fireEvent.change(slotTimeInputs[1] as HTMLInputElement, {
      target: { value: "08:30" },
    });

    await waitFor(() => {
      expect(
        screen.getByText("L'heure de debut doit etre avant l'heure de fin."),
      ).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
      expect(
        screen.getByText(
          "Vous devez remplir correctement les champs obligatoires.",
        ),
      ).toBeInTheDocument();
      expect(slotTimeInputs[1] as HTMLInputElement).toHaveAttribute(
        "aria-invalid",
        "true",
      );
    });

    fireEvent.change(slotTimeInputs[1] as HTMLInputElement, {
      target: { value: "09:40" },
    });

    await waitFor(() => {
      expect(submitButton).toBeEnabled();
      expect(slotTimeInputs[1] as HTMLInputElement).toHaveAttribute(
        "aria-invalid",
        "false",
      );
    });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/timetable/classes/class-1/slots"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            schoolYearId: "sy-1",
            weekday: 1,
            startMinute: 525,
            endMinute: 580,
            subjectId: "sub-1",
            teacherUserId: "teacher-1",
            room: "B14",
            activeFromDate: undefined,
            activeToDate: undefined,
          }),
        }),
      );
    });
  });

  it("validates occurrence updates inline before submitting", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input, init) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (url.endsWith("/schools/college-vogt/me")) {
          return jsonResponse({ role: "TEACHER" });
        }
        if (url.includes("/timetable/classes/class-1/context")) {
          return jsonResponse(contextPayload);
        }
        if (
          url.includes("/timetable/classes/class-1?") &&
          !url.includes("/context")
        ) {
          return jsonResponse(timetablePayload);
        }
        if (
          url.endsWith(
            "/schools/college-vogt/timetable/slots/slot-1/exceptions",
          ) &&
          method === "POST"
        ) {
          return jsonResponse({ id: "exception-1" }, 201);
        }

        return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
      });

    render(<TeacherClassAgendaPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Anglais" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Modifier cette occurrence" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));

    const submitButton = await screen.findByRole("button", {
      name: "Appliquer l'action",
    });
    expect(submitButton).toBeEnabled();

    const occurrenceTimeInputs =
      document.querySelectorAll('input[type="time"]');
    fireEvent.change(occurrenceTimeInputs[1] as HTMLInputElement, {
      target: { value: "08:00" },
    });

    await waitFor(() => {
      expect(
        screen.getByText("L'heure de debut doit etre avant l'heure de fin."),
      ).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
      expect(
        screen.getByText(
          "Vous devez remplir correctement les champs obligatoires.",
        ),
      ).toBeInTheDocument();
      expect(occurrenceTimeInputs[1] as HTMLInputElement).toHaveAttribute(
        "aria-invalid",
        "true",
      );
    });

    fireEvent.change(occurrenceTimeInputs[1] as HTMLInputElement, {
      target: { value: "09:40" },
    });

    await waitFor(() => {
      expect(submitButton).toBeEnabled();
      expect(occurrenceTimeInputs[1] as HTMLInputElement).toHaveAttribute(
        "aria-invalid",
        "false",
      );
    });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/timetable/slots/slot-1/exceptions"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            occurrenceDate: "2026-03-16",
            type: "OVERRIDE",
            startMinute: 525,
            endMinute: 580,
            subjectId: "sub-1",
            teacherUserId: "teacher-1",
            room: "B14",
          }),
        }),
      );
    });
  });

  it("DELETE_SERIES envoie DELETE sur /timetable/slots/:slotId (cascade API)", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input, init) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (url.endsWith("/schools/college-vogt/me")) {
          return jsonResponse({ role: "SCHOOL_ADMIN" });
        }
        if (url.includes("/timetable/classes/class-1/context")) {
          return jsonResponse(contextPayload);
        }
        if (
          url.includes("/timetable/classes/class-1?") &&
          !url.includes("/context")
        ) {
          return jsonResponse(timetablePayload);
        }
        if (
          url.endsWith("/schools/college-vogt/timetable/slots/slot-1") &&
          method === "DELETE"
        ) {
          return jsonResponse({ id: "slot-1", deleted: true }, 200);
        }

        return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
      });

    render(<TeacherClassAgendaPage />);

    // Ouvre le modal d'occurrence en cliquant sur le slot
    fireEvent.click(await screen.findByRole("button", { name: "Anglais" }));

    // Sélectionne "Supprimer toute la série" dans l'étape "action"
    fireEvent.click(
      await screen.findByRole("button", { name: "Supprimer toute la serie" }),
    );

    // Passe à l'étape "details" en cliquant Continuer
    fireEvent.click(await screen.findByRole("button", { name: "Continuer" }));

    // Confirme la suppression
    const submitButton = await screen.findByRole("button", {
      name: "Appliquer l'action",
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/schools/college-vogt/timetable/slots/slot-1"),
        expect.objectContaining({ method: "DELETE" }),
      );
    });
  });

  it("renders the agenda page in English when the locale is set to en", async () => {
    useLocaleStore.setState({ locale: "en" });

    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);

      if (url.endsWith("/schools/college-vogt/me")) {
        return jsonResponse({ role: "TEACHER" });
      }
      if (url.includes("/timetable/classes/class-1/context")) {
        return jsonResponse(contextPayload);
      }
      if (
        url.includes("/timetable/classes/class-1?") &&
        !url.includes("/context")
      ) {
        return jsonResponse(timetablePayload);
      }

      return jsonResponse({ message: `Unhandled GET ${url}` }, 404);
    });

    render(<TeacherClassAgendaPage />);

    expect(await screen.findByText("Timetable - 6eC")).toBeInTheDocument();
    expect(
      screen.getByText("Create and manage the yearly timetable"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Slots" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Holidays" }),
    ).toBeInTheDocument();

    fireEvent.click(await screen.findByTitle("Add"));

    expect(
      await screen.findByRole("button", { name: "Add slot" }),
    ).toBeInTheDocument();

    expect(screen.queryByText("Emploi du temps - 6eC")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Creation et gestion de l'emploi du temps annuel"),
    ).not.toBeInTheDocument();
  });
});
