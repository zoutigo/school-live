import { afterEach, describe, expect, it } from "vitest";
import { buildAllowedRedirectOrigins, resolveAllowedRedirect } from "./auth";

const originalEnv = {
  AUTH_URL: process.env.AUTH_URL,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  WEB_URL: process.env.WEB_URL,
};

describe("resolveAllowedRedirect", () => {
  afterEach(() => {
    process.env.AUTH_URL = originalEnv.AUTH_URL;
    process.env.NEXTAUTH_URL = originalEnv.NEXTAUTH_URL;
    process.env.WEB_URL = originalEnv.WEB_URL;
  });

  it("autorise les callbacks relatifs", () => {
    expect(
      resolveAllowedRedirect(
        "/auth/mobile-sso-callback?redirectUri=scolive://auth/callback",
        "http://localhost:3000",
      ),
    ).toBe(
      "http://localhost:3000/auth/mobile-sso-callback?redirectUri=scolive://auth/callback",
    );
  });

  it("autorise explicitement l'origine Android emulator", () => {
    expect(
      resolveAllowedRedirect(
        "http://10.0.2.2:3000/auth/mobile-sso-callback?redirectUri=scolive://auth/callback",
        "http://localhost:3000",
      ),
    ).toBe(
      "http://10.0.2.2:3000/auth/mobile-sso-callback?redirectUri=scolive://auth/callback",
    );
  });

  it("refuse une origine externe non autorisée", () => {
    expect(
      resolveAllowedRedirect(
        "https://evil.example.com/auth/mobile-sso-callback",
        "http://localhost:3000",
      ),
    ).toBe("http://localhost:3000");
  });

  it("inclut les origines d'environnement quand elles existent", () => {
    process.env.AUTH_URL = "https://auth.scolive.test";
    process.env.NEXTAUTH_URL = "https://nextauth.scolive.test";
    process.env.WEB_URL = "https://web.scolive.test";

    const origins = buildAllowedRedirectOrigins("http://localhost:3000");

    expect(origins.has("https://auth.scolive.test")).toBe(true);
    expect(origins.has("https://nextauth.scolive.test")).toBe(true);
    expect(origins.has("https://web.scolive.test")).toBe(true);
  });
});
