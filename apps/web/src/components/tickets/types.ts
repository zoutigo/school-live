import type { TranslateFn } from "../../i18n/useTranslation";

export type TicketType = "BUG" | "FEATURE_REQUEST";

export type TicketStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "ANSWERED"
  | "RESOLVED"
  | "CLOSED";

export function getTicketStatusLabels(
  t: TranslateFn,
): Record<TicketStatus, string> {
  return {
    OPEN: t("tickets.status.OPEN"),
    IN_PROGRESS: t("tickets.status.IN_PROGRESS"),
    ANSWERED: t("tickets.status.ANSWERED"),
    RESOLVED: t("tickets.status.RESOLVED"),
    CLOSED: t("tickets.status.CLOSED"),
  };
}

export function getTicketTypeLabels(
  t: TranslateFn,
): Record<TicketType, string> {
  return {
    BUG: t("tickets.type.BUG"),
    FEATURE_REQUEST: t("tickets.type.FEATURE_REQUEST"),
  };
}

export type TicketFolderKey = "open" | "answered" | "resolved" | "all";

export type TicketFolder = {
  key: TicketFolderKey;
  label: string;
  statuses: TicketStatus[];
};

export function getTicketFolders(t: TranslateFn): TicketFolder[] {
  return [
    {
      key: "open",
      label: t("tickets.folder.open"),
      statuses: ["OPEN", "IN_PROGRESS"],
    },
    {
      key: "answered",
      label: t("tickets.folder.answered"),
      statuses: ["ANSWERED"],
    },
    {
      key: "resolved",
      label: t("tickets.folder.resolved"),
      statuses: ["RESOLVED", "CLOSED"],
    },
    { key: "all", label: t("tickets.folder.all"), statuses: [] },
  ];
}

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
