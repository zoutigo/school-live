import { getCsrfTokenCookie } from "../../lib/auth-cookies";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export type HelpGuideAudience =
  | "PARENT"
  | "TEACHER"
  | "STUDENT"
  | "SCHOOL_ADMIN"
  | "STAFF";

export type HelpPublicationStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type HelpContentType = "RICH_TEXT" | "VIDEO";

export type HelpGuideItem = {
  id: string;
  schoolId: string | null;
  audience: HelpGuideAudience;
  title: string;
  slug: string;
  description: string | null;
  status: HelpPublicationStatus;
  chapterCount: number;
  createdAt: string;
  updatedAt: string;
};

export type HelpPlanNode = {
  id: string;
  title: string;
  slug: string;
  parentId: string | null;
  orderIndex: number;
  depth: number;
  contentType: HelpContentType;
  status: HelpPublicationStatus;
  children: HelpPlanNode[];
};

export type HelpChapterItem = {
  id: string;
  guideId: string;
  parentId: string | null;
  orderIndex: number;
  title: string;
  slug: string;
  summary: string | null;
  contentType: HelpContentType;
  contentHtml: string | null;
  contentJson: Record<string, unknown> | null;
  videoUrl: string | null;
  contentText: string;
  status: HelpPublicationStatus;
  createdAt: string;
  updatedAt: string;
  breadcrumb?: string[];
};

export type CurrentGuideResponse = {
  canManage: boolean;
  guide: HelpGuideItem | null;
  resolvedAudience: HelpGuideAudience;
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

export const helpGuidesApi = {
  getCurrent(params?: { guideId?: string; audience?: HelpGuideAudience }) {
    const query = new URLSearchParams();
    if (params?.guideId) query.set("guideId", params.guideId);
    if (params?.audience) query.set("audience", params.audience);
    return getJson<CurrentGuideResponse>(
      `/help-guides/current${query.toString() ? `?${query.toString()}` : ""}`,
    );
  },

  getPlan(params?: { guideId?: string; audience?: HelpGuideAudience }) {
    const query = new URLSearchParams();
    if (params?.guideId) query.set("guideId", params.guideId);
    if (params?.audience) query.set("audience", params.audience);
    return getJson<{ guide: HelpGuideItem | null; items: HelpPlanNode[] }>(
      `/help-guides/current/plan${query.toString() ? `?${query.toString()}` : ""}`,
    );
  },

  getChapter(
    chapterId: string,
    params?: { guideId?: string; audience?: HelpGuideAudience },
  ) {
    const query = new URLSearchParams();
    if (params?.guideId) query.set("guideId", params.guideId);
    if (params?.audience) query.set("audience", params.audience);

    return getJson<{ guide: HelpGuideItem | null; chapter: HelpChapterItem }>(
      `/help-guides/current/chapters/${chapterId}${query.toString() ? `?${query.toString()}` : ""}`,
    );
  },

  search(
    q: string,
    params?: { guideId?: string; audience?: HelpGuideAudience },
  ) {
    const query = new URLSearchParams();
    query.set("q", q);
    if (params?.guideId) query.set("guideId", params.guideId);
    if (params?.audience) query.set("audience", params.audience);

    return getJson<{ guide: HelpGuideItem | null; items: HelpChapterItem[] }>(
      `/help-guides/current/search?${query.toString()}`,
    );
  },

  listAdmin(params?: {
    audience?: HelpGuideAudience;
    status?: HelpPublicationStatus;
  }) {
    const query = new URLSearchParams();
    if (params?.audience) query.set("audience", params.audience);
    if (params?.status) query.set("status", params.status);
    return getJson<{ items: HelpGuideItem[] }>(
      `/help-guides/admin/guides${query.toString() ? `?${query.toString()}` : ""}`,
    );
  },

  createGuide(payload: {
    title: string;
    audience: HelpGuideAudience;
    status?: HelpPublicationStatus;
    description?: string;
    schoolId?: string;
  }) {
    return mutate<HelpGuideItem>("/help-guides/admin/guides", "POST", payload);
  },

  updateGuide(
    guideId: string,
    payload: Partial<{
      title: string;
      audience: HelpGuideAudience;
      status: HelpPublicationStatus;
      description: string;
      schoolId: string | null;
    }>,
  ) {
    return mutate<HelpGuideItem>(
      `/help-guides/admin/guides/${guideId}`,
      "PATCH",
      payload,
    );
  },

  deleteGuide(guideId: string) {
    return mutate<{ deleted: boolean }>(
      `/help-guides/admin/guides/${guideId}`,
      "DELETE",
    );
  },

  createChapter(
    guideId: string,
    payload: {
      title: string;
      parentId?: string;
      orderIndex?: number;
      summary?: string;
      contentType: HelpContentType;
      contentHtml?: string;
      contentJson?: Record<string, unknown>;
      videoUrl?: string;
      status?: HelpPublicationStatus;
    },
  ) {
    return mutate<HelpChapterItem>(
      `/help-guides/admin/guides/${guideId}/chapters`,
      "POST",
      payload,
    );
  },

  updateChapter(
    chapterId: string,
    payload: Partial<{
      title: string;
      parentId: string | null;
      orderIndex: number;
      summary: string;
      contentType: HelpContentType;
      contentHtml: string;
      contentJson: Record<string, unknown>;
      videoUrl: string;
      status: HelpPublicationStatus;
    }>,
  ) {
    return mutate<HelpChapterItem>(
      `/help-guides/admin/chapters/${chapterId}`,
      "PATCH",
      payload,
    );
  },

  deleteChapter(chapterId: string) {
    return mutate<{ deleted: boolean }>(
      `/help-guides/admin/chapters/${chapterId}`,
      "DELETE",
    );
  },

  async uploadInlineImage(file: File) {
    const csrf = getCsrfTokenCookie();
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(
      `${API_URL}/help-guides/admin/uploads/inline-image`,
      {
        method: "POST",
        credentials: "include",
        headers: csrf ? { "X-CSRF-Token": csrf } : {},
        body: formData,
      },
    );

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as {
        message?: string | string[];
      };
      const message = Array.isArray(payload.message)
        ? payload.message.join(", ")
        : (payload.message ?? `HTTP ${response.status}`);
      throw new Error(message);
    }

    const data = (await response.json()) as { url: string };
    return data.url;
  },

  async uploadInlineVideo(file: File) {
    const csrf = getCsrfTokenCookie();
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(
      `${API_URL}/help-guides/admin/uploads/inline-video`,
      {
        method: "POST",
        credentials: "include",
        headers: csrf ? { "X-CSRF-Token": csrf } : {},
        body: formData,
      },
    );

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as {
        message?: string | string[];
      };
      const message = Array.isArray(payload.message)
        ? payload.message.join(", ")
        : (payload.message ?? `HTTP ${response.status}`);
      throw new Error(message);
    }

    const data = (await response.json()) as { url: string };
    return data.url;
  },
};
