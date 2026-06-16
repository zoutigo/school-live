import type { MessagingMessage } from "./types";
import type { TranslateFn } from "../../i18n/useTranslation";

type CanSendInput = {
  hasRecipientGroups: boolean;
  selectedRecipientsCount: number;
  recipient: string;
  subject: string;
  bodyText: string;
  sending: boolean;
  savingDraft: boolean;
};

export function canSendMessage(input: CanSendInput) {
  if (input.sending || input.savingDraft) {
    return false;
  }

  const hasRecipient = input.hasRecipientGroups
    ? input.selectedRecipientsCount > 0
    : input.recipient.trim().length > 0;

  return (
    hasRecipient &&
    input.subject.trim().length > 0 &&
    input.bodyText.trim().length > 0
  );
}

export function buildDraftSnapshot(input: {
  hasRecipientGroups: boolean;
  recipient: string;
  selectedRecipientIds: string[];
  subject: string;
  bodyText: string;
}) {
  const recipientIds = input.hasRecipientGroups
    ? Array.from(
        new Set(
          input.selectedRecipientIds
            .map((value) => value.trim())
            .filter((value) => value.length > 0),
        ),
      ).sort()
    : input.recipient.trim()
      ? [input.recipient.trim()]
      : [];

  return JSON.stringify({
    recipientIds,
    subject: input.subject.trim(),
    body: input.bodyText.trim(),
  });
}

export function hasUnsavedDraftChanges(input: {
  currentSnapshot: string;
  lastSavedDraftSnapshot: string | null;
}) {
  if (!input.lastSavedDraftSnapshot) {
    const parsed = JSON.parse(input.currentSnapshot) as {
      recipientIds: string[];
      subject: string;
      body: string;
    };
    return (
      parsed.recipientIds.length > 0 ||
      parsed.subject.length > 0 ||
      parsed.body.length > 0
    );
  }
  return input.currentSnapshot !== input.lastSavedDraftSnapshot;
}

export function getLeaveComposerConfirmMessage(
  hasUnsavedChanges: boolean,
  t: TranslateFn,
) {
  if (hasUnsavedChanges) {
    return t("messaging.compose.leaveConfirmWithUnsaved");
  }
  return t("messaging.compose.leaveConfirmDefault");
}

type ComposeMode = "reply" | "forward";

export function buildComposeQueryFromMessage(
  mode: ComposeMode,
  message: MessagingMessage,
  t: TranslateFn,
) {
  const query = new URLSearchParams();
  query.set("mode", mode);
  const prefix =
    mode === "reply"
      ? t("messaging.compose.replyPrefix")
      : t("messaging.compose.forwardPrefix");
  query.set("subject", `${prefix}: ${message.subject}`);

  if (mode === "reply" && message.senderUserId) {
    query.set("recipientUserIds", message.senderUserId);
  }

  if (mode === "forward") {
    query.set(
      "body",
      [
        `<p>${t("messaging.compose.forwardedHeader")}</p>`,
        `<p><strong>${t("messaging.compose.forwardedFrom")}</strong> ${message.sender}<br /><strong>${t("messaging.compose.forwardedDate")}</strong> ${message.createdAt}<br /><strong>${t("messaging.compose.forwardedSubject")}</strong> ${message.subject}</p>`,
        "<hr />",
        message.bodyHtml ??
          message.body.map((line) => `<p>${line}</p>`).join(""),
      ].join(""),
    );
  }

  return query;
}
