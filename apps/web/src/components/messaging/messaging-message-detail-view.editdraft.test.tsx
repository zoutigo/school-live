import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  MessagingMessageDetailView,
  type MessagingDetailClient,
} from "./messaging-message-detail-view";
import type { MessagingMessage } from "./types";

function buildMessage(overrides: Partial<MessagingMessage>): MessagingMessage {
  return {
    id: "msg-1",
    folder: "drafts",
    sender: "Moi",
    subject: "Sujet brouillon",
    preview: "Preview",
    createdAt: "21 fevr. 2026, 06:31",
    unread: false,
    body: ["Bonjour"],
    attachments: [],
    status: "SENT",
    ...overrides,
  };
}

function buildClient(message: MessagingMessage): MessagingDetailClient {
  return {
    get: vi.fn().mockResolvedValue(message),
    markRead: vi.fn().mockResolvedValue(undefined),
    archive: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  };
}

describe("MessagingMessageDetailView — modifier le brouillon", () => {
  it("affiche le bouton 'Modifier le brouillon' quand le message est un DRAFT et onEditDraft est fourni", async () => {
    const message = buildMessage({ status: "DRAFT" });
    const onEditDraft = vi.fn();

    render(
      <MessagingMessageDetailView
        client={buildClient(message)}
        messageId="msg-1"
        folder="drafts"
        contextLabel="Contexte"
        onBack={vi.fn()}
        onArchivedRedirect={vi.fn()}
        onOpenCompose={vi.fn()}
        onEditDraft={onEditDraft}
      />,
    );

    const button = await screen.findByRole("button", {
      name: "Modifier le brouillon",
    });
    fireEvent.click(button);
    expect(onEditDraft).toHaveBeenCalledWith(
      expect.objectContaining({ id: "msg-1", status: "DRAFT" }),
    );
  });

  it("n'affiche pas le bouton pour un message envoyé (SENT)", async () => {
    const message = buildMessage({ status: "SENT" });

    render(
      <MessagingMessageDetailView
        client={buildClient(message)}
        messageId="msg-1"
        folder="inbox"
        contextLabel="Contexte"
        onBack={vi.fn()}
        onArchivedRedirect={vi.fn()}
        onOpenCompose={vi.fn()}
        onEditDraft={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Sujet brouillon")).toBeInTheDocument();
    });
    expect(
      screen.queryByRole("button", { name: "Modifier le brouillon" }),
    ).not.toBeInTheDocument();
  });

  it("n'affiche pas le bouton si onEditDraft n'est pas fourni, même pour un DRAFT", async () => {
    const message = buildMessage({ status: "DRAFT" });

    render(
      <MessagingMessageDetailView
        client={buildClient(message)}
        messageId="msg-1"
        folder="drafts"
        contextLabel="Contexte"
        onBack={vi.fn()}
        onArchivedRedirect={vi.fn()}
        onOpenCompose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Sujet brouillon")).toBeInTheDocument();
    });
    expect(
      screen.queryByRole("button", { name: "Modifier le brouillon" }),
    ).not.toBeInTheDocument();
  });
});
