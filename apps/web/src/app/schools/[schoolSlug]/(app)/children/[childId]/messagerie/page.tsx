"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Archive, FileText, Inbox, Send } from "lucide-react";
import { Card } from "../../../../../../../components/ui/card";
import {
  getSchoolMessage,
  getSchoolMessagesUnreadCount,
  listSchoolMessages,
  markSchoolMessageRead,
} from "../../../../../../../components/messaging/messaging-api";
import { MessagingAttachmentPreviewModal } from "../../../../../../../components/messaging/messaging-attachment-preview-modal";
import { MessagingFoldersPanel } from "../../../../../../../components/messaging/messaging-folders-panel";
import { MessagingMessagesList } from "../../../../../../../components/messaging/messaging-messages-list";
import { MessagingReader } from "../../../../../../../components/messaging/messaging-reader";
import { MessagingToolbar } from "../../../../../../../components/messaging/messaging-toolbar";
import { useTranslation } from "../../../../../../../i18n/useTranslation";
import type { TranslateFn } from "../../../../../../../i18n/useTranslation";
import { OnboardingTarget } from "../../../../../../../components/onboarding/onboarding-target";
import { useOnboardingTourStore } from "../../../../../../../store/onboarding-tour";
import { usePageHelp } from "../../../../../../../store/page-help";
import {
  MESSAGES_TOUR_ID,
  MESSAGES_TOUR_STEPS,
  MESSAGES_TOUR_TARGETS,
} from "../../../../../../../components/messaging/messages-tour.config";
import type {
  FolderKey,
  MessageAttachment,
  MessagingFolder,
  MessagingMessage,
} from "../../../../../../../components/messaging/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type ParentChild = {
  id: string;
  firstName: string;
  lastName: string;
};

function buildFolders(t: TranslateFn): MessagingFolder[] {
  return [
    { key: "inbox", label: t("messaging.folders.inbox"), icon: Inbox },
    { key: "sent", label: t("messaging.folders.sent"), icon: Send },
    { key: "drafts", label: t("messaging.folders.drafts"), icon: FileText },
    { key: "archive", label: t("messaging.folders.archive"), icon: Archive },
  ];
}

function getFolderLabel(folder: FolderKey, t: TranslateFn) {
  if (folder === "inbox") {
    return t("messaging.list.panelLabel.inbox");
  }
  if (folder === "sent") {
    return t("messaging.list.panelLabel.sent");
  }
  if (folder === "drafts") {
    return t("messaging.list.panelLabel.drafts");
  }
  return t("messaging.list.panelLabel.archive");
}

export default function ChildMessageriePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams<{ schoolSlug: string; childId: string }>();
  const schoolSlug = params.schoolSlug;
  const childId = params.childId;

  const initialFolder = searchParams.get("folder");
  const [folder, setFolder] = useState<FolderKey>(
    initialFolder === "sent" ||
      initialFolder === "drafts" ||
      initialFolder === "archive"
      ? initialFolder
      : "inbox",
  );
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [isCompactDevice, setIsCompactDevice] = useState(false);

  const [children, setChildren] = useState<ParentChild[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessagingMessage[]>([]);
  const [inboxUnreadCount, setInboxUnreadCount] = useState(0);
  const [draftsCount, setDraftsCount] = useState(0);
  const [archiveCount, setArchiveCount] = useState(0);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    null,
  );
  const [selectedMessage, setSelectedMessage] =
    useState<MessagingMessage | null>(null);
  const [previewAttachment, setPreviewAttachment] =
    useState<MessageAttachment | null>(null);

  useEffect(() => {
    if (!schoolSlug) {
      return;
    }
    void loadParentContext(schoolSlug, childId);
  }, [schoolSlug, childId]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const onChange = () => setIsCompactDevice(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

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
        onboardingHelpEnabled?: boolean;
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

      const tourStore = useOnboardingTourStore.getState();
      if (
        payload.onboardingHelpEnabled !== false &&
        !tourStore.isCompleted("parent", MESSAGES_TOUR_ID) &&
        !tourStore.activeTourId
      ) {
        tourStore.startTour(MESSAGES_TOUR_ID, "parent", MESSAGES_TOUR_STEPS);
      }

      await loadMessages(currentSchoolSlug, folder, search);
    } catch {
      setError(t("messaging.page.loadError"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!schoolSlug || loading) {
      return;
    }
    void loadMessages(schoolSlug, folder, search);
  }, [schoolSlug, folder, search]);

  useEffect(() => {
    if (folder !== "inbox" && unreadOnly) {
      setUnreadOnly(false);
    }
  }, [folder, unreadOnly]);

  async function loadMessages(
    currentSchoolSlug: string,
    nextFolder: FolderKey,
    nextSearch: string,
  ) {
    setMessagesLoading(true);
    try {
      const [payload, unreadCount, draftsPayload, archivePayload] =
        await Promise.all([
          listSchoolMessages(currentSchoolSlug, {
            folder: nextFolder,
            q: nextSearch,
            page: 1,
            limit: 50,
          }),
          getSchoolMessagesUnreadCount(currentSchoolSlug),
          listSchoolMessages(currentSchoolSlug, {
            folder: "drafts",
            page: 1,
            limit: 1,
          }),
          listSchoolMessages(currentSchoolSlug, {
            folder: "archive",
            page: 1,
            limit: 1,
          }),
        ]);
      setMessages(payload.items);
      setInboxUnreadCount(unreadCount);
      setDraftsCount(draftsPayload.meta.total);
      setArchiveCount(archivePayload.meta.total);
      setError(null);
    } catch {
      setError(t("messaging.page.loadError"));
    } finally {
      setMessagesLoading(false);
    }
  }

  const currentChild = useMemo(
    () => children.find((entry) => entry.id === childId) ?? null,
    [children, childId],
  );

  useEffect(() => {
    if (messages.length === 0) {
      setSelectedMessageId(null);
      setSelectedMessage(null);
      return;
    }
    if (
      !selectedMessageId ||
      !messages.some((message) => message.id === selectedMessageId)
    ) {
      setSelectedMessageId(messages[0].id);
    }
  }, [messages, selectedMessageId]);

  useEffect(() => {
    if (!schoolSlug || !selectedMessageId || isCompactDevice) {
      return;
    }
    void loadSelectedMessage(schoolSlug, selectedMessageId);
  }, [schoolSlug, selectedMessageId, isCompactDevice]);

  async function loadSelectedMessage(
    currentSchoolSlug: string,
    messageId: string,
  ) {
    try {
      const details = await getSchoolMessage(currentSchoolSlug, messageId);
      setSelectedMessage(details);
      if (folder === "inbox") {
        await markSchoolMessageRead(currentSchoolSlug, messageId, true);
        setMessages((prev) =>
          prev.map((entry) =>
            entry.id === messageId ? { ...entry, unread: false } : entry,
          ),
        );
        window.dispatchEvent(new Event("messaging:updated"));
      }
    } catch {
      setSelectedMessage(null);
    }
  }

  function handleMessageClick(messageId: string) {
    if (isCompactDevice) {
      const nextQuery = new URLSearchParams({ folder });
      if (search.trim()) {
        nextQuery.set("q", search.trim());
      }
      router.push(
        `/schools/${schoolSlug}/children/${childId}/messagerie/${messageId}?${nextQuery.toString()}`,
      );
      return;
    }
    setSelectedMessageId(messageId);
  }

  usePageHelp({
    title: t("messaging.help.title"),
    sections: [
      {
        title: t("messaging.help.section1Title"),
        body: [t("messaging.help.section1Body")],
      },
      {
        title: t("messaging.help.childReadOnlyTitle"),
        body: [t("messaging.help.childReadOnlyBody")],
      },
    ],
  });

  return (
    <div className="grid gap-4 lg:h-[calc(100vh-10rem)]">
      <Card
        title={undefined}
        subtitle={undefined}
        className="h-full overflow-hidden"
      >
        {loading ? (
          <p className="text-sm text-text-secondary">
            {t("messaging.page.loading")}
          </p>
        ) : error ? (
          <p className="text-sm text-notification">{error}</p>
        ) : (
          <div className="flex h-full min-h-0 flex-col gap-3">
            <OnboardingTarget id={MESSAGES_TOUR_TARGETS.toolbar}>
              <MessagingToolbar
                title={t("messaging.toolbar.title")}
                contextLabel={
                  currentChild
                    ? `${currentChild.firstName} ${currentChild.lastName}`
                    : t("messaging.page.childDefaultContext")
                }
                search={search}
                onSearchChange={setSearch}
                onRefresh={() => void loadMessages(schoolSlug, folder, search)}
              />
            </OnboardingTarget>

            <div className="grid gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-[230px_320px_minmax(0,1fr)]">
              <div className="lg:min-h-0">
                <OnboardingTarget id={MESSAGES_TOUR_TARGETS.folders}>
                  <MessagingFoldersPanel
                    folders={buildFolders(t)}
                    activeFolder={folder}
                    onSelectFolder={setFolder}
                    inboxUnreadCount={inboxUnreadCount}
                    draftsCount={draftsCount}
                    archiveCount={archiveCount}
                  />
                </OnboardingTarget>
              </div>
              <div className="lg:min-h-0">
                {/* Consultation seule : un parent qui navigue via le menu
                    d'un enfant ne peut ni composer, ni repondre/transferer,
                    ni marquer lu/non lu, ni archiver, ni supprimer. */}
                <MessagingMessagesList
                  panelLabel={getFolderLabel(folder, t)}
                  folder={folder}
                  messages={messages}
                  selectedMessageId={selectedMessageId}
                  onSelectMessage={handleMessageClick}
                  unreadOnly={unreadOnly}
                  onUnreadOnlyChange={setUnreadOnly}
                />
              </div>
              <div className="hidden gap-2 lg:grid lg:min-h-0">
                <MessagingReader
                  desktopOnly
                  message={selectedMessage}
                  onOpenAttachment={setPreviewAttachment}
                />
              </div>
            </div>
            {messagesLoading ? (
              <p className="text-xs text-text-secondary">
                {t("messaging.page.refreshing")}
              </p>
            ) : null}
          </div>
        )}
      </Card>

      <MessagingAttachmentPreviewModal
        attachment={previewAttachment}
        onClose={() => setPreviewAttachment(null)}
      />
    </div>
  );
}
