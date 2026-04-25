export type TicketType = "BUG" | "FEATURE_REQUEST";

export type TicketStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "ANSWERED"
  | "RESOLVED"
  | "CLOSED";

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: "Ouvert",
  IN_PROGRESS: "En cours",
  ANSWERED: "Répondu",
  RESOLVED: "Résolu",
  CLOSED: "Fermé",
};

export const TICKET_TYPE_LABELS: Record<TicketType, string> = {
  BUG: "Bug",
  FEATURE_REQUEST: "Suggestion",
};

export type TicketFolderKey = "open" | "answered" | "resolved" | "all";

export type TicketFolder = {
  key: TicketFolderKey;
  label: string;
  statuses: TicketStatus[];
};

export const TICKET_FOLDERS: TicketFolder[] = [
  { key: "open", label: "En cours", statuses: ["OPEN", "IN_PROGRESS"] },
  { key: "answered", label: "Répondus", statuses: ["ANSWERED"] },
  { key: "resolved", label: "Résolus", statuses: ["RESOLVED", "CLOSED"] },
  { key: "all", label: "Tous", statuses: [] },
];

export interface TicketAuthor {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  email?: string | null;
}

export interface TicketAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface TicketVote {
  id: string;
  userId: string;
  user: TicketAuthor;
  createdAt: string;
}

export interface TicketResponse {
  id: string;
  body: string;
  isInternal: boolean;
  author: TicketAuthor;
  createdAt: string;
  updatedAt: string;
}

export interface TicketSchool {
  id: string;
  name: string;
  slug: string;
}

export interface TicketListItem {
  id: string;
  type: TicketType;
  status: TicketStatus;
  title: string;
  description: string;
  platform?: string | null;
  author: TicketAuthor;
  school?: TicketSchool | null;
  attachments: TicketAttachment[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
  _count: { votes: number; responses: number };
}

export interface TicketDetail extends Omit<TicketListItem, "_count"> {
  appVersion?: string | null;
  screenPath?: string | null;
  responses: TicketResponse[];
  votes: TicketVote[];
  _count: { votes: number };
}

export interface TicketsMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TicketsListResponse {
  data: TicketListItem[];
  meta: TicketsMeta;
}
