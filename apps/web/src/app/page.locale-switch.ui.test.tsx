import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import LandingPage from "./page";
import { useLocaleStore } from "../i18n/locale-store";
import { DEFAULT_LOCALE } from "../i18n/translations";

describe("LandingPage language switch", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useLocaleStore.setState({ locale: DEFAULT_LOCALE });
  });

  it("renders the French copy by default", () => {
    render(<LandingPage />);

    expect(
      screen.getByText(
        "La vie scolaire de votre enfant, connectee et sereine.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Suivi des notes")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Se connecter" }),
    ).toBeInTheDocument();
  });

  it("renders the English copy when the locale is set to en", () => {
    useLocaleStore.setState({ locale: "en" });
    render(<LandingPage />);

    expect(
      screen.getByText("Your child's school life, connected and effortless."),
    ).toBeInTheDocument();
    expect(screen.getByText("Grade tracking")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toBeInTheDocument();
    expect(
      screen.queryByText(
        "La vie scolaire de votre enfant, connectee et sereine.",
      ),
    ).not.toBeInTheDocument();
  });

  it("keeps the Scolive brand name unchanged in both languages", () => {
    render(<LandingPage />);

    expect(screen.getAllByText("Scolive").length).toBeGreaterThan(0);

    useLocaleStore.setState({ locale: "en" });
    render(<LandingPage />);

    expect(screen.getAllByText("Scolive").length).toBeGreaterThan(0);
  });
});
