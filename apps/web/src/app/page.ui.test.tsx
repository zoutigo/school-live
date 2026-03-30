import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import LandingPage from "./page";

vi.mock("../components/marketing/landing-login-form", () => ({
  LandingLoginForm: () => <div data-testid="landing-login-form" />,
}));

describe("LandingPage", () => {
  it("renders the Android APK download link", () => {
    render(<LandingPage />);

    expect(
      screen.getByRole("link", { name: "Telecharger l'APK Android" }),
    ).toHaveAttribute("href", "/api/mobile-builds/android/latest");
  });
});
