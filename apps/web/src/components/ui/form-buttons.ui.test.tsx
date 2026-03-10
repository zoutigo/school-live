import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BackButton, SubmitButton } from "./form-buttons";

describe("Form buttons", () => {
  it("renders submit and back buttons with click behavior", () => {
    const onBack = vi.fn();
    render(
      <>
        <SubmitButton>Valider</SubmitButton>
        <BackButton onClick={onBack}>Retour</BackButton>
      </>,
    );

    expect(screen.getByRole("button", { name: "Valider" })).toHaveAttribute(
      "type",
      "submit",
    );
    fireEvent.click(screen.getByRole("button", { name: "Retour" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
