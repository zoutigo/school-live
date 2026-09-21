import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SchoolAdminDisciplinePage from "./page";
import { useOnboardingTourStore } from "../../../../../store/onboarding-tour";

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

const contextPayload = {
  assignments: [
    { classId: "class-1", className: "6eC" },
    { classId: "class-1", className: "6eC" },
    { classId: "class-2", className: "5eA" },
  ],
  students: [
    {
      classId: "class-1",
      studentId: "student-1",
      studentFirstName: "Remi",
      studentLastName: "Ntamack",
    },
    {
      classId: "class-2",
      studentId: "student-2",
      studentFirstName: "Alice",
      studentLastName: "Bosis",
    },
  ],
};

function mockAdminRouter(onboardingHelpEnabled = true) {
  return vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";

    if (url.endsWith("/schools/college-vogt/me")) {
      return jsonResponse({ role: "SCHOOL_ADMIN", onboardingHelpEnabled });
    }
    if (url.endsWith("/schools/college-vogt/student-grades/context")) {
      return jsonResponse(contextPayload);
    }
    if (
      url.includes("/schools/college-vogt/students/") &&
      url.includes("/life-events") &&
      method === "GET"
    ) {
      return jsonResponse([]);
    }
    if (
      url.includes("/schools/college-vogt/students/") &&
      url.endsWith("/life-events") &&
      method === "POST"
    ) {
      return jsonResponse({ id: "event-1" }, 201);
    }
    return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
  });
}

describe("School admin discipline page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
    getCsrfTokenCookieMock.mockReset();
    getCsrfTokenCookieMock.mockReturnValue("csrf-token-test");
    useOnboardingTourStore.setState({
      activeTourId: null,
      activeRole: null,
    } as never);
  });

  it("redirige un role non autorise vers le dashboard", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/schools/college-vogt/me")) {
        return jsonResponse({ role: "TEACHER" });
      }
      return jsonResponse({ message: "unhandled" }, 404);
    });

    render(<SchoolAdminDisciplinePage />);

    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith(
        "/schools/college-vogt/dashboard",
      ),
    );
  });

  it("charge la liste des classes dedupliquee et selectionne la premiere par defaut", async () => {
    mockAdminRouter();

    render(<SchoolAdminDisciplinePage />);

    await waitFor(() =>
      expect(
        screen.getByTestId("discipline-admin-class-select"),
      ).toBeInTheDocument(),
    );

    expect(
      await screen.findByRole("button", { name: "Enregistrer l'evenement" }),
    ).toBeInTheDocument();
  });

  it("recharge le panneau discipline quand on change de classe", async () => {
    mockAdminRouter();

    render(<SchoolAdminDisciplinePage />);

    await screen.findByTestId("discipline-admin-class-select");
    fireEvent.click(screen.getByTestId("discipline-admin-class-select"));
    fireEvent.click(
      await screen.findByTestId("discipline-admin-class-select-option-class-1"),
    );

    await waitFor(() =>
      expect(screen.getByTestId("discipline-student-select")).toHaveTextContent(
        "Ntamack",
      ),
    );
  });

  it("demarre le tour d'aide guidee pour un school admin par defaut", async () => {
    mockAdminRouter();

    render(<SchoolAdminDisciplinePage />);

    await waitFor(() =>
      expect(useOnboardingTourStore.getState().activeTourId).toBe(
        "school-admin-discipline",
      ),
    );
    expect(useOnboardingTourStore.getState().activeRole).toBe("SCHOOL_ADMIN");
  });

  it("ne demarre pas le tour si onboardingHelpEnabled est desactive", async () => {
    mockAdminRouter(false);

    render(<SchoolAdminDisciplinePage />);

    await screen.findByTestId("discipline-admin-class-select");
    expect(useOnboardingTourStore.getState().activeTourId).toBeNull();
  });
});
