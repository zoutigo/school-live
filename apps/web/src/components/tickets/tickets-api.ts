import { getCsrfTokenCookie } from "../../lib/auth-cookies";
import type {
  TicketDetail,
  TicketListItem,
  TicketsMeta,
  TicketStatus,
  TicketType,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type ListParams = {
  page?: number;
  limit?: number;
  q?: string;
  status?: TicketStatus;
  type?: TicketType;
};

export type ListTicketsResponse = {
  data: TicketListItem[];
  meta: TicketsMeta;
};

export type CreateTicketPayload = {
  type: TicketType;
  title: string;
  description: string;
  schoolSlug?: string;
  platform?: string;
  appVersion?: string;
  screenPath?: string;
  attachments?: File[];
};

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { credentials: "include" });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(
      typeof body.message === "string" ? body.message : `HTTP ${res.status}`,
    );
  }
  return res.json() as Promise<T>;
}

async function mutate<T>(
  path: string,
  method: string,
  body: unknown,
): Promise<T> {
  const csrf = getCsrfTokenCookie();
  const res = await fetch(`${API_URL}${path}`, {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(csrf ? { "X-CSRF-Token": csrf } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const b = (await res.json().catch(() => ({}))) as {
      message?: string | string[];
    };
    const msg = Array.isArray(b.message)
      ? b.message.join(", ")
      : typeof b.message === "string"
        ? b.message
        : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

async function postFormData<T>(path: string, formData: FormData): Promise<T> {
  const csrf = getCsrfTokenCookie();
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    credentials: "include",
    headers: csrf ? { "X-CSRF-Token": csrf } : {},
    body: formData,
  });
  if (!res.ok) {
    const b = (await res.json().catch(() => ({}))) as {
      message?: string | string[];
    };
    const msg = Array.isArray(b.message)
      ? b.message.join(", ")
      : typeof b.message === "string"
        ? b.message
        : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export async function listTickets(
  params?: ListParams,
): Promise<ListTicketsResponse> {
  const q = new URLSearchParams();
  if (params?.page) q.set("page", String(params.page));
  if (params?.limit) q.set("limit", String(params.limit));
  if (params?.q) q.set("q", params.q);
  if (params?.status) q.set("status", params.status);
  if (params?.type) q.set("type", params.type);
  const qs = q.toString();
  return getJson<ListTicketsResponse>(`/tickets${qs ? `?${qs}` : ""}`);
}

export async function getTicket(ticketId: string): Promise<TicketDetail> {
  return getJson<TicketDetail>(`/tickets/${ticketId}`);
}

export async function createTicket(
  payload: CreateTicketPayload,
): Promise<TicketDetail> {
  const formData = new FormData();
  formData.append("type", payload.type);
  formData.append("title", payload.title);
  formData.append("description", payload.description);
  if (payload.schoolSlug) formData.append("schoolSlug", payload.schoolSlug);
  if (payload.platform) formData.append("platform", payload.platform);
  if (payload.appVersion) formData.append("appVersion", payload.appVersion);
  if (payload.screenPath) formData.append("screenPath", payload.screenPath);
  for (const file of payload.attachments ?? []) {
    formData.append("attachments", file);
  }
  return postFormData<TicketDetail>("/tickets", formData);
}

export async function updateTicketStatus(
  ticketId: string,
  status: TicketStatus,
): Promise<TicketDetail> {
  return mutate<TicketDetail>(`/tickets/${ticketId}/status`, "PATCH", {
    status,
  });
}

export async function addTicketResponse(
  ticketId: string,
  body: string,
  isInternal: boolean,
): Promise<void> {
  await mutate<void>(`/tickets/${ticketId}/responses`, "POST", {
    body,
    isInternal,
  });
}

export async function toggleTicketVote(
  ticketId: string,
): Promise<{ voted: boolean }> {
  return mutate<{ voted: boolean }>(`/tickets/${ticketId}/votes`, "POST", {});
}

export async function deleteTicket(ticketId: string): Promise<void> {
  await mutate<void>(`/tickets/${ticketId}`, "DELETE", undefined);
}

export async function getMyTicketCount(): Promise<{ open: number }> {
  return getJson<{ open: number }>("/tickets/my-count");
}
