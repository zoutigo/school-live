import type { MarketingLocale } from "./seo";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

// Marketing pages are statically rendered (SEO-safe) and revalidated
// periodically instead of fetched on every request. The API-side fallback
// (see ContactInfoService/LegalDocumentsService) guarantees these fetches
// never return an empty page even before any admin edit exists.
const REVALIDATE_SECONDS = 3600;

export type PublicContactInfo = {
  email: string;
  phone: string;
  address: string;
};

export type PublicLegalDocument = {
  slug: string;
  locale: string;
  title: string;
  contentHtml: string;
  updatedAt: string;
};

export async function getPublicContactInfo(): Promise<PublicContactInfo> {
  const response = await fetch(`${API_URL}/public/site-content/contact`, {
    next: { revalidate: REVALIDATE_SECONDS },
  });
  return response.json() as Promise<PublicContactInfo>;
}

export async function getPublicLegalDocument(
  slug: string,
  locale: MarketingLocale,
): Promise<PublicLegalDocument> {
  const response = await fetch(
    `${API_URL}/public/site-content/legal/${slug}/${locale}`,
    { next: { revalidate: REVALIDATE_SECONDS } },
  );
  return response.json() as Promise<PublicLegalDocument>;
}
