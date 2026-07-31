import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LandingPage from "./page";
import LandingPageEn from "./en/page";

describe("Marketing landing pages per locale", () => {
  it("renders the French copy on the unprefixed / page", () => {
    render(<LandingPage />);

    expect(
      screen.getByText(
        "La vie scolaire de votre enfant, connectee et sereine.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Suivi des notes")).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: "Se connecter" }).length,
    ).toBeGreaterThan(0);
  });

  it("renders the English copy on the /en page", () => {
    render(<LandingPageEn />);

    expect(
      screen.getByText("Your child's school life, connected and effortless."),
    ).toBeInTheDocument();
    expect(screen.getByText("Grade tracking")).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: "Sign in" }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.queryByText(
        "La vie scolaire de votre enfant, connectee et sereine.",
      ),
    ).not.toBeInTheDocument();
  });

  it("keeps the Scolive brand name unchanged in both languages", () => {
    render(<LandingPage />);
    expect(screen.getAllByText("Scolive").length).toBeGreaterThan(0);
  });

  it("keeps the Scolive brand name unchanged on the English page", () => {
    render(<LandingPageEn />);
    expect(screen.getAllByText("Scolive").length).toBeGreaterThan(0);
  });
});
