import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLocaleStore } from "../../i18n/locale-store";
import { DEFAULT_LOCALE } from "../../i18n/translations";
import { useOnboardingTourStore } from "../../store/onboarding-tour";
import { SCHOOL_SETTINGS_TOUR_ID } from "./school-settings-tour.config";
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

const LEVELS = [
  {
    id: "own-gen",
    code: "GEN",
    label: "General",
    order: null,
    isNational: false,
    isActivated: true,
  },
  {
    id: "nat-6eme",
    code: "6EME",
    label: "6ème",
    order: 8,
    isNational: true,
    isActivated: true,
  },
  {
    id: "nat-5eme",
    code: "5EME",
    label: "5ème",
    order: 9,
    isNational: true,
    isActivated: false,
  },
];

describe("Settings page — onglet Niveaux", () => {
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

  it("demarre le tour spotlight pour un admin ecole quand l'aide est activee", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/api/me")) {
        return jsonResponse({
          ...SCHOOL_ADMIN_ME,
          onboardingHelpEnabled: true,
        });
      }
      if (url.endsWith("/api/schools/college-vogt/admin/staff-functions")) {
        return jsonResponse([]);
      }
      if (url.endsWith("/api/schools/college-vogt/admin/staff-assignments")) {
        return jsonResponse([]);
      }
      if (url.endsWith("/api/schools/college-vogt/admin/staff-candidates")) {
        return jsonResponse([]);
      }
      if (url.endsWith("/api/schools/college-vogt/admin/academic-levels")) {
        return jsonResponse(LEVELS);
      }
      return jsonResponse({ message: `Unhandled ${url}` }, 404);
    });

    render(<SettingsPage />);

    await waitFor(() => {
      expect(useOnboardingTourStore.getState().activeTourId).toBe(
        SCHOOL_SETTINGS_TOUR_ID,
      );
    });
  });

  it("ne demarre pas le tour quand l'aide guidee est desactivee sur le compte", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/api/me")) {
        return jsonResponse({
          ...SCHOOL_ADMIN_ME,
          onboardingHelpEnabled: false,
        });
      }
      if (url.endsWith("/api/schools/college-vogt/admin/staff-functions")) {
        return jsonResponse([]);
      }
      if (url.endsWith("/api/schools/college-vogt/admin/staff-assignments")) {
        return jsonResponse([]);
      }
      if (url.endsWith("/api/schools/college-vogt/admin/staff-candidates")) {
        return jsonResponse([]);
      }
      if (url.endsWith("/api/schools/college-vogt/admin/academic-levels")) {
        return jsonResponse(LEVELS);
      }
      return jsonResponse({ message: `Unhandled ${url}` }, 404);
    });

    render(<SettingsPage />);

    await screen.findByTestId("settings-tab-levels");
    expect(useOnboardingTourStore.getState().activeTourId).toBeNull();
  });

  it("charge et affiche les niveaux pour un admin ecole", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/api/me")) {
        return jsonResponse(SCHOOL_ADMIN_ME);
      }
      if (url.endsWith("/api/schools/college-vogt/admin/staff-functions")) {
        return jsonResponse([]);
      }
      if (url.endsWith("/api/schools/college-vogt/admin/staff-assignments")) {
        return jsonResponse([]);
      }
      if (url.endsWith("/api/schools/college-vogt/admin/staff-candidates")) {
        return jsonResponse([]);
      }
      if (url.endsWith("/api/schools/college-vogt/admin/academic-levels")) {
        return jsonResponse(LEVELS);
      }
      return jsonResponse({ message: `Unhandled ${url}` }, 404);
    });

    render(<SettingsPage />);

    fireEvent.click(await screen.findByTestId("settings-tab-levels"));

    expect(
      await screen.findByTestId("settings-level-row-own-gen"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("settings-level-row-nat-6eme"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("settings-level-row-own-gen-toggle"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId("settings-level-row-nat-6eme-toggle"),
    ).toBeInTheDocument();
  });

  it("active un niveau national via la case a cocher", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      if (url.endsWith("/api/me") && !init?.method) {
        return jsonResponse(SCHOOL_ADMIN_ME);
      }
      if (url.endsWith("/api/schools/college-vogt/admin/staff-functions")) {
        return jsonResponse([]);
      }
      if (url.endsWith("/api/schools/college-vogt/admin/staff-assignments")) {
        return jsonResponse([]);
      }
      if (url.endsWith("/api/schools/college-vogt/admin/staff-candidates")) {
        return jsonResponse([]);
      }
      if (
        url.endsWith("/api/schools/college-vogt/admin/academic-levels") &&
        !init?.method
      ) {
        return jsonResponse(LEVELS);
      }
      if (
        url.endsWith(
          "/api/schools/college-vogt/admin/academic-levels/nat-5eme/activation",
        ) &&
        init?.method === "PATCH"
      ) {
        expect(JSON.parse(String(init.body))).toEqual({ activated: true });
        return jsonResponse({ success: true, activated: true });
      }
      return jsonResponse({ message: `Unhandled ${url}` }, 404);
    });

    render(<SettingsPage />);

    fireEvent.click(await screen.findByTestId("settings-tab-levels"));
    const toggle = await screen.findByTestId(
      "settings-level-row-nat-5eme-toggle",
    );
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(screen.getByText("Modification enregistree.")).toBeInTheDocument();
    });
  });

  it("enregistre l'ordre d'un niveau propre a l'ecole", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      if (url.endsWith("/api/me") && !init?.method) {
        return jsonResponse(SCHOOL_ADMIN_ME);
      }
      if (url.endsWith("/api/schools/college-vogt/admin/staff-functions")) {
        return jsonResponse([]);
      }
      if (url.endsWith("/api/schools/college-vogt/admin/staff-assignments")) {
        return jsonResponse([]);
      }
      if (url.endsWith("/api/schools/college-vogt/admin/staff-candidates")) {
        return jsonResponse([]);
      }
      if (
        url.endsWith("/api/schools/college-vogt/admin/academic-levels") &&
        !init?.method
      ) {
        return jsonResponse(LEVELS);
      }
      if (
        url.endsWith(
          "/api/schools/college-vogt/admin/academic-levels/own-gen",
        ) &&
        init?.method === "PATCH"
      ) {
        expect(JSON.parse(String(init.body))).toEqual({ order: 5 });
        return jsonResponse({ id: "own-gen", order: 5 });
      }
      return jsonResponse({ message: `Unhandled ${url}` }, 404);
    });

    render(<SettingsPage />);

    fireEvent.click(await screen.findByTestId("settings-tab-levels"));
    const input = await screen.findByTestId(
      "settings-level-row-own-gen-order-input",
    );
    fireEvent.change(input, { target: { value: "5" } });
    fireEvent.click(
      screen.getByTestId("settings-level-row-own-gen-order-save"),
    );

    await waitFor(() => {
      expect(screen.getByText("Modification enregistree.")).toBeInTheDocument();
    });
  });
});
