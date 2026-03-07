import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PlatformCredentialsCompletionClient } from "./platform-credentials-completion-client";

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

describe("PlatformCredentialsCompletionClient UI", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    vi.restoreAllMocks();
  });

  it("shows inline zod errors only after interaction and keeps submit disabled until valid", async () => {
    render(
      <PlatformCredentialsCompletionClient
        token="platform-setup-token-very-long"
        email="platform@example.test"
        missing="PASSWORD,PHONE_PIN"
      />,
    );

    const submitButton = screen.getByRole("button", { name: "Valider" });
    expect(submitButton).toBeDisabled();
    expect(
      screen.queryByText("Numero invalide (9 chiffres attendus)."),
    ).not.toBeInTheDocument();

    fireEvent.input(screen.getByLabelText("Telephone"), {
      target: { value: "65099" },
    });
    expect(
      screen.getByText("Numero invalide (9 chiffres attendus)."),
    ).toBeInTheDocument();

    fireEvent.input(screen.getByLabelText("Confirmer le telephone"), {
      target: { value: "650998888" },
    });
    expect(
      screen.getByText("La confirmation du telephone ne correspond pas."),
    ).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    fireEvent.input(screen.getByLabelText("Nouveau mot de passe"), {
      target: { value: "abc" },
    });
    expect(
      screen.getByText(
        "Le mot de passe doit contenir au moins 8 caracteres avec majuscules, minuscules et chiffres.",
      ),
    ).toBeInTheDocument();
  });

  it("submits completion data then redirects to dashboard", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            role: "SUPER_ADMIN",
            schoolSlug: null,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );

    render(
      <PlatformCredentialsCompletionClient
        token="platform-setup-token-very-long"
        email="platform@example.test"
        missing="PASSWORD,PHONE_PIN"
      />,
    );

    fireEvent.input(screen.getByLabelText("Nouveau mot de passe"), {
      target: { value: "ValidPass123" },
    });
    fireEvent.input(screen.getByLabelText("Confirmer le mot de passe"), {
      target: { value: "ValidPass123" },
    });
    fireEvent.input(screen.getByLabelText("Telephone"), {
      target: { value: "650999888" },
    });
    fireEvent.input(screen.getByLabelText("Confirmer le telephone"), {
      target: { value: "650999888" },
    });
    fireEvent.input(screen.getByLabelText("Nouveau PIN (6 chiffres)"), {
      target: { value: "112233" },
    });
    fireEvent.input(screen.getByLabelText("Confirmer le PIN"), {
      target: { value: "112233" },
    });

    const submitButton = screen.getByRole("button", { name: "Valider" });
    expect(submitButton).toBeEnabled();

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/acceuil");
    });
  });
});
