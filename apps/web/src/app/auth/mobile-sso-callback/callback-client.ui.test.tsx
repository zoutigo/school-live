import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildMobileCallbackRedirect,
  MobileSsoCallbackClient,
} from "./callback-client";

const getSessionMock = vi.fn();
const signOutMock = vi.fn();
const replaceMock = vi.fn();

vi.mock("next-auth/react", () => ({
  getSession: (...args: unknown[]) => getSessionMock(...args),
  signOut: (...args: unknown[]) => signOutMock(...args),
}));

describe("MobileSsoCallbackClient", () => {
  beforeEach(() => {
    getSessionMock.mockReset();
    signOutMock.mockReset();
    replaceMock.mockReset();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...window.location,
        replace: replaceMock,
      },
    });
  });

  it("reconstruit correctement le deep link mobile", () => {
    expect(
      buildMobileCallbackRedirect({
        redirectUri: "scolive://auth/callback",
        schoolSlug: "college-vogt",
        provider: "GOOGLE",
        providerAccountId: "google-123",
        email: "sso.user@example.test",
        name: "Sso User",
        image: "https://example.test/avatar.png",
      }),
    ).toBe(
      "scolive://auth/callback?provider=GOOGLE&providerAccountId=google-123&email=sso.user%40example.test&firstName=Sso&lastName=User&avatarUrl=https%3A%2F%2Fexample.test%2Favatar.png&schoolSlug=college-vogt",
    );
  });

  it("redirige vers le deep link mobile quand la session SSO est complète", async () => {
    getSessionMock.mockResolvedValue({
      user: {
        email: "sso.user@example.test",
        name: "Sso User",
        image: "https://example.test/avatar.png",
        provider: "GOOGLE",
        providerAccountId: "google-123",
      },
    });
    signOutMock.mockResolvedValue(undefined);

    render(
      <MobileSsoCallbackClient
        redirectUri="scolive://auth/callback"
        schoolSlug="college-vogt"
      />,
    );

    await waitFor(() => {
      expect(signOutMock).toHaveBeenCalledWith({ redirect: false });
      expect(replaceMock).toHaveBeenCalledWith(
        "scolive://auth/callback?provider=GOOGLE&providerAccountId=google-123&email=sso.user%40example.test&firstName=Sso&lastName=User&avatarUrl=https%3A%2F%2Fexample.test%2Favatar.png&schoolSlug=college-vogt",
      );
    });
  });

  it("redirige avec une erreur quand la session SSO est incomplète", async () => {
    getSessionMock.mockResolvedValue({ user: { email: null } });

    render(<MobileSsoCallbackClient redirectUri="scolive://auth/callback" />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith(
        "scolive://auth/callback?error=GOOGLE_SSO_CALLBACK_FAILED&message=Session+SSO+incomplete",
      );
    });
  });
});
