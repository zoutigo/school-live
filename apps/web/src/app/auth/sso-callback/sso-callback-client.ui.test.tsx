import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SsoCallbackClient } from "./sso-callback-client";

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

describe("SsoCallbackClient UI", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    getSessionMock.mockReset();
    signOutMock.mockReset();
    vi.restoreAllMocks();
  });

  it("redirects to SSO profile completion when backend requires it", async () => {
    getSessionMock.mockResolvedValue({
      user: {
        email: "sso.user@example.test",
        provider: "GOOGLE",
        providerAccountId: "google-123",
      },
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          message: {
            code: "SSO_PROFILE_COMPLETION_REQUIRED",
            schoolSlug: "college-vogt",
          },
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    render(<SsoCallbackClient schoolSlug="college-vogt" />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith(
        "/auth/completer-profil-sso?email=sso.user%40example.test&provider=GOOGLE&providerAccountId=google-123&schoolSlug=college-vogt",
      );
    });

    expect(signOutMock).not.toHaveBeenCalled();
  });

  it("redirects to platform credentials setup when backend requires backup credentials", async () => {
    getSessionMock.mockResolvedValue({
      user: {
        email: "platform.user@example.test",
        provider: "GOOGLE",
        providerAccountId: "google-platform-123",
      },
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          message: {
            code: "PLATFORM_CREDENTIAL_SETUP_REQUIRED",
            schoolSlug: "college-vogt",
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

    render(<SsoCallbackClient schoolSlug="college-vogt" />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith(
        "/auth/completer-identifiants-platform?email=platform.user%40example.test&token=setup-token-123&schoolSlug=college-vogt&missing=PASSWORD%2CPHONE_PIN",
      );
    });
  });
});
