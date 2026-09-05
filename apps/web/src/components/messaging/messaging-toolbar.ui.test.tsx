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

  it("calls onRefresh when the refresh button is clicked", () => {
    // Regression: the refresh button used to render with no onClick handler
    // at all — clicking it fired zero network requests (confirmed live).
    const onRefresh = vi.fn();

    render(
      <MessagingToolbar
        title="Messagerie"
        search=""
        onSearchChange={vi.fn()}
        onRefresh={onRefresh}
      />,
    );

    fireEvent.click(screen.getByLabelText("Rafraichir"));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("no longer renders the non-functional year-scope selector", () => {
    // Regression: "Annee en cours" / "Annee precedente" was a purely
    // decorative dropdown backed by local state only, with no API filter
    // behind it — removed rather than left misleading users.
    render(
      <MessagingToolbar
        title="Messagerie"
        search=""
        onSearchChange={vi.fn()}
      />,
    );

    expect(screen.queryByText("Annee en cours")).not.toBeInTheDocument();
    expect(screen.queryByText("Annee precedente")).not.toBeInTheDocument();
  });
});
