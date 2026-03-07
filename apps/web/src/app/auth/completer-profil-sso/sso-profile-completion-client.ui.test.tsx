import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SsoProfileCompletionClient } from "./sso-profile-completion-client";

const replaceMock = vi.fn();
const getSessionMock = vi.fn();
const signOutMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
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

  it("completes missing SSO profile then redirects to school dashboard", async () => {
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

    await waitFor(() => {
      expect(screen.getByText("Completer votre profil")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Prenom"), {
      target: { value: "Aline" },
    });
    fireEvent.change(screen.getByLabelText("Nom"), {
      target: { value: "Mbella" },
    });
    fireEvent.change(screen.getByLabelText("Telephone"), {
      target: { value: "+237612345678" },
    });
    fireEvent.change(screen.getByLabelText("PIN (6 chiffres)"), {
      target: { value: "123456" },
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

    await waitFor(() => {
      expect(screen.getByText("Completer votre profil")).toBeInTheDocument();
    });

    expect(
      screen.queryByText("Le PIN doit contenir exactement 6 chiffres."),
    ).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Prenom"), {
      target: { value: "Aline" },
    });
    fireEvent.change(screen.getByLabelText("Nom"), {
      target: { value: "Mbella" },
    });
    fireEvent.change(screen.getByLabelText("Telephone"), {
      target: { value: "+237612345678" },
    });
    fireEvent.change(screen.getByLabelText("PIN (6 chiffres)"), {
      target: { value: "12345" },
    });

    expect(
      screen.getByText("Le PIN doit contenir exactement 6 chiffres."),
    ).toBeInTheDocument();

    const submitButton = screen.getByRole("button", {
      name: "Finaliser mon profil",
    });
    expect(submitButton).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining("/auth/sso/profile/complete"),
      expect.anything(),
    );
  });
});
