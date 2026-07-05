import { BadRequestException } from "@nestjs/common";
import type { CreateMessageDto } from "./dto/create-message.dto.js";
import {
  translateMessagingError,
  type MessagingLocale,
} from "./messaging.translations.js";

function ensureStringField(
  value: unknown,
  errorKey: string,
  locale: MessagingLocale,
) {
  if (typeof value !== "string") {
    throw new BadRequestException(translateMessagingError(locale, errorKey));
  }

  return value;
}

function normalizeStringArrayField(
  value: unknown,
  errorKey: string,
  locale: MessagingLocale,
) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => String(entry));
  }

  if (typeof value !== "string") {
    throw new BadRequestException(translateMessagingError(locale, errorKey));
  }

  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }

  if (normalized.startsWith("[")) {
    try {
      const parsed = JSON.parse(normalized) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map((entry) => String(entry));
      }
    } catch {
      throw new BadRequestException(translateMessagingError(locale, errorKey));
    }
  }

  if (normalized.includes(",")) {
    return normalized
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  return [normalized];
}

function normalizeBoolean(value: unknown, locale: MessagingLocale) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value !== "string") {
    throw new BadRequestException(
      translateMessagingError(locale, "messaging.errors.invalidIsDraft"),
    );
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1") {
    return true;
  }
  if (normalized === "false" || normalized === "0") {
    return false;
  }

  throw new BadRequestException(
    translateMessagingError(locale, "messaging.errors.invalidIsDraft"),
  );
}

export function normalizeCreateMessagePayload(
  payload: Record<string, unknown>,
  locale: MessagingLocale,
) {
  const subject = ensureStringField(
    payload.subject,
    "messaging.errors.invalidSubject",
    locale,
  );
  const body = ensureStringField(
    payload.body,
    "messaging.errors.invalidBody",
    locale,
  );
  const recipientUserIds = normalizeStringArrayField(
    payload.recipientUserIds,
    "messaging.errors.invalidRecipientUserIds",
    locale,
  );
  const isDraft = normalizeBoolean(payload.isDraft, locale);
  const forwardAttachmentIds = normalizeStringArrayField(
    payload.forwardAttachmentIds,
    "messaging.errors.invalidForwardAttachmentIds",
    locale,
  );

  return {
    subject,
    body,
    recipientUserIds,
    ...(isDraft === undefined ? {} : { isDraft }),
    ...(forwardAttachmentIds === undefined ? {} : { forwardAttachmentIds }),
  } satisfies CreateMessageDto;
}
