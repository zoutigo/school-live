"use client";

import { useState } from "react";
import {
  Bug,
  Clock,
  Lightbulb,
  Lock,
  MapPin,
  Paperclip,
  ThumbsUp,
  Trash2,
} from "lucide-react";
import { Button } from "../ui/button";
import { FormField } from "../ui/form-field";
import { FormTextarea } from "../ui/form-controls";
import type { TicketDetail, TicketStatus } from "./types";
import { getTicketStatusLabels, getTicketTypeLabels } from "./types";
import {
  addTicketResponse,
  deleteTicket,
  toggleTicketVote,
  updateTicketStatus,
} from "./tickets-api";
import { useTranslation } from "../../i18n/useTranslation";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_TRANSITIONS: TicketStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "ANSWERED",
  "RESOLVED",
  "CLOSED",
];

type Props = {
  ticket: TicketDetail;
  currentUserId: string;
  isPlatformStaff: boolean;
  isPlatformAny: boolean;
  onTicketUpdated: () => void;
  onTicketDeleted: () => void;
  onError: (msg: string) => void;
};

export function TicketsDetail({
  ticket,
  currentUserId,
  isPlatformStaff,
  isPlatformAny,
  onTicketUpdated,
  onTicketDeleted,
  onError,
}: Props) {
  const { t } = useTranslation();
  const statusLabels = getTicketStatusLabels(t);
  const typeLabels = getTicketTypeLabels(t);

  const [replyBody, setReplyBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [replying, setReplying] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canDelete = ticket.author.id === currentUserId || isPlatformStaff;
  const hasVoted = ticket.votes.some((v) => v.userId === currentUserId);

  async function handleStatusChange(status: TicketStatus) {
    setUpdatingStatus(true);
    try {
      await updateTicketStatus(ticket.id, status);
      onTicketUpdated();
    } catch (e) {
      onError(
        e instanceof Error ? e.message : t("tickets.detail.errorDefault"),
      );
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleVote() {
    try {
      await toggleTicketVote(ticket.id);
      onTicketUpdated();
    } catch (e) {
      onError(
        e instanceof Error ? e.message : t("tickets.detail.errorDefault"),
      );
    }
  }

  async function handleReply() {
    if (!replyBody.trim()) return;
    setReplying(true);
    try {
      await addTicketResponse(ticket.id, replyBody.trim(), isInternal);
      setReplyBody("");
      setIsInternal(false);
      onTicketUpdated();
    } catch (e) {
      onError(
        e instanceof Error ? e.message : t("tickets.detail.errorDefault"),
      );
    } finally {
      setReplying(false);
    }
  }

  async function handleDelete() {
    if (!confirm(t("tickets.detail.deleteConfirm"))) return;
    setDeleting(true);
    try {
      await deleteTicket(ticket.id);
      onTicketDeleted();
    } catch (e) {
      onError(
        e instanceof Error ? e.message : t("tickets.detail.errorDefault"),
      );
    } finally {
      setDeleting(false);
    }
  }

  const TypeIcon = ticket.type === "BUG" ? Bug : Lightbulb;
  const responseCount = ticket.responses.length;

  return (
    <article
      className="flex min-h-0 flex-col gap-4 overflow-y-auto rounded-[20px] border border-warm-border bg-surface p-5 shadow-card"
      data-testid="ticket-detail"
    >
      {/* En-tête */}
      <div className="flex flex-wrap items-start gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
            ticket.type === "BUG"
              ? "border-red-200 bg-red-50 text-red-600"
              : "border-amber-200 bg-amber-50 text-amber-700"
          }`}
        >
          <TypeIcon className="h-3 w-3" />
          {typeLabels[ticket.type]}
        </span>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-warm-border bg-warm-surface px-2.5 py-1 text-xs font-semibold text-text-secondary">
          {statusLabels[ticket.status]}
        </span>

        {canDelete && (
          <button
            type="button"
            aria-label={t("tickets.detail.deleteAriaLabel")}
            data-testid="delete-ticket-btn"
            disabled={deleting}
            onClick={handleDelete}
            className="ml-auto rounded-full p-1.5 text-text-secondary transition hover:bg-notification/10 hover:text-notification disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <h2
        className="text-xl font-bold text-text-primary"
        data-testid="detail-title"
      >
        {ticket.title}
      </h2>
      <p
        className="whitespace-pre-wrap text-sm text-text-secondary"
        data-testid="detail-description"
      >
        {ticket.description}
      </p>

      {/* Métadonnées */}
      <dl className="flex flex-wrap gap-4 text-xs text-text-secondary">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <dt className="sr-only">Créé le</dt>
          <dd>{formatDate(ticket.createdAt)}</dd>
        </div>
        {ticket.screenPath && (
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            <dt className="sr-only">Page</dt>
            <dd>{ticket.screenPath}</dd>
          </div>
        )}
        {ticket.school && (
          <div className="flex items-center gap-1">
            <dt className="sr-only">École</dt>
            <dd>{ticket.school.name}</dd>
          </div>
        )}
      </dl>

      {/* Pièces jointes */}
      {ticket.attachments.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-text-secondary">
            {t("tickets.detail.attachmentsLabel")}
          </p>
          <ul className="flex flex-col gap-1">
            {ticket.attachments.map((att) => (
              <li
                key={att.id}
                className="flex items-center gap-2 text-xs text-text-secondary"
              >
                <Paperclip className="h-3 w-3 shrink-0" />
                <a
                  href={att.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline"
                >
                  {att.fileName}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions — vote + changement statut */}
      <div className="flex flex-wrap items-center gap-2">
        {isPlatformAny && (
          <button
            type="button"
            data-testid="vote-btn"
            onClick={handleVote}
            className={`flex items-center gap-1.5 rounded-[12px] border px-3 py-1.5 text-xs font-semibold transition ${
              hasVoted
                ? "border-primary/30 bg-blue-50 text-primary"
                : "border-warm-border bg-warm-surface text-text-secondary hover:border-primary/30 hover:text-primary"
            }`}
          >
            <ThumbsUp className="h-3.5 w-3.5" />
            {ticket._count.votes}
          </button>
        )}

        {isPlatformStaff && (
          <div className="flex items-center gap-1">
            {STATUS_TRANSITIONS.map((s) => (
              <button
                key={s}
                type="button"
                data-testid={`status-btn-${s}`}
                disabled={updatingStatus || ticket.status === s}
                onClick={() => handleStatusChange(s)}
                className={`rounded-[10px] border px-2.5 py-1 text-[11px] font-semibold transition disabled:opacity-40 ${
                  ticket.status === s
                    ? "border-primary/30 bg-blue-50 text-primary"
                    : "border-warm-border bg-warm-surface text-text-secondary hover:border-primary/30 hover:text-primary"
                }`}
              >
                {statusLabels[s]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Fil des réponses */}
      {responseCount > 0 && (
        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
            {responseCount}{" "}
            {responseCount > 1
              ? t("tickets.detail.responsesWord")
              : t("tickets.detail.responseWord")}
          </p>
          <ul className="flex flex-col gap-2">
            {ticket.responses.map((resp) => (
              <li
                key={resp.id}
                data-testid={`response-${resp.id}`}
                className={`rounded-[14px] border p-3 ${
                  resp.isInternal
                    ? "border-warm-border bg-warm-surface/80"
                    : "border-border bg-surface"
                }`}
              >
                {resp.isInternal && (
                  <div className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold text-warm-500">
                    <Lock className="h-2.5 w-2.5" />
                    {t("tickets.detail.internalBadge")}
                  </div>
                )}
                <p className="mb-1 text-xs text-text-secondary">
                  {resp.author.firstName} {resp.author.lastName} ·{" "}
                  {formatDate(resp.createdAt)}
                </p>
                <p className="whitespace-pre-wrap text-sm text-text-primary">
                  {resp.body}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Zone réponse admin */}
      {isPlatformStaff && (
        <section className="rounded-[16px] border border-warm-border bg-warm-surface/60 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">
            {t("tickets.detail.replyTitle")}
          </p>
          <FormField label={t("tickets.detail.replyMessage")}>
            <FormTextarea
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder={t("tickets.detail.replyPlaceholder")}
              rows={4}
              data-testid="reply-textarea"
            />
          </FormField>

          <div className="mt-2 flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-text-secondary">
              <input
                type="checkbox"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
                data-testid="internal-checkbox"
              />
              {t("tickets.detail.internalCheckbox")}
            </label>
            <Button
              variant="primary"
              disabled={!replyBody.trim() || replying}
              onClick={handleReply}
              className="ml-auto"
              data-testid="send-reply-btn"
            >
              {replying
                ? t("tickets.detail.replying")
                : isInternal
                  ? t("tickets.detail.replyAddNote")
                  : t("tickets.detail.replySend")}
            </Button>
          </div>
        </section>
      )}
    </article>
  );
}
