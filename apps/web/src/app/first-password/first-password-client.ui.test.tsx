import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FirstPasswordClient } from "./first-password-client";

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

describe("FirstPasswordClient UI — branche username", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    vi.restoreAllMocks();
  });

  it("shows username as readonly label and password fields", () => {
    render(<FirstPasswordClient username="JeanDUPONT" />);

    expect(screen.getByText("JeanDUPONT")).toBeInTheDocument();
    expect(screen.getByLabelText("Nouveau mot de passe")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Confirmer le mot de passe"),
    ).toBeInTheDocument();
    // Submit button is always rendered (disabled when form invalid)
    expect(
      screen.getByRole("button", { name: "Definir mon mot de passe" }),
    ).toBeInTheDocument();
  });

  it("displays 'Identifiant :' label with the username value", () => {
    render(<FirstPasswordClient username="MarieMBOLO" />);

    expect(screen.getByText(/Identifiant/)).toBeInTheDocument();
    expect(screen.getByText("MarieMBOLO")).toBeInTheDocument();
  });

  it("submit button disabled when form is invalid", async () => {
    render(<FirstPasswordClient username="JeanDUPONT" />);

    const submitBtn = screen.getByRole("button", {
      name: "Definir mon mot de passe",
    });

    // Initially form is empty, button should be disabled
    fireEvent.input(screen.getByLabelText("Nouveau mot de passe"), {
      target: { value: "abc" },
    });
    await waitFor(() => expect(submitBtn).toBeDisabled());
  });

  it("shows password error when password is too short", async () => {
    render(<FirstPasswordClient username="JeanDUPONT" />);

    fireEvent.input(screen.getByLabelText("Nouveau mot de passe"), {
      target: { value: "short" },
    });

    await waitFor(() => {
      expect(
        screen.getByText("Le mot de passe doit faire au moins 8 caracteres."),
      ).toBeInTheDocument();
    });
  });

  it("shows complexity error when password lacks uppercase/digits", async () => {
    render(<FirstPasswordClient username="JeanDUPONT" />);

    fireEvent.input(screen.getByLabelText("Nouveau mot de passe"), {
      target: { value: "alllowercase" },
    });

    await waitFor(() => {
      expect(
        screen.getByText(
          "Le mot de passe doit contenir au moins 8 caracteres avec majuscules, minuscules et chiffres.",
        ),
      ).toBeInTheDocument();
    });
  });

  it("shows confirmation mismatch error", async () => {
    render(<FirstPasswordClient username="JeanDUPONT" />);

    fireEvent.input(screen.getByLabelText("Nouveau mot de passe"), {
      target: { value: "ValidPass123" },
    });
    fireEvent.input(screen.getByLabelText("Confirmer le mot de passe"), {
      target: { value: "OtherPass456" },
    });

    await waitFor(() => {
      expect(
        screen.getByText(
          "La confirmation ne correspond pas au nouveau mot de passe.",
        ),
      ).toBeInTheDocument();
    });
  });

  it("submit button enabled when form is valid", async () => {
    render(<FirstPasswordClient username="JeanDUPONT" />);

    fireEvent.input(screen.getByLabelText("Nouveau mot de passe"), {
      target: { value: "ValidPass123" },
    });
    fireEvent.input(screen.getByLabelText("Confirmer le mot de passe"), {
      target: { value: "ValidPass123" },
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Definir mon mot de passe" }),
      ).toBeEnabled();
    });
  });

  it("submit calls POST /auth/first-password-change/username with username and newPassword", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    render(<FirstPasswordClient username="JeanDUPONT" />);

    fireEvent.input(screen.getByLabelText("Nouveau mot de passe"), {
      target: { value: "ValidPass123" },
    });
    fireEvent.input(screen.getByLabelText("Confirmer le mot de passe"), {
      target: { value: "ValidPass123" },
    });

    const submitBtn = screen.getByRole("button", {
      name: "Definir mon mot de passe",
    });
    await waitFor(() => expect(submitBtn).toBeEnabled());
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/auth/first-password-change/username"),
        expect.objectContaining({
          method: "POST",
          credentials: "include",
          body: JSON.stringify({
            username: "JeanDUPONT",
            newPassword: "ValidPass123",
          }),
        }),
      );
    });
  });

  it("success → shows success message", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    render(<FirstPasswordClient username="JeanDUPONT" />);

    fireEvent.input(screen.getByLabelText("Nouveau mot de passe"), {
      target: { value: "ValidPass123" },
    });
    fireEvent.input(screen.getByLabelText("Confirmer le mot de passe"), {
      target: { value: "ValidPass123" },
    });

    const submitBtn = screen.getByRole("button", {
      name: "Definir mon mot de passe",
    });
    await waitFor(() => expect(submitBtn).toBeEnabled());
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("Mot de passe defini")).toBeInTheDocument();
    });
  });

  it("API error → shows error message", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          message: "Changement de mot de passe impossible.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      ),
    );

    render(<FirstPasswordClient username="JeanDUPONT" />);

    fireEvent.input(screen.getByLabelText("Nouveau mot de passe"), {
      target: { value: "ValidPass123" },
    });
    fireEvent.input(screen.getByLabelText("Confirmer le mot de passe"), {
      target: { value: "ValidPass123" },
    });

    const submitBtn = screen.getByRole("button", {
      name: "Definir mon mot de passe",
    });
    await waitFor(() => expect(submitBtn).toBeEnabled());
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Changement de mot de passe impossible."),
      ).toBeInTheDocument();
    });
  });
});
