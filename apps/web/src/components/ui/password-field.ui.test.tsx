import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PasswordField } from "./password-field";

describe("PasswordField", () => {
  it("renders a visibility toggle and switches input type", async () => {
    const user = userEvent.setup();
    const { container } = render(<PasswordField value="Secret123" readOnly />);

    const input = container.querySelector("input");
    expect(input).not.toBeNull();
    expect(input?.type).toBe("password");

    const showButton = screen.getByLabelText("Afficher le mot de passe");
    expect(showButton).toBeInTheDocument();

    await user.click(showButton);
    expect(input?.type).toBe("text");
    expect(
      screen.getByLabelText("Masquer le mot de passe"),
    ).toBeInTheDocument();
  });
});
