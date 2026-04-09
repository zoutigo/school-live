import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MobileSsoStartClient } from "./start-client";

const signInMock = vi.fn();

vi.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => signInMock(...args),
}));

describe("MobileSsoStartClient", () => {
  beforeEach(() => {
    signInMock.mockReset();
  });

  it("démarre Google avec le callback mobile attendu", async () => {
    signInMock.mockResolvedValue(undefined);

    render(
      <MobileSsoStartClient
        redirectUri="scolive://auth/callback"
        schoolSlug="college-vogt"
        webBaseUrl="http://10.0.2.2:3000"
      />,
    );

    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledWith("google", {
        callbackUrl:
          "http://10.0.2.2:3000/auth/mobile-sso-callback?redirectUri=scolive%3A%2F%2Fauth%2Fcallback&schoolSlug=college-vogt",
      });
    });
  });
});
