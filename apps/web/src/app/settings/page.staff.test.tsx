import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLocaleStore } from "../../i18n/locale-store";
import { DEFAULT_LOCALE } from "../../i18n/translations";
import { useOnboardingTourStore } from "../../store/onboarding-tour";
import { selectSearchableOption } from "../../test/searchable-select";
import SettingsPage from "./page";

const replaceMock = vi.fn();
const pushMock = vi.fn();
const getCsrfTokenCookieMock = vi.fn(() => "csrf-token-test");

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: pushMock }),
}));

vi.mock("../../components/layout/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("../../lib/auth-cookies", () => ({
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

const SCHOOL_ADMIN_ME = {
  role: "SCHOOL_ADMIN",
  activeRole: "SCHOOL_ADMIN",
  schoolSlug: "college-vogt",
  activeSchoolId: "school-1",
  platformRoles: [],
  memberships: [{ schoolId: "school-1", role: "SCHOOL_ADMIN" }],
  schools: [
    {
      schoolId: "school-1",
      slug: "college-vogt",
      name: "Collège Vogt",
      role: "SCHOOL_ADMIN",
    },
  ],
};

const STAFF_FUNCTIONS = [
  { id: "fn-1", name: "Surveillant" },
  { id: "fn-2", name: "Infirmier" },
];

const STAFF_CANDIDATES = [
  { userId: "u-1", firstName: "Anne", lastName: "Rousselet", role: "STAFF" },
  { userId: "u-2", firstName: "Paul", lastName: "Diallo", role: "STAFF" },
];

function mockFetchBase() {
  return vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";

    if (url.endsWith("/api/me")) {
      return jsonResponse(SCHOOL_ADMIN_ME);
    }
    if (
      url.endsWith("/api/schools/college-vogt/admin/staff-functions") &&
      method === "GET"
    ) {
      return jsonResponse(STAFF_FUNCTIONS);
    }
    if (
      url.endsWith("/api/schools/college-vogt/admin/staff-assignments") &&
      method === "GET"
    ) {
      return jsonResponse([]);
    }
    if (
      url.endsWith("/api/schools/college-vogt/admin/staff-assignments") &&
      method === "POST"
    ) {
      return jsonResponse({ id: "assignment-1" });
    }
    if (url.endsWith("/api/schools/college-vogt/admin/staff-candidates")) {
      return jsonResponse(STAFF_CANDIDATES);
    }
    if (url.endsWith("/api/schools/college-vogt/admin/academic-levels")) {
      return jsonResponse([]);
    }

    return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
  });
}

describe("Settings page — onglet Personnel", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    pushMock.mockReset();
    getCsrfTokenCookieMock.mockReset();
    getCsrfTokenCookieMock.mockReturnValue("csrf-token-test");
    vi.restoreAllMocks();
    window.localStorage.clear();
    useLocaleStore.setState({ locale: DEFAULT_LOCALE });
    useOnboardingTourStore.setState({
      completedTours: {},
      activeTourId: null,
      activeRole: null,
      steps: [],
      stepIndex: 0,
      targetRect: null,
    });
  });

  it("affecte un membre du personnel via les listes deroulantes Fonction/Personnel", async () => {
    const fetchMock = mockFetchBase();
    render(<SettingsPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Personnel" }));

    await selectSearchableOption("Fonction affectee", "Infirmier");
    await selectSearchableOption("Personnel", "Diallo Paul (STAFF)");

    fireEvent.click(screen.getByRole("button", { name: "Affecter" }));

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(
        ([callUrl, callInit]) =>
          String(callUrl).endsWith("/admin/staff-assignments") &&
          callInit?.method === "POST",
      );
      expect(postCall).toBeTruthy();
      const body = JSON.parse(String(postCall?.[1]?.body));
      expect(body).toEqual({ functionId: "fn-2", userId: "u-2" });
      const headers = postCall?.[1]?.headers as Record<string, string>;
      expect(headers["X-CSRF-Token"]).toBe("csrf-token-test");
    });

    await waitFor(() =>
      expect(screen.getByText("Affectation enregistree.")).toBeInTheDocument(),
    );
  });
});
