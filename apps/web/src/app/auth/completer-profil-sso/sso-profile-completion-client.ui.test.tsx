import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SsoProfileCompletionClient } from "./sso-profile-completion-client";

const replaceMock = vi.fn();
const getSessionMock = vi.fn();
const signOutMock = vi.fn();
const routerMock = { replace: replaceMock };

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

vi.mock("next-auth/react", () => ({
  getSession: () => getSessionMock(),
  signOut: (...args: unknown[]) => signOutMock(...args),
}));

describe("SsoProfileCompletionClient UI", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    getSessionMock.mockReset();
    signOutMock.mockReset();
    vi.restoreAllMocks();
  });

  async function waitForProfileFormReady() {
    await waitFor(() => {
      expect(
        screen.getByText(
          "Champs manquants detectes: firstName, lastName, gender, phone",
        ),
      ).toBeInTheDocument();
    });
  }

  it("completes missing SSO profile then redirects to school dashboard", async () => {
    const user = userEvent.setup();
    getSessionMock.mockResolvedValue({
      user: {
        email: "sso.user@example.test",
        provider: "GOOGLE",
        providerAccountId: "google-123",
      },
    });

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes("/auth/sso/profile/options")) {
        return new Response(
          JSON.stringify({
            success: true,
            firstName: "",
            lastName: "",
            gender: null,
            phone: null,
            schoolSlug: "college-vogt",
            missingFields: ["firstName", "lastName", "gender", "phone"],
            needsProfileCompletion: true,
          }),
          {
            status: 201,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      if (url.includes("/auth/sso/profile/complete")) {
        return new Response(
          JSON.stringify({ success: true, schoolSlug: "college-vogt" }),
          {
            status: 201,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      if (url.includes("/auth/sso/login")) {
        return new Response(JSON.stringify({ accessToken: "token" }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.endsWith("/me")) {
        return new Response(
          JSON.stringify({ role: "PARENT", schoolSlug: "college-vogt" }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      return new Response("not-found", { status: 404 });
    });

    render(<SsoProfileCompletionClient schoolSlug="college-vogt" />);

    await waitForProfileFormReady();

    await user.type(screen.getByLabelText("Prenom"), "Aline");
    await user.type(screen.getByLabelText("Nom"), "Mbella");
    await user.type(screen.getByLabelText("Telephone"), "+237612345678");
    await user.type(screen.getByLabelText("PIN (6 chiffres)"), "123456");

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Finaliser mon profil" }),
      ).toBeEnabled();
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Finaliser mon profil" }),
    );

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith(
        "/schools/college-vogt/dashboard",
      );
    });
  });

  it("blocks submission when PIN is not 6 digits", async () => {
    const user = userEvent.setup();
    getSessionMock.mockResolvedValue({
      user: {
        email: "sso.user@example.test",
        provider: "GOOGLE",
        providerAccountId: "google-123",
      },
    });

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (input) => {
        const url = String(input);
        if (url.includes("/auth/sso/profile/options")) {
          return new Response(
            JSON.stringify({
              success: true,
              firstName: "",
              lastName: "",
              gender: null,
              phone: null,
              schoolSlug: "college-vogt",
              missingFields: ["firstName", "lastName", "gender", "phone"],
              needsProfileCompletion: true,
            }),
            {
              status: 201,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
        return new Response("not-found", { status: 404 });
      });

    render(<SsoProfileCompletionClient schoolSlug="college-vogt" />);

    await waitForProfileFormReady();

    expect(
      screen.queryByText("Le PIN doit contenir exactement 6 chiffres."),
    ).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Prenom"), "Aline");
    await user.type(screen.getByLabelText("Nom"), "Mbella");
    await user.type(screen.getByLabelText("Telephone"), "+237612345678");
    await user.type(screen.getByLabelText("PIN (6 chiffres)"), "12345");

    const submitButton = screen.getByRole("button", {
      name: "Finaliser mon profil",
    });

    await waitFor(() => {
      expect(
        screen.getByText("Le PIN doit contenir exactement 6 chiffres."),
      ).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining("/auth/sso/profile/complete"),
      expect.anything(),
    );
  });

  it("shows inline phone validation onChange and enables submit only when valid", async () => {
    const user = userEvent.setup();
    getSessionMock.mockResolvedValue({
      user: {
        email: "sso.user@example.test",
        provider: "GOOGLE",
        providerAccountId: "google-123",
      },
    });

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/auth/sso/profile/options")) {
        return new Response(
          JSON.stringify({
            success: true,
            firstName: "",
            lastName: "",
            gender: null,
            phone: null,
            schoolSlug: "college-vogt",
            missingFields: ["firstName", "lastName", "gender", "phone"],
            needsProfileCompletion: true,
          }),
          {
            status: 201,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
      return new Response("not-found", { status: 404 });
    });

    render(<SsoProfileCompletionClient schoolSlug="college-vogt" />);

    await waitForProfileFormReady();

    await user.type(screen.getByLabelText("Prenom"), "Aline");
    await user.type(screen.getByLabelText("Nom"), "Mbella");
    const phoneInput = screen.getByLabelText("Telephone");
    const pinInput = screen.getByLabelText("PIN (6 chiffres)");

    await user.type(phoneInput, "61234");

    const submitButton = screen.getByRole("button", {
      name: "Finaliser mon profil",
    });

    await waitFor(() => {
      expect(
        screen.getByText("Numero invalide (9 chiffres attendus)."),
      ).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    await user.clear(phoneInput);
    await user.type(phoneInput, "+237612345678");
    await user.type(pinInput, "123456");

    await waitFor(() => {
      expect(
        screen.queryByText("Numero invalide (9 chiffres attendus)."),
      ).not.toBeInTheDocument();
      expect(submitButton).toBeEnabled();
    });
  });
});
