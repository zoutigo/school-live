import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HelpDialog } from "./help-dialog";

const baseProps = {
  open: true,
  title: "Rechercher et filtrer",
  body: [
    "Premier paragraphe explicatif.",
    "Second paragraphe explicatif.",
    "Troisième paragraphe explicatif.",
  ],
};

describe("HelpDialog", () => {
  it("ne rend rien quand open=false", () => {
    render(<HelpDialog {...baseProps} open={false} onClose={vi.fn()} />);
    expect(screen.queryByTestId("help-dialog")).not.toBeInTheDocument();
  });

  it("affiche l'icône et le titre sur la même ligne du header", () => {
    render(<HelpDialog {...baseProps} onClose={vi.fn()} />);
    const dialog = screen.getByTestId("help-dialog");
    const headerRow = dialog.querySelector(".mb-4.flex.items-center.gap-3");
    expect(headerRow).not.toBeNull();
    expect(headerRow).toHaveTextContent(baseProps.title);
  });

  it("affiche chaque paragraphe du corps comme un <p> justifié distinct", () => {
    render(<HelpDialog {...baseProps} onClose={vi.fn()} />);
    const body = screen.getByTestId("help-dialog-body");
    const paragraphs = body.querySelectorAll("p");
    expect(paragraphs).toHaveLength(baseProps.body.length);
    paragraphs.forEach((paragraph, index) => {
      expect(paragraph).toHaveTextContent(baseProps.body[index]);
      expect(paragraph.className).toContain("text-justify");
    });
  });

  it("appelle onClose au clic sur le bouton de fermeture", () => {
    const onClose = vi.fn();
    render(<HelpDialog {...baseProps} onClose={onClose} />);
    fireEvent.click(screen.getByTestId("help-dialog-close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("appelle onClose au clic sur le backdrop", () => {
    const onClose = vi.fn();
    const { container } = render(
      <HelpDialog {...baseProps} onClose={onClose} />,
    );
    const backdrop = container.querySelector("button[aria-label]");
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop as Element);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("appelle onClose sur la touche Escape", () => {
    const onClose = vi.fn();
    render(<HelpDialog {...baseProps} onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
