import type { FolderKey, MessagingMessage } from "./types";
import { getCsrfTokenCookie } from "../../lib/auth-cookies";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
const API_ORIGIN = API_URL.replace(/\/api\/?$/, "");

type UserSummary = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

type MessageListItemResponse = {
  id: string;
  folder: FolderKey;
  subject: string;
  preview: string;
  createdAt: string;
  unread: boolean;
  sender: UserSummary | null;
};

type MessageDetailResponse = {
  id: string;
  subject: string;
  body: string;
  status: "DRAFT" | "SENT";
  createdAt: string;
  sentAt: string | null;
  sender: UserSummary | null;
};

type ListMessagesResponse = {
  items: MessageListItemResponse[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type CreateMessagePayload = {
  subject: string;
  body: string;
  recipientUserIds: string[];
  isDraft?: boolean;
};

type ListMessagesParams = {
  folder: FolderKey;
  q?: string;
  page?: number;
  limit?: number;
};

function toDisplayDate(value?: string | null) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function senderLabel(sender: UserSummary | null) {
  if (!sender) {
    return "Moi";
  }
  return `${sender.lastName} ${sender.firstName}`.trim() || sender.email;
}

function splitBodyLines(body: string) {
  const plain = body
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  return plain.length > 0 ? plain : ["-"];
}

function mapListItemToUi(item: MessageListItemResponse): MessagingMessage {
  return {
    id: item.id,
    folder: item.folder,
    sender: senderLabel(item.sender),
    subject: item.subject,
    preview: item.preview,
    createdAt: toDisplayDate(item.createdAt),
    unread: item.unread,
    body: [item.preview || "-"],
    attachments: [],
  };
}

function mapDetailToUi(item: MessageDetailResponse): MessagingMessage {
  return {
    id: item.id,
    folder: "inbox",
    sender: senderLabel(item.sender),
    subject: item.subject,
    preview: item.body.replace(/<[^>]+>/g, " ").slice(0, 180),
    createdAt: toDisplayDate(item.sentAt ?? item.createdAt),
    unread: false,
    body: splitBodyLines(item.body),
    bodyHtml: item.body,
    attachments: [],
  };
}

export async function listSchoolMessages(
  schoolSlug: string,
  params: ListMessagesParams,
) {
  const query = new URLSearchParams({ folder: params.folder });
  if (params.q?.trim()) {
    query.set("q", params.q.trim());
  }
  if (params.page) {
    query.set("page", String(params.page));
  }
  if (params.limit) {
    query.set("limit", String(params.limit));
  }

  const response = await fetch(
    `${API_URL}/schools/${schoolSlug}/messages?${query.toString()}`,
    { credentials: "include" },
  );
  if (!response.ok) {
    throw new Error("MESSAGES_LIST_FAILED");
  }
  const payload = (await response.json()) as ListMessagesResponse;
  return {
    items: payload.items.map(mapListItemToUi),
    meta: payload.meta,
  };
}

export async function getSchoolMessage(schoolSlug: string, messageId: string) {
  const response = await fetch(
    `${API_URL}/schools/${schoolSlug}/messages/${messageId}`,
    { credentials: "include" },
  );
  if (!response.ok) {
    throw new Error("MESSAGE_DETAILS_FAILED");
  }
  const payload = (await response.json()) as MessageDetailResponse;
  return mapDetailToUi(payload);
}

export async function markSchoolMessageRead(
  schoolSlug: string,
  messageId: string,
  read = true,
) {
  const csrfToken = getCsrfTokenCookie();
  if (!csrfToken) {
    throw new Error("CSRF_TOKEN_MISSING");
  }
  const response = await fetch(
    `${API_URL}/schools/${schoolSlug}/messages/${messageId}/read`,
    {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
      body: JSON.stringify({ read }),
    },
  );
  if (!response.ok) {
    throw new Error("MARK_READ_FAILED");
  }
}

export async function createSchoolMessage(
  schoolSlug: string,
  payload: CreateMessagePayload,
) {
  const csrfToken = getCsrfTokenCookie();
  if (!csrfToken) {
    throw new Error("CSRF_TOKEN_MISSING");
  }
  const response = await fetch(`${API_URL}/schools/${schoolSlug}/messages`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message =
      typeof body?.message === "string"
        ? body.message
        : "CREATE_MESSAGE_FAILED";
    throw new Error(message);
  }
  return (await response.json()) as MessageDetailResponse;
}

export async function getSchoolMessagesUnreadCount(schoolSlug: string) {
  const response = await fetch(
    `${API_URL}/schools/${schoolSlug}/messages/unread-count`,
    {
      credentials: "include",
    },
  );
  if (!response.ok) {
    return 0;
  }
  const payload = (await response.json()) as { unread: number };
  return payload.unread ?? 0;
}

export async function archiveSchoolMessage(
  schoolSlug: string,
  messageId: string,
  archived: boolean,
) {
  const csrfToken = getCsrfTokenCookie();
  if (!csrfToken) {
    throw new Error("CSRF_TOKEN_MISSING");
  }
  const response = await fetch(
    `${API_URL}/schools/${schoolSlug}/messages/${messageId}/archive`,
    {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
      body: JSON.stringify({ archived }),
    },
  );

  if (!response.ok) {
    throw new Error("ARCHIVE_MESSAGE_FAILED");
  }
}

export async function deleteSchoolMessage(
  schoolSlug: string,
  messageId: string,
) {
  const csrfToken = getCsrfTokenCookie();
  if (!csrfToken) {
    throw new Error("CSRF_TOKEN_MISSING");
  }
  const response = await fetch(
    `${API_URL}/schools/${schoolSlug}/messages/${messageId}`,
    {
      method: "DELETE",
      credentials: "include",
      headers: {
        "X-CSRF-Token": csrfToken,
      },
    },
  );

  if (!response.ok) {
    throw new Error("DELETE_MESSAGE_FAILED");
  }
}

export async function uploadSchoolMessagingInlineImage(
  schoolSlug: string,
  file: File,
) {
  const csrfToken = getCsrfTokenCookie();
  if (!csrfToken) {
    throw new Error("CSRF_TOKEN_MISSING");
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(
    `${API_URL}/schools/${schoolSlug}/messages/uploads/inline-image`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "X-CSRF-Token": csrfToken,
      },
      body: formData,
    },
  );

  if (!response.ok) {
    throw new Error("INLINE_IMAGE_UPLOAD_FAILED");
  }

  const payload = (await response.json()) as { url: string };
  return payload.url.startsWith("http")
    ? payload.url
    : `${API_ORIGIN}${payload.url}`;
}
