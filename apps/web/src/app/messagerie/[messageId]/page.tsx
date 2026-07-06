"use client";

import { Suspense, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "../../../components/layout/app-shell";
import {
  archivePlatformMessage,
  deletePlatformMessage,
  getPlatformMessage,
  markPlatformMessageRead,
} from "../../../components/messaging/admin-messaging-api";
import { buildComposeQueryFromMessage } from "../../../components/messaging/messaging-compose-logic";
import {
  MessagingMessageDetailView,
  type MessagingDetailClient,
} from "../../../components/messaging/messaging-message-detail-view";
import { useTranslation } from "../../../i18n/useTranslation";

const client: MessagingDetailClient = {
  get: getPlatformMessage,
  markRead: markPlatformMessageRead,
  archive: archivePlatformMessage,
  remove: deletePlatformMessage,
};

export default function PlatformMessagerieMessagePage() {
  return (
    <Suspense fallback={null}>
      <PlatformMessagerieMessagePageContent />
    </Suspense>
  );
}

function PlatformMessagerieMessagePageContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams<{ messageId: string }>();
  const messageId = params.messageId;

  const folderParam = searchParams.get("folder") ?? "inbox";
  const searchParam = searchParams.get("q") ?? "";
  const backUrl = useMemo(() => {
    const q = new URLSearchParams({ folder: folderParam });
    if (searchParam) {
      q.set("q", searchParam);
    }
    return `/messagerie?${q.toString()}`;
  }, [folderParam, searchParam]);

  return (
    <AppShell schoolName="Scolive Platform">
      <MessagingMessageDetailView
        client={client}
        messageId={messageId}
        folder={folderParam}
        contextLabel={t("messaging.toolbar.platformContext")}
        onBack={() => router.push(backUrl)}
        onArchivedRedirect={(targetFolder) =>
          router.push(`/messagerie?folder=${targetFolder}`)
        }
        onOpenCompose={(mode, message) => {
          const query = buildComposeQueryFromMessage(mode, message, t);
          router.push(`/messagerie/nouveau?${query.toString()}`);
        }}
      />
    </AppShell>
  );
}
