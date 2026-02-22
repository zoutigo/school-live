import { getCsrfTokenCookie } from "../../lib/auth-cookies";
import type { FeedPost, FeedViewerRole } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type FeedAudienceScope =
  | "SCHOOL_ALL"
  | "STAFF_ONLY"
  | "PARENTS_STUDENTS"
  | "PARENTS_ONLY"
  | "LEVEL"
  | "CLASS";

type ApiFeedPost = {
  id: string;
  type: "POST" | "POLL";
  author: {
    id: string;
    fullName: string;
    civility?: "M." | "Mme" | "Mlle";
    roleLabel: string;
    avatarText: string;
  };
  title: string;
  bodyHtml: string;
  createdAt: string;
  featuredUntil: string | null;
  audience: {
    scope: FeedAudienceScope;
    label: string;
    levelId?: string;
    classId?: string;
  };
  attachments: Array<{
    id: string;
    fileName: string;
    fileUrl?: string | null;
    sizeLabel?: string;
  }>;
  likedByViewer: boolean;
  likesCount: number;
  authoredByViewer?: boolean;
  canManage?: boolean;
  comments: Array<{
    id: string;
    authorName: string;
    text: string;
    createdAt: string;
  }>;
  poll?: {
    question: string;
    options: Array<{ id: string; label: string; votes: number }>;
    votedOptionId: string | null;
  };
};

type ListFeedResponse = {
  items: ApiFeedPost[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type FeedListParams = {
  viewScope: "GENERAL" | "CLASS";
  classId?: string;
  levelId?: string;
  filter?: "all" | "featured" | "polls" | "mine";
  q?: string;
  page?: number;
  limit?: number;
};

type CreateFeedPayload = {
  type: "POST" | "POLL";
  title: string;
  bodyHtml: string;
  audienceScope: FeedAudienceScope;
  audienceLabel: string;
  audienceLevelId?: string;
  audienceClassId?: string;
  featuredDays?: number;
  pollQuestion?: string;
  pollOptions?: string[];
  attachments?: Array<{
    fileName: string;
    sizeLabel?: string;
    fileUrl?: string;
  }>;
};

type UpdateFeedPayload = CreateFeedPayload;

function toUiPost(post: ApiFeedPost, schoolSlug: string): FeedPost {
  return {
    id: post.id,
    type: post.type,
    schoolSlug,
    author: post.author,
    title: post.title,
    bodyHtml: post.bodyHtml,
    createdAt: post.createdAt,
    featuredUntil: post.featuredUntil,
    audience: post.audience,
    attachments: post.attachments.map((attachment) => ({
      id: attachment.id,
      fileName: attachment.fileName,
      fileUrl: attachment.fileUrl ?? undefined,
      sizeLabel: attachment.sizeLabel ?? "",
    })),
    likedByViewer: post.likedByViewer,
    likesCount: post.likesCount,
    authoredByViewer: post.authoredByViewer ?? false,
    canManage: post.canManage ?? false,
    comments: post.comments,
    poll: post.poll,
  };
}

function csrfHeaders() {
  const csrfToken = getCsrfTokenCookie();
  if (!csrfToken) {
    throw new Error("CSRF_TOKEN_MISSING");
  }
  return { "X-CSRF-Token": csrfToken };
}

export async function listFeedPosts(
  schoolSlug: string,
  params: FeedListParams,
) {
  const query = new URLSearchParams({
    viewScope: params.viewScope,
  });
  if (params.classId) query.set("classId", params.classId);
  if (params.levelId) query.set("levelId", params.levelId);
  if (params.filter && params.filter !== "mine")
    query.set("filter", params.filter);
  if (params.q?.trim()) query.set("q", params.q.trim());
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));

  const response = await fetch(
    `${API_URL}/schools/${schoolSlug}/feed?${query.toString()}`,
    {
      credentials: "include",
    },
  );

  if (!response.ok) {
    throw new Error("FEED_LIST_FAILED");
  }

  const payload = (await response.json()) as ListFeedResponse;
  return {
    ...payload,
    items: payload.items.map((post) => toUiPost(post, schoolSlug)),
  };
}

export async function createFeedPost(
  schoolSlug: string,
  payload: CreateFeedPayload,
) {
  const response = await fetch(`${API_URL}/schools/${schoolSlug}/feed`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...csrfHeaders(),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("FEED_CREATE_FAILED");
  }

  const post = (await response.json()) as ApiFeedPost;
  return toUiPost(post, schoolSlug);
}

export async function toggleFeedLike(schoolSlug: string, postId: string) {
  const response = await fetch(
    `${API_URL}/schools/${schoolSlug}/feed/${postId}/likes/toggle`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        ...csrfHeaders(),
      },
    },
  );

  if (!response.ok) {
    throw new Error("FEED_LIKE_FAILED");
  }

  return (await response.json()) as { liked: boolean; likesCount: number };
}

export async function addFeedComment(
  schoolSlug: string,
  postId: string,
  text: string,
) {
  const response = await fetch(
    `${API_URL}/schools/${schoolSlug}/feed/${postId}/comments`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...csrfHeaders(),
      },
      body: JSON.stringify({ text }),
    },
  );

  if (!response.ok) {
    throw new Error("FEED_COMMENT_FAILED");
  }

  return (await response.json()) as {
    comment: {
      id: string;
      authorName: string;
      text: string;
      createdAt: string;
    };
    commentsCount: number;
  };
}

export async function uploadFeedInlineImage(schoolSlug: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(
    `${API_URL}/schools/${schoolSlug}/feed/uploads/inline-image`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        ...csrfHeaders(),
      },
      body: formData,
    },
  );

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      message?: string | string[];
    } | null;
    const message: string =
      payload?.message && Array.isArray(payload.message)
        ? payload.message.join(", ")
        : typeof payload?.message === "string"
          ? payload.message
          : "FEED_INLINE_UPLOAD_FAILED";
    throw new Error(message);
  }

  const payload = (await response.json()) as { url: string };
  return payload.url;
}

export async function updateFeedPost(
  schoolSlug: string,
  postId: string,
  payload: UpdateFeedPayload,
) {
  const response = await fetch(
    `${API_URL}/schools/${schoolSlug}/feed/${postId}`,
    {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...csrfHeaders(),
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error("FEED_UPDATE_FAILED");
  }

  const post = (await response.json()) as ApiFeedPost;
  return toUiPost(post, schoolSlug);
}

export async function deleteFeedPost(schoolSlug: string, postId: string) {
  const response = await fetch(
    `${API_URL}/schools/${schoolSlug}/feed/${postId}`,
    {
      method: "DELETE",
      credentials: "include",
      headers: {
        ...csrfHeaders(),
      },
    },
  );

  if (!response.ok) {
    throw new Error("FEED_DELETE_FAILED");
  }
}

export function canUseBackendFeed(role: FeedViewerRole) {
  return Boolean(role);
}
