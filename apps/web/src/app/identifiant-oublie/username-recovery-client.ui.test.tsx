import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UsernameRecoveryClient } from "./username-recovery-client";
import { useLocaleStore } from "../../i18n/locale-store";
import { DEFAULT_LOCALE } from "../../i18n/translations";

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

describe("UsernameRecoveryClient UI", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    vi.restoreAllMocks();
    useLocaleStore.setState({ locale: DEFAULT_LOCALE });
  });

  // ── Step 1 ──────────────────────────────────────────────────────────────────

  it("step 1: shows username field and submit button", () => {
    render(<UsernameRecoveryClient />);

    expect(screen.getByLabelText("Identifiant")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Continuer" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Etape 1/3: saisir votre identifiant"),
    ).toBeInTheDocument();
  });

  it("step 1: submit calls /auth/recover/username/start with username", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          questions: [
            { key: "BIRTH_CITY", label: "Ville de naissance" },
            { key: "FAVORITE_BOOK", label: "Livre prefere" },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    render(<UsernameRecoveryClient />);

    fireEvent.input(screen.getByLabelText("Identifiant"), {
      target: { value: "JeanDUPONT" },
    });

    const submitBtn = screen.getByRole("button", { name: "Continuer" });
    await waitFor(() => expect(submitBtn).not.toBeDisabled());
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/auth/recover/username/start"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ username: "JeanDUPONT" }),
        }),
      );
    });
  });

  it("step 1: if API returns 0 questions → shows 'Contactez votre administration'", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ questions: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    render(<UsernameRecoveryClient />);

    fireEvent.input(screen.getByLabelText("Identifiant"), {
      target: { value: "JeanDUPONT" },
    });
    const submitBtn = screen.getByRole("button", { name: "Continuer" });
    await waitFor(() => expect(submitBtn).not.toBeDisabled());
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Contactez votre administration scolaire/i),
      ).toBeInTheDocument();
    });
  });

  it("step 1: API error → shows error message", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "Identifiant introuvable." }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }),
    );

    render(<UsernameRecoveryClient />);

    fireEvent.input(screen.getByLabelText("Identifiant"), {
      target: { value: "InconnuXYZ" },
    });
    const submitBtn = screen.getByRole("button", { name: "Continuer" });
    await waitFor(() => expect(submitBtn).not.toBeDisabled());
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("Identifiant introuvable.")).toBeInTheDocument();
    });
  });

  // ── Step 2 ──────────────────────────────────────────────────────────────────

  async function goToStep2() {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          questions: [
            { key: "BIRTH_CITY", label: "Ville de naissance" },
            { key: "FAVORITE_BOOK", label: "Livre prefere" },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    render(<UsernameRecoveryClient />);

    fireEvent.input(screen.getByLabelText("Identifiant"), {
      target: { value: "JeanDUPONT" },
    });
    const submitBtn = screen.getByRole("button", { name: "Continuer" });
    await waitFor(() => expect(submitBtn).not.toBeDisabled());
    fireEvent.click(submitBtn);
    await screen.findByText("Etape 2/3: verification");
  }

  it("step 2: shows birthDate field and question answer fields", async () => {
    await goToStep2();

    expect(screen.getByLabelText("Date de naissance")).toBeInTheDocument();
    expect(screen.getByLabelText("Ville de naissance")).toBeInTheDocument();
    expect(screen.getByLabelText("Livre prefere")).toBeInTheDocument();
  });

  it("step 2: submit calls /auth/recover/username/verify with correct payload", async () => {
    await goToStep2();

    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ recoveryToken: "token-abc-123" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const birthDateInput = document.querySelector(
      'input[type="date"]',
    ) as HTMLInputElement;
    fireEvent.input(birthDateInput, { target: { value: "1990-05-20" } });

    fireEvent.input(screen.getByLabelText("Ville de naissance"), {
      target: { value: "Douala" },
    });
    fireEvent.input(screen.getByLabelText("Livre prefere"), {
      target: { value: "Le Petit Prince" },
    });

    const verifyBtn = screen.getByRole("button", {
      name: "Verifier mon identite",
    });
    await waitFor(() => expect(verifyBtn).not.toBeDisabled());
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/auth/recover/username/verify"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("JeanDUPONT"),
        }),
      );
    });
  });

  it("step 2: verify error → shows error message", async () => {
    await goToStep2();

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({ message: "Informations de recuperation invalides." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      ),
    );

    const birthDateInput = document.querySelector(
      'input[type="date"]',
    ) as HTMLInputElement;
    fireEvent.input(birthDateInput, { target: { value: "1990-05-20" } });

    fireEvent.input(screen.getByLabelText("Ville de naissance"), {
      target: { value: "Douala" },
    });
    fireEvent.input(screen.getByLabelText("Livre prefere"), {
      target: { value: "Le Petit Prince" },
    });

    const verifyBtn = screen.getByRole("button", {
      name: "Verifier mon identite",
    });
    await waitFor(() => expect(verifyBtn).not.toBeDisabled());
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Informations de recuperation invalides."),
      ).toBeInTheDocument();
    });
  });

  // ── Step 3 ──────────────────────────────────────────────────────────────────

  async function goToStep3() {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            questions: [
              { key: "BIRTH_CITY", label: "Ville de naissance" },
              { key: "FAVORITE_BOOK", label: "Livre prefere" },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ recoveryToken: "token-abc-123" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    render(<UsernameRecoveryClient />);

    // Step 1
    fireEvent.input(screen.getByLabelText("Identifiant"), {
      target: { value: "JeanDUPONT" },
    });
    const continueBtn = screen.getByRole("button", { name: "Continuer" });
    await waitFor(() => expect(continueBtn).not.toBeDisabled());
    fireEvent.click(continueBtn);
    await screen.findByText("Etape 2/3: verification");

    // Step 2
    const birthDateInput = document.querySelector(
      'input[type="date"]',
    ) as HTMLInputElement;
    fireEvent.input(birthDateInput, { target: { value: "1990-05-20" } });
    fireEvent.input(screen.getByLabelText("Ville de naissance"), {
      target: { value: "Douala" },
    });
    fireEvent.input(screen.getByLabelText("Livre prefere"), {
      target: { value: "Le Petit Prince" },
    });

    const verifyBtn = screen.getByRole("button", {
      name: "Verifier mon identite",
    });
    await waitFor(() => expect(verifyBtn).not.toBeDisabled());
    fireEvent.click(verifyBtn);
    await screen.findByText("Etape 3/3: nouveau mot de passe");
  }

  it("step 3: shows newPassword and confirmPassword fields", async () => {
    await goToStep3();

    expect(screen.getByLabelText("Nouveau mot de passe")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirmation")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Reinitialiser mon mot de passe" }),
    ).toBeInTheDocument();
  });

  it("step 3: submit calls /auth/recover/username/reset with recoveryToken and newPassword", async () => {
    await goToStep3();

    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    fireEvent.input(screen.getByLabelText("Nouveau mot de passe"), {
      target: { value: "NewPass123" },
    });
    fireEvent.input(screen.getByLabelText("Confirmation"), {
      target: { value: "NewPass123" },
    });

    const resetBtn = screen.getByRole("button", {
      name: "Reinitialiser mon mot de passe",
    });
    await waitFor(() => expect(resetBtn).not.toBeDisabled());
    fireEvent.click(resetBtn);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/auth/recover/username/reset"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            recoveryToken: "token-abc-123",
            newPassword: "NewPass123",
          }),
        }),
      );
    });
  });

  it("step 3: reset error → shows error message", async () => {
    await goToStep3();

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({ message: "Reinitialisation impossible." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      ),
    );

    fireEvent.input(screen.getByLabelText("Nouveau mot de passe"), {
      target: { value: "NewPass123" },
    });
    fireEvent.input(screen.getByLabelText("Confirmation"), {
      target: { value: "NewPass123" },
    });

    const resetBtn = screen.getByRole("button", {
      name: "Reinitialiser mon mot de passe",
    });
    await waitFor(() => expect(resetBtn).not.toBeDisabled());
    fireEvent.click(resetBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Reinitialisation impossible."),
      ).toBeInTheDocument();
    });
  });

  it("step 3: success → shows success toast with link to /", async () => {
    await goToStep3();

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    fireEvent.input(screen.getByLabelText("Nouveau mot de passe"), {
      target: { value: "NewPass123" },
    });
    fireEvent.input(screen.getByLabelText("Confirmation"), {
      target: { value: "NewPass123" },
    });

    const resetBtn = screen.getByRole("button", {
      name: "Reinitialiser mon mot de passe",
    });
    await waitFor(() => expect(resetBtn).not.toBeDisabled());
    fireEvent.click(resetBtn);

    await waitFor(() => {
      expect(screen.getByText("Mot de passe reinitialise")).toBeInTheDocument();
    });

    expect(
      screen.getByRole("link", { name: /Retour a la connexion/i }),
    ).toHaveAttribute("href", "/");
  });

  it("traduit le contenu de la page en anglais quand la langue EN est active", () => {
    useLocaleStore.setState({ locale: "en" });

    render(<UsernameRecoveryClient />);

    expect(screen.getByLabelText("Username")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Continue" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Step 1/3: enter your username"),
    ).toBeInTheDocument();
    expect(screen.getByText("Back to sign in")).toBeInTheDocument();
  });
});
