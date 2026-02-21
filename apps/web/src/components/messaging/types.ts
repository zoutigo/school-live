import type { LucideIcon } from "lucide-react";

export type FolderKey = "inbox" | "sent" | "drafts" | "archive";

export type MessageAttachment = {
  id: string;
  fileName: string;
  sizeLabel: string;
  mimeType: string;
};

export type MessagingMessage = {
  id: string;
  folder: FolderKey;
  sender: string;
  senderUserId?: string;
  subject: string;
  preview: string;
  createdAt: string;
  unread: boolean;
  body: string[];
  bodyHtml?: string;
  attachments: MessageAttachment[];
};

export type MessagingFolder = {
  key: FolderKey;
  label: string;
  icon: LucideIcon;
};
