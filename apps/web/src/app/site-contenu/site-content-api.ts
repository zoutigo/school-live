import { getCsrfTokenCookie } from "../../lib/auth-cookies";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export type ContactInfo = {
  email: string;
  phone: string;
  address: string;
  legalRepresentativeFirstName: string;
  legalRepresentativeLastName: string;
};

export type LegalDocumentStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export const LEGAL_DOCUMENT_SLUGS = [
  "cgu",
  "mentions-legales",
  "confidentialite",
] as const;
export type LegalDocumentSlug = (typeof LEGAL_DOCUMENT_SLUGS)[number];

export const LEGAL_DOCUMENT_LOCALES = ["fr", "en"] as const;
export type LegalDocumentLocale = (typeof LEGAL_DOCUMENT_LOCALES)[number];

export type LegalDocumentItem = {
  id: string;
  slug: LegalDocumentSlug;
  locale: LegalDocumentLocale;
  version: number;
  title: string;
  contentHtml: string;
  status: LegalDocumentStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ContactSubmission = {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  readAt: string | null;
  readById: string | null;
  createdAt: string;
};

export type ContactSubmissionsPage = {
  items: ContactSubmission[];
  total: number;
  page: number;
  limit: number;
};

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { credentials: "include" });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      message?: string | string[];
    };
    const message = Array.isArray(body.message)
      ? body.message.join(", ")
      : (body.message ?? `HTTP ${response.status}`);
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

async function mutate<T>(
  path: string,
  method: "PUT" | "POST" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<T> {
  const csrf = getCsrfTokenCookie();
  const response = await fetch(`${API_URL}${path}`, {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(csrf ? { "X-CSRF-Token": csrf } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      message?: string | string[];
    };
    const message = Array.isArray(payload.message)
      ? payload.message.join(", ")
      : (payload.message ?? `HTTP ${response.status}`);
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return response.json() as Promise<T>;
}

export const siteContentApi = {
  getContactInfo() {
    return getJson<ContactInfo>("/site-content/admin/contact");
  },

  updateContactInfo(payload: ContactInfo) {
    return mutate<ContactInfo>("/site-content/admin/contact", "PUT", payload);
  },

  listLegalDocuments(params: {
    slug: LegalDocumentSlug;
    locale: LegalDocumentLocale;
  }) {
    const query = new URLSearchParams({
      slug: params.slug,
      locale: params.locale,
    });
    return getJson<LegalDocumentItem[]>(
      `/site-content/admin/legal-documents?${query.toString()}`,
    );
  },

  createLegalDocument(payload: {
    slug: LegalDocumentSlug;
    locale: LegalDocumentLocale;
    title: string;
    contentHtml: string;
  }) {
    return mutate<LegalDocumentItem>(
      "/site-content/admin/legal-documents",
      "POST",
      payload,
    );
  },

  updateLegalDocument(
    id: string,
    payload: { title: string; contentHtml: string },
  ) {
    return mutate<LegalDocumentItem>(
      `/site-content/admin/legal-documents/${id}`,
      "PATCH",
      payload,
    );
  },

  publishLegalDocument(id: string) {
    return mutate<LegalDocumentItem>(
      `/site-content/admin/legal-documents/${id}/publish`,
      "POST",
    );
  },

  deleteLegalDocument(id: string) {
    return mutate<void>(`/site-content/admin/legal-documents/${id}`, "DELETE");
  },

  listContactSubmissions(params: { page: number; limit: number }) {
    const query = new URLSearchParams({
      page: String(params.page),
      limit: String(params.limit),
    });
    return getJson<ContactSubmissionsPage>(
      `/site-content/admin/contact-submissions?${query.toString()}`,
    );
  },

  getContactSubmission(id: string) {
    return getJson<ContactSubmission>(
      `/site-content/admin/contact-submissions/${id}`,
    );
  },
};
