import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageHelpBlock } from "./page-help-block";

const baseProps = {
  title: "Comment utiliser cette page",
  body: [
    "Premier paragraphe : basculez entre les vues.",
    "Second paragraphe : cliquez sur une carte de cours pour voir son detail.",
  ],
  toggleOpenLabel: "Besoin d'aide sur cette page ?",
  toggleCloseLabel: "Masquer l'aide",
};

describe("PageHelpBlock", () => {
  it("est replie par defaut", () => {
    render(<PageHelpBlock {...baseProps} />);

    expect(
      screen.queryByTestId("page-help-block-content"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("page-help-block-toggle")).toHaveTextContent(
      baseProps.toggleOpenLabel,
    );
    expect(screen.getByTestId("page-help-block-toggle")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("s'ouvre directement si defaultOpen est vrai", () => {
    render(<PageHelpBlock {...baseProps} defaultOpen />);

    expect(screen.getByTestId("page-help-block-content")).toBeInTheDocument();
  });

  it("affiche le titre et chaque paragraphe du corps au clic sur le toggle", () => {
    render(<PageHelpBlock {...baseProps} />);

    fireEvent.click(screen.getByTestId("page-help-block-toggle"));

    expect(screen.getByTestId("page-help-block-content")).toHaveTextContent(
      baseProps.title,
    );
    for (const paragraph of baseProps.body) {
      expect(screen.getByTestId("page-help-block-content")).toHaveTextContent(
        paragraph,
      );
    }
    expect(screen.getByTestId("page-help-block-toggle")).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByTestId("page-help-block-toggle")).toHaveTextContent(
      baseProps.toggleCloseLabel,
    );
  });

  it("se referme si on reclique sur le toggle", () => {
    render(<PageHelpBlock {...baseProps} />);

    const toggle = screen.getByTestId("page-help-block-toggle");
    fireEvent.click(toggle);
    fireEvent.click(toggle);

    expect(
      screen.queryByTestId("page-help-block-content"),
    ).not.toBeInTheDocument();
  });

  it("respecte un testId personnalise", () => {
    render(<PageHelpBlock {...baseProps} testId="agenda-help" />);

    expect(screen.getByTestId("agenda-help")).toBeInTheDocument();
    expect(screen.getByTestId("agenda-help-toggle")).toBeInTheDocument();
  });
});
