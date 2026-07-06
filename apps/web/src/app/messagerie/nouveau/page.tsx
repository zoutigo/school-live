"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "../../../components/layout/app-shell";
import { Card } from "../../../components/ui/card";
import {
  createPlatformMessage,
  uploadPlatformMessagingInlineImage,
} from "../../../components/messaging/admin-messaging-api";
import { getLeaveComposerConfirmMessage } from "../../../components/messaging/messaging-compose-logic";
import {
  MessagingComposer,
  type SearchRecipientOption,
} from "../../../components/messaging/messaging-composer";
import { ConfirmDialog } from "../../../components/ui/confirm-dialog";
import { useTranslation } from "../../../i18n/useTranslation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type SystemUserSearchResult = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  school: { slug: string; name: string } | null;
};

type SystemUsersListResponse = {
  items: SystemUserSearchResult[];
};

export default function PlatformNewMessagePage() {
  return (
    <Suspense fallback={null}>
      <PlatformNewMessagePageContent />
    </Suspense>
  );
}

function PlatformNewMessagePageContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const composeMode = searchParams.get("mode");
  const initialSubject = searchParams.get("subject") ?? "";
  const initialBody = searchParams.get("body") ?? "";
  const initialRecipientUserIds = (searchParams.get("recipientUserIds") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);

  const backUrl = "/messagerie";
  const leaveMessage = getLeaveComposerConfirmMessage(hasUnsavedChanges, t);
  const subtitle = useMemo(() => {
    const base = t("messaging.toolbar.platformContext");
    if (composeMode === "reply") {
      return `${base} - ${t("messaging.compose.replySuffix")}`;
    }
    if (composeMode === "forward") {
      return `${base} - ${t("messaging.compose.forwardSuffix")}`;
    }
    return base;
  }, [composeMode, t]);

  function requestBackToList() {
    if (!hasUnsavedChanges) {
      router.push(backUrl);
      return;
    }
    setLeaveConfirmOpen(true);
  }

  async function searchRecipients(
    query: string,
  ): Promise<SearchRecipientOption[]> {
    const params = new URLSearchParams({
      search: query,
      page: "1",
      limit: "20",
    });
    const response = await fetch(
      `${API_URL}/system/users?${params.toString()}`,
      {
        credentials: "include",
      },
    );
    if (!response.ok) {
      return [];
    }
    const payload = (await response.json()) as SystemUsersListResponse;
    return payload.items.map((entry) => ({
      value: entry.id,
      label:
        `${entry.lastName} ${entry.firstName}`.trim() ||
        entry.email ||
        entry.id,
      schoolSlug: entry.school?.slug ?? null,
      schoolName: entry.school?.name ?? null,
    }));
  }

  async function sendMessage(payload: {
    subject: string;
    body: string;
    recipientUserIds: string[];
    attachments: File[];
  }) {
    await createPlatformMessage({
      subject: payload.subject,
      body: payload.body,
      recipientUserIds: payload.recipientUserIds,
      isDraft: false,
      attachments: payload.attachments,
    });
    router.push(backUrl);
  }

  async function saveDraft(payload: {
    subject: string;
    body: string;
    recipientUserIds: string[];
    attachments: File[];
  }) {
    await createPlatformMessage({
      subject: payload.subject,
      body: payload.body,
      recipientUserIds: payload.recipientUserIds,
      isDraft: true,
      attachments: payload.attachments,
    });
  }

  return (
    <AppShell schoolName="Scolive Platform">
      <div className="grid gap-4">
        <Card title={t("messaging.compose.pageTitle")} subtitle={subtitle}>
          <MessagingComposer
            onSearchRecipients={searchRecipients}
            initialSubject={initialSubject}
            initialBody={initialBody}
            initialRecipientUserIds={initialRecipientUserIds}
            onCancel={() => router.push(backUrl)}
            onRequestBackToList={requestBackToList}
            onUnsavedChange={setHasUnsavedChanges}
            onSend={sendMessage}
            onSaveDraft={saveDraft}
            onUploadInlineImage={uploadPlatformMessagingInlineImage}
          />
        </Card>
      </div>
      <ConfirmDialog
        open={leaveConfirmOpen}
        title={t("messaging.compose.leaveTitle")}
        message={leaveMessage}
        confirmLabel={t("messaging.compose.leaveConfirm")}
        onCancel={() => setLeaveConfirmOpen(false)}
        onConfirm={() => {
          setLeaveConfirmOpen(false);
          router.push(backUrl);
        }}
      />
    </AppShell>
  );
}
