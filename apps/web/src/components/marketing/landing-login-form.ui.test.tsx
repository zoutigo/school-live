import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LandingLoginForm } from "./landing-login-form";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("../auth/sso-buttons", () => ({
  SsoButtons: () => <div>SSO buttons</div>,
}));

describe("LandingLoginForm UI", () => {
  beforeEach(() => {
    pushMock.mockReset();
    vi.restoreAllMocks();
  });

  it("does not show inline errors on initial render", () => {
    render(<LandingLoginForm />);

    expect(
      screen.queryByText("Numero invalide (9 chiffres attendus)."),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("PIN invalide (6 chiffres attendus)."),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Adresse email invalide."),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Mot de passe requis.")).not.toBeInTheDocument();
  });

  it("shows phone and pin inline validation errors after input interactions", () => {
    render(<LandingLoginForm />);

    const phoneInput = screen.getByLabelText("Telephone");
    const pinInput = screen.getByLabelText("PIN");
    const phoneSubmit = screen.getByRole("button", {
      name: "Connexion telephone + PIN",
    });

    expect(phoneSubmit).toBeDisabled();

    fireEvent.input(phoneInput, { target: { value: "12" } });
    fireEvent.input(pinInput, { target: { value: "1234" } });

    expect(
      screen.getByText("Numero invalide (9 chiffres attendus)."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("PIN invalide (6 chiffres attendus)."),
    ).toBeInTheDocument();
    expect(phoneSubmit).toBeDisabled();

    fireEvent.input(phoneInput, { target: { value: "650597838" } });
    fireEvent.input(pinInput, { target: { value: "123456" } });

    expect(
      screen.queryByText("Numero invalide (9 chiffres attendus)."),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("PIN invalide (6 chiffres attendus)."),
    ).not.toBeInTheDocument();
    expect(phoneSubmit).toBeEnabled();
  });

  it("shows global phone auth error when API rejects submit", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    );
    render(<LandingLoginForm />);

    fireEvent.input(screen.getByLabelText("Telephone"), {
      target: { value: "650597838" },
    });
    fireEvent.input(screen.getByLabelText("PIN"), {
      target: { value: "123456" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Connexion telephone + PIN" }),
    );

    await waitFor(() => {
      expect(screen.getByText("Telephone ou PIN invalide")).toBeInTheDocument();
    });
  });

  it("redirects to onboarding when phone login requires profile setup", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          message: {
            code: "PROFILE_SETUP_REQUIRED",
            email: "teacher-237610101031-abc@noemail.scolive.local",
            schoolSlug: "college-vogt",
            setupToken: "setup-token-phone",
          },
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    render(<LandingLoginForm />);

    fireEvent.input(screen.getByLabelText("Telephone"), {
      target: { value: "610101031" },
    });
    fireEvent.input(screen.getByLabelText("PIN"), {
      target: { value: "123456" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Connexion telephone + PIN" }),
    );

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(
        "/onboarding?email=teacher-237610101031-abc%40noemail.scolive.local&phone=610101031&schoolSlug=college-vogt&token=setup-token-phone",
      );
    });
  });

  it("shows credential inline errors on submit and when email is invalid", () => {
    render(<LandingLoginForm />);

    const emailInput = screen.getByLabelText("Email");
    const credentialsSubmit = screen.getByRole("button", {
      name: "Se connecter",
    });
    const credentialsForm = credentialsSubmit.closest("form");

    expect(credentialsForm).not.toBeNull();

    fireEvent.change(emailInput, { target: { value: "bad-email" } });
    expect(screen.getByText("Adresse email invalide.")).toBeInTheDocument();

    fireEvent.change(emailInput, { target: { value: "parent@example.test" } });
    fireEvent.submit(credentialsForm as HTMLFormElement);

    expect(screen.getAllByText("Mot de passe requis.")).toHaveLength(1);
  });

  it("shows global credentials error when API rejects submit", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    );
    render(<LandingLoginForm />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "parent@example.test" },
    });
    fireEvent.input(screen.getByLabelText("Mot de passe"), {
      target: { value: "Password123!" },
    });
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Se connecter" }),
      ).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() => {
      expect(
        screen.getByText("Email ou mot de passe invalide"),
      ).toBeInTheDocument();
    });
  });

  it("redirects to platform credentials completion when backend requires it", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          message: {
            code: "PLATFORM_CREDENTIAL_SETUP_REQUIRED",
            setupToken: "setup-token-123",
            missingFields: ["PASSWORD", "PHONE_PIN"],
          },
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    render(<LandingLoginForm />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "platform@example.test" },
    });
    fireEvent.input(screen.getByLabelText("Mot de passe"), {
      target: { value: "Password123!" },
    });
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Se connecter" }),
      ).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(
        "/auth/completer-identifiants-platform?token=setup-token-123&email=platform%40example.test&missing=PASSWORD%2CPHONE_PIN",
      );
    });
  });
});
