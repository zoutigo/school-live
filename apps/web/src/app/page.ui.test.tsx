import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LandingPage from "./page";
import { useLocaleStore } from "../i18n/locale-store";
import { DEFAULT_LOCALE } from "../i18n/translations";

vi.mock("../components/marketing/landing-login-form", () => ({
  LandingLoginForm: () => <div data-testid="landing-login-form" />,
}));

describe("LandingPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useLocaleStore.setState({ locale: DEFAULT_LOCALE });
  });

  it("renders the Android APK download link", () => {
    render(<LandingPage />);

    expect(
      screen.getByRole("link", { name: "Telecharger l'APK Android" }),
    ).toHaveAttribute("href", "/api/mobile-builds/android/latest");
  });

  it("traduit le contenu de la page en anglais quand la langue EN est active", () => {
    useLocaleStore.setState({ locale: "en" });
    render(<LandingPage />);

    expect(screen.getByText("Scolive Access")).toBeInTheDocument();
    expect(
      screen.getByText("Sign in using the method provided by your school."),
    ).toBeInTheDocument();
    expect(screen.getByText("Scolive mobile app")).toBeInTheDocument();
    expect(screen.getByText("Grade tracking")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Download the Android APK" }),
    ).toHaveAttribute("href", "/api/mobile-builds/android/latest");
  });
});
