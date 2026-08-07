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
  addressStreet: string;
  addressDistrict: string;
  addressCity: string;
  addressCountry: string;
  legalRepresentativeFirstName: string;
  legalRepresentativeLastName: string;
};

export type PublicLegalDocument = {
  slug: string;
  locale: string;
  title: string;
  contentHtml: string;
  updatedAt: string;
};

// Filet de sécurité build-time : si l'API est injoignable pendant le build
// statique (ex. job CI "web" qui build sans API en cours d'exécution), le
// fetch échoue avec ECONNREFUSED et ferait échouer tout le build. Le vrai
// contenu (ou le fallback serveur si la base est vide) est récupéré
// normalement en production grâce au revalidate ISR.
const BUILD_TIME_CONTACT_FALLBACK: PublicContactInfo = {
  email: "contact@scolive.cm",
  phone: "+237 6XX XXX XXX",
  addressStreet: "",
  addressDistrict: "",
  addressCity: "",
  addressCountry: "Cameroun",
  legalRepresentativeFirstName: "",
  legalRepresentativeLastName: "",
};

const LEGAL_FALLBACK_TITLES: Record<string, { fr: string; en: string }> = {
  cgu: { fr: "Conditions générales d'utilisation", en: "Terms of Service" },
  "mentions-legales": { fr: "Mentions légales", en: "Legal Notice" },
  confidentialite: {
    fr: "Politique de confidentialité",
    en: "Privacy Policy",
  },
};

const LEGAL_FALLBACK_BODY: Record<"fr" | "en", string> = {
  fr: "<p>Ce contenu est en cours de rédaction. Contactez-nous pour toute question.</p>",
  en: "<p>This content is being drafted. Contact us with any question.</p>",
};

function buildTimeLegalFallback(
  slug: string,
  locale: MarketingLocale,
): PublicLegalDocument {
  const localeKey = locale === "en" ? "en" : "fr";
  return {
    slug,
    locale,
    title: LEGAL_FALLBACK_TITLES[slug]?.[localeKey] ?? slug,
    contentHtml: LEGAL_FALLBACK_BODY[localeKey],
    updatedAt: new Date(0).toISOString(),
  };
}

export function formatPublicAddress(contact: PublicContactInfo): string {
  return [
    contact.addressStreet,
    contact.addressDistrict,
    contact.addressCity,
    contact.addressCountry,
  ]
    .filter((part) => part.trim().length > 0)
    .join(", ");
}

export async function getPublicContactInfo(): Promise<PublicContactInfo> {
  try {
    const response = await fetch(`${API_URL}/public/site-content/contact`, {
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!response.ok) {
      return BUILD_TIME_CONTACT_FALLBACK;
    }
    const data = (await response.json()) as Partial<PublicContactInfo>;
    if (typeof data.email !== "string" || typeof data.phone !== "string") {
      return BUILD_TIME_CONTACT_FALLBACK;
    }
    return {
      email: data.email,
      phone: data.phone,
      addressStreet: data.addressStreet ?? "",
      addressDistrict: data.addressDistrict ?? "",
      addressCity: data.addressCity ?? "",
      addressCountry: data.addressCountry ?? "",
      legalRepresentativeFirstName: data.legalRepresentativeFirstName ?? "",
      legalRepresentativeLastName: data.legalRepresentativeLastName ?? "",
    };
  } catch {
    return BUILD_TIME_CONTACT_FALLBACK;
  }
}

export async function getPublicLegalDocument(
  slug: string,
  locale: MarketingLocale,
): Promise<PublicLegalDocument> {
  try {
    const response = await fetch(
      `${API_URL}/public/site-content/legal/${slug}/${locale}`,
      { next: { revalidate: REVALIDATE_SECONDS } },
    );
    if (!response.ok) {
      return buildTimeLegalFallback(slug, locale);
    }
    const data = (await response.json()) as Partial<PublicLegalDocument>;
    if (
      typeof data.contentHtml !== "string" ||
      typeof data.updatedAt !== "string" ||
      Number.isNaN(new Date(data.updatedAt).getTime())
    ) {
      return buildTimeLegalFallback(slug, locale);
    }
    return {
      slug,
      locale,
      title: data.title ?? buildTimeLegalFallback(slug, locale).title,
      contentHtml: data.contentHtml,
      updatedAt: data.updatedAt,
    };
  } catch {
    return buildTimeLegalFallback(slug, locale);
  }
}
