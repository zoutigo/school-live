import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PinRecoveryPage from "./page";

let currentSearchParams = new URLSearchParams();
const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
  useSearchParams: () => currentSearchParams,
}));

describe("PinRecoveryPage UI", () => {
  beforeEach(() => {
    currentSearchParams = new URLSearchParams("schoolSlug=college-vogt");
    replaceMock.mockReset();
    vi.restoreAllMocks();
  });

  it("renders recovery shell layout", () => {
    render(<PinRecoveryPage />);

    expect(screen.getByTestId("recovery-header")).toBeInTheDocument();
    expect(screen.getByTestId("recovery-sidebar")).toBeInTheDocument();
    expect(screen.getByText("Recuperation de PIN")).toBeInTheDocument();
  });

  it("uses inline zod validation onChange for PIN fields and enables submit when valid", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            schoolSlug: "college-vogt",
            principalHint: "p***t@example.test",
            questions: [
              { key: "BIRTH_CITY", label: "Ville de naissance" },
              { key: "FAVORITE_SPORT", label: "Sport prefere" },
              { key: "FATHER_FIRST_NAME", label: "Prenom du pere" },
            ],
          }),
          {
            status: 201,
            headers: { "Content-Type": "application/json" },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            schoolSlug: "college-vogt",
            recoveryToken: "recovery-token-very-long",
          }),
          {
            status: 201,
            headers: { "Content-Type": "application/json" },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            schoolSlug: "college-vogt",
          }),
          {
            status: 201,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );

    render(<PinRecoveryPage />);

    fireEvent.change(screen.getByLabelText("Email (optionnel)"), {
      target: { value: "parent@example.test" },
    });
    fireEvent.click(
      screen.getByRole("button", {
        name: "Continuer vers les questions de recuperation",
      }),
    );

    await waitFor(() => {
      expect(screen.getByText(/Compte detecte:/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Date de naissance"), {
      target: { value: "1985-07-14" },
    });
    fireEvent.change(screen.getByLabelText("Ville de naissance"), {
      target: { value: "Douala" },
    });
    fireEvent.change(screen.getByLabelText("Sport prefere"), {
      target: { value: "Football" },
    });
    fireEvent.change(screen.getByLabelText("Prenom du pere"), {
      target: { value: "Andre" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Verifier mes reponses" }),
    );

    await waitFor(() => {
      expect(
        screen.getByLabelText("Nouveau PIN (6 chiffres)"),
      ).toBeInTheDocument();
    });

    const pinInputs = screen.getAllByPlaceholderText("123456");
    const newPinInput = pinInputs[0];
    const confirmPinInput = pinInputs[1];
    const submitButton = screen.getByRole("button", {
      name: "Definir mon nouveau PIN",
    });
    expect(submitButton).toBeDisabled();
    expect(
      screen.queryByText("Le PIN doit contenir exactement 6 chiffres."),
    ).not.toBeInTheDocument();

    fireEvent.change(newPinInput, {
      target: { value: "65432" },
    });
    expect(
      screen.getByText("Le PIN doit contenir exactement 6 chiffres."),
    ).toBeInTheDocument();

    fireEvent.change(confirmPinInput, {
      target: { value: "123456" },
    });
    expect(
      screen.getByText("La confirmation ne correspond pas au PIN."),
    ).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    fireEvent.change(newPinInput, {
      target: { value: "654321" },
    });
    fireEvent.change(confirmPinInput, {
      target: { value: "654321" },
    });

    await waitFor(() => {
      expect(
        screen.queryByText("Le PIN doit contenir exactement 6 chiffres."),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText("La confirmation ne correspond pas au PIN."),
      ).not.toBeInTheDocument();
      expect(submitButton).toBeEnabled();
    });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/");
    });
  });

  it("uses inline zod validation onChange for email/phone and enables submit only when valid", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          schoolSlug: "college-vogt",
          principalHint: "p***t@example.test",
          questions: [
            { key: "BIRTH_CITY", label: "Ville de naissance" },
            { key: "FAVORITE_SPORT", label: "Sport prefere" },
            { key: "FATHER_FIRST_NAME", label: "Prenom du pere" },
          ],
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    render(<PinRecoveryPage />);

    const submitButton = screen.getByRole("button", {
      name: "Continuer vers les questions de recuperation",
    });
    const emailInput = screen.getByLabelText("Email (optionnel)");
    const phoneInput = screen.getByLabelText("Telephone (optionnel)");

    expect(submitButton).toBeDisabled();
    expect(
      screen.queryByText("Adresse email invalide."),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Renseignez un email ou un telephone."),
    ).not.toBeInTheDocument();

    fireEvent.change(emailInput, { target: { value: "bad-email" } });
    expect(screen.getByText("Adresse email invalide.")).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    fireEvent.change(emailInput, { target: { value: "" } });
    expect(
      screen.getByText("Renseignez un email ou un telephone."),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.change(phoneInput, { target: { value: "65099" } });
    expect(
      screen.getByText("Numero invalide (9 chiffres attendus)."),
    ).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    fireEvent.change(emailInput, { target: { value: "parent@example.test" } });
    fireEvent.change(phoneInput, { target: { value: "" } });

    await waitFor(() => {
      expect(
        screen.queryByText("Adresse email invalide."),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText("Numero invalide (9 chiffres attendus)."),
      ).not.toBeInTheDocument();
      expect(submitButton).toBeEnabled();
    });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/auth/forgot-pin/options"),
        expect.objectContaining({ method: "POST" }),
      );
    });
  });
});
