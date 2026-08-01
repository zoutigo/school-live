import { describe, expect, it } from "vitest";
import { buildMetadata, localizedPath, SITE_NAME, SITE_URL } from "./seo";

describe("localizedPath", () => {
  it("leaves the French path unprefixed", () => {
    expect(localizedPath("fr", "/tarifs")).toBe("/tarifs");
    expect(localizedPath("fr", "/")).toBe("/");
  });

  it("prefixes the English path with /en", () => {
    expect(localizedPath("en", "/tarifs")).toBe("/en/tarifs");
    expect(localizedPath("en", "/")).toBe("/en");
  });
});

describe("buildMetadata", () => {
  it("sets title, description and canonical from the French basePath by default", () => {
    const metadata = buildMetadata({
      title: "Tarifs — Scolive",
      description: "Des offres adaptées à votre établissement.",
      basePath: "/tarifs",
    });

    expect(metadata.title).toBe("Tarifs — Scolive");
    expect(metadata.description).toBe(
      "Des offres adaptées à votre établissement.",
    );
    expect(metadata.alternates?.canonical).toBe(`${SITE_URL}/tarifs`);
  });

  it("switches the canonical to the /en URL when locale is en", () => {
    const metadata = buildMetadata({
      title: "Pricing — Scolive",
      description: "Plans that fit your school.",
      basePath: "/tarifs",
      locale: "en",
    });

    expect(metadata.alternates?.canonical).toBe(`${SITE_URL}/en/tarifs`);
  });

  it("always links both hreflang variants plus x-default to the French URL", () => {
    const metadataFr = buildMetadata({
      title: "Tarifs — Scolive",
      description: "Des offres adaptées à votre établissement.",
      basePath: "/tarifs",
    });
    const metadataEn = buildMetadata({
      title: "Pricing — Scolive",
      description: "Plans that fit your school.",
      basePath: "/tarifs",
      locale: "en",
    });

    for (const metadata of [metadataFr, metadataEn]) {
      expect(metadata.alternates?.languages).toEqual({
        fr: `${SITE_URL}/tarifs`,
        en: `${SITE_URL}/en/tarifs`,
        "x-default": `${SITE_URL}/tarifs`,
      });
    }
  });

  it("defaults basePath to the site root when omitted", () => {
    const metadata = buildMetadata({
      title: "Scolive",
      description: "Plateforme scolaire.",
    });

    expect(metadata.alternates?.canonical).toBe(`${SITE_URL}/`);
  });

  it("mirrors title, description and canonical url into openGraph, with the right og:locale", () => {
    const metadata = buildMetadata({
      title: "Contact — Scolive",
      description: "Contactez l'équipe Scolive.",
      basePath: "/contact",
      locale: "en",
    });

    expect(metadata.openGraph).toMatchObject({
      type: "website",
      locale: "en_US",
      siteName: SITE_NAME,
      url: `${SITE_URL}/en/contact`,
      title: "Contact — Scolive",
      description: "Contactez l'équipe Scolive.",
    });
    expect(metadata.openGraph?.images).toEqual([
      {
        url: "/images/camer-school1.png",
        width: 1200,
        height: 630,
        alt: SITE_NAME,
      },
    ]);
  });

  it("sets a summary_large_image Twitter card mirroring title and description", () => {
    const metadata = buildMetadata({
      title: "CGU — Scolive",
      description: "Conditions générales d'utilisation.",
      basePath: "/cgu",
    });

    expect(metadata.twitter).toEqual({
      card: "summary_large_image",
      title: "CGU — Scolive",
      description: "Conditions générales d'utilisation.",
      images: ["/images/camer-school1.png"],
    });
  });
});
