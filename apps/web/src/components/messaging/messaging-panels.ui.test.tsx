import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { Archive, FileText, Inbox, Send } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { MessagingFoldersPanel } from "./messaging-folders-panel";
import { MessagingMessagesList } from "./messaging-messages-list";
import type { MessagingFolder, MessagingMessage } from "./types";

const FOLDERS: MessagingFolder[] = [
  { key: "inbox", label: "Boite de reception", icon: Inbox },
  { key: "sent", label: "Envoyes", icon: Send },
  { key: "drafts", label: "Brouillons", icon: FileText },
  { key: "archive", label: "Archives", icon: Archive },
];

const INBOX_MESSAGES: MessagingMessage[] = [
  {
    id: "msg-1",
    folder: "inbox",
    sender: "MBELE Valery",
    senderUserId: "u-1",
    subject: "Sujet non lu",
    preview: "preview",
    createdAt: "21 fevr. 2026, 05:22",
    unread: true,
    body: ["Bonjour"],
    attachments: [],
  },
  {
    id: "msg-2",
    folder: "inbox",
    sender: "ANNE Rousselet",
    senderUserId: "u-2",
    subject: "Sujet lu",
    preview: "preview",
    createdAt: "21 fevr. 2026, 07:31",
    unread: false,
    body: ["Bonjour"],
    attachments: [],
  },
];

describe("MessagingFoldersPanel", () => {
  it("renders folders and shows badges for inbox/drafts/archive", () => {
    render(
      <MessagingFoldersPanel
        folders={FOLDERS}
        activeFolder="inbox"
        onSelectFolder={vi.fn()}
        inboxUnreadCount={8}
        draftsCount={3}
        archiveCount={2}
        showComposeButton
        onCompose={vi.fn()}
      />,
    );

    expect(screen.getByText("Dossiers")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Boite de reception/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Envoyes" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Brouillons/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Archives/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Nouveau message" }),
    ).toBeInTheDocument();
  });

  it("calls onSelectFolder when a folder is clicked", () => {
    const onSelectFolder = vi.fn();
    render(
      <MessagingFoldersPanel
        folders={FOLDERS}
        activeFolder="inbox"
        onSelectFolder={onSelectFolder}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Archives/ }));
    expect(onSelectFolder).toHaveBeenCalledWith("archive");
  });
});

describe("MessagingMessagesList", () => {
  it("renders inbox row items with sender formatting and unread style", () => {
    render(
      <MessagingMessagesList
        panelLabel="Boite de reception"
        folder="inbox"
        messages={INBOX_MESSAGES}
        selectedMessageId="msg-1"
        onSelectMessage={vi.fn()}
      />,
    );

    expect(screen.getByText("Boite de reception")).toBeInTheDocument();
    expect(screen.getByText("V.MBELE")).toBeInTheDocument();
    expect(screen.getByText("R.ANNE")).toBeInTheDocument();

    const unreadSubject = screen.getByText("Sujet non lu");
    expect(unreadSubject).toHaveClass("font-semibold");
    expect(unreadSubject).toHaveClass("text-primary");

    const readSubject = screen.getByText("Sujet lu");
    expect(readSubject).toHaveClass("font-normal");
    expect(readSubject).toHaveClass("text-text-primary");
  });

  it("filters only unread messages when checkbox is enabled", () => {
    const onUnreadOnlyChange = vi.fn();
    render(
      <MessagingMessagesList
        panelLabel="Boite de reception"
        folder="inbox"
        messages={INBOX_MESSAGES}
        selectedMessageId="msg-1"
        onSelectMessage={vi.fn()}
        unreadOnly
        onUnreadOnlyChange={onUnreadOnlyChange}
      />,
    );

    expect(screen.getByText("Sujet non lu")).toBeInTheDocument();
    expect(screen.queryByText("Sujet lu")).not.toBeInTheDocument();
  });

  it("calls message selection and unread filter checkbox callbacks", () => {
    const onSelectMessage = vi.fn();
    const onUnreadOnlyChange = vi.fn();
    render(
      <MessagingMessagesList
        panelLabel="Boite de reception"
        folder="inbox"
        messages={INBOX_MESSAGES}
        selectedMessageId={null}
        onSelectMessage={onSelectMessage}
        unreadOnly={false}
        onUnreadOnlyChange={onUnreadOnlyChange}
      />,
    );

    fireEvent.click(screen.getByText("Sujet non lu"));
    expect(onSelectMessage).toHaveBeenCalledWith("msg-1");

    const unreadCheckbox = screen.getByRole("checkbox", { name: "Non lus" });
    fireEvent.click(unreadCheckbox);
    expect(onUnreadOnlyChange).toHaveBeenCalledWith(true);
  });

  it("shows preview in non-inbox folders", () => {
    const sent: MessagingMessage[] = [
      {
        ...INBOX_MESSAGES[0],
        id: "sent-1",
        folder: "sent",
        subject: "Message envoye",
        preview: "Apercu visible",
      },
    ];
    render(
      <MessagingMessagesList
        panelLabel="Messages envoyes"
        folder="sent"
        messages={sent}
        selectedMessageId="sent-1"
        onSelectMessage={vi.fn()}
      />,
    );

    expect(screen.getByText("Apercu visible")).toBeInTheDocument();
  });

  it("renders action slot for each message row", () => {
    render(
      <MessagingMessagesList
        panelLabel="Boite de reception"
        folder="inbox"
        messages={INBOX_MESSAGES}
        selectedMessageId="msg-1"
        onSelectMessage={vi.fn()}
        renderActions={(message) => (
          <button type="button" aria-label={`Action ${message.id}`}>
            action
          </button>
        )}
      />,
    );

    const row = screen.getByText("Sujet non lu").closest("li");
    expect(row).not.toBeNull();
    expect(
      within(row as HTMLElement).getByRole("button", { name: "Action msg-1" }),
    ).toBeInTheDocument();
  });
});
