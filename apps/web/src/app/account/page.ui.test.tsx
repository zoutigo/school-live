import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AccountPage from "./page";
import { useLocaleStore } from "../../i18n/locale-store";
import { DEFAULT_LOCALE } from "../../i18n/translations";

const replaceMock = vi.fn();
const pushMock = vi.fn();
const getCsrfTokenCookieMock = vi.fn(() => "csrf-token-test");

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: pushMock }),
}));

vi.mock("../../components/layout/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("../../lib/auth-cookies", () => ({
  getCsrfTokenCookie: () => getCsrfTokenCookieMock(),
}));

describe("AccountPage recovery settings UI", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    pushMock.mockReset();
    getCsrfTokenCookieMock.mockReset();
    getCsrfTokenCookieMock.mockReturnValue("csrf-token-test");
    vi.restoreAllMocks();
    window.localStorage.clear();
    useLocaleStore.setState({ locale: DEFAULT_LOCALE });
  });

  it("loads recovery options when opening security tab", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/me")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              firstName: "Zoutigo",
              lastName: "Admin",
              email: "zoutigo@gmail.com",
              role: "SUPER_ADMIN",
              schoolSlug: null,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          ),
        );
      }

      if (url.endsWith("/auth/recovery/options")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              schoolRoles: ["SUPER_ADMIN"],
              birthDate: "1990-06-14",
              selectedQuestions: [
                "BIRTH_CITY",
                "FAVORITE_BOOK",
                "FAVORITE_SPORT",
              ],
              questions: [
                { key: "BIRTH_CITY", label: "Votre ville de naissance" },
                { key: "FAVORITE_BOOK", label: "Votre livre prefere" },
                { key: "FAVORITE_SPORT", label: "Votre sport prefere" },
              ],
              classes: [],
              students: [],
              parentClassId: null,
              parentStudentId: null,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          ),
        );
      }

      return Promise.resolve(new Response(null, { status: 404 }));
    });

    render(<AccountPage />);

    fireEvent.click(screen.getByRole("button", { name: "Securite" }));

    await waitFor(() => {
      expect(screen.getByText("Questions de recuperation")).toBeInTheDocument();
    });
    fireEvent.click(
      screen.getByLabelText("Modifier les questions de recuperation"),
    );

    expect(screen.getByText("Votre ville de naissance")).toBeInTheDocument();
    expect(screen.getByText("Votre livre prefere")).toBeInTheDocument();
    expect(screen.getByText("Votre sport prefere")).toBeInTheDocument();
  });

  it("keeps recovery submit disabled while the form is incomplete", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/me")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              firstName: "Zoutigo",
              lastName: "Admin",
              email: "zoutigo@gmail.com",
              role: "SUPER_ADMIN",
              schoolSlug: null,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          ),
        );
      }

      if (url.endsWith("/auth/recovery/options")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              schoolRoles: ["SUPER_ADMIN"],
              birthDate: "1990-06-14",
              selectedQuestions: [],
              questions: [
                { key: "BIRTH_CITY", label: "Votre ville de naissance" },
                { key: "FAVORITE_BOOK", label: "Votre livre prefere" },
                { key: "FAVORITE_SPORT", label: "Votre sport prefere" },
              ],
              classes: [],
              students: [],
              parentClassId: null,
              parentStudentId: null,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          ),
        );
      }

      return Promise.resolve(new Response(null, { status: 404 }));
    });

    render(<AccountPage />);
    fireEvent.click(screen.getByRole("button", { name: "Securite" }));

    await waitFor(() => {
      expect(screen.getByText("Questions de recuperation")).toBeInTheDocument();
    });
    fireEvent.click(
      screen.getByLabelText("Modifier les questions de recuperation"),
    );

    expect(
      screen.getByRole("button", { name: "Mettre a jour la recuperation" }),
    ).toBeDisabled();
  });

  it("submits recovery update and shows success message", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input, init) => {
        const url = String(input);
        if (url.endsWith("/me")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                firstName: "Zoutigo",
                lastName: "Admin",
                email: "zoutigo@gmail.com",
                role: "SUPER_ADMIN",
                schoolSlug: null,
              }),
              {
                status: 200,
                headers: { "Content-Type": "application/json" },
              },
            ),
          );
        }

        if (url.endsWith("/auth/recovery/options")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                schoolRoles: ["SUPER_ADMIN"],
                birthDate: "1990-06-14",
                selectedQuestions: [],
                questions: [
                  { key: "BIRTH_CITY", label: "Votre ville de naissance" },
                  { key: "FAVORITE_BOOK", label: "Votre livre prefere" },
                  { key: "FAVORITE_SPORT", label: "Votre sport prefere" },
                ],
                classes: [],
                students: [],
                parentClassId: null,
                parentStudentId: null,
              }),
              {
                status: 200,
                headers: { "Content-Type": "application/json" },
              },
            ),
          );
        }

        if (url.endsWith("/auth/recovery/update")) {
          expect(init?.method).toBe("POST");
          return Promise.resolve(
            new Response(JSON.stringify({ success: true }), {
              status: 201,
              headers: { "Content-Type": "application/json" },
            }),
          );
        }

        return Promise.resolve(new Response(null, { status: 404 }));
      });

    render(<AccountPage />);
    fireEvent.click(screen.getByRole("button", { name: "Securite" }));

    await waitFor(() => {
      expect(screen.getByText("Questions de recuperation")).toBeInTheDocument();
    });
    fireEvent.click(
      screen.getByLabelText("Modifier les questions de recuperation"),
    );

    fireEvent.click(screen.getByLabelText("Votre ville de naissance"));
    fireEvent.change(screen.getByPlaceholderText("Votre reponse"), {
      target: { value: "Douala" },
    });

    fireEvent.click(screen.getByLabelText("Votre livre prefere"));
    fireEvent.change(screen.getAllByPlaceholderText("Votre reponse")[1], {
      target: { value: "Le Petit Prince" },
    });

    fireEvent.click(screen.getByLabelText("Votre sport prefere"));
    fireEvent.change(screen.getAllByPlaceholderText("Votre reponse")[2], {
      target: { value: "Football" },
    });

    const recoverySubmitButton = screen.getByRole("button", {
      name: "Mettre a jour la recuperation",
    });
    await waitFor(() => {
      expect(recoverySubmitButton).toBeEnabled();
    });
    fireEvent.click(recoverySubmitButton);

    await waitFor(() => {
      expect(
        screen.getByText("Questions de recuperation mises a jour."),
      ).toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/auth/recovery/update"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "X-CSRF-Token": "csrf-token-test",
        }),
      }),
    );
  });

  it("updates personal profile from informations personnelles tab", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/me")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              firstName: "Zoutigo",
              lastName: "Admin",
              email: "zoutigo@gmail.com",
              role: "SUPER_ADMIN",
              gender: "M",
              phone: "+237650111111",
              schoolSlug: null,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          ),
        );
      }

      if (url.endsWith("/me/profile")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              firstName: "Michel",
              lastName: "Zoutigo",
              email: "zoutigo@gmail.com",
              role: "SUPER_ADMIN",
              gender: "F",
              phone: "+237650597838",
              schoolSlug: null,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          ),
        );
      }

      return Promise.resolve(new Response(null, { status: 404 }));
    });

    render(<AccountPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Modifier" }),
      ).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "Modifier" }));
    fireEvent.change(screen.getByLabelText("Prenom"), {
      target: { value: "Michel" },
    });
    fireEvent.change(screen.getByLabelText("Nom"), {
      target: { value: "Zoutigo" },
    });
    fireEvent.change(screen.getByLabelText("Genre"), {
      target: { value: "F" },
    });
    fireEvent.change(screen.getByLabelText("Telephone"), {
      target: { value: "650597838" },
    });

    const submitButton = screen.getByRole("button", { name: "Enregistrer" });
    await waitFor(() => {
      expect(submitButton).toBeEnabled();
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Michel")).toBeInTheDocument();
    });
    expect(screen.getByText("650597838")).toBeInTheDocument();
  });

  it("shows inline password validation and keeps submit disabled until valid", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/me")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              firstName: "Zoutigo",
              lastName: "Admin",
              email: "zoutigo@gmail.com",
              role: "SUPER_ADMIN",
              schoolSlug: null,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          ),
        );
      }

      if (url.endsWith("/auth/change-password")) {
        return Promise.resolve(
          new Response(JSON.stringify({ success: true }), {
            status: 201,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }

      return Promise.resolve(new Response(null, { status: 404 }));
    });

    render(<AccountPage />);
    fireEvent.click(screen.getByRole("button", { name: "Securite" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Modifier le mot de passe" }),
    );

    const submitButton = screen.getByRole("button", {
      name: "Changer le mot de passe",
    });
    expect(submitButton).toBeDisabled();

    fireEvent.input(screen.getByLabelText("Nouveau mot de passe"), {
      target: { value: "abc" },
    });
    await waitFor(() => {
      expect(
        screen.getByText(
          "Le mot de passe doit contenir au moins 8 caracteres avec majuscules, minuscules et chiffres.",
        ),
      ).toBeInTheDocument();
    });
    expect(submitButton).toBeDisabled();

    fireEvent.input(screen.getByLabelText("Ancien mot de passe"), {
      target: { value: "CurrentPass123" },
    });
    fireEvent.input(screen.getByLabelText("Nouveau mot de passe"), {
      target: { value: "ValidPass123" },
    });
    fireEvent.input(
      screen.getByLabelText("Confirmer le nouveau mot de passe"),
      {
        target: { value: "ValidPass124" },
      },
    );
    await waitFor(() => {
      expect(
        screen.getByText(
          "La confirmation du nouveau mot de passe ne correspond pas.",
        ),
      ).toBeInTheDocument();
    });
    expect(submitButton).toBeDisabled();

    fireEvent.input(
      screen.getByLabelText("Confirmer le nouveau mot de passe"),
      {
        target: { value: "ValidPass123" },
      },
    );
    await waitFor(() => expect(submitButton).toBeEnabled());
  });

  it("shows inline PIN validation and keeps submit disabled until valid", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/me")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              firstName: "Zoutigo",
              lastName: "Admin",
              email: "zoutigo@gmail.com",
              role: "SUPER_ADMIN",
              schoolSlug: null,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          ),
        );
      }

      if (url.endsWith("/auth/change-pin")) {
        return Promise.resolve(
          new Response(JSON.stringify({ success: true }), {
            status: 201,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }

      return Promise.resolve(new Response(null, { status: 404 }));
    });

    render(<AccountPage />);
    fireEvent.click(screen.getByRole("button", { name: "Securite" }));
    fireEvent.click(screen.getByRole("button", { name: "Modifier le PIN" }));

    const submitButton = screen.getByRole("button", { name: "Changer le PIN" });
    expect(submitButton).toBeDisabled();

    fireEvent.input(screen.getByLabelText("Nouveau PIN (6 chiffres)"), {
      target: { value: "12345" },
    });
    await waitFor(() => {
      expect(
        screen.getByText("Le nouveau PIN doit contenir 6 chiffres."),
      ).toBeInTheDocument();
    });
    expect(submitButton).toBeDisabled();

    fireEvent.input(screen.getByLabelText("PIN actuel"), {
      target: { value: "111111" },
    });
    fireEvent.input(screen.getByLabelText("Nouveau PIN (6 chiffres)"), {
      target: { value: "222222" },
    });
    fireEvent.input(screen.getByLabelText("Confirmation PIN"), {
      target: { value: "333333" },
    });
    await waitFor(() => {
      expect(
        screen.getByText("La confirmation du nouveau PIN ne correspond pas."),
      ).toBeInTheDocument();
    });
    expect(submitButton).toBeDisabled();

    fireEvent.input(screen.getByLabelText("Confirmation PIN"), {
      target: { value: "222222" },
    });
    await waitFor(() => expect(submitButton).toBeEnabled());
  });

  it("shows the password section translated in English", async () => {
    useLocaleStore.setState({ locale: "en" });
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/me")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              firstName: "Zoutigo",
              lastName: "Admin",
              email: "zoutigo@gmail.com",
              role: "SUPER_ADMIN",
              schoolSlug: null,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          ),
        );
      }

      return Promise.resolve(new Response(null, { status: 404 }));
    });

    render(<AccountPage />);
    fireEvent.click(screen.getByRole("button", { name: "Securite" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit password" }));

    const submitButton = screen.getByRole("button", {
      name: "Change password",
    });
    expect(submitButton).toBeDisabled();

    fireEvent.input(screen.getByLabelText("New password"), {
      target: { value: "abc" },
    });
    await waitFor(() => {
      expect(
        screen.getByText(
          "The password must be at least 8 characters long with uppercase, lowercase and numbers.",
        ),
      ).toBeInTheDocument();
    });

    fireEvent.input(screen.getByLabelText("Old password"), {
      target: { value: "CurrentPass123" },
    });
    fireEvent.input(screen.getByLabelText("New password"), {
      target: { value: "ValidPass123" },
    });
    fireEvent.input(screen.getByLabelText("Confirm new password"), {
      target: { value: "ValidPass124" },
    });
    await waitFor(() => {
      expect(
        screen.getByText("The confirmation does not match the new password."),
      ).toBeInTheDocument();
    });
  });

  it("shows the PIN section translated in English", async () => {
    useLocaleStore.setState({ locale: "en" });
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/me")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              firstName: "Zoutigo",
              lastName: "Admin",
              email: "zoutigo@gmail.com",
              role: "SUPER_ADMIN",
              schoolSlug: null,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          ),
        );
      }

      return Promise.resolve(new Response(null, { status: 404 }));
    });

    render(<AccountPage />);
    fireEvent.click(screen.getByRole("button", { name: "Securite" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit PIN" }));

    const submitButton = screen.getByRole("button", { name: "Change PIN" });
    expect(submitButton).toBeDisabled();

    fireEvent.input(screen.getByLabelText("New PIN (6 digits)"), {
      target: { value: "12345" },
    });
    await waitFor(() => {
      expect(
        screen.getByText("The new PIN must contain 6 digits."),
      ).toBeInTheDocument();
    });

    fireEvent.input(screen.getByLabelText("Current PIN"), {
      target: { value: "111111" },
    });
    fireEvent.input(screen.getByLabelText("New PIN (6 digits)"), {
      target: { value: "222222" },
    });
    fireEvent.input(screen.getByLabelText("Confirm PIN"), {
      target: { value: "333333" },
    });
    await waitFor(() => {
      expect(
        screen.getByText("The confirmation does not match the new PIN."),
      ).toBeInTheDocument();
    });
  });

  it("synchronise la langue de l'appareil avec la langue du compte au chargement", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/me")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              firstName: "Zoutigo",
              lastName: "Admin",
              email: "zoutigo@gmail.com",
              role: "SUPER_ADMIN",
              schoolSlug: null,
              preferredLocale: "EN",
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          ),
        );
      }

      return Promise.resolve(new Response(null, { status: 404 }));
    });

    render(<AccountPage />);

    await waitFor(() => {
      expect(useLocaleStore.getState().locale).toBe("en");
    });
  });

  it("affiche la section Langue du compte et permet de la mettre a jour", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input, init) => {
        const url = String(input);
        if (url.endsWith("/me/language")) {
          expect(init?.method).toBe("PUT");
          return Promise.resolve(
            new Response(
              JSON.stringify({
                firstName: "Zoutigo",
                lastName: "Admin",
                email: "zoutigo@gmail.com",
                role: "SUPER_ADMIN",
                schoolSlug: null,
                preferredLocale: "EN",
              }),
              {
                status: 200,
                headers: { "Content-Type": "application/json" },
              },
            ),
          );
        }

        if (url.endsWith("/me")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                firstName: "Zoutigo",
                lastName: "Admin",
                email: "zoutigo@gmail.com",
                role: "SUPER_ADMIN",
                schoolSlug: null,
                preferredLocale: "FR",
              }),
              {
                status: 200,
                headers: { "Content-Type": "application/json" },
              },
            ),
          );
        }

        return Promise.resolve(new Response(null, { status: 404 }));
      });

    render(<AccountPage />);

    await waitFor(() => {
      expect(
        screen.getByTestId("account-language-section"),
      ).toBeInTheDocument();
    });
    expect(screen.getByTestId("account-language-fr")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByTestId("account-language-en")).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    fireEvent.click(screen.getByTestId("account-language-en"));

    await waitFor(() => {
      expect(screen.getByTestId("account-language-en")).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    });
    expect(
      screen.getByText("La langue de votre compte a ete enregistree."),
    ).toBeInTheDocument();
    expect(useLocaleStore.getState().locale).toBe("en");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/me/language"),
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({
          "X-CSRF-Token": "csrf-token-test",
        }),
        body: JSON.stringify({ preferredLocale: "EN" }),
      }),
    );
  });
});
