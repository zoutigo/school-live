"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Card } from "../../../../../../../../components/ui/card";
import {
  getSchoolMessage,
  markSchoolMessageRead,
} from "../../../../../../../../components/messaging/messaging-api";
import { MessagingAttachmentPreviewModal } from "../../../../../../../../components/messaging/messaging-attachment-preview-modal";
import { MessagingMessageDetail } from "../../../../../../../../components/messaging/messaging-message-detail";
import type {
  MessageAttachment,
  MessagingMessage,
} from "../../../../../../../../components/messaging/types";
import { useTranslation } from "../../../../../../../../i18n/useTranslation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type ParentChild = {
  id: string;
  firstName: string;
  lastName: string;
};

export default function ChildMessagerieMessagePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams<{
    schoolSlug: string;
    childId: string;
    messageId: string;
  }>();
  const schoolSlug = params.schoolSlug;
  const childId = params.childId;
  const messageId = params.messageId;

  const folderParam = searchParams.get("folder") ?? "inbox";
  const searchParam = searchParams.get("q") ?? "";
  const backUrl = useMemo(() => {
    const query = new URLSearchParams({ folder: folderParam });
    if (searchParam) {
      query.set("q", searchParam);
    }
    return `/schools/${schoolSlug}/children/${childId}/messagerie?${query.toString()}`;
  }, [childId, folderParam, schoolSlug, searchParam]);

  const [children, setChildren] = useState<ParentChild[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<MessagingMessage | null>(null);
  const [previewAttachment, setPreviewAttachment] =
    useState<MessageAttachment | null>(null);

  useEffect(() => {
    if (!schoolSlug) {
      return;
    }
    void loadParentContext(schoolSlug, childId);
  }, [schoolSlug, childId]);

  async function loadParentContext(
    currentSchoolSlug: string,
    currentChildId: string,
  ) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${API_URL}/schools/${currentSchoolSlug}/me`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        router.replace(`/schools/${currentSchoolSlug}/login`);
        return;
      }

      const payload = (await response.json()) as {
        role?: string;
        linkedStudents?: ParentChild[];
      };

      if (payload.role !== "PARENT") {
        router.replace(`/schools/${currentSchoolSlug}/dashboard`);
        return;
      }

      const linked = payload.linkedStudents ?? [];
      setChildren(linked);

      if (
        linked.length > 0 &&
        !linked.some((entry) => entry.id === currentChildId)
      ) {
        router.replace(
          `/schools/${currentSchoolSlug}/children/${linked[0].id}/messagerie`,
        );
      }
      const details = await getSchoolMessage(currentSchoolSlug, messageId);
      setMessage(details);
      if (folderParam === "inbox") {
        await markSchoolMessageRead(currentSchoolSlug, messageId, true);
        window.dispatchEvent(new Event("messaging:updated"));
      }
    } catch {
      setError(t("messaging.page.loadMessageError"));
    } finally {
      setLoading(false);
    }
  }

  const currentChild = useMemo(
    () => children.find((entry) => entry.id === childId) ?? null,
    [children, childId],
  );

  return (
    <div className="grid gap-4">
      <Card
        title={t("messaging.page.title")}
        subtitle={
          currentChild
            ? `${currentChild.firstName} ${currentChild.lastName}`
            : t("messaging.page.readingSubtitle")
        }
      >
        {loading ? (
          <p className="text-sm text-text-secondary">
            {t("messaging.page.loading")}
          </p>
        ) : error ? (
          <p className="text-sm text-notification">{error}</p>
        ) : (
          <MessagingMessageDetail
            message={message}
            onBack={() => router.push(backUrl)}
            onOpenAttachment={setPreviewAttachment}
          />
        )}
      </Card>

      <MessagingAttachmentPreviewModal
        attachment={previewAttachment}
        onClose={() => setPreviewAttachment(null)}
      />
    </div>
  );
}
