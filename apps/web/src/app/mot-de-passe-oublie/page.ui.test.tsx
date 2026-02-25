import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ForgotPasswordPage from "./page";

const replaceMock = vi.fn();
const pushMock = vi.fn();
let currentSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: pushMock }),
  useSearchParams: () => currentSearchParams,
}));

describe("ForgotPasswordPage UI", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    pushMock.mockReset();
    currentSearchParams = new URLSearchParams();
    vi.restoreAllMocks();
  });

  it("renders the request step when there is no token", () => {
    render(<ForgotPasswordPage />);

    expect(screen.getByText("Etape 1/3: demande de lien")).toBeInTheDocument();
    expect(screen.getByLabelText("Email du compte")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Envoyer le lien" }),
    ).toBeInTheDocument();
  });

  it("disables submit for invalid email and redirects 5s after success", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          message:
            "Si ce compte existe, un lien de reinitialisation a ete envoye.",
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    const setTimeoutSpy = vi.spyOn(window, "setTimeout");

    render(<ForgotPasswordPage />);

    const submitButton = screen.getByRole("button", {
      name: "Envoyer le lien",
    });
    const emailInput = screen.getByLabelText("Email du compte");

    expect(submitButton).toBeDisabled();

    fireEvent.change(emailInput, { target: { value: "bad-email" } });
    expect(submitButton).toBeDisabled();

    fireEvent.change(emailInput, { target: { value: "parent@example.test" } });
    expect(submitButton).toBeEnabled();

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        "Si ce compte existe, un lien de reinitialisation a ete envoye.",
      );
    });

    expect((emailInput as HTMLInputElement).value).toBe("");

    await waitFor(() => {
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 5000);
    });
    const redirectTimerCall = setTimeoutSpy.mock.calls.find(
      (entry) => entry[1] === 5000,
    );
    const callback = redirectTimerCall?.[0];
    expect(typeof callback).toBe("function");
    (callback as () => void)();
    expect(replaceMock).toHaveBeenCalledWith("/");
  });

  it("loads recovery questions and transitions to password step after verification", async () => {
    currentSearchParams = new URLSearchParams(
      "token=0123456789abcdefghijklmnop&schoolSlug=college-vogt",
    );

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            emailHint: "p***t@example.test",
            schoolSlug: "college-vogt",
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
        new Response(JSON.stringify({ success: true, verified: true }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }),
      );

    render(<ForgotPasswordPage />);

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
      screen.getByRole("button", { name: "Verifier mon identite" }),
    );

    await waitFor(() => {
      expect(screen.getByText("Nouveau mot de passe")).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        "8 caracteres minimum, dont au moins 1 Maj, 1 Min, 1 Chiffre",
      ),
    ).toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/auth/forgot-password/options"),
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/auth/forgot-password/verify"),
      expect.objectContaining({ method: "POST" }),
    );
  });
});
