import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SsoButtons } from "./sso-buttons";

const signInMock = vi.fn();

vi.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => signInMock(...args),
}));

describe("SsoButtons UI", () => {
  beforeEach(() => {
    signInMock.mockReset();
    vi.restoreAllMocks();
  });

  it("enables Google button when provider is available and calls signIn with callback", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          google: { id: "google", type: "oauth" },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    render(<SsoButtons schoolSlug="college-vogt" />);

    const googleButton = await screen.findByRole("button", {
      name: "Continuer avec Google",
    });

    await waitFor(() => {
      expect(googleButton).toBeEnabled();
    });

    fireEvent.click(googleButton);

    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledWith("google", {
        callbackUrl: "/auth/sso-callback?schoolSlug=college-vogt",
      });
    });
  });

  it("keeps Google button disabled when provider is missing", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    render(<SsoButtons />);

    const googleButton = await screen.findByRole("button", {
      name: "Continuer avec Google",
    });

    await waitFor(() => {
      expect(googleButton).toBeDisabled();
    });

    fireEvent.click(googleButton);
    expect(signInMock).not.toHaveBeenCalled();
  });
});
