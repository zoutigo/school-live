import { getCsrfTokenCookie } from "../../lib/auth-cookies";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export type HelpFaqAudience =
  | "PARENT"
  | "TEACHER"
  | "STUDENT"
  | "SCHOOL_ADMIN"
  | "STAFF";

export type HelpPublicationStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type HelpFaqItem = {
  id: string;
  themeId: string;
  orderIndex: number;
  question: string;
  answerHtml: string;
  answerJson: Record<string, unknown> | null;
  answerText: string;
  status: HelpPublicationStatus;
  createdAt: string;
  updatedAt: string;
  themeTitle?: string;
};

export type HelpFaqTheme = {
  id: string;
  faqId: string;
  orderIndex: number;
  title: string;
  slug: string;
  description: string | null;
  status: HelpPublicationStatus;
  createdAt: string;
  updatedAt: string;
  items: HelpFaqItem[];
};

export type HelpFaq = {
  id: string;
  schoolId: string | null;
  schoolName: string | null;
  audience: HelpFaqAudience;
  title: string;
  slug: string;
  description: string | null;
  status: HelpPublicationStatus;
  themeCount: number;
  createdAt: string;
  updatedAt: string;
};

export type HelpFaqScopeType = "GLOBAL" | "SCHOOL";

export type HelpFaqSource = {
  key: string;
  scopeType: HelpFaqScopeType;
  scopeLabel: string;
  schoolId: string | null;
  schoolName: string | null;
  faq: HelpFaq;
};

export type HelpFaqSourceWithThemes = HelpFaqSource & {
  themes: HelpFaqTheme[];
};

export type CurrentHelpFaqResponse = {
  permissions: {
    canManageGlobal: boolean;
    canManageSchool: boolean;
  };
  schoolScope: {
    schoolId: string;
    schoolName: string;
  } | null;
  sources: HelpFaqSource[];
  defaultSourceKey: string | null;
  resolvedAudience: HelpFaqAudience;
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
  method: "POST" | "PATCH" | "DELETE",
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

export const helpFaqsApi = {
  getCurrent(params?: { faqId?: string; audience?: HelpFaqAudience }) {
    const query = new URLSearchParams();
    if (params?.faqId) query.set("faqId", params.faqId);
    if (params?.audience) query.set("audience", params.audience);
    return getJson<CurrentHelpFaqResponse>(
      `/help-faqs/current${query.toString() ? `?${query.toString()}` : ""}`,
    );
  },

  getThemes(params?: { faqId?: string; audience?: HelpFaqAudience }) {
    const query = new URLSearchParams();
    if (params?.faqId) query.set("faqId", params.faqId);
    if (params?.audience) query.set("audience", params.audience);
    return getJson<{ sources: HelpFaqSourceWithThemes[] }>(
      `/help-faqs/current/themes${query.toString() ? `?${query.toString()}` : ""}`,
    );
  },

  search(q: string, params?: { faqId?: string; audience?: HelpFaqAudience }) {
    const query = new URLSearchParams();
    query.set("q", q);
    if (params?.faqId) query.set("faqId", params.faqId);
    if (params?.audience) query.set("audience", params.audience);
    return getJson<{
      sources: HelpFaqSource[];
      items: Array<
        HelpFaqItem & {
          faqId: string;
          sourceKey: string;
          scopeType: HelpFaqScopeType;
          scopeLabel: string;
          schoolId: string | null;
          schoolName: string | null;
        }
      >;
    }>(`/help-faqs/current/search?${query.toString()}`);
  },

  listGlobalAdmin(params?: {
    audience?: HelpFaqAudience;
    status?: HelpPublicationStatus;
  }) {
    const query = new URLSearchParams();
    if (params?.audience) query.set("audience", params.audience);
    if (params?.status) query.set("status", params.status);
    return getJson<{ items: HelpFaq[] }>(
      `/help-faqs/admin/global/faqs${query.toString() ? `?${query.toString()}` : ""}`,
    );
  },

  listSchoolAdmin(params?: {
    audience?: HelpFaqAudience;
    status?: HelpPublicationStatus;
  }) {
    const query = new URLSearchParams();
    if (params?.audience) query.set("audience", params.audience);
    if (params?.status) query.set("status", params.status);
    return getJson<{ items: HelpFaq[] }>(
      `/help-faqs/admin/school/faqs${query.toString() ? `?${query.toString()}` : ""}`,
    );
  },

  createGlobalFaq(payload: {
    title: string;
    audience: HelpFaqAudience;
    status?: HelpPublicationStatus;
    description?: string;
  }) {
    return mutate<HelpFaq>("/help-faqs/admin/global/faqs", "POST", payload);
  },

  createSchoolFaq(payload: {
    title: string;
    audience: HelpFaqAudience;
    status?: HelpPublicationStatus;
    description?: string;
  }) {
    return mutate<HelpFaq>("/help-faqs/admin/school/faqs", "POST", payload);
  },

  updateGlobalFaq(
    faqId: string,
    payload: Partial<{
      title: string;
      audience: HelpFaqAudience;
      status: HelpPublicationStatus;
      description: string;
    }>,
  ) {
    return mutate<HelpFaq>(
      `/help-faqs/admin/global/faqs/${faqId}`,
      "PATCH",
      payload,
    );
  },

  updateSchoolFaq(
    faqId: string,
    payload: Partial<{
      title: string;
      audience: HelpFaqAudience;
      status: HelpPublicationStatus;
      description: string;
    }>,
  ) {
    return mutate<HelpFaq>(
      `/help-faqs/admin/school/faqs/${faqId}`,
      "PATCH",
      payload,
    );
  },

  deleteGlobalFaq(faqId: string) {
    return mutate<{ deleted: boolean }>(
      `/help-faqs/admin/global/faqs/${faqId}`,
      "DELETE",
    );
  },

  deleteSchoolFaq(faqId: string) {
    return mutate<{ deleted: boolean }>(
      `/help-faqs/admin/school/faqs/${faqId}`,
      "DELETE",
    );
  },

  createGlobalTheme(
    faqId: string,
    payload: {
      title: string;
      orderIndex?: number;
      description?: string;
      status?: HelpPublicationStatus;
    },
  ) {
    return mutate<HelpFaqTheme>(
      `/help-faqs/admin/global/faqs/${faqId}/themes`,
      "POST",
      payload,
    );
  },

  createSchoolTheme(
    faqId: string,
    payload: {
      title: string;
      orderIndex?: number;
      description?: string;
      status?: HelpPublicationStatus;
    },
  ) {
    return mutate<HelpFaqTheme>(
      `/help-faqs/admin/school/faqs/${faqId}/themes`,
      "POST",
      payload,
    );
  },

  updateGlobalTheme(
    themeId: string,
    payload: Partial<{
      title: string;
      orderIndex: number;
      description: string;
      status: HelpPublicationStatus;
    }>,
  ) {
    return mutate<HelpFaqTheme>(
      `/help-faqs/admin/global/themes/${themeId}`,
      "PATCH",
      payload,
    );
  },

  updateSchoolTheme(
    themeId: string,
    payload: Partial<{
      title: string;
      orderIndex: number;
      description: string;
      status: HelpPublicationStatus;
    }>,
  ) {
    return mutate<HelpFaqTheme>(
      `/help-faqs/admin/school/themes/${themeId}`,
      "PATCH",
      payload,
    );
  },

  deleteGlobalTheme(themeId: string) {
    return mutate<{ deleted: boolean }>(
      `/help-faqs/admin/global/themes/${themeId}`,
      "DELETE",
    );
  },

  deleteSchoolTheme(themeId: string) {
    return mutate<{ deleted: boolean }>(
      `/help-faqs/admin/school/themes/${themeId}`,
      "DELETE",
    );
  },

  createGlobalItem(
    themeId: string,
    payload: {
      question: string;
      orderIndex?: number;
      answerHtml: string;
      answerJson?: Record<string, unknown>;
      status?: HelpPublicationStatus;
    },
  ) {
    return mutate<HelpFaqItem>(
      `/help-faqs/admin/global/themes/${themeId}/items`,
      "POST",
      payload,
    );
  },

  createSchoolItem(
    themeId: string,
    payload: {
      question: string;
      orderIndex?: number;
      answerHtml: string;
      answerJson?: Record<string, unknown>;
      status?: HelpPublicationStatus;
    },
  ) {
    return mutate<HelpFaqItem>(
      `/help-faqs/admin/school/themes/${themeId}/items`,
      "POST",
      payload,
    );
  },

  updateGlobalItem(
    itemId: string,
    payload: Partial<{
      question: string;
      orderIndex: number;
      answerHtml: string;
      answerJson: Record<string, unknown>;
      status: HelpPublicationStatus;
    }>,
  ) {
    return mutate<HelpFaqItem>(
      `/help-faqs/admin/global/items/${itemId}`,
      "PATCH",
      payload,
    );
  },

  updateSchoolItem(
    itemId: string,
    payload: Partial<{
      question: string;
      orderIndex: number;
      answerHtml: string;
      answerJson: Record<string, unknown>;
      status: HelpPublicationStatus;
    }>,
  ) {
    return mutate<HelpFaqItem>(
      `/help-faqs/admin/school/items/${itemId}`,
      "PATCH",
      payload,
    );
  },

  deleteGlobalItem(itemId: string) {
    return mutate<{ deleted: boolean }>(
      `/help-faqs/admin/global/items/${itemId}`,
      "DELETE",
    );
  },

  deleteSchoolItem(itemId: string) {
    return mutate<{ deleted: boolean }>(
      `/help-faqs/admin/school/items/${itemId}`,
      "DELETE",
    );
  },
};
