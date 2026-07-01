"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Card } from "../../../../../../components/ui/card";
import { BackButton } from "../../../../../../components/ui/form-buttons";
import {
  createSchoolMessage,
  uploadSchoolMessagingInlineImage,
} from "../../../../../../components/messaging/messaging-api";
import { getLeaveComposerConfirmMessage } from "../../../../../../components/messaging/messaging-compose-logic";
import { MessagingComposer } from "../../../../../../components/messaging/messaging-composer";
import { ConfirmDialog } from "../../../../../../components/ui/confirm-dialog";
import { useTranslation } from "../../../../../../i18n/useTranslation";

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

type MessagingRecipientsPayload = {
  teachers: Array<{
    value: string;
    label: string;
    email?: string;
    classes?: string[];
    subjects?: string[];
  }>;
  staffFunctions: Array<{
    value: string;
    label: string;
    description?: string | null;
    members: Array<{
      userId: string;
      fullName: string;
      email: string;
    }>;
  }>;
  staffPeople: Array<{
    value: string;
    label: string;
    email: string;
    functionId: string;
    functionLabel: string;
  }>;
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

export default function SchoolNewMessagePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams<{ schoolSlug: string }>();
  const schoolSlug = params.schoolSlug;
  const composeMode = searchParams.get("mode");
  const initialSubject = searchParams.get("subject") ?? "";
  const initialBody = searchParams.get("body") ?? "";
  const initialRecipientUserIds = (searchParams.get("recipientUserIds") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState<string | null>(null);
  const [role, setRole] = useState<SchoolRole | null>(null);
  const [teacherRecipients, setTeacherRecipients] = useState<
    Array<{
      value: string;
      label: string;
      email?: string;
      classes: string[];
      subjects: string[];
    }>
  >([]);
  const [functionRecipients, setFunctionRecipients] = useState<
    Array<{
      value: string;
      label: string;
      email?: string;
      functionId: string;
      functionLabel: string;
    }>
  >([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);

  useEffect(() => {
    if (!schoolSlug) {
      return;
    }
    void loadProfile(schoolSlug);
  }, [schoolSlug]);

  async function loadProfile(currentSchoolSlug: string) {
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

      const payload = (await response.json()) as MePayload;
      setRole(payload.role ?? null);
      setSchoolName(payload.schoolName ?? null);

      const recipientsResponse = await fetch(
        `${API_URL}/schools/${currentSchoolSlug}/messaging/recipients`,
        {
          credentials: "include",
        },
      );
      if (recipientsResponse.ok) {
        const recipientsPayload =
          (await recipientsResponse.json()) as MessagingRecipientsPayload;
        setTeacherRecipients(
          recipientsPayload.teachers.map((entry) => ({
            value: entry.value,
            label: entry.label,
            email: entry.email,
            classes: entry.classes ?? [],
            subjects: entry.subjects ?? [],
          })),
        );
        setFunctionRecipients(
          recipientsPayload.staffPeople.map((entry) => ({
            value: entry.value,
            label: entry.label,
            email: entry.email,
            functionId: entry.functionId,
            functionLabel: entry.functionLabel,
          })),
        );
      }
    } catch {
      setError(t("messaging.compose.loadError"));
    } finally {
      setLoading(false);
    }
  }

  const canCompose = role ? COMPOSER_ALLOWED_ROLES.includes(role) : false;
  const backUrl = useMemo(
    () => `/schools/${schoolSlug}/messagerie`,
    [schoolSlug],
  );
  const leaveMessage = getLeaveComposerConfirmMessage(hasUnsavedChanges, t);
  const subtitle = useMemo(() => {
    const base = schoolName ?? t("messaging.compose.defaultSubtitle");
    if (composeMode === "reply") {
      return `${base} - ${t("messaging.compose.replySuffix")}`;
    }
    if (composeMode === "forward") {
      return `${base} - ${t("messaging.compose.forwardSuffix")}`;
    }
    return base;
  }, [composeMode, schoolName, t]);

  function requestBackToList() {
    if (!hasUnsavedChanges) {
      router.push(backUrl);
      return;
    }
    setLeaveConfirmOpen(true);
  }

  async function sendMessage(payload: {
    subject: string;
    body: string;
    recipientUserIds: string[];
    attachments: File[];
  }) {
    await createSchoolMessage(schoolSlug, {
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
    await createSchoolMessage(schoolSlug, {
      subject: payload.subject,
      body: payload.body,
      recipientUserIds: payload.recipientUserIds,
      isDraft: true,
      attachments: payload.attachments,
    });
  }

  return (
    <div className="grid gap-4">
      <Card
        title={t("messaging.compose.pageTitle")}
        subtitle={subtitle}
        actions={
          canCompose ? (
            <BackButton onClick={requestBackToList}>
              {t("messaging.compose.backToList")}
            </BackButton>
          ) : null
        }
      >
        {loading ? (
          <p className="text-sm text-text-secondary">
            {t("messaging.page.loading")}
          </p>
        ) : error ? (
          <p className="text-sm text-notification">{error}</p>
        ) : !canCompose ? (
          <div className="grid gap-3">
            <p className="text-sm text-text-secondary">
              {t("messaging.compose.roleNotAllowed")}
            </p>
            <BackButton onClick={() => router.push(backUrl)}>
              {t("messaging.compose.backToMessaging")}
            </BackButton>
          </div>
        ) : (
          <MessagingComposer
            teacherRecipients={teacherRecipients}
            functionRecipients={functionRecipients}
            initialSubject={initialSubject}
            initialBody={initialBody}
            initialRecipientUserIds={initialRecipientUserIds}
            onCancel={() => router.push(backUrl)}
            onRequestBackToList={requestBackToList}
            onUnsavedChange={setHasUnsavedChanges}
            onSend={sendMessage}
            onSaveDraft={saveDraft}
            onUploadInlineImage={(file) =>
              uploadSchoolMessagingInlineImage(schoolSlug, file)
            }
          />
        )}
      </Card>
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
    </div>
  );
}
