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
    await waitFor(() =>
      expect(
        screen.getByRole("button", {
          name: "Continuer vers les questions de recuperation",
        }),
      ).toBeEnabled(),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Continuer vers les questions de recuperation",
      }),
    );

    await waitFor(() => {
      expect(screen.getByText(/Compte detecte:/i)).toBeInTheDocument();
    });

    const birthDateInput = screen.getByLabelText(
      "Date de naissance",
    ) as HTMLInputElement;
    await waitFor(() => {
      expect(birthDateInput.value).toBe("");
    });
    fireEvent.input(birthDateInput, {
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
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Verifier mes reponses" }),
      ).toBeEnabled();
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Verifier mes reponses" }),
    );

    const submitButton = await screen.findByRole("button", {
      name: "Definir mon nouveau PIN",
    });
    const pinInputs = await screen.findAllByPlaceholderText("123456");
    const newPinInput = pinInputs[0];
    const confirmPinInput = pinInputs[1];
    expect(submitButton).toBeDisabled();
    expect(
      screen.queryByText("Le PIN doit contenir exactement 6 chiffres."),
    ).not.toBeInTheDocument();

    fireEvent.change(newPinInput, {
      target: { value: "65432" },
    });
    await waitFor(() => {
      expect(
        screen.getByText("Le PIN doit contenir exactement 6 chiffres."),
      ).toBeInTheDocument();
    });

    fireEvent.change(confirmPinInput, {
      target: { value: "123456" },
    });
    await waitFor(() => {
      expect(
        screen.getByText("La confirmation ne correspond pas au PIN."),
      ).toBeInTheDocument();
    });
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
    await waitFor(() =>
      expect(screen.getByText("Adresse email invalide.")).toBeInTheDocument(),
    );
    expect(submitButton).toBeDisabled();

    fireEvent.change(emailInput, { target: { value: "" } });
    await waitFor(() =>
      expect(
        screen.getByText("Renseignez un email ou un telephone."),
      ).toBeInTheDocument(),
    );
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.change(phoneInput, { target: { value: "65099" } });
    await waitFor(() =>
      expect(
        screen.getByText("Numero invalide (9 chiffres attendus)."),
      ).toBeInTheDocument(),
    );
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

  it("shows inline zod errors during recovery answers step before enabling submit", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
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

    fireEvent.change(screen.getByLabelText("Email (optionnel)"), {
      target: { value: "parent@example.test" },
    });

    const requestButton = screen.getByRole("button", {
      name: "Continuer vers les questions de recuperation",
    });
    await waitFor(() => {
      expect(requestButton).toBeEnabled();
    });
    fireEvent.click(requestButton);

    await waitFor(() => {
      expect(screen.getByText(/Compte detecte:/i)).toBeInTheDocument();
    });

    const verifyButton = screen.getByRole("button", {
      name: "Verifier mes reponses",
    });
    expect(verifyButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Ville de naissance"), {
      target: { value: "D" },
    });

    await waitFor(() => {
      expect(
        screen.getByText("Too small: expected string to have >=2 characters"),
      ).toBeInTheDocument();
      expect(verifyButton).toBeDisabled();
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

    await waitFor(() => {
      expect(
        screen.queryByText("Too small: expected string to have >=2 characters"),
      ).not.toBeInTheDocument();
      expect(verifyButton).toBeEnabled();
    });
  });
});
