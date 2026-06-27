/**
 * Tests UI — changement d'email dans AccountPage
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AccountPage from "../page";
import { useLocaleStore } from "../../../i18n/locale-store";
import { DEFAULT_LOCALE } from "../../../i18n/translations";

const replaceMock = vi.fn();
const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: pushMock }),
}));

vi.mock("../../../components/layout/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("../../../lib/auth-cookies", () => ({
  getCsrfTokenCookie: () => "csrf-token-test",
}));

function mockMeWithEmail(email = "alice@example.com") {
  return new Response(
    JSON.stringify({
      firstName: "Alice",
      lastName: "Test",
      email,
      role: "TEACHER",
      schoolSlug: "test-school",
      hasPassword: true,
      hasPhoneCredential: false,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

function mockFetchForAccount(overrides: Record<string, Response> = {}) {
  return vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
    const url = String(input);
    if (url.endsWith("/me"))
      return Promise.resolve(overrides["/me"] ?? mockMeWithEmail());
    if (url.endsWith("/auth/recovery/options"))
      return Promise.resolve(
        new Response(
          JSON.stringify({
            questions: [],
            classes: [],
            students: [],
            selectedQuestions: [],
            birthDate: "",
            parentClassId: null,
            parentStudentId: null,
            schoolRoles: ["TEACHER"],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    return Promise.resolve(new Response("{}", { status: 200 }));
  });
}

describe("AccountPage — changement d'email", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    pushMock.mockReset();
    vi.restoreAllMocks();
    useLocaleStore.setState({ locale: DEFAULT_LOCALE });
  });

  it("affiche l'email actuel et un bouton Modifier l'email", async () => {
    mockFetchForAccount();

    render(<AccountPage />);

    await waitFor(() =>
      expect(screen.getByText("alice@example.com")).toBeInTheDocument(),
    );

    expect(
      screen.getByRole("button", { name: /modifier l.email/i }),
    ).toBeInTheDocument();
  });

  it("ouvre le formulaire de changement au clic sur Modifier", async () => {
    mockFetchForAccount();
    render(<AccountPage />);

    await waitFor(() =>
      expect(screen.getByText("alice@example.com")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /modifier l.email/i }));

    expect(
      screen.getByPlaceholderText("nouveau@email.com"),
    ).toBeInTheDocument();
  });

  it("ferme le formulaire au clic sur Annuler", async () => {
    mockFetchForAccount();
    render(<AccountPage />);

    await waitFor(() =>
      expect(screen.getByText("alice@example.com")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /modifier l.email/i }));
    expect(
      screen.getByPlaceholderText("nouveau@email.com"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /annuler/i }));

    expect(
      screen.queryByPlaceholderText("nouveau@email.com"),
    ).not.toBeInTheDocument();
  });

  it("appelle POST /me/request-email-change avec le bon email", async () => {
    const fetchSpy = mockFetchForAccount();

    fetchSpy.mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/me")) return Promise.resolve(mockMeWithEmail());
      if (url.includes("/me/request-email-change")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({ success: true, message: "Lien envoye." }),
            { status: 201, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      if (url.endsWith("/auth/recovery/options"))
        return Promise.resolve(
          new Response(
            JSON.stringify({
              questions: [],
              classes: [],
              students: [],
              selectedQuestions: [],
              birthDate: "",
              parentClassId: null,
              parentStudentId: null,
              schoolRoles: [],
            }),
            { status: 200 },
          ),
        );
      return Promise.resolve(new Response("{}", { status: 200 }));
    });

    render(<AccountPage />);

    await waitFor(() =>
      expect(screen.getByText("alice@example.com")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /modifier l.email/i }));

    const input = screen.getByPlaceholderText("nouveau@email.com");
    fireEvent.change(input, { target: { value: "nouvelle@example.com" } });

    fireEvent.click(screen.getByRole("button", { name: /envoyer le lien/i }));

    await waitFor(() =>
      expect(
        screen.getByText(/lien de confirmation a ete envoye/i),
      ).toBeInTheDocument(),
    );

    const changeCalls = fetchSpy.mock.calls.filter(([url]) =>
      String(url).includes("/me/request-email-change"),
    );
    expect(changeCalls).toHaveLength(1);
    const body = JSON.parse(
      String((changeCalls[0][1] as RequestInit)?.body ?? "{}"),
    ) as { email: string };
    expect(body.email).toBe("nouvelle@example.com");
  });

  it("affiche l'erreur API en cas d'échec", async () => {
    const fetchSpy = mockFetchForAccount();

    fetchSpy.mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/me")) return Promise.resolve(mockMeWithEmail());
      if (url.includes("/me/request-email-change"))
        return Promise.resolve(
          new Response(
            JSON.stringify({
              message: "Cette adresse email est deja utilisee.",
            }),
            { status: 403, headers: { "Content-Type": "application/json" } },
          ),
        );
      if (url.endsWith("/auth/recovery/options"))
        return Promise.resolve(
          new Response(
            JSON.stringify({
              questions: [],
              classes: [],
              students: [],
              selectedQuestions: [],
              birthDate: "",
              parentClassId: null,
              parentStudentId: null,
              schoolRoles: [],
            }),
            { status: 200 },
          ),
        );
      return Promise.resolve(new Response("{}", { status: 200 }));
    });

    render(<AccountPage />);

    await waitFor(() =>
      expect(screen.getByText("alice@example.com")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /modifier l.email/i }));
    fireEvent.change(screen.getByPlaceholderText("nouveau@email.com"), {
      target: { value: "taken@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /envoyer le lien/i }));

    await waitFor(() =>
      expect(screen.getByText(/deja utilisee/i)).toBeInTheDocument(),
    );
  });

  it("n'affiche pas le bouton Modifier quand l'utilisateur n'a pas d'email", async () => {
    mockFetchForAccount({
      "/me": new Response(
        JSON.stringify({
          firstName: "Alice",
          lastName: "Test",
          email: null,
          role: "PARENT",
          schoolSlug: "test-school",
          hasPassword: false,
          hasPhoneCredential: true,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    });

    render(<AccountPage />);

    await waitFor(() =>
      expect(screen.getByText("Non renseigne")).toBeInTheDocument(),
    );

    expect(
      screen.queryByRole("button", { name: /modifier l.email/i }),
    ).not.toBeInTheDocument();
  });
});
