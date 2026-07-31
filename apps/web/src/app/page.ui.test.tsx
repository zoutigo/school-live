import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LandingPage from "./page";
import LandingPageEn from "./en/page";

describe("LandingPage", () => {
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

    const links = screen.getAllByRole("link", { name: "Se connecter" });
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link).toHaveAttribute("href", "/login");
    }
  });

  it("renders the English copy on the /en page", () => {
    render(<LandingPageEn />);

    expect(screen.getByText("Grade tracking")).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: "Sign in" }).length,
    ).toBeGreaterThan(0);
    const links = screen.getAllByRole("link", {
      name: "Download the Android APK",
    });
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link).toHaveAttribute("href", "/api/mobile-builds/android/latest");
    }
  });
});
