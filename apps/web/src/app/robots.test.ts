import { describe, expect, it } from "vitest";
import robots from "./robots";
import { SITE_URL } from "../lib/seo";

describe("robots", () => {
  it("allows crawling by default and points to the sitemap", () => {
    const result = robots();

    expect(result.sitemap).toBe(`${SITE_URL}/sitemap.xml`);
    expect(result.rules).toMatchObject({
      userAgent: "*",
      allow: "/",
    });
  });

  it("disallows authenticated / private app routes", () => {
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    const disallow = rules.disallow;

    expect(disallow).toEqual(
      expect.arrayContaining([
        "/dashboard",
        "/account",
        "/settings",
        "/schools",
        "/api/",
        "/auth/",
      ]),
    );
  });

  it("does not disallow the public marketing routes", () => {
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    const disallow = rules.disallow as string[];

    for (const publicRoute of [
      "/fonctionnalites",
      "/tarifs",
      "/blog",
      "/contact",
      "/cgu",
      "/confidentialite",
      "/mentions-legales",
    ]) {
      expect(disallow).not.toContain(publicRoute);
    }
  });
});
