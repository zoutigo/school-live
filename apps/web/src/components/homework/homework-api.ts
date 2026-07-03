import { getCsrfTokenCookie } from "../../lib/auth-cookies";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

function csrfHeaders(
  headers: Record<string, string> = {},
): Record<string, string> {
  const token = getCsrfTokenCookie();
  return token ? { ...headers, "x-csrf-token": token } : headers;
}

export type HomeworkAttachment = {
  id?: string;
  fileName: string;
  fileUrl?: string | null;
  sizeLabel?: string | null;
  mimeType?: string | null;
};

export type HomeworkComment = {
  id: string;
  authorUserId: string;
  authorDisplayName: string;
  authorRole?: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
  mine?: boolean;
};

export type HomeworkCompletionStatus = {
  studentId: string;
  firstName: string;
  lastName: string;
  doneAt?: string | null;
};

export type HomeworkSummary = {
  totalStudents: number;
  doneStudents: number;
  pendingStudents: number;
};

export type HomeworkRow = {
  id: string;
  classId: string;
  title: string;
  contentHtml?: string | null;
  expectedAt: string;
  createdAt: string;
  updatedAt: string;
  authorUserId: string;
  authorDisplayName: string;
  subject: { id: string; name: string; colorHex?: string | null };
  attachments: HomeworkAttachment[];
  commentsCount: number;
  summary?: HomeworkSummary | null;
  myDoneAt?: string | null;
};

export type HomeworkDetail = HomeworkRow & {
  comments: HomeworkComment[];
  completionStatuses: HomeworkCompletionStatus[];
};

export type CreateHomeworkPayload = {
  subjectId: string;
  title: string;
  contentHtml?: string;
  expectedAt: string;
  attachments?: HomeworkAttachment[];
};

export type UpdateHomeworkPayload = Partial<CreateHomeworkPayload>;

async function throwIfError(response: Response, fallback: string) {
  if (response.ok) return;
  const payload = (await response.json().catch(() => null)) as {
    message?: string | string[];
  } | null;
  const message = Array.isArray(payload?.message)
    ? payload.message.join(", ")
    : typeof payload?.message === "string"
      ? payload.message
      : fallback;
  throw new Error(message);
}

export async function listClassHomework(
  schoolSlug: string,
  classId: string,
  params: { fromDate?: string; toDate?: string; studentId?: string } = {},
): Promise<HomeworkRow[]> {
  const query = new URLSearchParams();
  if (params.fromDate) query.set("fromDate", params.fromDate);
  if (params.toDate) query.set("toDate", params.toDate);
  if (params.studentId) query.set("studentId", params.studentId);
  const qs = query.toString() ? `?${query.toString()}` : "";

  const response = await fetch(
    `${API_URL}/schools/${schoolSlug}/classes/${classId}/homework${qs}`,
    { credentials: "include" },
  );
  await throwIfError(response, "HOMEWORK_LIST_FAILED");
  return (await response.json()) as HomeworkRow[];
}

export async function getHomeworkDetail(
  schoolSlug: string,
  classId: string,
  homeworkId: string,
  studentId?: string,
): Promise<HomeworkDetail> {
  const query = studentId ? `?studentId=${studentId}` : "";
  const response = await fetch(
    `${API_URL}/schools/${schoolSlug}/classes/${classId}/homework/${homeworkId}${query}`,
    { credentials: "include" },
  );
  await throwIfError(response, "HOMEWORK_DETAIL_FAILED");
  return (await response.json()) as HomeworkDetail;
}

export async function createHomework(
  schoolSlug: string,
  classId: string,
  payload: CreateHomeworkPayload,
): Promise<HomeworkRow> {
  const response = await fetch(
    `${API_URL}/schools/${schoolSlug}/classes/${classId}/homework`,
    {
      method: "POST",
      credentials: "include",
      headers: csrfHeaders({ "content-type": "application/json" }),
      body: JSON.stringify(payload),
    },
  );
  await throwIfError(response, "HOMEWORK_CREATE_FAILED");
  return (await response.json()) as HomeworkRow;
}

export async function updateHomework(
  schoolSlug: string,
  classId: string,
  homeworkId: string,
  payload: UpdateHomeworkPayload,
): Promise<HomeworkRow> {
  const response = await fetch(
    `${API_URL}/schools/${schoolSlug}/classes/${classId}/homework/${homeworkId}`,
    {
      method: "PATCH",
      credentials: "include",
      headers: csrfHeaders({ "content-type": "application/json" }),
      body: JSON.stringify(payload),
    },
  );
  await throwIfError(response, "HOMEWORK_UPDATE_FAILED");
  return (await response.json()) as HomeworkRow;
}

export async function deleteHomework(
  schoolSlug: string,
  classId: string,
  homeworkId: string,
): Promise<void> {
  const response = await fetch(
    `${API_URL}/schools/${schoolSlug}/classes/${classId}/homework/${homeworkId}`,
    {
      method: "DELETE",
      credentials: "include",
      headers: csrfHeaders(),
    },
  );
  await throwIfError(response, "HOMEWORK_DELETE_FAILED");
}

export async function addComment(
  schoolSlug: string,
  classId: string,
  homeworkId: string,
  payload: { body: string; studentId?: string },
): Promise<HomeworkDetail> {
  const response = await fetch(
    `${API_URL}/schools/${schoolSlug}/classes/${classId}/homework/${homeworkId}/comments`,
    {
      method: "POST",
      credentials: "include",
      headers: csrfHeaders({ "content-type": "application/json" }),
      body: JSON.stringify(payload),
    },
  );
  await throwIfError(response, "HOMEWORK_COMMENT_FAILED");
  return (await response.json()) as HomeworkDetail;
}

export async function setCompletion(
  schoolSlug: string,
  classId: string,
  homeworkId: string,
  payload: { done: boolean; studentId?: string },
): Promise<HomeworkDetail> {
  const response = await fetch(
    `${API_URL}/schools/${schoolSlug}/classes/${classId}/homework/${homeworkId}/completion`,
    {
      method: "PATCH",
      credentials: "include",
      headers: csrfHeaders({ "content-type": "application/json" }),
      body: JSON.stringify(payload),
    },
  );
  await throwIfError(response, "HOMEWORK_COMPLETION_FAILED");
  return (await response.json()) as HomeworkDetail;
}

export async function uploadHomeworkInlineImage(
  schoolSlug: string,
  file: File,
): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(
    `${API_URL}/schools/${schoolSlug}/homework/uploads/inline-image`,
    {
      method: "POST",
      credentials: "include",
      headers: csrfHeaders(),
      body: formData,
    },
  );
  await throwIfError(response, "HOMEWORK_INLINE_IMAGE_UPLOAD_FAILED");
  const payload = (await response.json()) as { url: string };
  return payload.url;
}

export async function uploadHomeworkAttachment(
  schoolSlug: string,
  file: File,
): Promise<HomeworkAttachment> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(
    `${API_URL}/schools/${schoolSlug}/homework/uploads/attachment`,
    {
      method: "POST",
      credentials: "include",
      headers: csrfHeaders(),
      body: formData,
    },
  );
  await throwIfError(response, "HOMEWORK_ATTACHMENT_UPLOAD_FAILED");
  const payload = (await response.json()) as {
    url?: string;
    fileUrl?: string;
    mimeType?: string;
  };
  return {
    fileName: file.name,
    fileUrl: payload.fileUrl ?? payload.url ?? null,
    mimeType: (payload.mimeType ?? file.type) || null,
    sizeLabel: file.size ? `${Math.round(file.size / 1024)} Ko` : null,
  };
}
