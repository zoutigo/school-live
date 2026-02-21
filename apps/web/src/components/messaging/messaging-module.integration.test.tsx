import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  Archive,
  ArchiveRestore,
  FileText,
  Forward,
  Inbox,
  Mail,
  MailOpen,
  Reply,
  Send,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { describe, expect, it } from "vitest";
import { ActionIconButton } from "../ui/action-icon-button";
import { buildComposeQueryFromMessage } from "./messaging-compose-logic";
import { MessagingComposer } from "./messaging-composer";
import { MessagingFoldersPanel } from "./messaging-folders-panel";
import { MessagingMessageActions } from "./messaging-message-actions";
import { MessagingMessagesList } from "./messaging-messages-list";
import { MessagingReader } from "./messaging-reader";
import { MessagingToolbar } from "./messaging-toolbar";
import type { FolderKey, MessagingFolder, MessagingMessage } from "./types";

const FOLDERS: MessagingFolder[] = [
  { key: "inbox", label: "Boite de reception", icon: Inbox },
  { key: "sent", label: "Envoyes", icon: Send },
  { key: "drafts", label: "Brouillons", icon: FileText },
  { key: "archive", label: "Archives", icon: Archive },
];

function setEditorText(container: HTMLElement, value: string) {
  const editor = container.querySelector(
    '[contenteditable="true"]',
  ) as HTMLElement | null;
  if (!editor) {
    throw new Error("Editor not found");
  }
  editor.innerText = value;
  editor.textContent = value;
  fireEvent.input(editor);
}

function getComposerRecipientSelect(container: HTMLElement) {
  const select = container.querySelector(
    'select[class*="h-10"][class*="bg-surface"]',
  ) as HTMLSelectElement | null;
  if (!select) {
    throw new Error("Recipient select not found");
  }
  return select;
}

function createMessage(partial: Partial<MessagingMessage>): MessagingMessage {
  return {
    id: partial.id ?? crypto.randomUUID(),
    folder: partial.folder ?? "inbox",
    sender: partial.sender ?? "MBELE Valery",
    senderUserId: partial.senderUserId,
    subject: partial.subject ?? "Sujet",
    preview: partial.preview ?? "Apercu",
    createdAt: partial.createdAt ?? "21 fevr. 2026, 05:22",
    unread: partial.unread ?? false,
    body: partial.body ?? ["Bonjour"],
    bodyHtml: partial.bodyHtml,
    attachments: partial.attachments ?? [],
  };
}

type ComposerPreset = {
  subject: string;
  body: string;
  recipientUserIds: string[];
};

function MessagingModuleHarness() {
  const [messages, setMessages] = useState<MessagingMessage[]>([
    createMessage({
      id: "inbox-1",
      folder: "inbox",
      sender: "MBELE Valery",
      senderUserId: "u-mbele",
      subject: "Demande de suivi particulier",
      preview: "Bonjour",
      unread: true,
      body: ["Bonjour", "Je vous remercie d'avance"],
    }),
    createMessage({
      id: "inbox-2",
      folder: "inbox",
      sender: "ANNE Rousselet",
      senderUserId: "u-anne",
      subject: "Point de progression",
      preview: "Point sur le trimestre",
      unread: false,
    }),
    createMessage({
      id: "draft-1",
      folder: "drafts",
      sender: "Moi",
      subject: "Brouillon discipline",
      preview: "A finaliser",
    }),
    createMessage({
      id: "arch-1",
      folder: "archive",
      sender: "PIERRE W",
      subject: "Ancien message archive",
      preview: "Archive",
    }),
  ]);
  const [folder, setFolder] = useState<FolderKey>("inbox");
  const [search, setSearch] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composerPreset, setComposerPreset] = useState<ComposerPreset | null>(
    null,
  );

  const inboxUnreadCount = messages.filter(
    (message) => message.folder === "inbox" && message.unread,
  ).length;
  const draftsCount = messages.filter(
    (message) => message.folder === "drafts",
  ).length;
  const archiveCount = messages.filter(
    (message) => message.folder === "archive",
  ).length;

  const listMessages = useMemo(() => {
    const byFolder = messages.filter((message) => message.folder === folder);
    const term = search.trim().toLowerCase();
    if (!term) {
      return byFolder;
    }
    return byFolder.filter((message) =>
      `${message.subject} ${message.sender} ${message.preview}`
        .toLowerCase()
        .includes(term),
    );
  }, [messages, folder, search]);

  useEffect(() => {
    if (folder !== "inbox" && unreadOnly) {
      setUnreadOnly(false);
    }
  }, [folder, unreadOnly]);

  useEffect(() => {
    if (listMessages.length === 0) {
      setSelectedId(null);
      return;
    }
    if (
      !selectedId ||
      !listMessages.some((message) => message.id === selectedId)
    ) {
      setSelectedId(listMessages[0].id);
    }
  }, [listMessages, selectedId]);

  const selectedMessage =
    listMessages.find((message) => message.id === selectedId) ?? null;

  function openComposerWithPreset(preset: ComposerPreset) {
    setComposerPreset(preset);
  }

  async function sendMessage(payload: {
    subject: string;
    body: string;
    recipientUserIds: string[];
  }) {
    const newMessage = createMessage({
      id: `sent-${messages.length + 1}`,
      folder: "sent",
      sender: "Moi",
      subject: payload.subject,
      preview: payload.body
        .replace(/<[^>]+>/g, " ")
        .slice(0, 64)
        .trim(),
      bodyHtml: payload.body,
      body: [payload.body.replace(/<[^>]+>/g, " ").trim()],
      unread: false,
    });
    setMessages((prev) => [newMessage, ...prev]);
    setFolder("sent");
    setSearch("");
    setComposerPreset(null);
    setSelectedId(newMessage.id);
  }

  function toggleRead(messageId: string, read: boolean) {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === messageId ? { ...message, unread: !read } : message,
      ),
    );
  }

  function archiveSelected() {
    if (!selectedId) {
      return;
    }
    const isArchiveView = folder === "archive";
    setMessages((prev) =>
      prev.map((message) =>
        message.id === selectedId
          ? { ...message, folder: isArchiveView ? "inbox" : "archive" }
          : message,
      ),
    );
  }

  function deleteSelected() {
    if (!selectedId) {
      return;
    }
    setMessages((prev) => prev.filter((message) => message.id !== selectedId));
  }

  return (
    <div>
      <MessagingToolbar
        title="Messagerie"
        contextLabel="Lisa MBELE"
        search={search}
        onSearchChange={setSearch}
      />

      {composerPreset ? (
        <MessagingComposer
          recipients={[
            { value: "u-anne", label: "Anne Rousselet" },
            { value: "u-pierre", label: "Pierre W" },
            { value: "u-mbele", label: "Valery MBELE" },
          ]}
          initialSubject={composerPreset.subject}
          initialBody={composerPreset.body}
          initialRecipientUserIds={composerPreset.recipientUserIds}
          onCancel={() => setComposerPreset(null)}
          onSend={sendMessage}
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-[220px_320px_1fr]">
          <MessagingFoldersPanel
            folders={FOLDERS}
            activeFolder={folder}
            onSelectFolder={setFolder}
            inboxUnreadCount={inboxUnreadCount}
            draftsCount={draftsCount}
            archiveCount={archiveCount}
            showComposeButton
            onCompose={() =>
              openComposerWithPreset({
                subject: "",
                body: "",
                recipientUserIds: [],
              })
            }
          />
          <MessagingMessagesList
            panelLabel={
              folder === "inbox"
                ? "Boite de reception"
                : folder === "sent"
                  ? "Messages envoyes"
                  : folder === "drafts"
                    ? "Brouillons"
                    : "Messages archives"
            }
            folder={folder}
            messages={listMessages}
            selectedMessageId={selectedId}
            onSelectMessage={setSelectedId}
            unreadOnly={unreadOnly}
            onUnreadOnlyChange={setUnreadOnly}
            renderActions={(message) => {
              if (folder === "inbox") {
                return (
                  <ActionIconButton
                    icon={message.unread ? MailOpen : Mail}
                    label={
                      message.unread
                        ? "Marquer comme lu"
                        : "Marquer comme non lu"
                    }
                    onClick={() => toggleRead(message.id, message.unread)}
                  />
                );
              }
              if (folder === "archive") {
                return (
                  <ActionIconButton
                    icon={ArchiveRestore}
                    label="Restaurer depuis archives"
                    onClick={() =>
                      setMessages((prev) =>
                        prev.map((entry) =>
                          entry.id === message.id
                            ? { ...entry, folder: "inbox" }
                            : entry,
                        ),
                      )
                    }
                  />
                );
              }
              return null;
            }}
          />
          <MessagingReader
            message={selectedMessage}
            onOpenAttachment={() => undefined}
            topActions={
              selectedMessage ? (
                <div className="flex w-full items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const query = buildComposeQueryFromMessage(
                          "reply",
                          selectedMessage,
                        );
                        openComposerWithPreset({
                          subject: query.get("subject") ?? "",
                          body: query.get("body") ?? "",
                          recipientUserIds: query.get("recipientUserIds")
                            ? [query.get("recipientUserIds") as string]
                            : [],
                        });
                      }}
                    >
                      <Reply className="h-4 w-4" />
                      Repondre
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const query = buildComposeQueryFromMessage(
                          "forward",
                          selectedMessage,
                        );
                        openComposerWithPreset({
                          subject: query.get("subject") ?? "",
                          body: query.get("body") ?? "",
                          recipientUserIds: [],
                        });
                      }}
                    >
                      <Forward className="h-4 w-4" />
                      Transferer
                    </button>
                  </div>
                  <MessagingMessageActions
                    archivedView={folder === "archive"}
                    onArchiveToggle={archiveSelected}
                    onDelete={deleteSelected}
                    unread={selectedMessage.unread}
                    onToggleRead={
                      folder === "inbox"
                        ? () =>
                            toggleRead(
                              selectedMessage.id,
                              selectedMessage.unread,
                            )
                        : undefined
                    }
                  />
                </div>
              ) : undefined
            }
          />
        </div>
      )}
    </div>
  );
}

describe("Messaging module integration", () => {
  it("renders toolbar and 3-column structure with expected elements", () => {
    render(<MessagingModuleHarness />);

    expect(screen.getByText("Messagerie")).toBeInTheDocument();
    expect(screen.getByText("Lisa MBELE")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Rechercher un message..."),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("Annee en cours")).toBeInTheDocument();

    expect(screen.getByText("Dossiers")).toBeInTheDocument();
    expect(screen.getAllByText("Boite de reception").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Demande de suivi particulier").length,
    ).toBeGreaterThan(0);
  });

  it("creates a new message and makes it appear in sent folder", async () => {
    const { container } = render(<MessagingModuleHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Nouveau message" }));
    fireEvent.change(getComposerRecipientSelect(container), {
      target: { value: "u-anne" },
    });
    fireEvent.change(screen.getByPlaceholderText("Objet du message"), {
      target: { value: "Message parent -> staff" },
    });
    setEditorText(container, "Contenu nouveau message");
    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

    await waitFor(() =>
      expect(screen.getByText("Messages envoyes")).toBeInTheDocument(),
    );
    expect(
      screen.getAllByText("Message parent -> staff").length,
    ).toBeGreaterThan(0);
  });

  it("opens reply with prefilled recipient + subject and sends", async () => {
    const { container } = render(<MessagingModuleHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Repondre" }));

    const subjectInput = screen.getByDisplayValue(
      "Re: Demande de suivi particulier",
    );
    expect(subjectInput).toBeInTheDocument();
    const recipientSelect = getComposerRecipientSelect(container);
    expect(recipientSelect.value).toBe("u-mbele");

    setEditorText(container, "Reponse au message");
    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

    await waitFor(() =>
      expect(screen.getByText("Messages envoyes")).toBeInTheDocument(),
    );
    expect(
      screen.getAllByText("Re: Demande de suivi particulier").length,
    ).toBeGreaterThan(0);
  });

  it("opens forward with prefilled transfer subject/body", () => {
    render(<MessagingModuleHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Transferer" }));

    expect(
      screen.getByDisplayValue("Tr: Demande de suivi particulier"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Message transfere/i)).toBeInTheDocument();
  });

  it("filters inbox to unread only when checkbox is checked", () => {
    render(<MessagingModuleHarness />);
    expect(
      screen.getAllByText("Demande de suivi particulier").length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("Point de progression").length).toBeGreaterThan(
      0,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Non lus" }));
    expect(
      screen.getAllByText("Demande de suivi particulier").length,
    ).toBeGreaterThan(0);
    expect(screen.queryAllByText("Point de progression")).toHaveLength(0);
  });

  it("updates unread count badge when marking message as read/unread", () => {
    render(<MessagingModuleHarness />);

    const inboxButton = screen.getByRole("button", {
      name: /Boite de reception/,
    });
    expect(inboxButton).toHaveTextContent("1");
    fireEvent.click(
      screen.getAllByRole("button", { name: "Marquer comme lu" })[0],
    );
    expect(inboxButton).not.toHaveTextContent("1");

    fireEvent.click(
      screen.getAllByRole("button", { name: "Marquer comme non lu" })[0],
    );
    expect(inboxButton).toHaveTextContent("1");
  });

  it("archives, restores and deletes through clickable actions", () => {
    render(<MessagingModuleHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Archiver" }));
    fireEvent.click(screen.getByRole("button", { name: /Archives/ }));

    expect(
      screen.getAllByText("Demande de suivi particulier").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: "Desarchiver" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Desarchiver" }));
    expect(screen.queryAllByText("Demande de suivi particulier")).toHaveLength(
      0,
    );

    fireEvent.click(screen.getByRole("button", { name: /Boite de reception/ }));
    expect(
      screen.getAllByText("Demande de suivi particulier").length,
    ).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Supprimer" }));
    expect(screen.queryAllByText("Demande de suivi particulier")).toHaveLength(
      0,
    );
  });

  it("applies toolbar search filtering", () => {
    render(<MessagingModuleHarness />);

    fireEvent.change(screen.getByPlaceholderText("Rechercher un message..."), {
      target: { value: "progression" },
    });
    expect(screen.getAllByText("Point de progression").length).toBeGreaterThan(
      0,
    );
    expect(
      screen.queryByText("Demande de suivi particulier"),
    ).not.toBeInTheDocument();
  });
});
