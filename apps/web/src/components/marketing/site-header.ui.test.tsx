import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SiteHeader } from "./site-header";
import { useLocaleStore } from "../../i18n/locale-store";
import { DEFAULT_LOCALE } from "../../i18n/translations";

vi.mock("next/navigation", () => ({
  usePathname: () => "/fonctionnalites",
}));

describe("SiteHeader", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useLocaleStore.setState({ locale: DEFAULT_LOCALE });
  });

  it("renders the public nav links and the login CTA", () => {
    render(<SiteHeader />);

    expect(
      screen.getByRole("link", { name: "Fonctionnalités" }),
    ).toHaveAttribute("href", "/fonctionnalites");
    expect(screen.getByRole("link", { name: "Tarifs" })).toHaveAttribute(
      "href",
      "/tarifs",
    );
    expect(screen.getByRole("link", { name: "Blog" })).toHaveAttribute(
      "href",
      "/blog",
    );
    expect(screen.getByRole("link", { name: "Contact" })).toHaveAttribute(
      "href",
      "/contact",
    );
    expect(
      screen.getAllByRole("link", { name: "Se connecter" })[0],
    ).toHaveAttribute("href", "/login");
  });

  it("opens the mobile menu on burger click and shows the nav + CTA", async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);

    expect(
      screen.getAllByRole("link", { name: "Fonctionnalités" }),
    ).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Ouvrir le menu" }));

    expect(
      screen.getAllByRole("link", { name: "Fonctionnalités" }),
    ).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "Se connecter" })).toHaveLength(
      2,
    );
  });
});
