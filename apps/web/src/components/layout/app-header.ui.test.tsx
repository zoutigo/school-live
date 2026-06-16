import { act, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLocaleStore } from "../../i18n/locale-store";
import { DEFAULT_LOCALE } from "../../i18n/translations";
import { AppHeader } from "./app-header";
import { useAppShellUiStore } from "./app-shell-ui-store";

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
});
