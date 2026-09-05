import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PaginationControls } from "./pagination-controls";

describe("PaginationControls", () => {
  it("renders page info and triggers previous/next navigation", () => {
    const onPageChange = vi.fn();

    render(
      <PaginationControls
        page={2}
        totalPages={4}
        totalItems={18}
        onPageChange={onPageChange}
      />,
    );

    expect(screen.getByText("18 resultat(s) - page 2/4")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Precedent" }));
    fireEvent.click(screen.getByRole("button", { name: "Suivant" }));

    expect(onPageChange).toHaveBeenNthCalledWith(1, 1);
    expect(onPageChange).toHaveBeenNthCalledWith(2, 3);
  });

  it("renders a compact summary when requested", () => {
    const onPageChange = vi.fn();

    render(
      <PaginationControls
        page={2}
        totalPages={4}
        compact
        onPageChange={onPageChange}
      />,
    );

    expect(screen.getByText("2/4")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Page precedente" }));
    fireEvent.click(screen.getByRole("button", { name: "Page suivante" }));

    expect(onPageChange).toHaveBeenNthCalledWith(1, 1);
    expect(onPageChange).toHaveBeenNthCalledWith(2, 3);
  });

  it("wraps the summary and buttons instead of overflowing on narrow viewports", () => {
    render(
      <PaginationControls
        page={1}
        totalPages={1}
        totalItems={6}
        onPageChange={vi.fn()}
      />,
    );

    const summary = screen.getByText("6 resultat(s) - page 1/1");
    expect(summary.parentElement).toHaveClass("flex-wrap");
  });
});
