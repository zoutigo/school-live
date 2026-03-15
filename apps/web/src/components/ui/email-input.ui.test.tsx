import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EmailInput } from "./email-input";

describe("EmailInput", () => {
  it("renders an email input and propagates changes", () => {
    const onChange = vi.fn();
    render(
      <EmailInput
        value=""
        onChange={onChange}
        placeholder="prenom.nom@gmail.com"
      />,
    );

    const input = screen.getByPlaceholderText("prenom.nom@gmail.com");
    expect(input).toHaveAttribute("type", "email");

    fireEvent.change(input, { target: { value: "a@b.com" } });
    expect(onChange).toHaveBeenCalled();
  });

  it("supports the invalid visual state", () => {
    render(<EmailInput aria-label="email-invalid" invalid value="" readOnly />);

    const input = screen.getByLabelText("email-invalid");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input.className).toContain("border-notification");
  });
});
