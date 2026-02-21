"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card } from "../../../../../../components/ui/card";
import {
  createSchoolMessage,
  uploadSchoolMessagingInlineImage,
} from "../../../../../../components/messaging/messaging-api";
import { getLeaveComposerConfirmMessage } from "../../../../../../components/messaging/messaging-compose-logic";
import { MessagingComposer } from "../../../../../../components/messaging/messaging-composer";
import { ConfirmDialog } from "../../../../../../components/ui/confirm-dialog";

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
      setError("Impossible de charger l'editeur de message.");
    } finally {
      setLoading(false);
    }
  }

  const canCompose = role ? COMPOSER_ALLOWED_ROLES.includes(role) : false;
  const backUrl = useMemo(
    () => `/schools/${schoolSlug}/messagerie`,
    [schoolSlug],
  );
  const leaveMessage = getLeaveComposerConfirmMessage(hasUnsavedChanges);
  const subtitle = useMemo(() => {
    const base = schoolName ?? "Messagerie de l'etablissement";
    if (composeMode === "reply") {
      return `${base} - Reponse`;
    }
    if (composeMode === "forward") {
      return `${base} - Transfert`;
    }
    return base;
  }, [composeMode, schoolName]);

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
  }) {
    await createSchoolMessage(schoolSlug, {
      subject: payload.subject,
      body: payload.body,
      recipientUserIds: payload.recipientUserIds,
      isDraft: false,
    });
    router.push(backUrl);
  }

  async function saveDraft(payload: {
    subject: string;
    body: string;
    recipientUserIds: string[];
  }) {
    await createSchoolMessage(schoolSlug, {
      subject: payload.subject,
      body: payload.body,
      recipientUserIds: payload.recipientUserIds,
      isDraft: true,
    });
  }

  return (
    <div className="grid gap-4">
      <Card
        title="Nouveau message"
        subtitle={subtitle}
        actions={
          canCompose ? (
            <button
              type="button"
              onClick={requestBackToList}
              className="inline-flex items-center gap-2 rounded-card border border-border bg-background px-3 py-2 text-sm text-text-primary transition hover:bg-primary/10"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour a la liste
            </button>
          ) : null
        }
      >
        {loading ? (
          <p className="text-sm text-text-secondary">Chargement...</p>
        ) : error ? (
          <p className="text-sm text-notification">{error}</p>
        ) : !canCompose ? (
          <div className="grid gap-3">
            <p className="text-sm text-text-secondary">
              Votre role actuel ne peut pas poster de message.
            </p>
            <button
              type="button"
              onClick={() => router.push(backUrl)}
              className="inline-flex w-fit items-center gap-2 rounded-card border border-border bg-background px-3 py-2 text-sm text-text-primary transition hover:bg-primary/10"
            >
              Retour a la messagerie
            </button>
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
        title="Quitter la redaction ?"
        message={leaveMessage}
        confirmLabel="Quitter"
        onCancel={() => setLeaveConfirmOpen(false)}
        onConfirm={() => {
          setLeaveConfirmOpen(false);
          router.push(backUrl);
        }}
      />
    </div>
  );
}
