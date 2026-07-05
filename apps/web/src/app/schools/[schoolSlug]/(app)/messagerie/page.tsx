"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  archiveSchoolMessage,
  deleteSchoolMessage,
  getSchoolMessage,
  getSchoolMessagesUnreadCount,
  listSchoolMessages,
  markSchoolMessageRead,
} from "../../../../../components/messaging/messaging-api";
import { buildComposeQueryFromMessage } from "../../../../../components/messaging/messaging-compose-logic";
import {
  MessagingMailboxView,
  type MessagingMailboxClient,
} from "../../../../../components/messaging/messaging-mailbox-view";
import { useTranslation } from "../../../../../i18n/useTranslation";
import type { FolderKey } from "../../../../../components/messaging/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type SchoolRole =
  | "SCHOOL_ADMIN"
  | "SCHOOL_MANAGER"
  | "SUPERVISOR"
  | "SCHOOL_ACCOUNTANT"
  | "SCHOOL_STAFF"
  | "TEACHER"
  | "PARENT"
  | "STUDENT";

type MePayload = {
  role?: SchoolRole;
  schoolName?: string;
};

const COMPOSER_ALLOWED_ROLES: SchoolRole[] = [
  "SCHOOL_ADMIN",
  "SCHOOL_MANAGER",
  "SUPERVISOR",
  "SCHOOL_ACCOUNTANT",
  "SCHOOL_STAFF",
  "TEACHER",
  "PARENT",
];

export default function SchoolMessageriePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams<{ schoolSlug: string }>();
  const schoolSlug = params.schoolSlug;

  const initialFolderParam = searchParams.get("folder");
  const initialFolder: FolderKey =
    initialFolderParam === "sent" ||
    initialFolderParam === "drafts" ||
    initialFolderParam === "archive"
      ? initialFolderParam
      : "inbox";
  const initialSearch = searchParams.get("q") ?? "";

  const [profileLoading, setProfileLoading] = useState(true);
  const [schoolName, setSchoolName] = useState<string | null>(null);
  const [role, setRole] = useState<SchoolRole | null>(null);

  useEffect(() => {
    if (!schoolSlug) {
      return;
    }
    void loadProfile(schoolSlug);
  }, [schoolSlug]);

  async function loadProfile(currentSchoolSlug: string) {
    setProfileLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/schools/${currentSchoolSlug}/me`,
        { credentials: "include" },
      );

      if (!response.ok) {
        router.replace(`/schools/${currentSchoolSlug}/login`);
        return;
      }

      const payload = (await response.json()) as MePayload;
      setRole(payload.role ?? null);
      setSchoolName(payload.schoolName ?? null);
    } finally {
      setProfileLoading(false);
    }
  }

  const canCompose = role ? COMPOSER_ALLOWED_ROLES.includes(role) : false;

  if (profileLoading) {
    return (
      <p className="text-sm text-text-secondary">
        {t("messaging.page.loading")}
      </p>
    );
  }

  const client: MessagingMailboxClient = {
    list: (params) => listSchoolMessages(schoolSlug, params),
    get: (messageId) => getSchoolMessage(schoolSlug, messageId),
    markRead: (messageId, read) =>
      markSchoolMessageRead(schoolSlug, messageId, read),
    archive: (messageId, archived) =>
      archiveSchoolMessage(schoolSlug, messageId, archived),
    remove: (messageId) => deleteSchoolMessage(schoolSlug, messageId),
    unreadCount: () => getSchoolMessagesUnreadCount(schoolSlug),
  };

  return (
    <MessagingMailboxView
      client={client}
      contextLabel={schoolName ?? t("messaging.toolbar.defaultContext")}
      canCompose={canCompose}
      initialFolder={initialFolder}
      initialSearch={initialSearch}
      onOpenCompose={() =>
        router.push(`/schools/${schoolSlug}/messagerie/nouveau`)
      }
      onOpenComposeFromMessage={(mode, message) => {
        const query = buildComposeQueryFromMessage(mode, message, t);
        router.push(
          `/schools/${schoolSlug}/messagerie/nouveau?${query.toString()}`,
        );
      }}
      onOpenMessage={(messageId, folder, search) => {
        const query = new URLSearchParams({ folder });
        if (search.trim()) {
          query.set("q", search.trim());
        }
        router.push(
          `/schools/${schoolSlug}/messagerie/${messageId}?${query.toString()}`,
        );
      }}
    />
  );
}
