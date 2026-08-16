import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "./app-shell";
import { usePageHelpStore } from "../../store/page-help";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("./app-sidebar", () => ({
  AppSidebar: ({ onLogoutClick }: { onLogoutClick?: () => void }) => (
    <nav aria-label="Sidebar">
      <button type="button" onClick={onLogoutClick}>
        Sidebar logout
      </button>
    </nav>
  ),
  SIDEBAR_HELP_TOUR_TARGET: "sidebar-help-target",
}));

describe("AppShell header scroll behavior", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    pushMock.mockReset();
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.endsWith("/api/me")) {
        return new Response(
          JSON.stringify({
            firstName: "Robert",
            lastName: "Ntamack",
            role: "PARENT",
            activeRole: "PARENT",
            platformRoles: [],
            memberships: [],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      if (url.includes("/schools/college-vogt/public")) {
        return new Response(
          JSON.stringify({
            name: "college vogt",
            logoUrl: null,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      if (url.endsWith("/api/auth/logout")) {
        return new Response(null, { status: 204 });
      }

      return new Response(JSON.stringify({ message: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    });
  });

  it("hides the header on downward scroll and reveals it on slight upward scroll", async () => {
    render(
      <AppShell schoolSlug="college-vogt" schoolName="college vogt">
        <div style={{ height: "2400px" }}>Long content</div>
      </AppShell>,
    );

    const header = screen.getByTestId("app-header-shell");
    const main = screen.getByTestId("app-shell-main");

    expect(header).toHaveAttribute("data-state", "visible");

    await act(async () => {
      Object.defineProperty(main, "scrollTop", {
        configurable: true,
        value: 64,
      });
      fireEvent.scroll(main);
      await Promise.resolve();
    });

    await waitFor(() => expect(header).toHaveAttribute("data-state", "hidden"));

    await act(async () => {
      Object.defineProperty(main, "scrollTop", {
        configurable: true,
        value: 60,
      });
      fireEvent.scroll(main);
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(header).toHaveAttribute("data-state", "visible"),
    );
  });

  it("confirms logout from the desktop header before redirecting to the home page", async () => {
    render(
      <AppShell schoolSlug="college-vogt" schoolName="college vogt">
        <div>Content</div>
      </AppShell>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Se deconnecter" }));

    const confirmDialog = screen.getByRole("dialog", {
      name: "Confirmer la deconnexion",
    });

    expect(confirmDialog).toBeInTheDocument();

    fireEvent.click(
      within(confirmDialog).getByRole("button", { name: "Se deconnecter" }),
    );

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/");
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://localhost:3001/api/auth/logout",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
      }),
    );
  });

  it("confirms logout from the mobile sidebar before redirecting to the home page", async () => {
    render(
      <AppShell schoolSlug="college-vogt" schoolName="college vogt">
        <div>Content</div>
      </AppShell>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Ouvrir le menu" }));

    const mobileMenu = screen.getByRole("dialog");
    fireEvent.click(
      within(mobileMenu).getByRole("button", { name: "Sidebar logout" }),
    );

    const confirmDialog = screen.getByRole("dialog", {
      name: "Confirmer la deconnexion",
    });

    expect(confirmDialog).toBeInTheDocument();

    fireEvent.click(
      within(confirmDialog).getByRole("button", { name: "Se deconnecter" }),
    );

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/");
    });
  });
});

describe("AppShell — modale d'aide globale", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    pushMock.mockReset();
    usePageHelpStore.setState({ entry: null, open: false });
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.endsWith("/api/me")) {
        return new Response(
          JSON.stringify({
            firstName: "Robert",
            lastName: "Ntamack",
            role: "PARENT",
            activeRole: "PARENT",
            platformRoles: [],
            memberships: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response(JSON.stringify({ message: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    });
  });

  it("ne rend aucune modale quand aucune page n'a enregistré d'aide", () => {
    render(
      <AppShell schoolSlug="college-vogt" schoolName="college vogt">
        <div>Content</div>
      </AppShell>,
    );

    expect(screen.queryByTestId("help-dialog")).not.toBeInTheDocument();
  });

  it("affiche la modale enregistrée par la page une fois ouverte via le store", async () => {
    usePageHelpStore.setState({
      entry: {
        title: "Emploi du temps",
        sections: [{ title: "Vue", body: ["Changez de vue ici."] }],
      },
      open: false,
    });

    render(
      <AppShell schoolSlug="college-vogt" schoolName="college vogt">
        <div>Content</div>
      </AppShell>,
    );

    expect(screen.queryByTestId("help-dialog")).not.toBeInTheDocument();

    act(() => {
      usePageHelpStore.getState().openHelp();
    });

    await waitFor(() => {
      expect(screen.getByTestId("help-dialog")).toHaveTextContent(
        "Emploi du temps",
      );
    });
    expect(screen.getByTestId("help-dialog")).toHaveTextContent(
      "Changez de vue ici.",
    );

    fireEvent.click(screen.getByTestId("help-dialog-close"));
    expect(usePageHelpStore.getState().open).toBe(false);
  });
});
