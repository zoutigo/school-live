import { describe, expect, it } from "vitest";
import sitemap from "./sitemap";
import { SITE_URL } from "../lib/seo";

const BASE_PATHS = [
  "/",
  "/fonctionnalites",
  "/tarifs",
  "/blog",
  "/contact",
  "/cgu",
  "/confidentialite",
  "/mentions-legales",
];

describe("sitemap", () => {
  it("lists a French and an English entry for every public marketing route", () => {
    const entries = sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toContain(SITE_URL + "/");
    expect(urls).toContain(`${SITE_URL}/en`);
    for (const basePath of BASE_PATHS.slice(1)) {
      expect(urls).toContain(`${SITE_URL}${basePath}`);
      expect(urls).toContain(`${SITE_URL}/en${basePath}`);
    }
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("links each entry's French/English alternates together", () => {
    const entries = sitemap();
    const tarifsFr = entries.find(
      (entry) => entry.url === `${SITE_URL}/tarifs`,
    );
    const tarifsEn = entries.find(
      (entry) => entry.url === `${SITE_URL}/en/tarifs`,
    );

    expect(tarifsFr?.alternates?.languages).toEqual({
      fr: `${SITE_URL}/tarifs`,
      en: `${SITE_URL}/en/tarifs`,
    });
    expect(tarifsEn?.alternates?.languages).toEqual(
      tarifsFr?.alternates?.languages,
    );
  });

  it("gives the French homepage the highest priority and weekly refresh", () => {
    const [home] = sitemap();

    expect(home.url).toBe(SITE_URL + "/");
    expect(home.priority).toBe(1);
    expect(home.changeFrequency).toBe("weekly");
  });

  it("sets a lastModified date on every entry", () => {
    const entries = sitemap();

    for (const entry of entries) {
      expect(entry.lastModified).toBeInstanceOf(Date);
    }
  });
});
