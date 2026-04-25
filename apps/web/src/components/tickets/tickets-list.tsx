"use client";

import {
  Bug,
  Lightbulb,
  MessageCircle,
  Paperclip,
  ThumbsUp,
} from "lucide-react";
import type { TicketListItem, TicketStatus, TicketType } from "./types";
import { TICKET_STATUS_LABELS, TICKET_TYPE_LABELS } from "./types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const STATUS_CLASSES: Record<TicketStatus, { pill: string }> = {
  OPEN: { pill: "bg-blue-50 text-blue-700 border border-blue-200" },
  IN_PROGRESS: {
    pill: "bg-orange-50 text-orange-700 border border-orange-200",
  },
  ANSWERED: { pill: "bg-green-50 text-green-700 border border-green-200" },
  RESOLVED: {
    pill: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  },
  CLOSED: { pill: "bg-gray-100 text-text-secondary border border-border" },
};

const TYPE_CLASSES: Record<
  TicketType,
  { pill: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  BUG: { pill: "bg-red-50 text-red-600 border border-red-200", Icon: Bug },
  FEATURE_REQUEST: {
    pill: "bg-amber-50 text-amber-700 border border-amber-200",
    Icon: Lightbulb,
  },
};

type Props = {
  tickets: TicketListItem[];
  selectedId: string | null;
  onSelect: (ticket: TicketListItem) => void;
  isLoading: boolean;
};

export function TicketsList({
  tickets,
  selectedId,
  onSelect,
  isLoading,
}: Props) {
  if (isLoading) {
    return (
      <div
        className="flex h-full items-center justify-center text-sm text-text-secondary"
        data-testid="tickets-list-loading"
      >
        Chargement…
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div
        className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-text-secondary"
        data-testid="tickets-list-empty"
      >
        <Bug className="h-8 w-8 opacity-30" />
        <p className="font-medium">Aucun ticket</p>
        <p className="text-xs">Signalez un bug ou proposez une amélioration</p>
      </div>
    );
  }

  return (
    <ul
      className="flex min-h-0 flex-col gap-1.5 overflow-y-auto"
      data-testid="tickets-list"
    >
      {tickets.map((ticket) => {
        const active = ticket.id === selectedId;
        const { pill: statusPill } = STATUS_CLASSES[ticket.status];
        const { pill: typePill, Icon: TypeIcon } = TYPE_CLASSES[ticket.type];

        return (
          <li key={ticket.id}>
            <button
              type="button"
              data-testid={`ticket-item-${ticket.id}`}
              onClick={() => onSelect(ticket)}
              className={`w-full rounded-[16px] px-3 py-3 text-left transition ${
                active
                  ? "border border-primary/25 bg-[linear-gradient(180deg,rgba(12,95,168,0.06)_0%,rgba(255,248,240,0.9)_100%)] shadow-[0_10px_22px_rgba(12,95,168,0.08)]"
                  : "hover:bg-warm-highlight/60"
              }`}
            >
              <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${typePill}`}
                >
                  <TypeIcon className="h-2.5 w-2.5" />
                  {TICKET_TYPE_LABELS[ticket.type]}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusPill}`}
                >
                  {TICKET_STATUS_LABELS[ticket.status]}
                </span>
              </div>

              <p
                className={`mb-0.5 line-clamp-2 text-sm font-semibold leading-snug ${
                  active ? "text-primary" : "text-text-primary"
                }`}
                data-testid={`ticket-title-${ticket.id}`}
              >
                {ticket.title}
              </p>

              <p className="line-clamp-1 text-xs text-text-secondary">
                {ticket.description}
              </p>

              <div className="mt-2 flex items-center gap-3">
                <span className="text-[11px] text-text-secondary">
                  {formatDate(ticket.createdAt)}
                </span>
                {ticket._count.responses > 0 && (
                  <span className="flex items-center gap-1 text-[11px] text-text-secondary">
                    <MessageCircle className="h-3 w-3" />
                    {ticket._count.responses}
                  </span>
                )}
                {ticket._count.votes > 0 && (
                  <span className="flex items-center gap-1 text-[11px] text-text-secondary">
                    <ThumbsUp className="h-3 w-3" />
                    {ticket._count.votes}
                  </span>
                )}
                {ticket.attachments.length > 0 && (
                  <span className="flex items-center gap-1 text-[11px] text-text-secondary">
                    <Paperclip className="h-3 w-3" />
                    {ticket.attachments.length}
                  </span>
                )}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
