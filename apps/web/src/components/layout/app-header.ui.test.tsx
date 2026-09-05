import { act, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLocaleStore } from "../../i18n/locale-store";
import { DEFAULT_LOCALE } from "../../i18n/translations";
import { AppHeader } from "./app-header";
import { useAppShellUiStore } from "./app-shell-ui-store";
import { usePageHelpStore } from "../../store/page-help";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("AppHeader mobile menu attention", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers();
    window.localStorage.clear();
    useAppShellUiStore.getState().reset();
    useLocaleStore.setState({ locale: DEFAULT_LOCALE });
  });

  it("animates the mobile menu button every 15 seconds until the first click", () => {
    const onToggleMenu = vi.fn();

    render(
      <AppHeader
        schoolName="college vogt"
        isSchoolContext
        role="PARENT"
        userInitials="RN"
        userDisplayName="Robert Ntamack"
        onToggleMenu={onToggleMenu}
        onLogoutClick={vi.fn()}
      />,
    );

    const menuButton = screen.getByRole("button", { name: "Ouvrir le menu" });

    expect(menuButton).toHaveAttribute("data-attention", "idle");

    act(() => {
      vi.advanceTimersByTime(15_000);
    });

    expect(menuButton).toHaveAttribute("data-attention", "active");

    fireEvent.click(menuButton);
    expect(onToggleMenu).toHaveBeenCalledTimes(1);
    expect(menuButton).toHaveAttribute("data-attention", "dismissed");

    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(menuButton).toHaveAttribute("data-attention", "dismissed");
  });

  it("keeps the menu hint dismissed across header remounts in the same app session", () => {
    const onToggleMenu = vi.fn();

    const { unmount } = render(
      <AppHeader
        schoolName="college vogt"
        isSchoolContext
        role="PARENT"
        userInitials="RN"
        userDisplayName="Robert Ntamack"
        onToggleMenu={onToggleMenu}
        onLogoutClick={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Ouvrir le menu" }));
    expect(useAppShellUiStore.getState().hasOpenedMobileMenu).toBe(true);

    unmount();

    render(
      <AppHeader
        schoolName="college vogt"
        isSchoolContext
        role="PARENT"
        userInitials="RN"
        userDisplayName="Robert Ntamack"
        onToggleMenu={onToggleMenu}
        onLogoutClick={vi.fn()}
      />,
    );

    const menuButton = screen.getByRole("button", { name: "Ouvrir le menu" });
    expect(menuButton).toHaveAttribute("data-attention", "dismissed");

    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(menuButton).toHaveAttribute("data-attention", "dismissed");
  });

  it("persists the menu hint dismissal in local storage", () => {
    const onToggleMenu = vi.fn();

    render(
      <AppHeader
        schoolName="college vogt"
        isSchoolContext
        role="PARENT"
        userInitials="RN"
        userDisplayName="Robert Ntamack"
        onToggleMenu={onToggleMenu}
        onLogoutClick={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Ouvrir le menu" }));

    expect(window.localStorage.getItem("app-shell-ui")).toContain(
      '"hasOpenedMobileMenu":true',
    );
  });

  it("delegates desktop logout to the shared shell handler", () => {
    const onLogoutClick = vi.fn();

    render(
      <AppHeader
        schoolName="college vogt"
        isSchoolContext
        role="PARENT"
        userInitials="RN"
        userDisplayName="Robert Ntamack"
        onToggleMenu={vi.fn()}
        onLogoutClick={onLogoutClick}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Se deconnecter" }));

    expect(onLogoutClick).toHaveBeenCalledTimes(1);
  });
});

describe("AppHeader localization", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    useAppShellUiStore.getState().reset();
    useLocaleStore.setState({ locale: DEFAULT_LOCALE });
  });

  it("renders French labels by default", () => {
    render(
      <AppHeader
        schoolName="college vogt"
        isSchoolContext
        role="PARENT"
        userInitials="RN"
        userDisplayName="Robert Ntamack"
        onToggleMenu={vi.fn()}
        onLogoutClick={vi.fn()}
      />,
    );

    expect(screen.getByText("Portail famille")).toBeInTheDocument();
    expect(screen.getByText("Parent")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Se deconnecter" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Ouvrir le menu" }),
    ).toBeInTheDocument();
  });

  it("renders English labels when the locale is set to English", () => {
    useLocaleStore.getState().setLocale("en");

    render(
      <AppHeader
        schoolName="college vogt"
        isSchoolContext
        role="PARENT"
        userInitials="RN"
        userDisplayName="Robert Ntamack"
        onToggleMenu={vi.fn()}
        onLogoutClick={vi.fn()}
      />,
    );

    expect(screen.getByText("Family portal")).toBeInTheDocument();
    expect(screen.getByText("Parent")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open menu" }),
    ).toBeInTheDocument();
  });

  it("shows the platform admin dashboard title translated for the active locale", () => {
    useLocaleStore.getState().setLocale("en");

    render(
      <AppHeader
        schoolName="Plateforme"
        isSchoolContext={false}
        role="ADMIN"
        userInitials="AD"
        userDisplayName="Admin User"
        onToggleMenu={vi.fn()}
        onLogoutClick={vi.fn()}
      />,
    );

    expect(
      screen.getByText("Platform administration dashboard"),
    ).toBeInTheDocument();
  });

  it("shows the generic app name instead of the admin dashboard title for a non-platform role without an active school", () => {
    // Regression: a PARENT (or TEACHER/STUDENT/school-staff) browsing a
    // global, non-school-scoped route (e.g. /resources) has no active
    // schoolSlug on that route, so isSchoolContext is false even though the
    // viewer is not a platform admin. The header must not claim they are
    // looking at the "platform administration dashboard" in that case.
    render(
      <AppHeader
        schoolName="Plateforme"
        isSchoolContext={false}
        role="PARENT"
        userInitials="PW"
        userDisplayName="Pierre Wome"
        onToggleMenu={vi.fn()}
        onLogoutClick={vi.fn()}
      />,
    );

    expect(
      screen.queryByText("Dashboard d'administration de la plateforme"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Platform administration dashboard"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Scolive" }),
    ).toBeInTheDocument();
  });
});

describe("AppHeader help button", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    useAppShellUiStore.getState().reset();
    useLocaleStore.setState({ locale: DEFAULT_LOCALE });
    usePageHelpStore.setState({ entry: null, open: false });
  });

  it("n'affiche pas de bouton Aide quand aucune page n'en a enregistré", () => {
    render(
      <AppHeader
        schoolName="college vogt"
        isSchoolContext
        role="PARENT"
        userInitials="RN"
        userDisplayName="Robert Ntamack"
        onToggleMenu={vi.fn()}
        onLogoutClick={vi.fn()}
      />,
    );

    expect(screen.queryByTestId("header-help-button")).not.toBeInTheDocument();
  });

  it("affiche le bouton Aide en header, quelle que soit la taille d'écran, et ouvre la modale au clic", () => {
    usePageHelpStore.setState({
      entry: { title: "Emploi du temps", sections: [] },
      open: false,
    });

    render(
      <AppHeader
        schoolName="college vogt"
        isSchoolContext
        role="PARENT"
        userInitials="RN"
        userDisplayName="Robert Ntamack"
        onToggleMenu={vi.fn()}
        onLogoutClick={vi.fn()}
      />,
    );

    const helpButton = screen.getByTestId("header-help-button");
    expect(helpButton).not.toHaveClass("md:hidden");
    expect(helpButton.parentElement).not.toHaveClass("hidden");

    fireEvent.click(helpButton);
    expect(usePageHelpStore.getState().open).toBe(true);
  });
});
