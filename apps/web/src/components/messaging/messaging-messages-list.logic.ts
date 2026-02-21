import type { FolderKey } from "./types";

export function formatSenderForList(sender: string) {
  const normalized = sender.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return "";
  }

  const tokens = normalized.split(" ");
  if (tokens.length < 2) {
    return normalized.toUpperCase();
  }

  const firstLooksLikeLastName = tokens[0] === tokens[0].toUpperCase();
  const firstName = firstLooksLikeLastName ? tokens[1] : tokens[0];
  const lastName = firstLooksLikeLastName
    ? tokens[0]
    : tokens[tokens.length - 1];

  return `${firstName.charAt(0).toUpperCase()}.${lastName.toUpperCase()}`;
}

export function getSubjectClass(unread: boolean) {
  return unread
    ? "line-clamp-1 text-sm font-semibold text-primary"
    : "line-clamp-1 text-sm font-normal text-text-primary";
}

export function shouldShowPreview(folder: FolderKey) {
  return folder !== "inbox";
}
