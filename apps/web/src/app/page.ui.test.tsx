import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import LandingPage from "./page";
import { useLocaleStore } from "../i18n/locale-store";
import { DEFAULT_LOCALE } from "../i18n/translations";

describe("LandingPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useLocaleStore.setState({ locale: DEFAULT_LOCALE });
  });

  it("renders the Android APK download link", () => {
    render(<LandingPage />);

    const links = screen.getAllByRole("link", {
      name: "Telecharger l'APK Android",
    });
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link).toHaveAttribute("href", "/api/mobile-builds/android/latest");
    }
  });

  it("renders a link to the login page for the Se connecter CTA", () => {
    render(<LandingPage />);

    expect(screen.getByRole("link", { name: "Se connecter" })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("traduit le contenu de la page en anglais quand la langue EN est active", () => {
    useLocaleStore.setState({ locale: "en" });
    render(<LandingPage />);

    expect(screen.getByText("Grade tracking")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toBeInTheDocument();
    const links = screen.getAllByRole("link", {
      name: "Download the Android APK",
    });
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link).toHaveAttribute("href", "/api/mobile-builds/android/latest");
    }
  });
});
