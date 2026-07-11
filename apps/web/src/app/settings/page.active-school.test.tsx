import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLocaleStore } from "../../i18n/locale-store";
import { DEFAULT_LOCALE } from "../../i18n/translations";
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

const MULTI_SCHOOL_ME = {
  role: "TEACHER",
  activeRole: "TEACHER",
  schoolSlug: "college-a",
  activeSchoolId: "school-a",
  platformRoles: [],
  memberships: [
    { schoolId: "school-a", role: "TEACHER" },
    { schoolId: "school-b", role: "TEACHER" },
  ],
  schools: [
    {
      schoolId: "school-a",
      slug: "college-a",
      name: "College A",
      role: "TEACHER",
    },
    {
      schoolId: "school-b",
      slug: "college-b",
      name: "College B",
      role: "TEACHER",
    },
  ],
};

const SINGLE_SCHOOL_ME = {
  role: "PARENT",
  activeRole: "PARENT",
  schoolSlug: "college-vogt",
  activeSchoolId: "school-1",
  platformRoles: [],
  memberships: [{ schoolId: "school-1", role: "PARENT" }],
  schools: [
    {
      schoolId: "school-1",
      slug: "college-vogt",
      name: "Collège Vogt",
      role: "PARENT",
    },
  ],
};

describe("Settings page — active school switcher", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    pushMock.mockReset();
    getCsrfTokenCookieMock.mockReset();
    getCsrfTokenCookieMock.mockReturnValue("csrf-token-test");
    vi.restoreAllMocks();
    window.localStorage.clear();
    useLocaleStore.setState({ locale: DEFAULT_LOCALE });
  });

  it("does not show the school switcher when the user has a single school", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/api/me")) {
        return jsonResponse(SINGLE_SCHOOL_ME);
      }
      return jsonResponse({ message: `Unhandled ${url}` }, 404);
    });

    render(<SettingsPage />);

    await screen.findByText(
      "Choisissez le role actif pour afficher une seule vue a la fois dans le menu.",
    );
    expect(screen.queryByText("Ecole active")).not.toBeInTheDocument();
  });

  it("shows the school switcher and lists every school when the user has several", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/api/me")) {
        return jsonResponse(MULTI_SCHOOL_ME);
      }
      return jsonResponse({ message: `Unhandled ${url}` }, 404);
    });

    render(<SettingsPage />);

    expect(await screen.findByText("Ecole active")).toBeInTheDocument();
    expect(screen.getByText("College A", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("College B", { exact: false })).toBeInTheDocument();
  });

  it("switches the active school and redirects to its dashboard", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      if (url.endsWith("/api/me") && (!init || init.method === undefined)) {
        return jsonResponse(MULTI_SCHOOL_ME);
      }
      if (url.endsWith("/api/me/active-school") && init?.method === "PUT") {
        expect(init.headers).toMatchObject({
          "X-CSRF-Token": "csrf-token-test",
        });
        expect(JSON.parse(String(init.body))).toEqual({
          schoolId: "school-b",
        });
        return jsonResponse({
          ...MULTI_SCHOOL_ME,
          activeSchoolId: "school-b",
          schoolSlug: "college-b",
        });
      }
      return jsonResponse({ message: `Unhandled ${url}` }, 404);
    });

    render(<SettingsPage />);

    await screen.findByText("Ecole active");
    fireEvent.click(screen.getByRole("radio", { name: /College B/ }));

    const applyButton = screen.getByRole("button", { name: "Changer d'ecole" });
    expect(applyButton).not.toBeDisabled();
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/schools/college-b/dashboard");
    });
  });
});
