import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AccountPage from "./page";
import { useLocaleStore } from "../../i18n/locale-store";
import { DEFAULT_LOCALE } from "../../i18n/translations";

const replaceMock = vi.fn();
const pushMock = vi.fn();
const getCsrfTokenCookieMock = vi.fn((): string | null => "csrf-token-test");

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

  it("permet de choisir la classe et l'enfant via les listes deroulantes filtrables (compte parent)", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input, init) => {
        const url = String(input);
        if (url.endsWith("/me")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                firstName: "Zoutigo",
                lastName: "Parent",
                email: "parent@gmail.com",
                role: "PARENT",
                schoolSlug: "lycee-du-poisson-d-avril",
              }),
              { status: 200, headers: { "Content-Type": "application/json" } },
            ),
          );
        }

        if (url.endsWith("/auth/recovery/options")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                schoolRoles: ["PARENT"],
                birthDate: "1990-06-14",
                selectedQuestions: [],
                questions: [
                  { key: "BIRTH_CITY", label: "Votre ville de naissance" },
                  { key: "FAVORITE_BOOK", label: "Votre livre prefere" },
                  { key: "FAVORITE_SPORT", label: "Votre sport prefere" },
                ],
                classes: [
                  {
                    id: "class-1",
                    name: "6eme A",
                    schoolYearLabel: "2025-2026",
                  },
                  {
                    id: "class-2",
                    name: "5eme B",
                    schoolYearLabel: "2025-2026",
                  },
                ],
                students: [
                  { id: "student-1", firstName: "Alice", lastName: "Zoutigo" },
                  { id: "student-2", firstName: "Bob", lastName: "Zoutigo" },
                ],
                parentClassId: null,
                parentStudentId: null,
              }),
              { status: 200, headers: { "Content-Type": "application/json" } },
            ),
          );
        }

        if (url.endsWith("/auth/recovery/update")) {
          expect(init?.method).toBe("POST");
          expect(JSON.parse(String(init?.body))).toEqual(
            expect.objectContaining({
              parentClassId: "class-2",
              parentStudentId: "student-1",
            }),
          );
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

    fireEvent.click(screen.getByTestId("account-recovery-parent-class-select"));
    expect(screen.getByText("6eme A (2025-2026)")).toBeInTheDocument();
    fireEvent.click(
      screen.getByTestId("account-recovery-parent-class-select-option-class-2"),
    );
    expect(screen.getByText("5eme B (2025-2026)")).toBeInTheDocument();

    fireEvent.click(
      screen.getByTestId("account-recovery-parent-student-select"),
    );
    fireEvent.click(
      screen.getByTestId(
        "account-recovery-parent-student-select-option-student-1",
      ),
    );
    expect(screen.getByText("Zoutigo Alice")).toBeInTheDocument();

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
      expect.objectContaining({ method: "POST" }),
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
    fireEvent.click(screen.getByTestId("account-gender-select"));
    fireEvent.click(screen.getByTestId("account-gender-select-option-F"));
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
        screen.getByRole("button", { name: "Parametres" }),
      ).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "Parametres" }));

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

  it("affiche le contenu d'aide au bas de l'onglet Securite", async () => {
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
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      if (url.endsWith("/auth/recovery/options")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              schoolRoles: ["SUPER_ADMIN"],
              birthDate: "",
              selectedQuestions: [],
              questions: [],
              classes: [],
              students: [],
              parentClassId: null,
              parentStudentId: null,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      return Promise.resolve(new Response(null, { status: 404 }));
    });

    render(<AccountPage />);

    fireEvent.click(screen.getByRole("button", { name: "Securite" }));

    expect(
      await screen.findByText(
        /ce module centralise vos informations personnelles et la securite/,
      ),
    ).toBeInTheDocument();
  });

  it("n'affiche plus le contenu d'aide dans l'onglet Aide (deplace dans l'onglet Securite)", async () => {
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
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      return Promise.resolve(new Response(null, { status: 404 }));
    });

    render(<AccountPage />);

    fireEvent.click(screen.getByRole("button", { name: "Aide" }));

    await waitFor(() => {
      expect(
        screen.getByTestId("account-onboarding-help-switch"),
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByText(
        /ce module centralise vos informations personnelles et la securite/,
      ),
    ).toBeNull();
  });

  it("affiche le toggle d'aide guidee et le bouton de rejeu dans l'onglet Aide, ouverts a tous les comptes", async () => {
    document.cookie = "school_live_csrf_token=test-csrf-token";
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      if (url.endsWith("/me")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              firstName: "Zoutigo",
              lastName: "Admin",
              email: "zoutigo@gmail.com",
              role: "PARENT",
              schoolSlug: null,
              onboardingHelpEnabled: true,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      if (url.endsWith("/me/onboarding-help") && init?.method === "PUT") {
        return Promise.resolve(
          new Response(JSON.stringify({}), { status: 200 }),
        );
      }
      return Promise.resolve(new Response(null, { status: 404 }));
    });

    render(<AccountPage />);

    fireEvent.click(screen.getByRole("button", { name: "Aide" }));

    const toggle = await screen.findByTestId("account-onboarding-help-switch");
    expect(toggle).toHaveAttribute("aria-checked", "true");

    fireEvent.click(toggle);

    await waitFor(() => {
      expect(toggle).toHaveAttribute("aria-checked", "false");
    });

    expect(
      screen.getByTestId("account-reset-tours-action"),
    ).toBeInTheDocument();
  });

  it("reinitialise les visites guidees depuis l'onglet Aide", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/me")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              firstName: "Zoutigo",
              lastName: "Admin",
              email: "zoutigo@gmail.com",
              role: "PARENT",
              schoolSlug: null,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      return Promise.resolve(new Response(null, { status: 404 }));
    });

    const { useOnboardingTourStore } =
      await import("../../store/onboarding-tour");
    useOnboardingTourStore.setState({
      completedTours: { "parent:agenda": true },
    });

    render(<AccountPage />);

    fireEvent.click(screen.getByRole("button", { name: "Aide" }));

    const resetButton = await screen.findByTestId("account-reset-tours-action");
    fireEvent.click(resetButton);

    expect(useOnboardingTourStore.getState().completedTours).toEqual({});
  });

  it("affiche la langue de l'appareil dans l'onglet Parametres et masque ecole/profil quand un seul est disponible", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/me")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              firstName: "Zoutigo",
              lastName: "Admin",
              email: "zoutigo@gmail.com",
              role: "SCHOOL_ADMIN",
              activeRole: "SCHOOL_ADMIN",
              schoolSlug: "lycee-du-poisson-d-avril",
              activeSchoolId: "school-1",
              schools: [
                {
                  schoolId: "school-1",
                  slug: "lycee-du-poisson-d-avril",
                  name: "Lycee du Poisson d'Avril",
                  role: "SCHOOL_ADMIN",
                },
              ],
              platformRoles: [],
              memberships: [{ schoolId: "school-1", role: "SCHOOL_ADMIN" }],
              preferredLocale: "FR",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      return Promise.resolve(new Response(null, { status: 404 }));
    });

    render(<AccountPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Parametres" }));

    expect(
      await screen.findByTestId("account-device-language-section"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("account-language-section")).toBeInTheDocument();
    expect(
      screen.queryByTestId("account-active-school-section"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("account-active-role-section"),
    ).not.toBeInTheDocument();
  });

  it("permet de changer l'ecole active depuis l'onglet Parametres", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input, init) => {
        const url = String(input);
        if (url.endsWith("/me/active-school")) {
          expect(init?.method).toBe("PUT");
          expect(JSON.parse(String(init?.body))).toEqual({
            schoolId: "school-2",
          });
          return Promise.resolve(
            new Response(
              JSON.stringify({
                firstName: "Zoutigo",
                lastName: "Admin",
                email: "zoutigo@gmail.com",
                role: "SCHOOL_ADMIN",
                activeRole: "SCHOOL_ADMIN",
                schoolSlug: "college-des-fleurs",
                activeSchoolId: "school-2",
                schools: [
                  {
                    schoolId: "school-1",
                    slug: "lycee-du-poisson-d-avril",
                    name: "Lycee du Poisson d'Avril",
                    role: "SCHOOL_ADMIN",
                  },
                  {
                    schoolId: "school-2",
                    slug: "college-des-fleurs",
                    name: "College des Fleurs",
                    role: "TEACHER",
                  },
                ],
                platformRoles: [],
                memberships: [
                  { schoolId: "school-1", role: "SCHOOL_ADMIN" },
                  { schoolId: "school-2", role: "TEACHER" },
                ],
                preferredLocale: "FR",
              }),
              { status: 200, headers: { "Content-Type": "application/json" } },
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
                role: "SCHOOL_ADMIN",
                activeRole: "SCHOOL_ADMIN",
                schoolSlug: "lycee-du-poisson-d-avril",
                activeSchoolId: "school-1",
                schools: [
                  {
                    schoolId: "school-1",
                    slug: "lycee-du-poisson-d-avril",
                    name: "Lycee du Poisson d'Avril",
                    role: "SCHOOL_ADMIN",
                  },
                  {
                    schoolId: "school-2",
                    slug: "college-des-fleurs",
                    name: "College des Fleurs",
                    role: "TEACHER",
                  },
                ],
                platformRoles: [],
                memberships: [
                  { schoolId: "school-1", role: "SCHOOL_ADMIN" },
                  { schoolId: "school-2", role: "TEACHER" },
                ],
                preferredLocale: "FR",
              }),
              { status: 200, headers: { "Content-Type": "application/json" } },
            ),
          );
        }

        return Promise.resolve(new Response(null, { status: 404 }));
      });

    render(<AccountPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Parametres" }));

    const schoolSection = await screen.findByTestId(
      "account-active-school-section",
    );
    const saveButton = screen.getByTestId("account-active-school-save");
    expect(saveButton).toBeDisabled();

    fireEvent.click(screen.getByTestId("account-active-school-select"));
    fireEvent.click(
      screen.getByTestId("account-active-school-select-option-school-2"),
    );
    expect(saveButton).not.toBeDisabled();

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(
        screen.getByText("L'ecole active a ete mise a jour."),
      ).toBeInTheDocument();
    });
    expect(schoolSection).toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/me/active-school"),
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({
          "X-CSRF-Token": "csrf-token-test",
        }),
      }),
    );
  });

  it("permet de changer le profil actif depuis l'onglet Parametres", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input, init) => {
        const url = String(input);
        if (url.endsWith("/me/active-role")) {
          expect(init?.method).toBe("PUT");
          expect(JSON.parse(String(init?.body))).toEqual({
            role: "TEACHER",
          });
          return Promise.resolve(
            new Response(
              JSON.stringify({
                firstName: "Zoutigo",
                lastName: "Admin",
                email: "zoutigo@gmail.com",
                role: "SCHOOL_ADMIN",
                activeRole: "TEACHER",
                schoolSlug: "lycee-du-poisson-d-avril",
                activeSchoolId: "school-1",
                schools: [],
                platformRoles: [],
                memberships: [
                  { schoolId: "school-1", role: "SCHOOL_ADMIN" },
                  { schoolId: "school-1", role: "TEACHER" },
                ],
                preferredLocale: "FR",
              }),
              { status: 200, headers: { "Content-Type": "application/json" } },
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
                role: "SCHOOL_ADMIN",
                activeRole: "SCHOOL_ADMIN",
                schoolSlug: "lycee-du-poisson-d-avril",
                activeSchoolId: "school-1",
                schools: [
                  {
                    schoolId: "school-1",
                    slug: "lycee-du-poisson-d-avril",
                    name: "Lycee du Poisson d'Avril",
                    role: "SCHOOL_ADMIN",
                  },
                ],
                platformRoles: [],
                memberships: [
                  { schoolId: "school-1", role: "SCHOOL_ADMIN" },
                  { schoolId: "school-1", role: "TEACHER" },
                ],
                preferredLocale: "FR",
              }),
              { status: 200, headers: { "Content-Type": "application/json" } },
            ),
          );
        }

        return Promise.resolve(new Response(null, { status: 404 }));
      });

    render(<AccountPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Parametres" }));

    const roleSection = await screen.findByTestId(
      "account-active-role-section",
    );
    const saveButton = screen.getByTestId("account-active-role-save");
    expect(saveButton).toBeDisabled();

    fireEvent.click(screen.getByTestId("account-active-role-select"));
    fireEvent.click(
      screen.getByTestId("account-active-role-select-option-TEACHER"),
    );
    expect(saveButton).not.toBeDisabled();

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(
        screen.getByText("Le profil actif a ete mis a jour."),
      ).toBeInTheDocument();
    });
    expect(roleSection).toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/me/active-role"),
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({
          "X-CSRF-Token": "csrf-token-test",
        }),
      }),
    );
  });

  it("affiche une erreur si le changement d'ecole active echoue", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      if (url.endsWith("/me/active-school")) {
        expect(init?.method).toBe("PUT");
        return Promise.resolve(
          new Response(JSON.stringify({ message: "Ecole introuvable." }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }

      if (url.endsWith("/me")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              firstName: "Zoutigo",
              lastName: "Admin",
              email: "zoutigo@gmail.com",
              role: "SCHOOL_ADMIN",
              activeRole: "SCHOOL_ADMIN",
              schoolSlug: "lycee-du-poisson-d-avril",
              activeSchoolId: "school-1",
              schools: [
                {
                  schoolId: "school-1",
                  slug: "lycee-du-poisson-d-avril",
                  name: "Lycee du Poisson d'Avril",
                  role: "SCHOOL_ADMIN",
                },
                {
                  schoolId: "school-2",
                  slug: "college-des-fleurs",
                  name: "College des Fleurs",
                  role: "TEACHER",
                },
              ],
              platformRoles: [],
              memberships: [
                { schoolId: "school-1", role: "SCHOOL_ADMIN" },
                { schoolId: "school-2", role: "TEACHER" },
              ],
              preferredLocale: "FR",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }

      return Promise.resolve(new Response(null, { status: 404 }));
    });

    render(<AccountPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Parametres" }));
    await screen.findByTestId("account-active-school-section");

    fireEvent.click(screen.getByTestId("account-active-school-select"));
    fireEvent.click(
      screen.getByTestId("account-active-school-select-option-school-2"),
    );
    fireEvent.click(screen.getByTestId("account-active-school-save"));

    await waitFor(() => {
      expect(screen.getByText("Ecole introuvable.")).toBeInTheDocument();
    });
  });

  it("redirige vers l'accueil si le token CSRF est absent lors du changement de profil actif", async () => {
    getCsrfTokenCookieMock.mockReturnValue(null);

    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/me")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              firstName: "Zoutigo",
              lastName: "Admin",
              email: "zoutigo@gmail.com",
              role: "SCHOOL_ADMIN",
              activeRole: "SCHOOL_ADMIN",
              schoolSlug: "lycee-du-poisson-d-avril",
              activeSchoolId: "school-1",
              schools: [
                {
                  schoolId: "school-1",
                  slug: "lycee-du-poisson-d-avril",
                  name: "Lycee du Poisson d'Avril",
                  role: "SCHOOL_ADMIN",
                },
              ],
              platformRoles: [],
              memberships: [
                { schoolId: "school-1", role: "SCHOOL_ADMIN" },
                { schoolId: "school-1", role: "TEACHER" },
              ],
              preferredLocale: "FR",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      return Promise.resolve(new Response(null, { status: 404 }));
    });

    render(<AccountPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Parametres" }));
    await screen.findByTestId("account-active-role-section");

    fireEvent.click(screen.getByTestId("account-active-role-select"));
    fireEvent.click(
      screen.getByTestId("account-active-role-select-option-TEACHER"),
    );
    fireEvent.click(screen.getByTestId("account-active-role-save"));

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/");
    });
  });
});
