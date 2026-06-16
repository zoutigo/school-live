import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LOCALE_STORAGE_KEY, useLocaleStore } from "../../i18n/locale-store";
import { DEFAULT_LOCALE } from "../../i18n/translations";
import SettingsPage from "./page";

const replaceMock = vi.fn();
const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: pushMock }),
}));

vi.mock("../../components/layout/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

function jsonResponse(payload: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

describe("Settings page language tab", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
    pushMock.mockReset();
    window.localStorage.clear();
    useLocaleStore.setState({ locale: DEFAULT_LOCALE });

    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/api/me")) {
        return jsonResponse({
          role: "PARENT",
          activeRole: "PARENT",
          schoolSlug: "college-vogt",
          platformRoles: [],
          memberships: [{ schoolId: "school-1", role: "PARENT" }],
        });
      }
      return jsonResponse({ message: `Unhandled ${url}` }, 404);
    });
  });

  it("shows the language tab and switches the active locale", async () => {
    render(<SettingsPage />);

    const languageTab = await screen.findByRole("button", { name: "Langue" });
    fireEvent.click(languageTab);

    expect(
      screen.getByText("Choisissez la langue de l'interface"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "Anglais" }));

    expect(useLocaleStore.getState().locale).toBe("en");
    await waitFor(() => {
      const stored = JSON.parse(
        window.localStorage.getItem(LOCALE_STORAGE_KEY) as string,
      );
      expect(stored.state.locale).toBe("en");
    });

    // The whole page re-renders in English once the locale changes.
    expect(
      screen.getByRole("button", { name: "Language" }),
    ).toBeInTheDocument();
  });

  it("keeps the previously persisted locale across a re-mount", async () => {
    window.localStorage.setItem(
      LOCALE_STORAGE_KEY,
      JSON.stringify({ state: { locale: "en" }, version: 0 }),
    );
    await useLocaleStore.persist.rehydrate();

    render(<SettingsPage />);

    expect(
      await screen.findByRole("button", { name: "Language" }),
    ).toBeInTheDocument();
  });
});
