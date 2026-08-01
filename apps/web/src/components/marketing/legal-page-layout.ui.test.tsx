import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LegalPageLayout } from "./legal-page-layout";
import { useLocaleStore } from "../../i18n/locale-store";
import { DEFAULT_LOCALE } from "../../i18n/translations";

vi.mock("next/navigation", () => ({
  usePathname: () => "/mentions-legales",
}));

describe("LegalPageLayout", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useLocaleStore.setState({ locale: DEFAULT_LOCALE });
  });

  it("does not show a publisher line when publisherName is not provided", () => {
    render(
      <LegalPageLayout
        title="Mentions légales"
        updatedAt="1 août 2026"
        bodyHtml="<p>Contenu</p>"
      />,
    );

    expect(
      screen.queryByTestId("legal-publisher-name"),
    ).not.toBeInTheDocument();
  });

  it("shows the publisher line when publisherName is provided", () => {
    render(
      <LegalPageLayout
        title="Mentions légales"
        updatedAt="1 août 2026"
        bodyHtml="<p>Contenu</p>"
        publisherName="Jean Dupont"
      />,
    );

    const publisher = screen.getByTestId("legal-publisher-name");
    expect(publisher).toHaveTextContent("Responsable de publication :");
    expect(publisher).toHaveTextContent("Jean Dupont");
  });
});
