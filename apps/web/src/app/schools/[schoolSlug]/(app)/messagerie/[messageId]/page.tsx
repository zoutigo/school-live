"use client";

import { useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  archiveSchoolMessage,
  deleteSchoolMessage,
  getSchoolMessage,
  markSchoolMessageRead,
} from "../../../../../../components/messaging/messaging-api";
import { buildComposeQueryFromMessage } from "../../../../../../components/messaging/messaging-compose-logic";
import {
  MessagingMessageDetailView,
  type MessagingDetailClient,
} from "../../../../../../components/messaging/messaging-message-detail-view";
import { useTranslation } from "../../../../../../i18n/useTranslation";

export default function SchoolMessagerieMessagePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams<{ schoolSlug: string; messageId: string }>();
  const schoolSlug = params.schoolSlug;
  const messageId = params.messageId;

  const folderParam = searchParams.get("folder") ?? "inbox";
  const searchParam = searchParams.get("q") ?? "";
  const backUrl = useMemo(() => {
    const q = new URLSearchParams({ folder: folderParam });
    if (searchParam) {
      q.set("q", searchParam);
    }
    return `/schools/${schoolSlug}/messagerie?${q.toString()}`;
  }, [folderParam, schoolSlug, searchParam]);

  const client: MessagingDetailClient = {
    get: (id) => getSchoolMessage(schoolSlug, id),
    markRead: (id, read) => markSchoolMessageRead(schoolSlug, id, read),
    archive: (id, archived) => archiveSchoolMessage(schoolSlug, id, archived),
    remove: (id) => deleteSchoolMessage(schoolSlug, id),
  };

  return (
    <MessagingMessageDetailView
      client={client}
      messageId={messageId}
      folder={folderParam}
      contextLabel={t("messaging.page.readingSubtitle")}
      onBack={() => router.push(backUrl)}
      onArchivedRedirect={(targetFolder) =>
        router.push(`/schools/${schoolSlug}/messagerie?folder=${targetFolder}`)
      }
      onOpenCompose={(mode, message) => {
        const query = buildComposeQueryFromMessage(mode, message, t);
        router.push(
          `/schools/${schoolSlug}/messagerie/nouveau?${query.toString()}`,
        );
      }}
    />
  );
}
