import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TeacherClassDisciplinePage from "./page";

const replaceMock = vi.fn();
const getCsrfTokenCookieMock = vi.fn(() => "csrf-token-test");

vi.mock("next/navigation", () => ({
  useParams: () => ({
    schoolSlug: "college-vogt",
    classId: "class-1",
  }),
  useRouter: () => ({ replace: replaceMock }),
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
  schoolYears: [{ id: "sy-1", label: "2025-2026", isActive: true }],
  selectedSchoolYearId: "sy-1",
  assignments: [
    {
      classId: "class-1",
      subjectId: "sub-1",
      className: "6eC",
      subjectName: "Anglais",
      schoolYearId: "sy-1",
    },
  ],
  students: [
    {
      classId: "class-1",
      className: "6eC",
      studentId: "student-1",
      studentFirstName: "Remi",
      studentLastName: "Ntamack",
    },
  ],
};

describe("Discipline page form", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
    getCsrfTokenCookieMock.mockReset();
    getCsrfTokenCookieMock.mockReturnValue("csrf-token-test");
  });

  it("validates discipline creation inline and submits only when the form passes zod", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input, init) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (url.endsWith("/schools/college-vogt/me")) {
          return jsonResponse({ role: "TEACHER" });
        }
        if (url.endsWith("/schools/college-vogt/student-grades/context")) {
          return jsonResponse(contextPayload);
        }
        if (
          url.includes(
            "/schools/college-vogt/students/student-1/life-events",
          ) &&
          method === "GET"
        ) {
          return jsonResponse([]);
        }
        if (
          url.endsWith(
            "/schools/college-vogt/students/student-1/life-events",
          ) &&
          method === "POST"
        ) {
          return jsonResponse({ id: "event-1" }, 201);
        }

        return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
      });

    render(<TeacherClassDisciplinePage />);

    const submitButton = await screen.findByRole("button", {
      name: "Enregistrer l'evenement",
    });
    expect(submitButton).toBeDisabled();
    expect(
      screen.getByText(
        "Vous devez remplir correctement les champs obligatoires.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Motif")).toHaveAttribute(
      "aria-invalid",
      "true",
    );

    fireEvent.change(screen.getByLabelText("Motif"), {
      target: { value: "Absence non justifiee" },
    });

    await waitFor(() => {
      expect(submitButton).toBeEnabled();
      expect(screen.getByLabelText("Motif")).toHaveAttribute(
        "aria-invalid",
        "false",
      );
    });

    const durationInput = document.querySelector(
      'input[type="number"]',
    ) as HTMLInputElement;

    fireEvent.change(durationInput, {
      target: { value: "-5" },
    });

    await waitFor(() => {
      expect(
        screen.getByText("La duree doit etre un entier positif."),
      ).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
      expect(
        screen.getByText(
          "Vous devez remplir correctement les champs obligatoires.",
        ),
      ).toBeInTheDocument();
      expect(durationInput).toHaveAttribute("aria-invalid", "true");
    });

    fireEvent.change(durationInput, {
      target: { value: "15" },
    });

    await waitFor(() => {
      expect(
        screen.queryByText("La duree doit etre un entier positif."),
      ).not.toBeInTheDocument();
      expect(submitButton).toBeEnabled();
      expect(durationInput).toHaveAttribute("aria-invalid", "false");
    });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining(
          "/schools/college-vogt/students/student-1/life-events",
        ),
        expect.objectContaining({
          method: "POST",
          body: expect.any(String),
        }),
      );
    });

    const postCall = fetchMock.mock.calls.find(
      ([input, init]) =>
        String(input).endsWith(
          "/schools/college-vogt/students/student-1/life-events",
        ) && (init?.method ?? "GET") === "POST",
    );
    expect(postCall).toBeDefined();

    const requestBody = JSON.parse(String(postCall?.[1]?.body)) as {
      type: string;
      occurredAt: string;
      reason: string;
      durationMinutes?: number;
      justified?: boolean;
      classId: string;
    };

    expect(requestBody).toMatchObject({
      type: "ABSENCE",
      reason: "Absence non justifiee",
      durationMinutes: 15,
      justified: false,
      classId: "class-1",
    });
    expect(requestBody.occurredAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
  });

  it("shows the inline date error and keeps submit disabled until the date is restored", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url.endsWith("/schools/college-vogt/me")) {
        return jsonResponse({ role: "TEACHER" });
      }
      if (url.endsWith("/schools/college-vogt/student-grades/context")) {
        return jsonResponse(contextPayload);
      }
      if (
        url.includes("/schools/college-vogt/students/student-1/life-events") &&
        method === "GET"
      ) {
        return jsonResponse([]);
      }

      return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
    });

    render(<TeacherClassDisciplinePage />);

    const submitButton = await screen.findByRole("button", {
      name: "Enregistrer l'evenement",
    });
    const reasonInput = screen.getByLabelText("Motif");
    const dateInput = screen.getByLabelText("Date et heure");

    fireEvent.change(reasonInput, {
      target: { value: "Retard repetitif" },
    });

    await waitFor(() => {
      expect(submitButton).toBeEnabled();
    });

    fireEvent.change(dateInput, {
      target: { value: "" },
    });

    await waitFor(() => {
      expect(screen.getByText("La date est obligatoire.")).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
      expect(
        screen.getAllByText(
          "Vous devez remplir correctement les champs obligatoires.",
        ).length,
      ).toBeGreaterThan(0);
    });

    fireEvent.change(dateInput, {
      target: { value: "2026-03-15T08:30" },
    });

    await waitFor(() => {
      expect(
        screen.queryByText("La date est obligatoire."),
      ).not.toBeInTheDocument();
      expect(submitButton).toBeEnabled();
      expect(screen.getByLabelText("Date et heure")).toHaveAttribute(
        "aria-invalid",
        "false",
      );
    });
  });

  it("validates discipline edition inline before submitting", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input, init) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (url.endsWith("/schools/college-vogt/me")) {
          return jsonResponse({ role: "TEACHER" });
        }
        if (url.endsWith("/schools/college-vogt/student-grades/context")) {
          return jsonResponse(contextPayload);
        }
        if (
          url.includes(
            "/schools/college-vogt/students/student-1/life-events",
          ) &&
          method === "GET"
        ) {
          return jsonResponse([
            {
              id: "event-1",
              type: "ABSENCE",
              occurredAt: "2026-03-15T08:30:00.000Z",
              durationMinutes: 10,
              justified: false,
              reason: "Absence initiale",
              comment: null,
              authorUser: {
                id: "teacher-1",
                firstName: "Jean",
                lastName: "Prof",
                email: "prof@example.test",
              },
            },
          ]);
        }
        if (
          url.endsWith(
            "/schools/college-vogt/students/student-1/life-events/event-1",
          ) &&
          method === "PATCH"
        ) {
          return jsonResponse({ id: "event-1" });
        }

        return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
      });

    render(<TeacherClassDisciplinePage />);

    fireEvent.click(await screen.findByRole("button", { name: "Historique" }));
    fireEvent.click(
      (
        await screen.findAllByRole("button", { name: "Modifier l'evenement" })
      )[0],
    );

    const saveButton = await screen.findByRole("button", {
      name: "Enregistrer les modifications",
    });

    fireEvent.change(screen.getByLabelText("Motif edition"), {
      target: { value: "" },
    });

    await waitFor(() => {
      expect(screen.getByText("Le motif est obligatoire.")).toBeInTheDocument();
      expect(saveButton).toBeDisabled();
    });

    fireEvent.change(screen.getByLabelText("Motif edition"), {
      target: { value: "Absence corrigee" },
    });

    await waitFor(() => {
      expect(saveButton).toBeEnabled();
    });

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining(
          "/schools/college-vogt/students/student-1/life-events/event-1",
        ),
        expect.objectContaining({
          method: "PATCH",
          body: expect.any(String),
        }),
      );
    });
  });
});
