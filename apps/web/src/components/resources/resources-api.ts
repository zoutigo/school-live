import { getCsrfTokenCookie } from "../../lib/auth-cookies";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

function csrfHeaders(
  headers: Record<string, string> = {},
): Record<string, string> {
  const token = getCsrfTokenCookie();
  return token ? { ...headers, "x-csrf-token": token } : headers;
}

export type ResourceKind = "ASSESSMENT" | "EXAM";
export type ResourceExamType = "SEQUENCE_TEST" | "POP_QUIZ" | "MOCK_EXAM";
export type ResourceSequence =
  | "SEQ_1"
  | "SEQ_2"
  | "SEQ_3"
  | "SEQ_4"
  | "SEQ_5"
  | "SEQ_6";
export type ResourceApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";
export type ResourceSubmissionStatus =
  | "DRAFT"
  | "AWAITING"
  | "APPROVED"
  | "REJECTED"
  | "DISCARDED";
export type ResourceSubmissionPart = "statement" | "correction";

export type Cycle = { id: string; code: string; label: string };
export type AcademicLevel = {
  id: string;
  code: string;
  label: string;
  cycleId: string;
  languageSystem: string | null;
};
export type Track = { id: string; code: string; label: string };
export type Curriculum = {
  id: string;
  academicLevelId: string;
  trackId: string | null;
};
export type CurriculumSubject = { curriculumId: string; subjectId: string };
export type Subject = { id: string; code: string; name: string };

export type ResourceCatalog = {
  cycles: Cycle[];
  academicLevels: AcademicLevel[];
  tracks: Track[];
  curriculums: Curriculum[];
  curriculumSubjects: CurriculumSubject[];
  subjects: Subject[];
};

export type SchoolOption = { id: string; name: string };
export type SchoolSearchOption = {
  id: string;
  name: string;
  cycle: string | null;
  languageSystem: string | null;
};

export type ResourceAttachment = {
  id?: string;
  part?: "STATEMENT" | "CORRECTION";
  fileName: string;
  fileUrl?: string | null;
  sizeLabel?: string | null;
  mimeType?: string | null;
  submissionId?: string | null;
};

export type ResourceRow = {
  id: string;
  kind: ResourceKind;
  schoolId: string | null;
  academicLevelId: string;
  trackId: string | null;
  subjectId: string;
  examType: ResourceExamType;
  sequence: ResourceSequence | null;
  academicYearLabel: string;
  title: string;
  authorUserId: string;
  statementStatus: ResourceApprovalStatus;
  correctionContent: string | null;
  correctionStatus: ResourceApprovalStatus;
  createdAt: string;
  updatedAt: string;
  school: { id: string; name: string } | null;
  academicLevel: { id: string; code: string; label: string };
  track: { id: string; code: string; label: string } | null;
  subject: { id: string; name: string };
  authorUser: { id: string; firstName: string; lastName: string };
  isFavorite: boolean;
};

export type ResourceDetail = ResourceRow & {
  statementContent: string | null;
  attachments: ResourceAttachment[];
};

export type ResourceSubmission = {
  id: string;
  resourceId: string;
  part: "STATEMENT" | "CORRECTION";
  status: ResourceSubmissionStatus;
  content: string;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  authorUser: { id: string; firstName: string; lastName: string };
  attachments: ResourceAttachment[];
};

export type ListResponse<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};

export type CreateResourcePayload = {
  kind: ResourceKind;
  schoolId?: string;
  academicLevelId: string;
  trackId?: string;
  subjectId: string;
  examType: ResourceExamType;
  sequence?: ResourceSequence;
  academicYearLabel: string;
  title: string;
  confirmDuplicate?: boolean;
};

export type UpdateResourcePayload = Partial<
  Omit<CreateResourcePayload, "kind" | "confirmDuplicate">
>;

export type DuplicateCandidate = { title: string };

export class ResourceConflictError extends Error {
  candidates: DuplicateCandidate[];

  constructor(message: string, candidates: DuplicateCandidate[]) {
    super(message);
    this.name = "ResourceConflictError";
    this.candidates = candidates;
  }
}

async function throwIfError(response: Response, fallback: string) {
  if (response.ok) return;
  const payload = (await response.json().catch(() => null)) as {
    message?: string | string[];
    warning?: boolean;
    candidates?: DuplicateCandidate[];
  } | null;
  const message = Array.isArray(payload?.message)
    ? payload.message.join(", ")
    : typeof payload?.message === "string"
      ? payload.message
      : fallback;
  if (response.status === 409 && payload?.warning) {
    throw new ResourceConflictError(message, payload.candidates ?? []);
  }
  throw new Error(message);
}

export async function getCatalog(): Promise<ResourceCatalog> {
  const response = await fetch(`${API_URL}/resources/catalog`, {
    credentials: "include",
  });
  await throwIfError(response, "RESOURCES_CATALOG_FAILED");
  return (await response.json()) as ResourceCatalog;
}

export async function listSchoolsWithResources(): Promise<SchoolOption[]> {
  const response = await fetch(`${API_URL}/resources/schools`, {
    credentials: "include",
  });
  await throwIfError(response, "RESOURCES_SCHOOLS_FAILED");
  return (await response.json()) as SchoolOption[];
}

export async function searchSchools(q?: string): Promise<SchoolSearchOption[]> {
  const query = q ? `?q=${encodeURIComponent(q)}` : "";
  const response = await fetch(`${API_URL}/resources/schools/search${query}`, {
    credentials: "include",
  });
  await throwIfError(response, "RESOURCES_SCHOOLS_SEARCH_FAILED");
  return (await response.json()) as SchoolSearchOption[];
}

export async function listMyResources(
  kind?: ResourceKind,
): Promise<ListResponse<ResourceRow>> {
  const query = kind ? `?kind=${kind}` : "";
  const response = await fetch(`${API_URL}/resources/mine${query}`, {
    credentials: "include",
  });
  await throwIfError(response, "RESOURCES_MINE_FAILED");
  return (await response.json()) as ListResponse<ResourceRow>;
}

export async function getResource(resourceId: string): Promise<ResourceDetail> {
  const response = await fetch(`${API_URL}/resources/${resourceId}`, {
    credentials: "include",
  });
  await throwIfError(response, "RESOURCE_DETAIL_FAILED");
  return (await response.json()) as ResourceDetail;
}

export async function createResource(
  payload: CreateResourcePayload,
): Promise<ResourceRow> {
  const response = await fetch(`${API_URL}/resources`, {
    method: "POST",
    credentials: "include",
    headers: csrfHeaders({ "content-type": "application/json" }),
    body: JSON.stringify(payload),
  });
  await throwIfError(response, "RESOURCE_CREATE_FAILED");
  return (await response.json()) as ResourceRow;
}

export async function updateResource(
  resourceId: string,
  payload: UpdateResourcePayload,
): Promise<ResourceRow> {
  const response = await fetch(`${API_URL}/resources/${resourceId}`, {
    method: "PATCH",
    credentials: "include",
    headers: csrfHeaders({ "content-type": "application/json" }),
    body: JSON.stringify(payload),
  });
  await throwIfError(response, "RESOURCE_UPDATE_FAILED");
  return (await response.json()) as ResourceRow;
}

export async function listSubmissions(
  resourceId: string,
  part: ResourceSubmissionPart,
): Promise<ResourceSubmission[]> {
  const response = await fetch(
    `${API_URL}/resources/${resourceId}/submissions?part=${part}`,
    { credentials: "include" },
  );
  await throwIfError(response, "RESOURCE_SUBMISSIONS_FAILED");
  return (await response.json()) as ResourceSubmission[];
}

export async function saveSubmissionDraft(
  resourceId: string,
  part: ResourceSubmissionPart,
  payload: { content: string; attachments: ResourceAttachment[] },
): Promise<ResourceSubmission> {
  const response = await fetch(
    `${API_URL}/resources/${resourceId}/${part}/submissions`,
    {
      method: "POST",
      credentials: "include",
      headers: csrfHeaders({ "content-type": "application/json" }),
      body: JSON.stringify(payload),
    },
  );
  await throwIfError(response, "RESOURCE_SUBMISSION_SAVE_FAILED");
  return (await response.json()) as ResourceSubmission;
}

export async function submitSubmission(
  resourceId: string,
  submissionId: string,
): Promise<ResourceSubmission> {
  const response = await fetch(
    `${API_URL}/resources/${resourceId}/submissions/${submissionId}/submit`,
    {
      method: "PATCH",
      credentials: "include",
      headers: csrfHeaders(),
    },
  );
  await throwIfError(response, "RESOURCE_SUBMISSION_SUBMIT_FAILED");
  return (await response.json()) as ResourceSubmission;
}

export async function uploadInlineImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}/resources/uploads/inline-image`, {
    method: "POST",
    credentials: "include",
    headers: csrfHeaders(),
    body: formData,
  });
  await throwIfError(response, "RESOURCE_INLINE_IMAGE_UPLOAD_FAILED");
  const payload = (await response.json()) as { url: string };
  return payload.url;
}

export function currentAcademicYearLabel(now = new Date()): string {
  const year = now.getFullYear();
  return now.getMonth() >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

export function academicYearValues(): string[] {
  const [startYear] = currentAcademicYearLabel().split("-").map(Number);
  const years: string[] = [];
  for (let offset = -2; offset <= 1; offset += 1) {
    years.push(`${startYear + offset}-${startYear + offset + 1}`);
  }
  return years;
}

export async function uploadAttachment(
  file: File,
): Promise<ResourceAttachment> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}/resources/uploads/attachment`, {
    method: "POST",
    credentials: "include",
    headers: csrfHeaders(),
    body: formData,
  });
  await throwIfError(response, "RESOURCE_ATTACHMENT_UPLOAD_FAILED");
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
