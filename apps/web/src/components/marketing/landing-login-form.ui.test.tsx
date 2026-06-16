import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LandingLoginForm } from "./landing-login-form";
import { useLocaleStore } from "../../i18n/locale-store";
import { DEFAULT_LOCALE } from "../../i18n/translations";

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
    window.localStorage.clear();
    useLocaleStore.setState({ locale: DEFAULT_LOCALE });
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

  it("affiche le sélecteur de langue de l'appareil avec FR sélectionné par défaut", () => {
    render(<LandingLoginForm />);

    expect(screen.getByTestId("login-language-switcher")).toBeInTheDocument();
    expect(screen.getByTestId("login-language-fr")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByTestId("login-language-en")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("bascule la langue de l'appareil en anglais au clic sur EN", () => {
    render(<LandingLoginForm />);

    fireEvent.click(screen.getByTestId("login-language-en"));

    expect(useLocaleStore.getState().locale).toBe("en");
    expect(screen.getByTestId("login-language-en")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("traduit le contenu du formulaire en anglais quand la langue EN est active", () => {
    useLocaleStore.setState({ locale: "en" });
    render(<LandingLoginForm />);

    expect(screen.getAllByText("Phone + PIN").length).toBeGreaterThan(0);
    expect(screen.getByText("Email + Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Phone")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sign in with phone + PIN" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByText("Forgot PIN?")).toBeInTheDocument();
    expect(screen.getByText("Forgot password?")).toBeInTheDocument();
    expect(screen.getByText("Google / Apple")).toBeInTheDocument();
    expect(screen.getByText("School SSO")).toBeInTheDocument();
  });

  it("affiche les messages de validation en anglais quand la langue EN est active", () => {
    useLocaleStore.setState({ locale: "en" });
    render(<LandingLoginForm />);

    fireEvent.input(screen.getByLabelText("Phone"), {
      target: { value: "12" },
    });
    fireEvent.input(screen.getByLabelText("PIN"), {
      target: { value: "1234" },
    });

    expect(
      screen.getByText("Invalid number (9 digits expected)."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Invalid PIN (6 digits expected)."),
    ).toBeInTheDocument();
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

// ── Méthode "Identifiant + Mot de passe" ──────────────────────────────────────

function switchToUsernameMethod() {
  fireEvent.click(
    screen.getByRole("button", { name: "Se connecter autrement" }),
  );
  fireEvent.click(screen.getByText("Identifiant + Mot de passe"));
}

describe("LandingLoginForm UI — méthode Identifiant (username)", () => {
  beforeEach(() => {
    pushMock.mockReset();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("la section username n'est pas rendue par défaut (méthode phone active)", () => {
    render(<LandingLoginForm />);

    expect(
      screen.queryByRole("button", { name: "Se connecter (identifiant)" }),
    ).not.toBeInTheDocument();
  });

  it("charge la méthode username depuis localStorage et affiche la section username", () => {
    localStorage.setItem("preferred_auth_method", "username");
    render(<LandingLoginForm />);

    expect(
      screen.getByRole("button", { name: "Se connecter (identifiant)" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Identifiant")).toBeInTheDocument();
  });

  it("le dropdown 'Se connecter autrement' affiche 'Identifiant + Mot de passe'", () => {
    render(<LandingLoginForm />);

    fireEvent.click(
      screen.getByRole("button", { name: "Se connecter autrement" }),
    );

    expect(screen.getByText("Identifiant + Mot de passe")).toBeInTheDocument();
  });

  it("cliquer sur 'Identifiant + Mot de passe' affiche la section username", () => {
    render(<LandingLoginForm />);

    switchToUsernameMethod();

    expect(
      screen.getByRole("button", { name: "Se connecter (identifiant)" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Identifiant")).toBeInTheDocument();
  });

  it("aucune erreur inline au premier rendu de la section username", () => {
    localStorage.setItem("preferred_auth_method", "username");
    render(<LandingLoginForm />);

    expect(
      screen.queryByText("Identifiant invalide (3 caracteres minimum)."),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Mot de passe requis.")).not.toBeInTheDocument();
  });

  it("erreur inline si identifiant fait moins de 3 caractères", () => {
    localStorage.setItem("preferred_auth_method", "username");
    render(<LandingLoginForm />);

    fireEvent.input(screen.getByLabelText("Identifiant"), {
      target: { value: "ab" },
    });

    expect(
      screen.getByText("Identifiant invalide (3 caracteres minimum)."),
    ).toBeInTheDocument();
  });

  it("erreur inline si le mot de passe est vide après saisie de l'identifiant", () => {
    localStorage.setItem("preferred_auth_method", "username");
    render(<LandingLoginForm />);

    fireEvent.input(screen.getByLabelText("Identifiant"), {
      target: { value: "JeanDUPONT" },
    });
    fireEvent.submit(
      screen
        .getByRole("button", { name: "Se connecter (identifiant)" })
        .closest("form") as HTMLFormElement,
    );

    expect(screen.getByText("Mot de passe requis.")).toBeInTheDocument();
  });

  it("le bouton submit est désactivé tant que le formulaire est invalide", () => {
    localStorage.setItem("preferred_auth_method", "username");
    render(<LandingLoginForm />);

    expect(
      screen.getByRole("button", { name: "Se connecter (identifiant)" }),
    ).toBeDisabled();

    fireEvent.input(screen.getByLabelText("Identifiant"), {
      target: { value: "JeanDUPONT" },
    });

    expect(
      screen.getByRole("button", { name: "Se connecter (identifiant)" }),
    ).toBeDisabled();
  });

  it("le bouton submit est activé quand identifiant et mot de passe sont valides", async () => {
    localStorage.setItem("preferred_auth_method", "username");
    render(<LandingLoginForm />);

    fireEvent.input(screen.getByLabelText("Identifiant"), {
      target: { value: "JeanDUPONT" },
    });
    fireEvent.input(screen.getByLabelText("Mot de passe (identifiant)"), {
      target: { value: "somepassword" },
    });

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Se connecter (identifiant)" }),
      ).toBeEnabled(),
    );
  });

  it("submit appelle POST /auth/login/username avec identifiant et mot de passe", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ schoolSlug: null }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ role: "STUDENT", schoolSlug: "college-vogt" }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

    localStorage.setItem("preferred_auth_method", "username");
    render(<LandingLoginForm />);

    fireEvent.input(screen.getByLabelText("Identifiant"), {
      target: { value: "JeanDUPONT" },
    });
    fireEvent.input(screen.getByLabelText("Mot de passe (identifiant)"), {
      target: { value: "Password123!" },
    });
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Se connecter (identifiant)" }),
      ).toBeEnabled(),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Se connecter (identifiant)" }),
    );

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("/auth/login/username"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            username: "JeanDUPONT",
            password: "Password123!",
          }),
        }),
      );
    });
  });

  it("succès : redirige vers /schools/{slug}/dashboard", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ schoolSlug: "college-vogt" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ role: "STUDENT", schoolSlug: "college-vogt" }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

    localStorage.setItem("preferred_auth_method", "username");
    render(<LandingLoginForm />);

    fireEvent.input(screen.getByLabelText("Identifiant"), {
      target: { value: "JeanDUPONT" },
    });
    fireEvent.input(screen.getByLabelText("Mot de passe (identifiant)"), {
      target: { value: "Password123!" },
    });
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Se connecter (identifiant)" }),
      ).toBeEnabled(),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Se connecter (identifiant)" }),
    );

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/schools/college-vogt/dashboard");
    });
  });

  it("PASSWORD_CHANGE_REQUIRED : redirige vers /first-password?username=...&schoolSlug=...", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          code: "PASSWORD_CHANGE_REQUIRED",
          username: "JeanDUPONT",
          schoolSlug: "college-vogt",
        }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      ),
    );

    localStorage.setItem("preferred_auth_method", "username");
    render(<LandingLoginForm />);

    fireEvent.input(screen.getByLabelText("Identifiant"), {
      target: { value: "JeanDUPONT" },
    });
    fireEvent.input(screen.getByLabelText("Mot de passe (identifiant)"), {
      target: { value: "OldPass123!" },
    });
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Se connecter (identifiant)" }),
      ).toBeEnabled(),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Se connecter (identifiant)" }),
    );

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(
        expect.stringContaining("/first-password?"),
      );
      expect(pushMock).toHaveBeenCalledWith(
        expect.stringContaining("username=JeanDUPONT"),
      );
    });
  });

  it("erreur API : affiche 'Identifiant ou mot de passe invalide'", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    );

    localStorage.setItem("preferred_auth_method", "username");
    render(<LandingLoginForm />);

    fireEvent.input(screen.getByLabelText("Identifiant"), {
      target: { value: "JeanDUPONT" },
    });
    fireEvent.input(screen.getByLabelText("Mot de passe (identifiant)"), {
      target: { value: "WrongPass!" },
    });
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Se connecter (identifiant)" }),
      ).toBeEnabled(),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Se connecter (identifiant)" }),
    );

    await waitFor(() => {
      expect(
        screen.getByText("Identifiant ou mot de passe invalide"),
      ).toBeInTheDocument();
    });
  });

  it("le lien 'Mot de passe oublie ?' de la section username pointe vers /identifiant-oublie", () => {
    localStorage.setItem("preferred_auth_method", "username");
    render(<LandingLoginForm />);

    // Il y a deux liens "Mot de passe oublie ?" (email + username) — on vérifie que l'un d'eux pointe vers /identifiant-oublie
    const forgotLinks = screen.getAllByRole("link", {
      name: "Mot de passe oublie ?",
    });
    const usernameLink = forgotLinks.find((l) =>
      l.getAttribute("href")?.includes("identifiant-oublie"),
    );
    expect(usernameLink).toBeDefined();
    expect(usernameLink).toHaveAttribute("href", "/identifiant-oublie");
  });

  it("changer de méthode efface l'erreur affichée", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    );

    localStorage.setItem("preferred_auth_method", "username");
    render(<LandingLoginForm />);

    fireEvent.input(screen.getByLabelText("Identifiant"), {
      target: { value: "JeanDUPONT" },
    });
    fireEvent.input(screen.getByLabelText("Mot de passe (identifiant)"), {
      target: { value: "WrongPass!" },
    });
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Se connecter (identifiant)" }),
      ).toBeEnabled(),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Se connecter (identifiant)" }),
    );

    await waitFor(() =>
      expect(
        screen.getByText("Identifiant ou mot de passe invalide"),
      ).toBeInTheDocument(),
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Se connecter autrement" }),
    );
    // "Telephone + PIN" apparaît aussi comme heading de section — on cible le bouton du dropdown
    const phoneBtns = screen.getAllByText("Telephone + PIN");
    const dropdownBtn = phoneBtns.find((el) => el.tagName === "BUTTON");
    fireEvent.click(dropdownBtn!);

    expect(
      screen.queryByText("Identifiant ou mot de passe invalide"),
    ).not.toBeInTheDocument();
  });
});
