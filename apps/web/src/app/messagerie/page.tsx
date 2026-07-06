"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "../../components/layout/app-shell";
import {
  archivePlatformMessage,
  deletePlatformMessage,
  getPlatformMessage,
  getPlatformMessagesUnreadCount,
  listPlatformMessages,
  markPlatformMessageRead,
} from "../../components/messaging/admin-messaging-api";
import { buildComposeQueryFromMessage } from "../../components/messaging/messaging-compose-logic";
import {
  MessagingMailboxView,
  type MessagingMailboxClient,
} from "../../components/messaging/messaging-mailbox-view";
import { useTranslation } from "../../i18n/useTranslation";
import type { FolderKey } from "../../components/messaging/types";

const client: MessagingMailboxClient = {
  list: listPlatformMessages,
  get: getPlatformMessage,
  markRead: markPlatformMessageRead,
  archive: archivePlatformMessage,
  remove: deletePlatformMessage,
  unreadCount: getPlatformMessagesUnreadCount,
};

export default function PlatformMessageriePage() {
  return (
    <Suspense fallback={null}>
      <PlatformMessageriePageContent />
    </Suspense>
  );
}

function PlatformMessageriePageContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialFolderParam = searchParams.get("folder");
  const initialFolder: FolderKey =
    initialFolderParam === "sent" ||
    initialFolderParam === "drafts" ||
    initialFolderParam === "archive"
      ? initialFolderParam
      : "inbox";
  const initialSearch = searchParams.get("q") ?? "";

  return (
    <AppShell schoolName="Scolive Platform">
      <MessagingMailboxView
        client={client}
        contextLabel={t("messaging.toolbar.platformContext")}
        canCompose
        initialFolder={initialFolder}
        initialSearch={initialSearch}
        onOpenCompose={() => router.push("/messagerie/nouveau")}
        onOpenComposeFromMessage={(mode, message) => {
          const query = buildComposeQueryFromMessage(mode, message, t);
          router.push(`/messagerie/nouveau?${query.toString()}`);
        }}
        onOpenMessage={(messageId, folder: FolderKey, search) => {
          const query = new URLSearchParams({ folder });
          if (search.trim()) {
            query.set("q", search.trim());
          }
          router.push(`/messagerie/${messageId}?${query.toString()}`);
        }}
      />
    </AppShell>
  );
}
