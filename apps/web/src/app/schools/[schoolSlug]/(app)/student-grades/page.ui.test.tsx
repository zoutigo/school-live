import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StudentGradesPage from "./page";

const replaceMock = vi.fn();
const getCsrfTokenCookieMock = vi.fn(() => "csrf-token-test");

vi.mock("next/navigation", () => ({
  useParams: () => ({ schoolSlug: "college-vogt" }),
  useRouter: () => ({ replace: replaceMock }),
}));

vi.mock("../../../../../lib/auth-cookies", () => ({
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

describe("Student grades page form", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
    getCsrfTokenCookieMock.mockReset();
    getCsrfTokenCookieMock.mockReturnValue("csrf-token-test");
  });

  it("keeps grade creation disabled until valid and submits", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input, init) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (url.endsWith("/schools/college-vogt/me")) {
          return jsonResponse({ role: "TEACHER" });
        }
        if (url.endsWith("/schools/college-vogt/student-grades/context")) {
          return jsonResponse({
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
          });
        }
        if (url.endsWith("/schools/college-vogt/student-grades")) {
          if (method === "POST") {
            return jsonResponse({ id: "grade-1" }, 201);
          }
          return jsonResponse([]);
        }

        return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
      });

    render(<StudentGradesPage />);

    const submitButton = await screen.findByRole("button", {
      name: "Ajouter la note",
    });
    expect(submitButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Note"), {
      target: { value: "15.5", valueAsNumber: 15.5 },
    });

    await waitFor(() => {
      expect(submitButton).toBeEnabled();
    });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/schools/college-vogt/student-grades"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            studentId: "student-1",
            classId: "class-1",
            subjectId: "sub-1",
            value: 15.5,
            maxValue: 20,
            assessmentWeight: 1,
            term: "TERM_1",
          }),
        }),
      );
    });
  });
});
