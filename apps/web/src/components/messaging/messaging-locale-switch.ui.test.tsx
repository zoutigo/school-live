import React from "react";
import { render, screen } from "@testing-library/react";
import { Archive, FileText, Inbox, Send } from "lucide-react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MessagingFoldersPanel } from "./messaging-folders-panel";
import { MessagingMessagesList } from "./messaging-messages-list";
import type { MessagingFolder } from "./types";
import { useLocaleStore } from "../../i18n/locale-store";
import { DEFAULT_LOCALE } from "../../i18n/translations";

const FOLDERS: MessagingFolder[] = [
  { key: "inbox", label: "Boite de reception", icon: Inbox },
  { key: "sent", label: "Envoyes", icon: Send },
  { key: "drafts", label: "Brouillons", icon: FileText },
  { key: "archive", label: "Archives", icon: Archive },
];

describe("Messaging UI locale switch", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useLocaleStore.setState({ locale: DEFAULT_LOCALE });
  });

  it("translates the folders panel and compose button to English", () => {
    const { rerender } = render(
      <MessagingFoldersPanel
        folders={FOLDERS}
        activeFolder="inbox"
        onSelectFolder={vi.fn()}
        showComposeButton
        onCompose={vi.fn()}
      />,
    );

    expect(screen.getByText("Dossiers")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Nouveau message" }),
    ).toBeInTheDocument();

    useLocaleStore.setState({ locale: "en" });
    rerender(
      <MessagingFoldersPanel
        folders={FOLDERS}
        activeFolder="inbox"
        onSelectFolder={vi.fn()}
        showComposeButton
        onCompose={vi.fn()}
      />,
    );

    expect(screen.getByText("Folders")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "New message" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Dossiers")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Nouveau message" }),
    ).not.toBeInTheDocument();
  });

  it("translates the messages list empty state to English", () => {
    const { rerender } = render(
      <MessagingMessagesList
        panelLabel="Boite de reception"
        folder="inbox"
        messages={[]}
        selectedMessageId={null}
        onSelectMessage={vi.fn()}
      />,
    );

    expect(
      screen.getByText("Aucun message pour ce filtre."),
    ).toBeInTheDocument();

    useLocaleStore.setState({ locale: "en" });
    rerender(
      <MessagingMessagesList
        panelLabel="Boite de reception"
        folder="inbox"
        messages={[]}
        selectedMessageId={null}
        onSelectMessage={vi.fn()}
      />,
    );

    expect(screen.getByText("No message for this filter.")).toBeInTheDocument();
    expect(
      screen.queryByText("Aucun message pour ce filtre."),
    ).not.toBeInTheDocument();
  });
});
