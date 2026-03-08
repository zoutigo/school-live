import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PinInput } from "./pin-input";

describe("PinInput", () => {
  it("renders masked by default and toggles visibility", () => {
    render(<PinInput aria-label="PIN" value="123456" onChange={() => {}} />);
    const input = screen.getByLabelText("PIN") as HTMLInputElement;
    expect(input.type).toBe("password");

    fireEvent.click(screen.getByRole("button", { name: "Afficher le mot de passe" }));
    expect(input.type).toBe("text");
  });

  it("keeps numeric input mode and max length 6", () => {
    render(<PinInput aria-label="PIN" value="" onChange={() => {}} />);
    const input = screen.getByLabelText("PIN") as HTMLInputElement;
    expect(input.maxLength).toBe(6);
    expect(input.inputMode).toBe("numeric");
  });
});
