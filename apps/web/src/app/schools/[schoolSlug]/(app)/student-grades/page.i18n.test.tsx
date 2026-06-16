import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StudentGradesPage from "./page";
import { useLocaleStore } from "../../../../../i18n/locale-store";
import { DEFAULT_LOCALE } from "../../../../../i18n/translations";
import { translate } from "../../../../../i18n/useTranslation";

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

function setupFetchMock() {
  return vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
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
      return jsonResponse([]);
    }

    return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
  });
}

describe("StudentGradesPage i18n", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useLocaleStore.setState({ locale: DEFAULT_LOCALE });
    vi.restoreAllMocks();
    replaceMock.mockReset();
    getCsrfTokenCookieMock.mockReset();
    getCsrfTokenCookieMock.mockReturnValue("csrf-token-test");
  });

  afterEach(() => {
    useLocaleStore.setState({ locale: DEFAULT_LOCALE });
  });

  it("renders the form in French by default", async () => {
    setupFetchMock();

    render(<StudentGradesPage />);

    expect(
      await screen.findByRole("button", {
        name: translate("fr", "notes.admin.form.submit"),
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(translate("fr", "notes.admin.card.title")),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(translate("fr", "notes.admin.form.value")),
    ).toBeInTheDocument();
  });

  it("renders the form in English when locale=en", async () => {
    useLocaleStore.setState({ locale: "en" });
    setupFetchMock();

    render(<StudentGradesPage />);

    expect(
      await screen.findByRole("button", {
        name: translate("en", "notes.admin.form.submit"),
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(translate("en", "notes.admin.card.title")),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(translate("en", "notes.admin.form.value")),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole("button", {
        name: translate("fr", "notes.admin.form.submit"),
      }),
    ).not.toBeInTheDocument();
  });
});
