import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  MessagingMessageDetailView,
  type MessagingDetailClient,
} from "./messaging-message-detail-view";
import {
  MessagingMailboxView,
  type MessagingMailboxClient,
} from "./messaging-mailbox-view";
import { SchoolReadOnlyContext } from "../layout/school-read-only-context";
import type { MessagingMessage } from "./types";

function buildMessage(overrides: Partial<MessagingMessage> = {}) {
  return {
    id: "msg-1",
    folder: "inbox",
    sender: "Direction",
    subject: "Sujet reçu",
    preview: "Preview",
    createdAt: "21 fevr. 2026, 06:31",
    unread: true,
    body: ["Bonjour"],
    attachments: [],
    status: "SENT",
    ...overrides,
  } as MessagingMessage;
}

function buildDetailClient(
  message: MessagingMessage,
  markRead = vi.fn().mockResolvedValue(undefined),
): MessagingDetailClient {
  return {
    get: vi.fn().mockResolvedValue(message),
    markRead,
    archive: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  };
}

function renderDetail(client: MessagingDetailClient, readOnly: boolean) {
  return render(
    <SchoolReadOnlyContext.Provider value={readOnly}>
      <MessagingMessageDetailView
        client={client}
        messageId="msg-1"
        folder="inbox"
        contextLabel="Contexte"
        onBack={vi.fn()}
        onArchivedRedirect={vi.fn()}
        onOpenCompose={vi.fn()}
      />
    </SchoolReadOnlyContext.Provider>,
  );
}

describe("Messagerie — lecture du détail d'un message", () => {
  it("lecture seule : le message s'affiche sans accusé de lecture ni action", async () => {
    const markRead = vi.fn().mockResolvedValue(undefined);
    renderDetail(buildDetailClient(buildMessage(), markRead), true);

    expect(await screen.findByText("Sujet reçu")).toBeInTheDocument();
    expect(markRead).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: "Repondre" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Transferer" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /archiv/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /supprim/i }),
    ).not.toBeInTheDocument();
  });

  it("accès normal : accusé de lecture envoyé et actions disponibles", async () => {
    const markRead = vi.fn().mockResolvedValue(undefined);
    renderDetail(buildDetailClient(buildMessage(), markRead), false);

    expect(await screen.findByText("Sujet reçu")).toBeInTheDocument();
    await waitFor(() => expect(markRead).toHaveBeenCalledWith("msg-1", true));
    expect(screen.getByRole("button", { name: "Repondre" })).toBeEnabled();
  });

  it("un échec de l'accusé de lecture n'empêche jamais de lire le message", async () => {
    const markRead = vi
      .fn()
      .mockRejectedValue(new Error("403 SCHOOL_MEMBER_READ_ONLY"));
    renderDetail(buildDetailClient(buildMessage(), markRead), false);

    expect(await screen.findByText("Sujet reçu")).toBeInTheDocument();
    await waitFor(() => expect(markRead).toHaveBeenCalled());
    // Pas de message d'erreur de chargement à la place du contenu.
    expect(screen.getByText("Bonjour")).toBeInTheDocument();
    expect(
      screen.queryByText(/impossible de charger/i),
    ).not.toBeInTheDocument();
  });

  it("n'envoie pas d'accusé de lecture depuis un dossier autre que la réception", async () => {
    const markRead = vi.fn().mockResolvedValue(undefined);
    render(
      <MessagingMessageDetailView
        client={buildDetailClient(buildMessage({ folder: "sent" }), markRead)}
        messageId="msg-1"
        folder="sent"
        contextLabel="Contexte"
        onBack={vi.fn()}
        onArchivedRedirect={vi.fn()}
        onOpenCompose={vi.fn()}
      />,
    );
    expect(await screen.findByText("Sujet reçu")).toBeInTheDocument();
    expect(markRead).not.toHaveBeenCalled();
  });
});

function buildMailboxClient(): MessagingMailboxClient {
  return {
    list: vi
      .fn()
      .mockResolvedValue({ items: [buildMessage()], meta: { total: 1 } }),
    get: vi.fn().mockResolvedValue(buildMessage()),
    markRead: vi.fn().mockResolvedValue(undefined),
    archive: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    unreadCount: vi.fn().mockResolvedValue(1),
  };
}

function renderMailbox(readOnly: boolean, canCompose = true) {
  const onOpenCompose = vi.fn();
  render(
    <SchoolReadOnlyContext.Provider value={readOnly}>
      <MessagingMailboxView
        client={buildMailboxClient()}
        contextLabel="Contexte"
        canCompose={canCompose}
        onOpenCompose={onOpenCompose}
        onOpenComposeFromMessage={vi.fn()}
        onOpenMessage={vi.fn()}
      />
    </SchoolReadOnlyContext.Provider>,
  );
  return { onOpenCompose };
}

describe("Messagerie — boîte aux lettres", () => {
  it("lecture seule : plus de bouton « Nouveau message », la liste reste consultable", async () => {
    renderMailbox(true);
    expect(await screen.findByText("Sujet reçu")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /nouveau message/i }),
    ).not.toBeInTheDocument();
  });

  it("accès normal : le bouton « Nouveau message » déclenche la composition", async () => {
    const { onOpenCompose } = renderMailbox(false);
    await screen.findByText("Sujet reçu");
    const buttons = screen.getAllByRole("button", {
      name: /nouveau message/i,
    });
    fireEvent.click(buttons[0]);
    expect(onOpenCompose).toHaveBeenCalled();
  });

  it("respecte aussi canCompose=false hors lecture seule", async () => {
    renderMailbox(false, false);
    await screen.findByText("Sujet reçu");
    expect(
      screen.queryByRole("button", { name: /nouveau message/i }),
    ).not.toBeInTheDocument();
  });
});
