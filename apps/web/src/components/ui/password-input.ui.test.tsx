import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PasswordInput } from "./password-input";

describe("PasswordInput", () => {
  it("toggles visibility with the built-in eye button", () => {
    render(<PasswordInput value="Secret123" readOnly />);

    const input = screen.getByDisplayValue("Secret123");
    expect(input).toHaveAttribute("type", "password");

    fireEvent.click(screen.getByRole("button", { name: /Afficher/i }));
    expect(input).toHaveAttribute("type", "text");
  });
});
