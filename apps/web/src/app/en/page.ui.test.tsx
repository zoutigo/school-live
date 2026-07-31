import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LandingPageEn from "./page";

describe("LandingPageEn", () => {
  it("renders the English landing copy at the /en URL", () => {
    render(<LandingPageEn />);

    expect(
      screen.getByText("Your child's school life, connected and effortless."),
    ).toBeInTheDocument();
  });

  it("points the login CTA at the shared, unprefixed /login page", () => {
    render(<LandingPageEn />);

    const links = screen.getAllByRole("link", { name: "Sign in" });
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link).toHaveAttribute("href", "/login");
    }
  });
});
