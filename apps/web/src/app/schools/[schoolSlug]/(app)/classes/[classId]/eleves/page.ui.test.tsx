import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TeacherClassAttendancePage from "./page";

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
    {
      classId: "class-1",
      className: "6eC",
      studentId: "student-2",
      studentFirstName: "Alice",
      studentLastName: "Ateba",
    },
  ],
};

function rosterPayload(date: string, absentStudentIds: string[] = []) {
  return {
    classId: "class-1",
    className: "6eC",
    date,
    students: [
      {
        id: "student-2",
        firstName: "Alice",
        lastName: "Ateba",
        present: !absentStudentIds.includes("student-2"),
      },
      {
        id: "student-1",
        firstName: "Remi",
        lastName: "Ntamack",
        present: !absentStudentIds.includes("student-1"),
      },
    ],
  };
}

describe("Teacher class attendance page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
    getCsrfTokenCookieMock.mockReset();
    getCsrfTokenCookieMock.mockReturnValue("csrf-token-test");
  });

  it("loads the roster with everyone present by default and toggles a student to absent", async () => {
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
        url.includes("/schools/college-vogt/classes/class-1/attendance") &&
        method === "GET"
      ) {
        return jsonResponse(rosterPayload("2026-09-16"));
      }

      return jsonResponse({ message: "not found" }, 404);
    });

    render(<TeacherClassAttendancePage />);

    await screen.findByText("Ateba Alice");
    expect(screen.getByText("2/2 présents")).toBeInTheDocument();

    const absentButtons = screen.getAllByRole("button", { name: "Absent" });
    fireEvent.click(absentButtons[0]);

    await waitFor(() =>
      expect(screen.getByText("1/2 présents")).toBeInTheDocument(),
    );
  });

  it("submits only the absent student ids and shows a success message", async () => {
    let lastPostBody: unknown = null;

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
        url.includes("/schools/college-vogt/classes/class-1/attendance") &&
        method === "GET"
      ) {
        return jsonResponse(rosterPayload("2026-09-16"));
      }
      if (
        url.endsWith("/schools/college-vogt/classes/class-1/attendance") &&
        method === "POST"
      ) {
        lastPostBody = JSON.parse(String(init?.body));
        return jsonResponse(rosterPayload("2026-09-16", ["student-2"]));
      }

      return jsonResponse({ message: "not found" }, 404);
    });

    render(<TeacherClassAttendancePage />);

    await screen.findByText("Ateba Alice");

    const absentButtons = screen.getAllByRole("button", { name: "Absent" });
    fireEvent.click(absentButtons[0]);

    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer l'appel" }),
    );

    await screen.findByText("Appel enregistré.");

    expect(lastPostBody).toEqual({
      date: "2026-09-16",
      absentStudentIds: ["student-2"],
    });
  });

  it("redirects to login when the CSRF cookie is missing on save", async () => {
    getCsrfTokenCookieMock.mockReturnValue(undefined as unknown as string);

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
        url.includes("/schools/college-vogt/classes/class-1/attendance") &&
        method === "GET"
      ) {
        return jsonResponse(rosterPayload("2026-09-16"));
      }

      return jsonResponse({ message: "not found" }, 404);
    });

    render(<TeacherClassAttendancePage />);

    await screen.findByText("Ateba Alice");
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer l'appel" }),
    );

    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith("/schools/college-vogt/login"),
    );
  });
});
