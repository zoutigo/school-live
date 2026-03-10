import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BackLinkButton } from "./back-link-button";

describe("BackLinkButton", () => {
  it("renders an anchor link with back label", () => {
    render(<BackLinkButton href="/demo">Retour a la connexion</BackLinkButton>);

    const link = screen.getByRole("link", { name: "Retour a la connexion" });
    expect(link).toHaveAttribute("href", "/demo");
  });
});
