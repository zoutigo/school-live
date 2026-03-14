import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  assertNoHorizontalOverflowAt320,
  setViewportWidth,
} from "../../test/responsive";
import { MessagingToolbar } from "./messaging-toolbar";

describe("MessagingToolbar", () => {
  it("renders a usable smartphone layout at 320px", () => {
    setViewportWidth(320);
    const onSearchChange = vi.fn();
    const onCompose = vi.fn();

    render(
      <MessagingToolbar
        title="Messagerie"
        contextLabel="Echanges internes et familles"
        search=""
        onSearchChange={onSearchChange}
        onCompose={onCompose}
      />,
    );

    expect(screen.getByTestId("messaging-toolbar")).toBeInTheDocument();
    expect(screen.getByText("Messagerie")).toBeInTheDocument();
    expect(screen.getByLabelText("Rafraichir")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Rechercher un message..."),
    ).toBeInTheDocument();
    expect(
      screen.getAllByDisplayValue("Annee en cours").length,
    ).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Nouveau message" }));
    expect(onCompose).toHaveBeenCalled();
    assertNoHorizontalOverflowAt320(screen.getByTestId("messaging-toolbar"));
  });

  it("updates search input", () => {
    const onSearchChange = vi.fn();

    render(
      <MessagingToolbar
        title="Messagerie"
        search=""
        onSearchChange={onSearchChange}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("Rechercher un message..."), {
      target: { value: "parent" },
    });

    expect(onSearchChange).toHaveBeenCalledWith("parent");
  });
});
