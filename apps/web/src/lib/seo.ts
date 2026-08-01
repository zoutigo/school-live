import type { Metadata } from "next";

export const SITE_URL = "https://scolive.cm";
export const SITE_NAME = "Scolive";

export type MarketingLocale = "fr" | "en";

const DEFAULT_OG_IMAGE = "/images/camer-school1.png";

/**
 * Builds the public path for a marketing page in the given locale.
 * French is the unprefixed default (matches the already-indexed URLs);
 * English is prefixed with /en. `basePath` is always the French path,
 * e.g. "/" or "/tarifs".
 */
export function localizedPath(
  locale: MarketingLocale,
  basePath: string,
): string {
  if (locale === "fr") return basePath;
  return basePath === "/" ? "/en" : `/en${basePath}`;
}

export function buildMetadata({
  title,
  description,
  basePath = "/",
  locale = "fr",
}: {
  title: string;
  description: string;
  basePath?: string;
  locale?: MarketingLocale;
}): Metadata {
  const frUrl = `${SITE_URL}${localizedPath("fr", basePath)}`;
  const enUrl = `${SITE_URL}${localizedPath("en", basePath)}`;
  const url = locale === "en" ? enUrl : frUrl;

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        fr: frUrl,
        en: enUrl,
        "x-default": frUrl,
      },
    },
    openGraph: {
      type: "website",
      locale: locale === "en" ? "en_US" : "fr_FR",
      siteName: SITE_NAME,
      url,
      title,
      description,
      images: [
        { url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: SITE_NAME },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [DEFAULT_OG_IMAGE],
    },
  };
}
